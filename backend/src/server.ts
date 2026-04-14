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
import { IncomingMessage } from 'http';
import { Server as HttpsServer } from 'https';
import { Duplex } from 'stream';
import * as k8s from '@kubernetes/client-node';
import express, { Application } from 'express';
import { http, https } from 'follow-redirects';
import httpProxy from 'http-proxy';
import morgan from 'morgan';
import { ParsedQs, stringify as stringifyQuery } from 'qs';

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

class Server {
  private app: Application;
  private proxy: httpProxy;
  private k8sApi: k8s.CoreV1Api;
  private skipTlsVerify: boolean;
  private htmlDir: string;
  private httpsServer?: HttpsServer;
  private connections: Duplex[] = [];

  constructor(kubeConfig: k8s.KubeConfig, skipTlsVerify?: boolean, htmlDir?: string) {
    this.skipTlsVerify = skipTlsVerify ?? process.env.NODE_TLS_REJECT_UNAUTHORIZED == '0';
    this.htmlDir = htmlDir ?? process.env.HTML_DIR ?? './html';
    this.k8sApi = kubeConfig.makeApiClient(k8s.CoreV1Api);
    this.app = express();
    this.proxy = httpProxy.createProxyServer({ ws: true });

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(morgan('combined'));
    this.app.use(express.static(this.htmlDir));
  }

  private setupRoutes(): void {
    this.app.get('/health', (_, res) => {
      res.status(204).send();
    });

    this.app.use('/upstream/{*pathMatch}', async (req, res) => {
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
        const port = await this.getServicePort({ ns, name });
        tls = port.tls;
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
        method,
        target: await this.getProxyTarget({ ns, name }),
        headers,
        followRedirects: true,
        secure: !this.skipTlsVerify,
        xfwd: true,
      };
      const qs = stringifyQuery(req.query);
      // Strip the /upstream prefix from the original URL
      let correctedUrl = req.originalUrl.replace(/^\/upstream/, '');
      if (!correctedUrl) {
        correctedUrl = '/';
      }
      // Query string is already in originalUrl, so we're done
      req.url = correctedUrl;
      console.log(`Proxying <${ns}, ${name}> ${method} ${req.url} -> ${opts.target}`);
      this.proxy.web(req, res, opts, (err) => {
        console.error(err);
        res.status(502).send();
      });
    });
  }

  private async getServicePort(instance: CryostatInstance): Promise<{ tls: boolean; port: number }> {
    let tls = true;
    let svcPort;

    const svc = await this.k8sApi
      .readNamespacedService({ name: instance.name, namespace: instance.ns })
      .catch((err) => {
        console.error(err);
        throw err;
      });
    const svcLabels = svc?.metadata?.labels ?? {};
    if (
      !(
        svcLabels['app.kubernetes.io/part-of'] === 'cryostat' && svcLabels['app.kubernetes.io/component'] === 'cryostat'
      )
    ) {
      throw new Error(
        `Selected Service "${instance.name}" in namespace "${instance.ns}" does not have the expected Cryostat selector labels`,
      );
    }

    // select ports by appProtocol, preferring https over http
    for (const port of svc?.spec?.ports ?? []) {
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
      for (const port of svc?.spec?.ports ?? []) {
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

  private async getProxyTarget({ ns, name }: CryostatInstance): Promise<string> {
    const port = await this.getServicePort({ ns, name });
    const tls = port.tls;
    const svcPort = port.port;
    const host = `${name}.${ns}`;

    return `http${tls ? 's' : ''}://${host}:${svcPort}`;
  }

  private setupWebSocketUpgrade(tlsOpts: { cert: Buffer; key: Buffer }): void {
    if (!this.httpsServer) {
      throw new Error('HTTPS server not initialized. Call start() first.');
    }

    this.httpsServer.on('upgrade', async (req: IncomingMessage, sock: Duplex, head: Buffer) => {
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
      const target = await this.getProxyTarget(instance);

      const correctedUrl = req.url.replace(/^\/upstream(.*)/, '$1');
      req.url = correctedUrl;
      console.log(`WebSocket ${req.url} -> ${target}`);
      this.proxy.ws(
        req,
        sock,
        head,
        {
          target,
          followRedirects: true,
          secure: !this.skipTlsVerify,
          ssl: tlsOpts,
        },
        (err: Error) => {
          console.error(err);
          sock.destroy(err);
        },
      );
    });
  }

  public start(port?: number | string, tlsCertPath?: string, tlsKeyPath?: string): void {
    const serverPort = port ?? process.env.PORT ?? 9443;
    const certPath = tlsCertPath ?? process.env.TLS_CERT_PATH ?? '/var/cert/tls.crt';
    const keyPath = tlsKeyPath ?? process.env.TLS_KEY_PATH ?? '/var/cert/tls.key';

    const tlsOpts = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };

    this.httpsServer = https.createServer(tlsOpts, this.app);

    this.httpsServer.on('connection', (connection: Duplex) => {
      this.connections.push(connection);
      connection.on('close', () => (this.connections = this.connections.filter((curr) => curr !== connection)));
    });

    this.setupWebSocketUpgrade(tlsOpts);

    this.httpsServer.listen(serverPort, () => {
      console.log(`Service started on port ${serverPort} using ${certPath}`);
    });

    this.setupShutdownHandlers();
  }

  private setupShutdownHandlers(): void {
    const shutdown = () => {
      console.log('Received kill signal, shutting down gracefully');
      if (this.httpsServer) {
        this.httpsServer.close(() => {
          console.log('Closed out remaining connections');
          process.exit(0);
        });
      }

      setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);

      this.connections.forEach((curr) => curr.end());
      setTimeout(() => this.connections.forEach((curr) => curr.destroy()), 5000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }

  public getApp(): Application {
    return this.app;
  }

  public getProxy(): httpProxy {
    return this.proxy;
  }
}

export { Server, getCryostatInstance };
