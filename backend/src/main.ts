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
import fs from 'fs';
import { Duplex } from 'stream';
import { https } from 'follow-redirects';
import { app, proxy, getCryostatInstance, getProxyTarget } from './server';

const port = process.env.PORT || 9443;
const skipTlsVerify = process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0';
const tlsCertPath = process.env.TLS_CERT_PATH || '/var/cert/tls.crt';
const tlsKeyPath = process.env.TLS_KEY_PATH || '/var/cert/tls.key';

const tlsOpts = {
  cert: fs.readFileSync(tlsCertPath),
  key: fs.readFileSync(tlsKeyPath),
};

let connections: Duplex[] = [];

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
