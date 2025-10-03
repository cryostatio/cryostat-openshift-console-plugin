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
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sModel, K8sResourceKind, useAccessReview, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeploymentLabelActionModal } from './DeploymentLabelActionModal';
import '@testing-library/jest-dom';

jest.mock('@i18n/i18nextUtil', () => ({
  useCryostatTranslation: jest.fn(() => ({
    t: (key: string) => `${key}`,
  })),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useK8sWatchResource: jest.fn(),
  useAccessReview: jest.fn(),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sPatchResource: jest.fn(),
  isUtilsConfigSet: jest.fn(() => true),
}));

const mockDeploymentModel = {
  kind: 'Deployment',
} as K8sModel;

const mockDeploymentWithLabels = {
  metadata: { name: 'test-app', namespace: 'test-namespace' },
  spec: {
    template: {
      metadata: {
        labels: {
          'cryostat.io/name': 'cryostat-operator',
          'cryostat.io/namespace': 'cryostat-operator-ns',
        },
      },
    },
  },
} as K8sResourceKind;

const mockDeploymentWithHelmLabels = {
  metadata: { name: 'test-app', namespace: 'test-namespace' },
  spec: {
    template: {
      metadata: {
        labels: {
          'cryostat.io/name': 'cryostat-helm',
          'cryostat.io/namespace': 'cryostat-helm-ns',
        },
      },
    },
  },
} as K8sResourceKind;

const mockDeploymentWithoutLabels = {
  metadata: { name: 'test-app', namespace: 'test-namespace' },
  spec: { template: { metadata: { labels: {} } } },
} as K8sResourceKind;

const mockCryostatList = [
  { metadata: { name: 'cryostat-operator', namespace: 'cryostat-operator-ns' } },
  { metadata: { name: 'cryostat-helm', namespace: 'cryostat-helm-ns' } },
] as K8sResourceKind[];

const mockOperatorCryostatList = [
  {
    metadata: { name: 'cryostat-operator', namespace: 'cryostat-operator-ns' },
    spec: { targetNamespaces: ['test-namespace'] },
  },
] as K8sResourceKind[];

describe('DeploymentLabelActionModal', () => {
  // Note: the following functions return similar but different second boolean values, loaded vs. loading respectively
  const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
  const useAccessReviewMock = useAccessReview as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useK8sWatchResourceMock.mockImplementation((resource) => {
      if (resource.groupVersionKind.kind === 'Service') {
        return [mockCryostatList, true];
      }
      if (resource.groupVersionKind.kind === 'Cryostat') {
        return [mockOperatorCryostatList, true];
      }
      return [{}, false];
    });
  });

  function renderModal(mockDeploymentResource) {
    render(
      <DeploymentLabelActionModal
        kind={mockDeploymentModel}
        resource={mockDeploymentResource}
        isOpen={true}
        closeModal={jest.fn()}
      />,
    );
  }

  it('should display the default option if the deployment has no labels', async () => {
    useAccessReviewMock.mockReturnValue([true, false]);
    renderModal(mockDeploymentWithoutLabels);
    const selectElement = screen.getByLabelText('Cryostat Deployment Action FormSelect Input');
    expect(selectElement).toHaveValue('-1');
  });

  it('should display the selected Cryostat if labels exist on the deployment', async () => {
    useAccessReviewMock.mockReturnValue([true, false]);
    renderModal(mockDeploymentWithLabels);
    const selectElement = screen.getByLabelText('Cryostat Deployment Action FormSelect Input');
    expect(selectElement).toHaveValue('0');
  });

  it('should disable the submit button and display helper text if lacking permissions to update the deployment', async () => {
    useAccessReviewMock.mockReturnValue([false, false]);
    renderModal(mockDeploymentWithLabels);
    expect(screen.getByText('SUBMIT')).toBeDisabled();
    expect(screen.getByText('DEPLOYMENT_ACTION_NO_UPDATE_PERMISSIONS')).toBeInTheDocument();
  });

  it('should disable the submit button and display helper text if selecting a helm Cryostat', async () => {
    useAccessReviewMock.mockReturnValue([true, false]);
    renderModal(mockDeploymentWithHelmLabels);
    const selectElement = screen.getByLabelText('Cryostat Deployment Action FormSelect Input');
    expect(selectElement).toHaveValue('1');
    expect(screen.getByText('SUBMIT')).toBeDisabled();
    expect(screen.getByText('DEPLOYMENT_ACTION_HELM_CRYOSTAT_SELECTED')).toBeInTheDocument();
  });

  it('should call k8sPatchResource to add labels when selecting a valid Cryostat', async () => {
    useAccessReviewMock.mockReturnValue([true, false]);
    renderModal(mockDeploymentWithoutLabels);

    const select = screen.getByLabelText('Cryostat Deployment Action FormSelect Input');
    expect(select).toHaveValue('-1');

    await userEvent.selectOptions(select, '0');
    await waitFor(() => {
      expect(select).toHaveValue('0');
    });

    await userEvent.click(screen.getByText('SUBMIT'));
    expect(k8sPatchResource).toHaveBeenCalledTimes(1);
    expect(k8sPatchResource).toHaveBeenCalledWith({
      model: mockDeploymentModel,
      queryOptions: { name: 'test-app', ns: 'test-namespace' },
      patches: [
        {
          op: 'replace',
          path: '/spec/template/metadata/labels/cryostat.io~1name',
          value: 'cryostat-operator',
        },
        {
          op: 'replace',
          path: '/spec/template/metadata/labels/cryostat.io~1namespace',
          value: 'cryostat-operator-ns',
        },
      ],
    });
  });

  it('should call k8sPatchResource to remove labels when selecting the empty option', async () => {
    useAccessReviewMock.mockReturnValue([true, false]);
    renderModal(mockDeploymentWithLabels);

    const selectElement = screen.getByLabelText('Cryostat Deployment Action FormSelect Input');
    expect(selectElement).toHaveValue('0');

    await userEvent.selectOptions(selectElement, '-1');
    await waitFor(() => {
      expect(selectElement).toHaveValue('-1');
    });

    await userEvent.click(screen.getByText('SUBMIT'));
    expect(k8sPatchResource).toHaveBeenCalledTimes(1);
    expect(k8sPatchResource).toHaveBeenCalledWith({
      model: mockDeploymentModel,
      queryOptions: { name: 'test-app', ns: 'test-namespace' },
      patches: [
        {
          op: 'remove',
          path: '/spec/template/metadata/labels/cryostat.io~1name',
        },
        {
          op: 'remove',
          path: '/spec/template/metadata/labels/cryostat.io~1namespace',
        },
      ],
    });
  });
});
