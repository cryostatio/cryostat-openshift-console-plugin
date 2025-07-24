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
import { consoleFetch, k8sGet, K8sModel, K8sVerb } from '@openshift-console/dynamic-plugin-sdk';
import { from, of, Observable, ReplaySubject, first, map } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';

const CONSOLE_PLUGIN_MODEL: K8sModel = {
  label: 'ConsolePlugin',
  labelKey: 'public~ConsolePlugin',
  apiVersion: 'v1',
  apiGroup: 'console.openshift.io',
  plural: 'consoleplugins',
  abbr: 'CP',
  namespaced: false,
  kind: 'ConsolePlugin',
  id: 'consoleplugin',
  labelPlural: 'ConsolePlugins',
  labelPluralKey: 'public~ConsolePlugins',
  crd: true,
  verbs: ['delete', 'deletecollection', 'get', 'list', 'patch', 'create', 'update', 'watch'] as K8sVerb[],
};

const PLUGIN_NAME = 'cryostat-plugin'; // this should match the consolePlugin.name in package.json

interface ConsolePluginCustomResource {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
    labels?: Map<string, string>;
  };
  spec: {
    displayName: string;
    backend: {
      type: string;
      service: {
        name: string;
        namespace: string;
        port: number;
        basePath: string;
      };
    };
    proxy: {
      alias: string;
      authorization: string;
      endpoint: {
        type: string;
        service: {
          name: string;
          namespace: string;
          port: number;
        };
      };
    }[];
  };
}

interface ConsolePluginInstance {
  pluginName: string;
  proxyAlias: string;
  proxyNamespace: string;
}

export class PluginService {
  constructor(private readonly _pluginInstance = new ReplaySubject<ConsolePluginInstance>()) {
    from(k8sGet({ model: CONSOLE_PLUGIN_MODEL, name: PLUGIN_NAME }))
      .pipe(
        first(),
        map((v) => {
          if (!v) {
            throw new Error();
          }
          if (v['items']) {
            return v['items'];
          }
          return v;
        }),
        map((v) => {
          if (Array.isArray(v)) {
            if (v.length !== 1) {
              console.warn(`Expected to find one ConsolePlugin named ${PLUGIN_NAME}, found: ${v.length}`);
            }
            return v[0];
          }
          return v;
        }),
        catchError((err) => {
          console.error(err);
          const defaultCr: ConsolePluginCustomResource = {
            metadata: {
              name: PLUGIN_NAME,
            },
            spec: {
              proxy: [
                {
                  alias: `${PLUGIN_NAME}-proxy`,
                  endpoint: {
                    service: {
                      namespace: `plugin--${PLUGIN_NAME}`,
                    },
                  },
                },
              ],
            },
          } as ConsolePluginCustomResource;
          return of(defaultCr);
        }),
      )
      .subscribe((pluginInstance: ConsolePluginCustomResource) => {
        this._pluginInstance.next({
          proxyAlias: pluginInstance.spec.proxy[0].alias,
          pluginName: pluginInstance.metadata.name,
          proxyNamespace: pluginInstance.spec.proxy[0].endpoint.service.namespace,
        });
      });
  }

  status(): Observable<string> {
    return this.proxyUrl('health')
      .pipe(
        concatMap((url) =>
          from(
            consoleFetch(url.toString(), {
              method: 'GET',
              redirect: 'follow',
            }),
          ),
        ),
      )
      .pipe(
        concatMap((resp: Response) => (resp.ok ? resp.text() : of(resp.statusText))),
        catchError((err) => {
          console.error(err);
          return JSON.stringify(err);
        }),
      );
  }

  cryostat(ns: string, name: string, method: string, requestPath: string, _body?: object): Observable<string> {
    return this.proxyUrl(`upstream/${requestPath}`)
      .pipe(
        concatMap((url) =>
          from(
            consoleFetch(url, {
              method,
              redirect: 'follow',
              headers: {
                'CRYOSTAT-SVC-NS': ns,
                'CRYOSTAT-SVC-NAME': name,
              },
            }),
          ),
        ),
      )
      .pipe(
        concatMap((resp: Response) => (resp.ok ? resp.text() : of(resp.statusText))),
        catchError((err) => {
          console.error(err);
          return JSON.stringify(err);
        }),
      );
  }

  proxyUrl(requestPath?: string): Observable<string> {
    return this._pluginInstance.pipe(
      first(),
      map((instance) =>
        `/api/proxy/plugin/${instance.pluginName}/${instance.proxyAlias}/${requestPath}`.replace(/([^:]\/)\/+/g, '$1'),
      ),
      map((proxiedPath) => {
        try {
          const url = new URL(requestPath ?? '');
          // we only want the path and the parts that come after, the rest is handled by proxying
          return `${url.pathname}${url.search}${url.hash}`;
        } catch (_) {
          // requestPath is empty or a relative path, so just use the adjusted proxied path
          return proxiedPath;
        }
      }),
    );
  }
}
