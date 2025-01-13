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
import { from, of, Observable } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { consoleFetch } from '@openshift-console/dynamic-plugin-sdk';

export class ApiService {
  status(): Observable<string> {
    const url = this.proxyUrl('health');
    return from(
      consoleFetch(url.toString(), {
        method: 'GET',
        redirect: 'follow',
      }),
    ).pipe(
      concatMap((resp: Response) => (resp.ok ? resp.text() : of(resp.statusText))),
      catchError((err) => {
        console.error(err);
        return JSON.stringify(err);
      }),
    );
  }

  cryostat(ns: string, name: string, method: string, requestPath: string, body?: object): Observable<string> {
    const url = this.proxyUrl(`upstream/${requestPath}`);
    return from(
      consoleFetch(url.toString(), {
        method,
        redirect: 'follow',
        headers: {
          'CRYOSTAT-SVC-NS': ns,
          'CRYOSTAT-SVC-NAME': name,
        },
      }),
    ).pipe(
      concatMap((resp: Response) => (resp.ok ? resp.text() : of(resp.statusText))),
      catchError((err) => {
        console.error(err);
        return JSON.stringify(err);
      }),
    );
  }

  private proxyUrl(requestPath: string): string {
    const pluginName = 'cryostat-plugin'; // this must match the consolePlugin.name in package.json
    const proxyAlias = 'cryostat-plugin-proxy'; // this must match the .spec.proxy.alias in the ConsolePlugin CR
    const url = `/api/proxy/plugin/${pluginName}/${proxyAlias}/${requestPath}`;
    return url;
  }
}
