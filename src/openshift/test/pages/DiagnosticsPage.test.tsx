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
import DiagnosticsPage from '@console-plugin/pages/DiagnosticsPage';
import { getOperatorCryostatVersion, isVersionEqualOrGreaterThan } from '@console-plugin/utils/utils';
import { K8sModel, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { mockCryostatList } from '../utils';

jest.mock('@i18n/i18nextUtil', () => ({
  useCryostatTranslation: jest.fn(() => ({
    t: (key: string) => `${key}`,
  })),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sGet: jest.fn(() => ({
    model: 'mock-model',
    name: 'mock-plugin',
  })),
  useActiveNamespace: jest.fn(() => ['mock-namespace', true]),
  useK8sModel: jest.fn(() => ({}) as K8sModel),
  useK8sWatchResource: jest.fn(),
}));

jest.mock('@console-plugin/components/CryostatContainer', () => ({
  CryostatContainer: ({ children }) => <div data-testid="cryostat-container-mock">{children}</div>,
  LoadingState: () => <div data-testid="loading-state-mock" />,
  SESSIONSTORAGE_SVC_NAME_KEY: 'mock-name-key',
  SESSIONSTORAGE_SVC_NS_KEY: 'mock-ns-key',
}));

jest.mock('@console-plugin/utils/utils', () => ({
  getOperatorCryostatVersion: jest.fn(),
  isVersionEqualOrGreaterThan: jest.fn(),
}));

describe('DiagnosticsPage', () => {
  const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
  const mockIsVersionEqualOrGreaterThan = isVersionEqualOrGreaterThan as jest.Mock;
  const mockGetOperatorCryostatVersion = getOperatorCryostatVersion as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useK8sWatchResourceMock.mockImplementation((resource) => {
      if (resource.groupVersionKind.kind === 'Service') {
        return [mockCryostatList, true];
      }
      return [{}, false];
    });
  });

  it('should display content if the Cryostat version is greater than or equal to 4.1.0', async () => {
    sessionStorage.setItem('mock-name-key', 'cryostat-operator');
    sessionStorage.setItem('mock-ns-key', 'cryostat-operator-ns');
    mockGetOperatorCryostatVersion.mockReturnValue('4.1.0');
    mockIsVersionEqualOrGreaterThan.mockReturnValue(true);
    render(<DiagnosticsPage />);
    expect(screen.getByText('Diagnostics')).toBeInTheDocument();
  });

  it('should display a Feature Unavailable page if the version is less than 4.1.0', async () => {
    sessionStorage.setItem('mock-name-key', 'cryostat-operator');
    sessionStorage.setItem('mock-ns-key', 'cryostat-operator-ns');
    mockGetOperatorCryostatVersion.mockReturnValue('4.0.0');
    mockIsVersionEqualOrGreaterThan.mockReturnValue(false);
    render(<DiagnosticsPage />);
    expect(screen.getByText('FEATURE_NOT_AVAILABLE_PAGE_TITLE')).toBeInTheDocument();
  });
});
