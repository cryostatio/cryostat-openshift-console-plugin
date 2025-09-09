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
import { UtilsConfig, WebSocketAppSettings } from '@openshift/dynamic-plugin-sdk-utils';
import { getCSRFToken } from '@openshift-console/dynamic-plugin-sdk/lib/utils/fetch/console-fetch-utils';
import * as _ from 'lodash';

// See: https://github.com/openshift/console/blob/main/frontend/public/co-fetch.ts
export const CryostatPluginUtilsConfig: UtilsConfig = {
  appFetch: async function (url: string, options: RequestInit): Promise<Response> {
    url = `/api/kubernetes${url}`;
    const token = getCSRFToken();
    if (options?.headers) {
      options.headers['X-CSRFToken'] = token;
    } else {
      options.headers = { 'X-CSRFToken': token };
    }
    // X-CSRFToken is used only for non-GET requests targeting bridge
    if (options.method === 'GET' || url.indexOf('://') >= 0) {
      delete options.headers['X-CSRFToken'];
    }
    const initDefaults = {
      headers: {},
      credentials: 'same-origin',
    };
    const allOptions = _.defaultsDeep({}, initDefaults, options);
    return await fetch(url, allOptions).then((resp) => validateStatus(resp));
  },
  wsAppSettings: function (): Promise<WebSocketAppSettings> {
    throw new Error('Function not implemented.');
  },
};

/**
 * Validates the response before resolving the Promise
 * Required as per the UtilsConfig documentation in console-dynamic-plugin-sdk
 * See: https://github.com/openshift/console/blob/main/frontend/packages/console-dynamic-plugin-sdk/src/app/configSetup.ts
 */
const validateStatus = async (response: Response) => {
  if (response.ok) {
    return response;
  }

  if (response.status === 429) {
    throw new Error();
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || contentType.indexOf('json') === -1) {
    throw new Error(response.statusText);
  }

  if (response.status === 403) {
    return response.json().then((json) => {
      throw new Error(json.message || 'Access denied due to cluster policy.');
    });
  }

  return response.json().then((json) => {
    // retry 409 conflict errors due to ClustResourceQuota / ResourceQuota
    // https://bugzilla.redhat.com/show_bug.cgi?id=1920699
    if (
      // method === 'POST' &&
      response.status === 409 &&
      ['resourcequotas', 'clusterresourcequotas'].includes(json.details?.kind)
    ) {
      throw new Error();
    }
    const cause = json.details?.causes?.[0];
    let reason;
    if (cause) {
      reason = `Error "${cause.message}" for field "${cause.field}".`;
    }
    if (!reason) {
      reason = json.message;
    }
    if (!reason) {
      reason = json.error;
    }
    if (!reason) {
      reason = response.statusText;
    }
    throw new Error(reason);
  });
};
