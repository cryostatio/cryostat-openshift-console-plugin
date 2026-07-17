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
import storeHandler from '@openshift-console/dynamic-plugin-sdk/lib/app/storeHandler';
import { getImpersonate } from '@openshift-console/dynamic-plugin-sdk/lib/app/core/reducers/coreSelectors';

export const getCSRFToken = (): string => {
  const cookiePrefix = 'csrf-token=';
  return (
    document?.cookie
      ?.split(';')
      .map((c) => c.trim())
      .filter((c) => c.startsWith(cookiePrefix))
      .map((c) => c.slice(cookiePrefix.length))
      .pop() ?? ''
  );
};

export const getConsoleRequestHeaders = (): Record<string, string> => {
  const store = storeHandler.getStore();
  const headers: Record<string, string> = {
    'X-CSRFToken': getCSRFToken(),
  };
  if (!store) return headers;
  const { kind, name } = getImpersonate(store.getState()) || {};
  if ((kind === 'User' || kind === 'Group') && name) {
    headers['Impersonate-User'] = name;
    if (kind === 'Group') {
      headers['Impersonate-Group'] = name;
    }
  }
  return headers;
};
