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
import { VersionGate } from '@console-plugin/components/VersionGate';
import { getOperatorCryostatVersion, isVersionEqualOrGreaterThan } from '@console-plugin/utils/utils';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { mockCryostatList } from '../utils';

jest.mock('@i18n/i18nextUtil', () => ({
  useCryostatTranslation: jest.fn(() => ({
    t: (key: string) => `${key}`,
  })),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
}));

jest.mock('@console-plugin/components/CryostatContainer', () => ({
  LoadingState: () => <div data-testid="loading-state-mock" />,
  SESSIONSTORAGE_SVC_NAME_KEY: 'mock-name-key',
  SESSIONSTORAGE_SVC_NS_KEY: 'mock-ns-key',
}));

jest.mock('@console-plugin/utils/utils', () => ({
  getOperatorCryostatVersion: jest.fn(),
  isVersionEqualOrGreaterThan: jest.fn(),
}));

const helmCryostat = {
  metadata: {
    name: 'cryostat-helm',
    namespace: 'cryostat-helm-ns',
    labels: {
      'app.kubernetes.io/managed-by': 'Helm',
      'app.kubernetes.io/version': '4.2.0',
    },
  },
};

describe('VersionGate', () => {
  const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
  const mockIsVersionEqualOrGreaterThan = isVersionEqualOrGreaterThan as jest.Mock;
  const mockGetOperatorCryostatVersion = getOperatorCryostatVersion as jest.Mock;

  const watchServices = (services: unknown[]) => {
    useK8sWatchResourceMock.mockImplementation((resource) => {
      if (resource.groupVersionKind.kind === 'Service') {
        return [services, true];
      }
      return [{}, false];
    });
  };

  const selectInstance = (name: string, namespace: string) => {
    sessionStorage.setItem('mock-name-key', name);
    sessionStorage.setItem('mock-ns-key', namespace);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    watchServices(mockCryostatList);
  });

  it('should display a loading state while the version is unknown', () => {
    render(
      <VersionGate requiredVersion={'4.2.0'}>
        <div data-testid="gated-content-mock" />
      </VersionGate>,
    );

    expect(screen.getByTestId('loading-state-mock')).toBeInTheDocument();
    expect(screen.queryByTestId('gated-content-mock')).not.toBeInTheDocument();
  });

  it('should display the children when the operator-managed instance is new enough', () => {
    selectInstance('cryostat-operator', 'cryostat-operator-ns');
    mockGetOperatorCryostatVersion.mockReturnValue('4.2.0');
    mockIsVersionEqualOrGreaterThan.mockReturnValue(true);

    render(
      <VersionGate requiredVersion={'4.2.0'}>
        <div data-testid="gated-content-mock" />
      </VersionGate>,
    );

    expect(screen.getByTestId('gated-content-mock')).toBeInTheDocument();
    expect(mockIsVersionEqualOrGreaterThan).toHaveBeenCalledWith('4.2.0', '4.2.0');
  });

  it('should read the version from the Service labels of a Helm-managed instance', () => {
    watchServices([helmCryostat]);
    selectInstance('cryostat-helm', 'cryostat-helm-ns');
    mockIsVersionEqualOrGreaterThan.mockReturnValue(true);

    render(
      <VersionGate requiredVersion={'4.2.0'}>
        <div data-testid="gated-content-mock" />
      </VersionGate>,
    );

    expect(screen.getByTestId('gated-content-mock')).toBeInTheDocument();
    expect(mockGetOperatorCryostatVersion).not.toHaveBeenCalled();
    expect(mockIsVersionEqualOrGreaterThan).toHaveBeenCalledWith('4.2.0', '4.2.0');
  });

  it('should display a Feature Unavailable page when the instance is too old', () => {
    selectInstance('cryostat-operator', 'cryostat-operator-ns');
    mockGetOperatorCryostatVersion.mockReturnValue('4.1.0');
    mockIsVersionEqualOrGreaterThan.mockReturnValue(false);

    render(
      <VersionGate requiredVersion={'4.2.0'}>
        <div data-testid="gated-content-mock" />
      </VersionGate>,
    );

    expect(screen.getByText('FEATURE_NOT_AVAILABLE_PAGE_TITLE')).toBeInTheDocument();
    expect(screen.queryByTestId('gated-content-mock')).not.toBeInTheDocument();
  });
});
