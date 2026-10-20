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

import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';

// ClusterServiceVersionKind type extends K8sResourceKind:
// https://github.com/openshift/console/blob/main/frontend/packages/operator-lifecycle-manager/src/types.ts#L115
export function getOperatorCryostatVersion(namespace: string, csvs: K8sResourceKind[]) {
  let version = '';
  csvs.forEach((csv) => {
    if (csv.metadata?.name?.startsWith('cryostat-operator.') && csv.metadata?.namespace === namespace) {
      version = csv.spec?.version;
      return;
    }
  });
  return version;
}

export function isVersionEqualOrGreaterThan(currentVersion, targetVersion): boolean {
  // Versions could have -dev suffixes that need to be removed
  const versionRegex = /(\d\.{0,1}){3}/;
  const regexMatch = currentVersion.match(versionRegex);
  if (!regexMatch) {
    return false;
  }
  const currentDigits = regexMatch[0].split('.').map((d) => parseInt(d));
  const targetDigits = targetVersion.split('.').map((d) => parseInt(d));
  for (let i = 0; i < 3; i++) {
    if (currentDigits[i] > targetDigits[i]) {
      return true;
    } else if (currentDigits[i] < targetDigits[i]) {
      return false;
    }
  }
  return true;
}
