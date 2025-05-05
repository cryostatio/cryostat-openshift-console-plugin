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
import { ParsedQs, stringify as stringifyQuery } from 'qs';
import { Duplex } from 'stream';

const port = process.env.PORT || 9443;
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
const proxy = httpProxy.createProxyServer({ ws: true });

app.use(morgan('combined'));

let connections: Duplex[] = [];

app.use(express.static(htmlDir));

app.get('/health', (_, res) => {
  res.status(204).send();
});

type CryostatInstance = { ns: string; name: string };

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

const getSearchParam = (q: URLSearchParams, key: string, def?: string): string | undefined => {
  return (q.has(key) ? q.get(key) : def) ?? def;
};

/* eslint-disable  @typescript-eslint/no-explicit-any */
const getCryostatInstance = (req: any): CryostatInstance => {
  let ns;
  let name;
  if (req.headers) {
    ns = req.headers['cryostat-svc-ns'];
    name = req.headers['cryostat-svc-name'];
  }
  if (!ns && !name && req.query) {
    ns = getQuery(req.query, 'ns');
    name = getQuery(req.query, 'name');
  }
  if (!ns && !name && req.searchParams) {
    ns = getSearchParam(req.searchParams, 'ns');
    name = getSearchParam(req.searchParams, 'name');
  }
  if (!ns || !name) {
    throw new Error(
      `Proxy request from ${req.hostname} ${req.url} requested <${ns}, ${name}> - values cannot be falsey`,
    );
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
};

const getServicePort = async (instance: CryostatInstance): Promise<{ tls: boolean; port: number }> => {
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
};

const getProxyTarget = async ({ ns, name }: CryostatInstance): Promise<string> => {
  const port = await getServicePort({ ns, name });
  const tls = port.tls;
  const svcPort = port.port;
  const host = `${name}.${ns}`;

  return `http${tls ? 's' : ''}://${host}:${svcPort}`;
};

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

  const method = req.method;

  let tls;
  try {
    const port = await getServicePort({ ns, name });
    tls = port.tls;
  } catch (err) {
    console.error(err);
    res.status(502).send();
    return;
  }

  /* eslint-disable  @typescript-eslint/no-explicit-any */
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
    method,
    target: await getProxyTarget({ ns, name }),
    headers,
    followRedirects: true,
    secure: !skipTlsVerify,
    ssl: tlsOpts,
    xfwd: true,
  };
  const qs = stringifyQuery(req.query);
  let correctedUrl = req.baseUrl.replace(/^\/upstream/, '');
  if (qs) {
    correctedUrl += `?${qs}`;
  }
  req.url = correctedUrl;
  console.log(`Proxying <${ns}, ${name}> ${method} ${req.url} -> ${opts.target}`);
  proxy.web(req, res, opts, (err) => {
    console.error(err);
    res.status(502).send();
  });
});

const svc = https.createServer(tlsOpts, app);

svc.on('connection', (connection) => {
  connections.push(connection);
  connection.on('close', () => (connections = connections.filter((curr) => curr !== connection)));
});
svc.on('upgrade', async (req, sock, head) => {
  console.log(`WebSocket Upgrade: ${req.url}`);
  if (!req.url) {
    throw new Error(`Cannot upgrade WebSocket connection to: ${req.url}`);
  }
  const u = URL.parse(req.url, 'http://localhost');
  if (!u) {
    throw new Error(`Could not parse request URL: ${req.url}`);
  }
  const r2 = {
    ...req,
    searchParams: u.searchParams,
  };
  const instance = getCryostatInstance(r2);
  const target = await getProxyTarget(instance);
  const correctedUrl = req.url.replace(/^\/upstream(\.*)/, '');
  req.url = correctedUrl;
  console.log(`WebSocket ${req.url} -> ${target}`);
  proxy.ws(
    req,
    sock,
    head,
    {
      target,
      followRedirects: true,
      secure: !skipTlsVerify,
      ssl: tlsOpts,
    },
    (err) => {
      console.error(err);
      sock.destroy(err);
    },
  );
});
svc.listen(port, () => {
  console.log(`Service started on port ${port} using ${tlsCertPath}`);
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
