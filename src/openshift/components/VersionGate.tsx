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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import type { ServiceKind } from '@openshift/api-types/dist/kubernetes/core/v1';
import { K8sResourceKind, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import React from 'react';

export type CryostatVersion = {
  /** The resolved version, or the empty string if it could not be determined. */
  version: string;
  /** False while the version lookup is still in flight. */
  resolved: boolean;
};

/**
 * Resolves the Cryostat version of the instance currently selected in session storage. Helm-managed
 * instances carry the version as a Service label, while operator-managed instances take it from the
 * ClusterServiceVersion in the same namespace.
 *
 * Resolution completes once the watches the selected instance depends on have either loaded or
 * failed, so a version that cannot be determined is reported as resolved-but-empty rather than
 * being indistinguishable from a lookup that is still pending.
 *
 * This must be called from a page component, outside of CryostatContainer. The container renders its
 * children inside Cryostat Web's react-redux Provider, and react-redux is a singleton shared with the
 * Console, so a Console SDK hook called underneath that Provider resolves against Cryostat Web's store
 * instead of the Console's and fails on the Console's own state shape.
 */
export function useCryostatVersion(): CryostatVersion {
  const [sessionCryostatName, setSessionCryostatName] = React.useState(() => {
    return sessionStorage.getItem(SESSIONSTORAGE_SVC_NAME_KEY) || '';
  });
  const [sessionCryostatNs, setSessionCryostatNs] = React.useState(() => {
    return sessionStorage.getItem(SESSIONSTORAGE_SVC_NS_KEY) || '';
  });
  const [cryostats, cryostatsLoaded, cryostatsError] = useK8sWatchResource<ServiceKind[]>({
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
  const [csvs, csvsLoaded, csvsError] = useK8sWatchResource<K8sResourceKind[]>({
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

  return React.useMemo(() => {
    if (!cryostatsLoaded && !cryostatsError) {
      return { version: '', resolved: false };
    }

    const currentCryostat = cryostats.find(
      (cryostat) => cryostat.metadata?.name == sessionCryostatName && cryostat.metadata?.namespace == sessionCryostatNs,
    );
    const labels = currentCryostat?.metadata?.labels;

    if (labels && labels['app.kubernetes.io/managed-by'] == 'Helm') {
      return { version: labels['app.kubernetes.io/version'] || '', resolved: true };
    }

    // Operator-managed instances carry no version label, so the ClusterServiceVersion watch must
    // settle before the absence of a version can be treated as conclusive.
    if (!csvsLoaded && !csvsError) {
      return { version: '', resolved: false };
    }

    return { version: getOperatorCryostatVersion(sessionCryostatNs, csvs), resolved: true };
  }, [cryostats, cryostatsLoaded, cryostatsError, sessionCryostatName, sessionCryostatNs, csvs, csvsLoaded, csvsError]);
}

export type VersionGateProps = {
  /** The result of useCryostatVersion, which the page must resolve outside of CryostatContainer. */
  cryostatVersion: CryostatVersion;
  requiredVersion: string;
  children: React.ReactNode;
};

/**
 * Renders its children only if the selected Cryostat instance is at least requiredVersion, showing a
 * loading indicator while the version is being resolved and a FeatureNotAvailablePage if the selected
 * instance is too old to serve the feature. An instance whose version cannot be determined at all is
 * treated as unsupported, so that an unresolvable lookup does not leave the page loading forever.
 *
 * The version is taken as a prop rather than resolved here so that this can be rendered inside
 * CryostatContainer while the Console SDK watches that back it run outside of it. See
 * useCryostatVersion.
 */
export const VersionGate: React.FC<VersionGateProps> = ({ cryostatVersion, requiredVersion, children }) => {
  const { t } = useCryostatTranslation();
  const { version, resolved } = cryostatVersion;

  if (!resolved) {
    return <LoadingState />;
  }
  if (!version || !isVersionEqualOrGreaterThan(version, requiredVersion)) {
    return (
      <FeatureNotAvailablePage currentVersion={version || t('UNKNOWN_VERSION')} requiredVersion={requiredVersion} />
    );
  }
  return <>{children}</>;
};
