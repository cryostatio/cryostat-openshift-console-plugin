/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { http, https } from 'follow-redirects';
import fs from 'fs';
import k8s from '@kubernetes/client-node';
import express from 'express';
import morgan from 'morgan';
import qs from 'qs';
import { Duplex } from 'stream';

const app = express();
const port = process.env.PORT || 9943;
const skipTlsVerify = process.env.SKIP_TLS_VERIFY == 'true';
const htmlDir = process.env.HTML_DIR || './html';
const tlsCertPath = process.env.TLS_CERT_PATH || '/var/cert/tls.crt';
const tlsKeyPath = process.env.TLS_KEY_PATH || '/var/cert/tls.key';

const tlsOpts = {
  cert: fs.readFileSync(tlsCertPath),
  key: fs.readFileSync(tlsKeyPath),
};

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
kc.applyToHTTPSOptions({
  rejectUnauthorized: !skipTlsVerify,
});
kc.applyToRequest({
  url: '',
  strictSSL: !skipTlsVerify,
});

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

app.use(morgan('combined'));

let connections: Duplex[] = [];

app.use(express.static(htmlDir));

app.get('/health', (_, res) => {
  res.status(204).send();
});

app.use('/upstream/*', async (req, res) => {
  let ns = req.headers['cryostat-svc-ns'];
  let name = req.headers['cryostat-svc-name'];
  if (!ns || !name) {
    res.status(400).send();
    return;
  }
  if (Array.isArray(ns)) {
    ns = ns[0];
  }
  if (Array.isArray(name)) {
    name = name[0];
  }

  const svc = await k8sApi.readNamespacedService(name, ns);
  const svcLabels = svc?.body?.metadata?.labels ?? {};
  if (
    !(svcLabels['app.kubernetes.io/part-of'] === 'cryostat' && svcLabels['app.kubernetes.io/component'] === 'cryostat')
  ) {
    throw new Error(
      `Selected Service "${name}" in namspace "${ns}" does not have the expected Cryostat selector labels`,
    );
  }

  const host = `${name}.${ns}`;
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
    throw new Error(
      `Could not find suitable port with http(s) appProtocol or with name ending in http(s) on <${name}, ${ns}>`,
    );
  }

  const proto = tls ? https : http;

  let path = (req.baseUrl + req.path).slice('/upstream'.length);
  if (path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  const query = qs.stringify(req.query);
  if (query) {
    path += `?${query}`;
  }
  const initOptions = {
    host,
    method,
    path,
    port: svcPort,
    headers: {
      Authorization: req.headers.authorization,
      Referer: req.headers.referer,
    },
  };
  const options = {
    ...initOptions,
    agent: new proto.Agent(initOptions),
  };
  let body = '';
  const upReq = proto.request(options, (upRes) => {
    upRes.setEncoding('utf8');
    upRes.setTimeout(10_000, () => {
      res.status(504).send();
    });
    upRes.on('data', (chunk) => (body += chunk));
    upRes.on('end', () => {
      console.log(`${host} ${path} : ${upRes.statusCode} ${body.length}`);
      res.status(upRes.statusCode ?? 503).send(body);
    });
  });
  upReq.on('error', (e) => {
    console.error(e);
    res.status(502).send();
  });
  upReq.end();
});

const svc = https.createServer(tlsOpts, app).listen(port, () => {
  console.log(`Service started on port ${port}`);
});

svc.on('connection', (connection) => {
  connections.push(connection);
  connection.on('close', () => (connections = connections.filter((curr) => curr !== connection)));
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

  connections.forEach((curr) => curr.end());
  setTimeout(() => connections.forEach((curr) => curr.destroy()), 5000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
