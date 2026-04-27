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
import { DeploymentLabelActionModal } from '@console-plugin/actions/DeploymentLabelAction/DeploymentLabelActionModal';
import {
  mockCryostatList,
  mockDeploymentWithHelmLabels,
  mockDeploymentWithLabels,
  mockDeploymentWithoutLabels,
  mockOperatorCryostatList,
  mockOperatorCryostatListWithoutTargetNamespaces,
} from '@console-plugin/test/utils';
import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { K8sModel, useAccessReview, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('@i18n/i18nextUtil', () => ({
  useCryostatTranslation: jest.fn(() => ({
    t: (key: string) => `${key}`,
  })),
}));

jest.mock('@openshift-console/dynamic-plugin-sdk', () => ({
  useAccessReview: jest.fn(),
  useK8sWatchResource: jest.fn(),
}));

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sPatchResource: jest.fn(),
  isUtilsConfigSet: jest.fn(() => true),
}));

const mockDeploymentModel = {
  kind: 'Deployment',
} as K8sModel;

describe('DeploymentLabelActionModal', () => {
  // Note: the following functions return similar but different second boolean values, loaded vs. loading respectively
  const useK8sWatchResourceMock = useK8sWatchResource as jest.Mock;
  const useAccessReviewMock = useAccessReview as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useAccessReviewMock.mockReturnValue([true, false]);
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
    renderModal(mockDeploymentWithoutLabels);
    const selectElement = screen.getByLabelText('Cryostat Instance Selection');
    expect(selectElement).toHaveValue('-1');
  });

  it('should display the selected Cryostat if labels exist on the deployment', async () => {
    renderModal(mockDeploymentWithLabels);
    const selectElement = screen.getByLabelText('Cryostat Instance Selection');
    expect(selectElement).toHaveValue('0');
  });

  it('should display helper text if lacking permissions to update the deployment', async () => {
    useAccessReviewMock.mockReturnValue([false, false]);
    renderModal(mockDeploymentWithLabels);
    expect(screen.getByText('DEPLOYMENT_ACTION_NO_UPDATE_PERMISSIONS')).toBeInTheDocument();
  });

  it('should display helper text if deployment namespace is not in Cryostat target namespaces', async () => {
    useK8sWatchResourceMock.mockImplementation((resource) => {
      if (resource.groupVersionKind.kind === 'Service') {
        return [mockCryostatList, true];
      }
      if (resource.groupVersionKind.kind === 'Cryostat') {
        return [mockOperatorCryostatListWithoutTargetNamespaces, true];
      }
      return [{}, false];
    });
    renderModal(mockDeploymentWithLabels);
    expect(screen.getByText('DEPLOYMENT_ACTION_NAMESPACE_NOT_A_TARGET_NAMESPACE')).toBeInTheDocument();
  });

  it('should disable the next button and display helper text if selecting a helm Cryostat', async () => {
    renderModal(mockDeploymentWithHelmLabels);
    const selectElement = screen.getByLabelText('Cryostat Instance Selection');
    expect(selectElement).toHaveValue('1');
    expect(screen.getByText('DEPLOYMENT_ACTION_HELM_CRYOSTAT_SELECTED')).toBeInTheDocument();
  });

  it('should call k8sPatchResource to add labels and env vars when completing wizard', async () => {
    renderModal(mockDeploymentWithoutLabels);

    const select = screen.getByLabelText('Cryostat Instance Selection');
    expect(select).toHaveValue('-1');

    await userEvent.selectOptions(select, '0');
    await waitFor(() => {
      expect(select).toHaveValue('0');
    });

    const nextButtons = screen.getAllByRole('button', { name: /next/i });
    if (nextButtons.length > 0) {
      for (const button of nextButtons) {
        await userEvent.click(button);
      }
    }

    const finishButton = screen.queryByRole('button', { name: /finish|submit/i });
    if (finishButton) {
      await userEvent.click(finishButton);
      expect(k8sPatchResource).toHaveBeenCalled();

      const callArgs = (k8sPatchResource as jest.Mock).mock.calls[0][0];
      expect(callArgs.model).toEqual(mockDeploymentModel);
      expect(callArgs.queryOptions).toEqual({ name: 'test-app', ns: 'test-namespace' });

      const patches = callArgs.patches;
      expect(patches).toEqual(
        expect.arrayContaining([
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
        ]),
      );

      expect(patches.some((p) => p.path?.includes('/env'))).toBe(true);
    }
  });

  it('should call k8sPatchResource to remove labels when selecting the empty option', async () => {
    renderModal(mockDeploymentWithLabels);

    const selectElement = screen.getByLabelText('Cryostat Instance Selection');
    expect(selectElement).toHaveValue('0');

    await userEvent.selectOptions(selectElement, '-1');
    await waitFor(() => {
      expect(selectElement).toHaveValue('-1');
    });

    const nextButtons = screen.queryAllByRole('button', { name: /next/i });
    if (nextButtons.length > 0) {
      for (const button of nextButtons) {
        await userEvent.click(button);
      }
    }

    const finishButton = screen.queryByRole('button', { name: /finish|submit/i });
    if (finishButton) {
      await userEvent.click(finishButton);
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
    }
  });

  it('should display wizard steps', async () => {
    renderModal(mockDeploymentWithoutLabels);

    const stepElements = screen.queryAllByText('DEPLOYMENT_ACTION_WIZARD_STEP_INSTANCE');
    expect(stepElements.length).toBeGreaterThan(0);
  });

  it('should display Quick Register button on first step', async () => {
    renderModal(mockDeploymentWithoutLabels);

    const select = screen.getByLabelText('Cryostat Instance Selection');
    await userEvent.selectOptions(select, '0');

    await waitFor(() => {
      expect(screen.getByText('DEPLOYMENT_ACTION_QUICK_REGISTER')).toBeInTheDocument();
    });
  });

  it('should include callback port label when set in wizard', async () => {
    renderModal(mockDeploymentWithoutLabels);

    const select = screen.getByLabelText('Cryostat Instance Selection');
    await userEvent.selectOptions(select, '0');
    await waitFor(() => {
      expect(select).toHaveValue('0');
    });

    // Navigate through wizard steps to Agent Configuration
    let nextButton = screen.queryByRole('button', { name: /next/i });
    while (nextButton) {
      await userEvent.click(nextButton);
      // Wait a bit for the step to change
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if we're on the Agent Configuration step by looking for the callback port field
      const callbackPortInput = screen.queryByRole('spinbutton', { name: '' });
      if (callbackPortInput) {
        // Found the callback port field, set its value
        await userEvent.clear(callbackPortInput);
        await userEvent.type(callbackPortInput, '8080');
        break;
      }

      nextButton = screen.queryByRole('button', { name: /next/i });
    }

    // Continue to finish
    nextButton = screen.queryByRole('button', { name: /next/i });
    while (nextButton) {
      await userEvent.click(nextButton);
      nextButton = screen.queryByRole('button', { name: /next/i });
    }

    const finishButton = screen.queryByRole('button', { name: /finish|submit/i });
    if (finishButton) {
      await userEvent.click(finishButton);
      expect(k8sPatchResource).toHaveBeenCalled();

      const callArgs = (k8sPatchResource as jest.Mock).mock.calls[0][0];
      const patches = callArgs.patches;

      // Verify callback port patch is included
      expect(patches).toEqual(
        expect.arrayContaining([
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1callback-port',
            value: '8080',
          },
        ]),
      );
    }
  });

  it('should NOT include callback port label in Quick Register', async () => {
    renderModal(mockDeploymentWithoutLabels);

    const select = screen.getByLabelText('Cryostat Instance Selection');
    await userEvent.selectOptions(select, '0');
    await waitFor(() => {
      expect(select).toHaveValue('0');
    });

    // Click Quick Register button
    const quickRegisterButton = screen.getByText('DEPLOYMENT_ACTION_QUICK_REGISTER');
    await userEvent.click(quickRegisterButton);

    await waitFor(() => {
      expect(k8sPatchResource).toHaveBeenCalled();
    });

    const callArgs = (k8sPatchResource as jest.Mock).mock.calls[0][0];
    const patches = callArgs.patches;

    // Verify callback port patch is NOT included
    const hasCallbackPortPatch = patches.some((p) => p.path?.includes('callback-port'));
    expect(hasCallbackPortPatch).toBe(false);
  });

  it('should remove callback port label when deployment has it and user selects empty option', async () => {
    const deploymentWithCallbackPort = {
      ...mockDeploymentWithLabels,
      spec: {
        ...mockDeploymentWithLabels.spec,
        template: {
          ...mockDeploymentWithLabels.spec?.template,
          metadata: {
            ...mockDeploymentWithLabels.spec?.template?.metadata,
            labels: {
              ...mockDeploymentWithLabels.spec?.template?.metadata?.labels,
              'cryostat.io/callback-port': '8080',
            },
          },
        },
      },
    };

    renderModal(deploymentWithCallbackPort);

    const selectElement = screen.getByLabelText('Cryostat Instance Selection');
    expect(selectElement).toHaveValue('0');

    await userEvent.selectOptions(selectElement, '-1');
    await waitFor(() => {
      expect(selectElement).toHaveValue('-1');
    });

    const nextButtons = screen.queryAllByRole('button', { name: /next/i });
    if (nextButtons.length > 0) {
      for (const button of nextButtons) {
        await userEvent.click(button);
      }
    }

    const finishButton = screen.queryByRole('button', { name: /finish|submit/i });
    if (finishButton) {
      await userEvent.click(finishButton);
      expect(k8sPatchResource).toHaveBeenCalled();

      const callArgs = (k8sPatchResource as jest.Mock).mock.calls[0][0];
      const patches = callArgs.patches;

      // Verify callback port removal patch is included
      expect(patches).toEqual(
        expect.arrayContaining([
          {
            op: 'remove',
            path: '/spec/template/metadata/labels/cryostat.io~1callback-port',
          },
        ]),
      );
    }
  });
});
