const { http, https } = require('follow-redirects');
const fs = require('fs');
const k8s = require('@kubernetes/client-node');
const express = require('express');
const morgan = require('morgan');
const qs = require('qs');
const app = express();
const port = process.env.PORT || 9943;
const skipTlsVerify = process.env.SKIP_TLS_VERIFY == 'true';
const htmlDir = process.env.HTML_DIR || './html';

const tlsOpts = {
  cert: fs.readFileSync('/var/cert/tls.crt'),
  key: fs.readFileSync('/var/cert/tls.key'),
};

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
kc.applyToHTTPSOptions({
  rejectUnauthorized: !skipTlsVerify,
});
kc.applyToRequest({
  strictSSL: !skipTlsVerify,
});

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

app.use(morgan('combined'));

let connections = [];

app.use(express.static(htmlDir))

app.get('/health', (req, res) => {
  res.send(`Hello from backend service: ${new Date().toISOString()}`);
});

app.use('/upstream/*', async (req, res) => {
  let ns = req.headers['cryostat-svc-ns'];
  let name = req.headers['cryostat-svc-name'];
  if (!ns || !name) {
    res.status(400).send();
    return;
  }

  const svc = await k8sApi.readNamespacedService(name, ns);
  const svcLabels = svc?.body?.metadata?.labels ?? {};
  if (!(svcLabels['app.kubernetes.io/part-of'] === 'cryostat' && svcLabels['app.kubernetes.io/component'] === 'cryostat')) {
    throw new Error(`Selected Service "${name}" in namspace "${ns}" does not have the expected Cryostat selector labels`);
  }

  let host = `${name}.${ns}`;

  const method = req.method;

  let tls;
  let svcPort;
  // select ports by appProtocol, preferring https over http
  for (const port of svc?.body?.spec?.ports ?? []) {
    if (port.appProtocol === 'https') {
      tls = true;
      svcPort = port.port;
      break;
    } else if (port.appProtocol === 'http') {
      tls = false;
      svcPort = port.port;
    }
  }
  if (!svcPort) {
    // if we haven't selected a port by appProtocol, then try to select by name
    for (const port of svc?.body?.spec?.ports ?? []) {
      if (!port.name) {
        continue;
      }
      if (port.name.endsWith('https')) {
        tls = true;
        svcPort = port.port;
        break;
      } else if (port.name.endsWith('http')) {
        tls = false;
        svcPort = port.port;
      }
    }
  }
  if (!svcPort) {
    throw new Error(`Could not find suitable port with http(s) appProtocol or with name ending in http(s) on <${name}, ${ns}>`);
  }

  const proto = (tls ? https : http);

  let path = (req.baseUrl + req.path).slice('/upstream'.length);
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  const query = qs.stringify(req.query);
  if (query) {
    path += `?${query}`;
  }
  const options = {
    host,
    method,
    path,
    port: svcPort,
    headers: {
      'Authorization': req.headers.authorization,
      'Referer': req.headers.referer,
    },
  };
  options['agent'] = new proto.Agent(options);
  let body = '';
  var upReq = proto.request(options, upRes => {
    upRes.setEncoding('utf8');
    upRes.setTimeout(10_000, () => {
      res.status(504).send();
    });
    upRes.on('data', chunk => body += chunk);
    upRes.on('end', () => {
      console.log(`${host} ${path} : ${upRes.statusCode} ${body.length}`);
      res.status(upRes.statusCode).send(body);
    });
  });
  upReq.on('error', e => {
    console.error(e);
    res.status(502).send();
  });
  upReq.end();
});

const svc = https.createServer(tlsOpts, app).listen(port, () => {
  console.log(`Service started on port ${port}`);
});

svc.on('connection', connection => {
    connections.push(connection);
    connection.on('close', () => connections = connections.filter(curr => curr !== connection));
});

const shutdown = () => {
  console.log('Received kill signal, shutting down gracefully');
  svc.close(() => {
    console.log('Closed out remaining connections');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);

  connections.forEach(curr => curr.end());
  setTimeout(() => connections.forEach(curr => curr.destroy()), 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
