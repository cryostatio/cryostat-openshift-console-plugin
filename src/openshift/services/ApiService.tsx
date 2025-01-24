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
import { from, of, Observable, ReplaySubject, first, map } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { consoleFetch, k8sGet, K8sVerb } from '@openshift-console/dynamic-plugin-sdk';

const CONSOLE_PLUGIN_MODEL = {
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

interface ConsolePluginInstance {
  pluginName: string;
  proxyAlias: string;
  proxyNamespace: string;
}

export class ApiService {
  constructor(private readonly _pluginInstance = new ReplaySubject<ConsolePluginInstance>()) {
    this._pluginInstance.subscribe(cryostatConsolePlugin => console.debug({ pluginInstance: cryostatConsolePlugin }));
    from(k8sGet({ model: CONSOLE_PLUGIN_MODEL, name: PLUGIN_NAME }))
      .pipe(
        first(),
        map((v) => {
          if (!v) {
            throw new Error();
          }
          if (v.hasOwnProperty('items')) {
            return v['items'];
          }
          return v;
        }),
        map((v) => {
          if (Array.isArray(v)) {
            return v[0];
          }
          return v;
        }),
        catchError((err) => {
          console.error(err);
          return of({
            meta: {
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
          });
        }),
      )
      .subscribe((pluginInstance: any) => {
        this._pluginInstance.next({
          proxyAlias: pluginInstance.spec.proxy[0].alias,
          pluginName: pluginInstance.meta.name,
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

  private proxyUrl(requestPath: string): Observable<string> {
    return this._pluginInstance.pipe(
      first(),
      map((instance) => `/api/proxy/plugin/${instance.pluginName}/${instance.proxyAlias}/${requestPath}`),
    );
  }
}
