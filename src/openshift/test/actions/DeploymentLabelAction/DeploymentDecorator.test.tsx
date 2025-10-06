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
import DeploymentDecorator from '@console-plugin/actions/DeploymentLabelAction/DeploymentDecorator';
import {
  mockOperatorCryostatList,
  mockDeploymentWithLabels,
  mockDeploymentWithoutLabels,
} from '@console-plugin/test/utils';
import { k8sGet, K8sModel, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  k8sGet: jest.fn(),
  useK8sModel: jest.fn(() => ({}) as K8sModel),
  useK8sWatchResource: jest.fn(),
}));

const mockRoute = {
  status: {
    ingress: [{ host: 'route-to-test-cryostat.com' }],
  },
};

describe('DeploymentDecorator', () => {
  const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
  const k8sGetMock = k8sGet as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    k8sGetMock.mockResolvedValue(mockRoute);
  });

  const setupWatchResourceMock = (mockDeployment, mockCryostats) => {
    useK8sWatchResourceMock.mockImplementation((resource) => {
      if (resource.groupVersionKind.kind === 'Deployment') {
        return [mockDeployment, true];
      }
      if (resource.groupVersionKind.kind === 'Cryostat') {
        return [mockCryostats, true];
      }
      return [{}, false];
    });
  };

  function renderDecorator() {
    const props = {
      element: {
        resourceKind: 'apps~v1~Deployment',
        resource: {
          metadata: {
            name: 'test-app',
            namespace: 'test-namespace',
          },
        },
      },
      radius: 7,
      x: 10,
      y: 10,
    } as any;

    render(
      <svg>
        <DeploymentDecorator {...props} />
      </svg>,
    );
  }

  it('should not display if the deployment has no Cryostat labels', async () => {
    setupWatchResourceMock(mockDeploymentWithoutLabels, mockOperatorCryostatList);
    renderDecorator();
    expect(() => screen.getByLabelText('Open Cryostat')).toThrow();
  });

  it('should display if the deployment has valid Cryostat labels', async () => {
    setupWatchResourceMock(mockDeploymentWithLabels, mockOperatorCryostatList);
    renderDecorator();
    const decorator = screen.getByLabelText('Open Cryostat');
    expect(decorator).toBeInTheDocument();
    expect(() => screen.getByLabelText('Warning Icon')).toThrow();
  });
});
