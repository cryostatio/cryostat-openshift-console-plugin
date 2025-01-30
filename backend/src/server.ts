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
import httpProxy from 'http-proxy';
import fs from 'fs';
import * as k8s from '@kubernetes/client-node';
import express from 'express';
import morgan from 'morgan';
import multer from 'multer';
import { ParsedQs } from 'qs';
import { Duplex } from 'stream';

const port = process.env.PORT || 9943;
const skipTlsVerify = process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0';
const htmlDir = process.env.HTML_DIR || './html';
const tlsCertPath = process.env.TLS_CERT_PATH || '/var/cert/tls.crt';
const tlsKeyPath = process.env.TLS_KEY_PATH || '/var/cert/tls.key';

const tlsOpts = {
  cert: fs.readFileSync(tlsCertPath),
  key: fs.readFileSync(tlsKeyPath),
};

const kc = new k8s.KubeConfig();
kc.loadFromCluster();
kc.applyToHTTPSOptions({
  rejectUnauthorized: !skipTlsVerify,
});
kc.applyToRequest({
  url: '',
  strictSSL: !skipTlsVerify,
});

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

const app = express();
const proxy = httpProxy.createProxyServer({});

app.use(morgan('combined'));

let connections: Duplex[] = [];

app.use(express.json());
app.use(express.static(htmlDir));
app.use(express.raw());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.use(multer().none());

app.get('/health', (_, res) => {
  res.status(204).send();
});

const getQuery = (q: ParsedQs, key: string, def?: string): string | undefined => {
  let v = q[key];
  while (Array.isArray(v)) {
    v = v[0];
  }
  if (!v) {
    v = def;
  }
  if (typeof v === 'string') {
    return v;
  }
  return def;
};

const getCryostatInstance = (req: any): { ns: string, name: string } => {
  let ns = req.headers['cryostat-svc-ns'];
  let name = req.headers['cryostat-svc-name'];
  if (!ns && !name) {
    ns = getQuery(req.query, 'ns');
    name = getQuery(req.query, 'name');
  }
  if (!ns || !name) {
    throw new Error();
  }
  if (Array.isArray(ns)) {
    ns = ns[0];
  }
  if (Array.isArray(name)) {
    name = name[0];
  }
  return {
    ns,
    name,
  };
}

const getServicePort = async (instance: { ns: string, name: string }): Promise<{ tls: boolean, port: number }> => {
  let tls = true;
  let svcPort;

  const svc = await k8sApi.readNamespacedService(instance.name, instance.ns).catch((err) => {
    console.error(err);
    throw err;
  });
  const svcLabels = svc?.body?.metadata?.labels ?? {};
  if (
    !(svcLabels['app.kubernetes.io/part-of'] === 'cryostat' && svcLabels['app.kubernetes.io/component'] === 'cryostat')
  ) {
    throw new Error(
      `Selected Service "${instance.name}" in namespace "${instance.ns}" does not have the expected Cryostat selector labels`,
    );
  }

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
      `Could not find suitable port with http(s) appProtocol or with name ending in http(s) on <${instance.ns}, ${instance.name}>`,
    );
  }
  return {
    tls,
    port: svcPort,
  };
}

app.use('/upstream/*', async (req, res) => {
  let ns: string;
  let name: string;
  try {
    const instance = getCryostatInstance(req);
    ns = instance.ns;
    name = instance.name;
  } catch (err) {
    console.warn(err);
    res.status(400).send();
    return;
  }

  const host = `${name}.${ns}`;
  const method = req.method;

  let tls;
  let svcPort;
  try {
    const port = await getServicePort({ ns, name });
    tls = port.tls;
    svcPort = port.port;
  } catch (err) {
    console.error(err);
    res.status(502).send();
    return;
  }

  const headers = {} as any;
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key] = value;
    } else if (Array.isArray(value)) {
      headers[key] = value.join();
    }
  }
  const opts: httpProxy.ServerOptions = {
    agent: (tls ? https : http).globalAgent,
    target: `http${tls ? 's' : ''}://${host}:${svcPort}`,
    headers,
    followRedirects: true,
    secure: !skipTlsVerify,
    ssl: tlsOpts,
    xfwd: true,
  };
  const correctedUrl = (req.baseUrl + req.url).replace(/^\/upstream(\.*)/, '');
  req.url = correctedUrl;
  console.log(
    `Proxying <${ns}, ${name}> ${method} ${req.url} -> ${opts.target}`,
  );
  proxy.web(req, res, opts);
});

const svc = https.createServer(tlsOpts, app).listen(port, () => {
  console.log(`Service started on port ${port} using ${tlsCertPath}`);
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
