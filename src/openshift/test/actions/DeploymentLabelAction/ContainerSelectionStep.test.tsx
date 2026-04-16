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
import { ContainerSelectionStep } from '@console-plugin/actions/DeploymentLabelAction/ContainerSelectionStep';
import { Container, AGENT_ENV_VARS, LOG_LEVELS } from '@console-plugin/actions/DeploymentLabelAction/envVarUtils';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

jest.mock('@i18n/i18nextUtil', () => ({
  useCryostatTranslation: jest.fn(() => ({
    t: (key: string) => key,
  })),
}));

describe('ContainerSelectionStep', () => {
  const mockOnChange = jest.fn();

  const singleContainer: Container[] = [
    {
      name: 'app-container',
      image: 'quay.io/app:latest',
      env: [],
    },
  ];

  const multipleContainers: Container[] = [
    {
      name: 'app-container',
      image: 'quay.io/app:latest',
      env: [{ name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: 'Continuous' }],
    },
    {
      name: 'sidecar-container',
      image: 'quay.io/sidecar:v1',
      env: [],
    },
    {
      name: 'worker-container',
      image: 'quay.io/worker:latest',
      env: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Container', () => {
    it('should display auto-selected message for single container', () => {
      render(
        <ContainerSelectionStep containers={singleContainer} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      expect(screen.getByText('DEPLOYMENT_ACTION_CONTAINER_SINGLE_AUTO_SELECTED')).toBeInTheDocument();
    });

    it('should display container details for single container', () => {
      render(
        <ContainerSelectionStep containers={singleContainer} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      expect(screen.getByText('app-container')).toBeInTheDocument();
      expect(screen.getByText('quay.io/app:latest')).toBeInTheDocument();
    });

    it('should not display radio buttons for single container', () => {
      render(
        <ContainerSelectionStep containers={singleContainer} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      const radioButtons = screen.queryAllByRole('radio');
      expect(radioButtons).toHaveLength(0);
    });
  });

  describe('Multiple Containers', () => {
    it('should display selection instruction for multiple containers', () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      expect(screen.getByText('DEPLOYMENT_ACTION_CONTAINER_MUST_SELECT_ONE')).toBeInTheDocument();
    });

    it('should display radio buttons for all containers', () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons).toHaveLength(3);
    });

    it('should display container names as radio labels', () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      expect(screen.getByText('app-container')).toBeInTheDocument();
      expect(screen.getByText('sidecar-container')).toBeInTheDocument();
      expect(screen.getByText('worker-container')).toBeInTheDocument();
    });

    it('should display container images', () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      expect(screen.getByText('quay.io/app:latest')).toBeInTheDocument();
      expect(screen.getByText('quay.io/sidecar:v1')).toBeInTheDocument();
      expect(screen.getByText('quay.io/worker:latest')).toBeInTheDocument();
    });

    it('should display current agent config for containers', () => {
      render(
        <ContainerSelectionStep
          containers={multipleContainers}
          selectedContainerIndex={0}
          onChange={mockOnChange}
          logLevel={LOG_LEVELS.INFO}
          javaOptsVar="JAVA_TOOL_OPTIONS"
        />,
      );

      expect(screen.getByText('Harvester=Continuous, LogLevel=INFO')).toBeInTheDocument();
      expect(screen.getAllByText('LogLevel=INFO')).toHaveLength(2);
    });

    it('should check the selected container radio button', () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={1} onChange={mockOnChange} />,
      );

      const radioButtons = screen.getAllByRole('radio');
      expect(radioButtons[0]).not.toBeChecked();
      expect(radioButtons[1]).toBeChecked();
      expect(radioButtons[2]).not.toBeChecked();
    });

    it('should call onChange when a different container is selected', async () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      const radioButtons = screen.getAllByRole('radio');
      await userEvent.click(radioButtons[2]);

      expect(mockOnChange).toHaveBeenCalledWith(2);
    });

    it('should call onChange when clicking on an unselected container', async () => {
      render(
        <ContainerSelectionStep containers={multipleContainers} selectedContainerIndex={0} onChange={mockOnChange} />,
      );

      const radioButtons = screen.getAllByRole('radio');
      await userEvent.click(radioButtons[1]);

      expect(mockOnChange).toHaveBeenCalledWith(1);
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });
});
