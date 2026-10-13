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
import {
  LoadingState,
  SESSIONSTORAGE_SVC_NAME_KEY,
  SESSIONSTORAGE_SVC_NS_KEY,
} from '@console-plugin/components/CryostatContainer';
import { FeatureNotAvailablePage } from '@console-plugin/pages/FeatureNotAvailablePage';
import { getOperatorCryostatVersion, isVersionEqualOrGreaterThan } from '@console-plugin/utils/utils';
import type { ServiceKind } from '@openshift/api-types/dist/kubernetes/core/v1';
import { K8sResourceKind, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import React from 'react';

/**
 * Resolves the Cryostat version of the instance currently selected in session storage. Helm-managed
 * instances carry the version as a Service label, while operator-managed instances take it from the
 * ClusterServiceVersion in the same namespace. Returns the empty string until the version is known.
 */
export function useCryostatVersion(): string {
  const [sessionCryostatName, setSessionCryostatName] = React.useState(() => {
    return sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY) || '';
  });
  const [sessionCryostatNs, setSessionCryostatNs] = React.useState(() => {
    return sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY) || '';
  });
  const [version, setVersion] = React.useState('');
  const [cryostats, cryostatsLoaded] = useK8sWatchResource<ServiceKind[]>({
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
    return () => window.removeEventListener('storage', handleStorageChange);
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
      setVersion(getOperatorCryostatVersion(sessionCryostatNs, csvs));
    }
  }, [cryostats, cryostatsLoaded, version, sessionCryostatName, sessionCryostatNs, csvs, csvsLoaded]);

  return version;
}

export type VersionGateProps = {
  requiredVersion: string;
  children: React.ReactNode;
};

/**
 * Renders its children only if the selected Cryostat instance is at least requiredVersion, showing a
 * loading indicator while the version is being resolved and a FeatureNotAvailablePage if the selected
 * instance is too old to serve the feature.
 */
export const VersionGate: React.FC<VersionGateProps> = ({ requiredVersion, children }) => {
  const version = useCryostatVersion();

  if (!version) {
    return <LoadingState />;
  }
  if (!isVersionEqualOrGreaterThan(version, requiredVersion)) {
    return <FeatureNotAvailablePage currentVersion={version} requiredVersion={requiredVersion} />;
  }
  return <>{children}</>;
};
