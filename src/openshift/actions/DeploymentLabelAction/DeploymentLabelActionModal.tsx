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
import { CryostatPluginUtilsConfig } from '@console-plugin/utils/CryostatPluginUtilsConfig';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { isUtilsConfigSet, k8sPatchResource, setUtilsConfig } from '@openshift/dynamic-plugin-sdk-utils';
import {
  K8sModel,
  K8sResourceCommon,
  K8sResourceKind,
  Patch,
  useAccessReview,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Modal, ModalVariant, Wizard, WizardStep, ValidatedOptions } from '@patternfly/react-core';
import * as React from 'react';

interface StepConfig {
  id: string;
  name: string;
  component: React.ReactNode;
  enableNext?: boolean;
  canJumpTo?: boolean;
  nextButtonText?: string;
}
import { ContainerSelectionStep } from './ContainerSelectionStep';
import {
  Container,
  HARVESTER_TEMPLATES,
  LOG_LEVELS,
  HarvesterTemplate,
  LogLevel,
  AGENT_ENV_VARS,
  getAgentConfig,
  getEnvVarIndex,
} from './envVarUtils';
import { HarvesterConfigStep } from './HarvesterConfigStep';
import { InstanceSelectionStep } from './InstanceSelectionStep';
import { LogLevelConfigStep } from './LogLevelConfigStep';
import { ReviewStep } from './ReviewStep';

interface CryostatModalProps {
  kind: K8sModel;
  resource: K8sResourceKind;
  isOpen: boolean;
  closeModal: () => void;
}

interface WizardFormData {
  cryostatInstance: string;
  selectedContainerIndex: number;
  selectedContainerName: string;
  harvesterTemplate: HarvesterTemplate;
  logLevel: LogLevel;
}

export const DeploymentLabelActionModal: React.FC<CryostatModalProps> = ({ kind, resource, closeModal }) => {
  const EMPTY_VALUE = '-1';
  const { t } = useCryostatTranslation();
  const [initialValue, setInitialValue] = React.useState(EMPTY_VALUE);
  const [formSelectValue, setFormSelectValue] = React.useState(EMPTY_VALUE);
  const [helperText, setHelperText] = React.useState('');
  const [validated, setValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [isDisabled, setIsDisabled] = React.useState(false);

  const [formData, setFormData] = React.useState<WizardFormData>({
    cryostatInstance: EMPTY_VALUE,
    selectedContainerIndex: 0,
    selectedContainerName: '',
    harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
    logLevel: LOG_LEVELS.ERROR,
  });

  const [initialFormData, setInitialFormData] = React.useState<WizardFormData>({
    cryostatInstance: EMPTY_VALUE,
    selectedContainerIndex: 0,
    selectedContainerName: '',
    harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
    logLevel: LOG_LEVELS.ERROR,
  });

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

  const [operatorCryostats, operatorCryostatsLoaded] = useK8sWatchResource<K8sResourceKind[]>({
    groupVersionKind: {
      group: 'operator.cryostat.io',
      version: 'v1beta2',
      kind: 'Cryostat',
    },
    isList: true,
  });

  const [canUpdateDeployment, canUpdateDeploymentLoading] = useAccessReview({
    group: 'apps',
    resource: 'deployments',
    name: resource.metadata?.name,
    namespace: resource.metadata?.namespace,
    verb: 'update',
  });

  const containers: Container[] = React.useMemo(() => {
    return (resource.spec?.template?.spec?.containers || []).map((container: any) => ({
      name: container.name,
      image: container.image,
      env: container.env || [],
    }));
  }, [resource]);

  React.useLayoutEffect(() => {
    if (!cryostatsLoaded || !operatorCryostatsLoaded) {
      return;
    }
    const deploymentLabels = resource.spec?.template.metadata.labels;
    const name = deploymentLabels['cryostat.io/name'];
    const namespace = deploymentLabels['cryostat.io/namespace'];
    for (let i = 0; i < cryostats.length; i++) {
      if (cryostats[i].metadata?.name === name && cryostats[i].metadata?.namespace === namespace) {
        setFormSelectValue(i.toString());
        setInitialValue(i.toString());
        setFormData((prev) => ({ ...prev, cryostatInstance: i.toString() }));
        return;
      }
    }
  }, [resource, cryostats, cryostatsLoaded, operatorCryostatsLoaded]);

  React.useEffect(() => {
    if (containers.length > 0) {
      const firstContainer = containers[0];
      const agentConfig = getAgentConfig(firstContainer);

      setFormData((prev) => {
        const newData = {
          ...prev,
          selectedContainerIndex: 0,
          selectedContainerName: firstContainer.name,
          harvesterTemplate: agentConfig?.harvesterTemplate || HARVESTER_TEMPLATES.CONTINUOUS,
          logLevel: agentConfig?.logLevel || LOG_LEVELS.ERROR,
        };
        setInitialFormData(newData);
        return newData;
      });
    }
  }, [containers]);

  React.useEffect(() => {
    if (cryostatsLoaded && operatorCryostatsLoaded) {
      validateOption(formSelectValue);
    }
  });

  React.useEffect(() => {
    if (cryostatsLoaded && operatorCryostatsLoaded && formSelectValue !== '-1') {
      if (
        !operatorCryostats.some(
          (operatorCryostat) =>
            operatorCryostat.metadata?.name == cryostats[formSelectValue].metadata?.name &&
            operatorCryostat.metadata?.namespace == cryostats[formSelectValue].metadata?.namespace,
        )
      ) {
        setHelperText(
          t('DEPLOYMENT_ACTION_HELM_CRYOSTAT_SELECTED', { cryostatName: cryostats[formSelectValue].metadata?.name }),
        );
        setValidated(ValidatedOptions.error);
        setIsDisabled(true);
      }
    }
  }, [operatorCryostatsLoaded, cryostatsLoaded, operatorCryostats, cryostats, formSelectValue, t]);

  React.useEffect(() => {
    if (!canUpdateDeploymentLoading && !canUpdateDeployment) {
      setValidated(ValidatedOptions.error);
      setHelperText(t('DEPLOYMENT_ACTION_NO_UPDATE_PERMISSIONS', { deploymentName: resource?.metadata?.name }));
      setIsDisabled(true);
    }
  }, [canUpdateDeployment, canUpdateDeploymentLoading, resource?.metadata?.name, t]);

  React.useEffect(() => {
    if (cryostatsLoaded && operatorCryostatsLoaded && cryostats.length === 0) {
      setHelperText(t('DEPLOYMENT_ACTION_NO_CRYOSTAT_OPERATOR_CR'));
      setValidated(ValidatedOptions.error);
      setIsDisabled(true);
    }
  }, [cryostats, cryostatsLoaded, operatorCryostatsLoaded, t]);

  function validateOption(value: string) {
    if (value !== '-1') {
      let deploymentNamespace: string = resource?.metadata?.namespace || '';
      for (let i = 0; i < operatorCryostats.length; i++) {
        if (operatorCryostats[i]?.metadata?.namespace == cryostats[value].metadata?.namespace) {
          if (!(operatorCryostats[i].spec?.targetNamespaces as string[]).includes(deploymentNamespace)) {
            setHelperText(
              t('DEPLOYMENT_ACTION_NAMESPACE_NOT_A_TARGET_NAMESPACE', {
                deploymentNamespace: deploymentNamespace,
                cryostatName: operatorCryostats[i].metadata?.name,
              }),
            );
            setValidated(ValidatedOptions.error);
            setIsDisabled(true);
          }
        }
      }
    }
  }

  function patchResource(patches: Patch[]) {
    if (!isUtilsConfigSet()) {
      setUtilsConfig(CryostatPluginUtilsConfig);
    }
    k8sPatchResource({
      // @ts-ignore
      model: kind,
      queryOptions: { name: resource.metadata?.name, ns: resource.metadata?.namespace },
      patches: patches,
    });
  }

  function generateEnvVarPatches(containerIndex: number): Patch[] {
    const patches: Patch[] = [];
    const container = containers[containerIndex];
    const basePath = `/spec/template/spec/containers/${containerIndex}/env`;

    const envVarUpdates = [
      { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: formData.harvesterTemplate },
      { name: AGENT_ENV_VARS.LOG_LEVEL, value: formData.logLevel },
    ];

    if (!container.env || container.env.length === 0) {
      patches.push({
        op: 'add',
        path: basePath,
        value: [],
      });
    }

    for (const envVar of envVarUpdates) {
      const existingIndex = getEnvVarIndex(container, envVar.name);

      if (existingIndex !== -1) {
        if (envVar.value) {
          patches.push({
            op: 'replace',
            path: `${basePath}/${existingIndex}/value`,
            value: envVar.value,
          });
        } else {
          patches.push({
            op: 'remove',
            path: `${basePath}/${existingIndex}`,
          });
        }
      } else if (envVar.value) {
        patches.push({
          op: 'add',
          path: `${basePath}/-`,
          value: {
            name: envVar.name,
            value: envVar.value,
          },
        });
      }
    }

    return patches;
  }

  function addMetadataLabels(instance: K8sResourceCommon) {
    const patches: Patch[] = [
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1name',
        value: instance.metadata?.name,
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1namespace',
        value: instance.metadata?.namespace,
      },
    ];

    const envVarPatches = generateEnvVarPatches(formData.selectedContainerIndex);
    patches.push(...envVarPatches);

    patchResource(patches);
  }

  function removeMetadataLabels() {
    const patches: Patch[] = [
      {
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1name',
      },
      {
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1namespace',
      },
    ];
    patchResource(patches);
  }

  function handleFormSubmit() {
    const instanceValue = formData.cryostatInstance !== EMPTY_VALUE ? formData.cryostatInstance : formSelectValue;

    const hasInstanceChanged = formSelectValue !== initialValue || formData.cryostatInstance !== initialValue;
    const hasHarvesterChanged = formData.harvesterTemplate !== initialFormData.harvesterTemplate;
    const hasLogLevelChanged = formData.logLevel !== initialFormData.logLevel;
    const hasAnyChange = hasInstanceChanged || hasHarvesterChanged || hasLogLevelChanged;

    if (instanceValue !== EMPTY_VALUE && hasAnyChange) {
      addMetadataLabels(cryostats[instanceValue]);
    } else if (instanceValue === EMPTY_VALUE && hasInstanceChanged) {
      removeMetadataLabels();
    }

    closeModal();
  }

  const handleInstanceChange = (value: string) => {
    setIsDisabled(false);
    setFormSelectValue(value);
    setFormData((prev) => ({ ...prev, cryostatInstance: value }));
    setHelperText('');
    setValidated(ValidatedOptions.default);
    if (value === initialValue) {
      setHelperText(t('DEPLOYMENT_ACTION_ALREADY_REGISTERED'));
      setValidated(ValidatedOptions.success);
    }
    validateOption(value);
  };

  const handleQuickRegister = () => {
    if (formSelectValue !== EMPTY_VALUE) {
      setFormData({
        cryostatInstance: formSelectValue,
        selectedContainerIndex: 0,
        selectedContainerName: containers[0]?.name || '',
        harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
        logLevel: LOG_LEVELS.ERROR,
      });
      handleFormSubmit();
    }
  };

  const handleContainerChange = (index: number) => {
    const container = containers[index];
    const agentConfig = getAgentConfig(container);

    setFormData((prev) => ({
      ...prev,
      selectedContainerIndex: index,
      selectedContainerName: container.name,
      harvesterTemplate: agentConfig?.harvesterTemplate || HARVESTER_TEMPLATES.CONTINUOUS,
      logLevel: agentConfig?.logLevel || LOG_LEVELS.ERROR,
    }));
  };

  const handleHarvesterChange = (template: HarvesterTemplate) => {
    setFormData((prev) => ({ ...prev, harvesterTemplate: template }));
  };

  const handleLogLevelChange = (level: LogLevel) => {
    setFormData((prev) => ({ ...prev, logLevel: level }));
  };

  const selectedInstance = formData.cryostatInstance !== EMPTY_VALUE ? cryostats[formData.cryostatInstance] : null;
  const selectedContainer = containers[formData.selectedContainerIndex] || null;

  const steps: StepConfig[] = [
    {
      id: 'instance-selection',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_INSTANCE'),
      component: (
        <InstanceSelectionStep
          cryostats={cryostats}
          formSelectValue={formSelectValue}
          onChange={handleInstanceChange}
          validated={validated}
          helperText={helperText}
          onQuickRegister={handleQuickRegister}
          canQuickRegister={formSelectValue !== EMPTY_VALUE && !isDisabled}
        />
      ),
      enableNext: formSelectValue !== EMPTY_VALUE && !isDisabled,
    },
    {
      id: 'container-selection',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_CONTAINER'),
      component: (
        <ContainerSelectionStep
          containers={containers}
          selectedContainerIndex={formData.selectedContainerIndex}
          onChange={handleContainerChange}
        />
      ),
      canJumpTo: formSelectValue !== EMPTY_VALUE && !isDisabled,
    },
    {
      id: 'harvester-config',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_HARVESTER'),
      component: (
        <HarvesterConfigStep harvesterTemplate={formData.harvesterTemplate} onChange={handleHarvesterChange} />
      ),
      canJumpTo: formSelectValue !== EMPTY_VALUE && !isDisabled,
    },
    {
      id: 'log-level-config',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_LOG_LEVEL'),
      component: <LogLevelConfigStep logLevel={formData.logLevel} onChange={handleLogLevelChange} />,
      canJumpTo: formSelectValue !== EMPTY_VALUE && !isDisabled,
    },
    {
      id: 'review',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_REVIEW'),
      component: (
        <ReviewStep
          selectedInstance={selectedInstance}
          selectedContainer={selectedContainer}
          harvesterTemplate={formData.harvesterTemplate}
          logLevel={formData.logLevel}
        />
      ),
      nextButtonText: t('SUBMIT'),
      canJumpTo: formSelectValue !== EMPTY_VALUE && !isDisabled,
    },
  ];

  return (
    <Modal
      variant={ModalVariant.large}
      title={t('DEPLOYMENT_ACTION_TITLE')}
      isOpen={true}
      onClose={closeModal}
      hasNoBodyWrapper
      aria-label={t('DEPLOYMENT_ACTION_TITLE')}
      ouiaId="CryostatDeploymentActionWizard"
    >
      <Wizard onClose={closeModal} onSave={handleFormSubmit}>
        {steps.map((step) => (
          <WizardStep key={step.id} id={step.id} name={step.name}>
            {step.component}
          </WizardStep>
        ))}
      </Wizard>
    </Modal>
  );
};
