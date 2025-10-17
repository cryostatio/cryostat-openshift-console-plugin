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
import { CaptureDiagnostics } from '@app/Diagnostics/CaptureDiagnostics';
import {
  CryostatContainer,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
} from '@console-plugin/components/CryostatContainer';
import '@app/app.css';
import { K8sResourceKind, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import React from 'react';
import { FeatureNotAvailablePage } from './FeatureNotAvailablePage';

export default function DiagnosticsPage() {
  const [sessionCryostatName, setSessionCryostatName] = React.useState(() => {
    return sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY);
  });
  const [sessionCryostatNs, setSessionCryostatNs] = React.useState(() => {
    return sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY);
  });
  const [version, setVersion] = React.useState('');
  const [cryostats, cryostatsLoaded] = useK8sWatchResource<K8sResourceKind[]>({
    groupVersionKind: {
      group: '',
      kind: 'Service',
      version: 'v1',
    },
    selector: {
      matchLabels: {
        'app.kubernetes.io/part-of': 'cryostat',
        'app.kubernetes.io/component': 'cryostat',
      },
    },
    isList: true,
  });
  const [csvs, csvsLoaded] = useK8sWatchResource<K8sResourceKind[]>({
    groupVersionKind: {
      group: 'operators.coreos.com',
      kind: 'ClusterServiceVersion',
      version: 'v1alpha1',
    },
    isList: true,
  });

  React.useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === SESSIONSTORAGE_SVC_NAME_KEY && event.newValue !== sessionCryostatName) {
        setSessionCryostatName(event.newValue);
      }
      if (event.key === SESSIONSTORAGE_SVC_NS_KEY && event.newValue !== sessionCryostatNs) {
        setSessionCryostatNs(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
  }, [sessionCryostatName, sessionCryostatNs]);

  React.useEffect(() => {
    const currentCryostat = cryostats.find(
      (cryostat) => cryostat.metadata?.name == sessionCryostatName && cryostat.metadata?.namespace == sessionCryostatNs,
    );

    if ((!cryostatsLoaded && !csvsLoaded) || !currentCryostat) {
      return;
    }

    if (
      currentCryostat.metadata?.labels &&
      currentCryostat.metadata?.labels['app.kubernetes.io/managed-by'] == 'Helm'
    ) {
      setVersion(currentCryostat.metadata?.labels['app.kubernetes.io/version']);
    } else {
      // ClusterServiceVersionKind type extends K8sResourceKind:
      // https://github.com/openshift/console/blob/main/frontend/packages/operator-lifecycle-manager/src/types.ts#L115
      csvs.forEach((csv) => {
        if (csv.metadata?.name?.startsWith('cryostat-operator.') && csv.metadata?.namespace === sessionCryostatNs) {
          setVersion(csv.spec?.version);
          return;
        }
      });
    }
  }, [cryostats, cryostatsLoaded, version, sessionCryostatName, sessionCryostatNs, csvs, csvsLoaded]);

  return (
    <CryostatContainer>
      {version !== '4.1.0' ? (
        <FeatureNotAvailablePage currentVersion={version} requiredVersion={'4.1.0'}></FeatureNotAvailablePage>
      ) : (
        <CaptureDiagnostics></CaptureDiagnostics>
      )}
    </CryostatContainer>
  );
}
