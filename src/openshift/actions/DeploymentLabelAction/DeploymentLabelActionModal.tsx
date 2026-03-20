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
import { JavaOptsConfigStep } from './JavaOptsConfigStep';
import { LogLevelConfigStep } from './LogLevelConfigStep';
import { ReviewStep } from './ReviewStep';
import { WizardCustomFooter } from './WizardCustomFooter';

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
  javaOptsVar: string;
  harvesterTemplate: HarvesterTemplate;
  harvesterExitMaxAgeMs: number;
  harvesterExitMaxSizeB: number;
  logLevel: LogLevel;
}

const EMPTY_VALUE = '-1';

const formDefaults: WizardFormData = {
  cryostatInstance: EMPTY_VALUE,
  selectedContainerIndex: 0,
  selectedContainerName: '',
  javaOptsVar: 'JAVA_TOOL_OPTIONS',
  harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
  harvesterExitMaxAgeMs: 30000,
  harvesterExitMaxSizeB: 20971520,
  logLevel: LOG_LEVELS.OFF,
};

export const DeploymentLabelActionModal: React.FC<CryostatModalProps> = ({ kind, resource, closeModal }) => {
  const { t } = useCryostatTranslation();
  const [initialValue, setInitialValue] = React.useState(EMPTY_VALUE);
  const [formSelectValue, setFormSelectValue] = React.useState(EMPTY_VALUE);
  const [helperText, setHelperText] = React.useState('');
  const [validated, setValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [isDisabled, setIsDisabled] = React.useState(false);

  const [formData, setFormData] = React.useState<WizardFormData>({ ...formDefaults });

  const [initialFormData, setInitialFormData] = React.useState<WizardFormData>({ ...formDefaults });

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
          javaOptsVar: agentConfig?.javaOptsVar || 'JAVA_TOOL_OPTIONS',
          harvesterTemplate: agentConfig?.harvesterTemplate || HARVESTER_TEMPLATES.CONTINUOUS,
          harvesterExitMaxAgeMs: agentConfig?.harvesterExitMaxAgeMs || 30000,
          harvesterExitMaxSizeB: agentConfig?.harvesterExitMaxSizeB || 20971520,
          logLevel: agentConfig?.logLevel || LOG_LEVELS.OFF,
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
      { name: AGENT_ENV_VARS.JAVA_OPTS_VAR, value: formData.javaOptsVar },
      { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: formData.harvesterTemplate },
      { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_AGE_MS, value: formData.harvesterExitMaxAgeMs.toString() },
      { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_SIZE_B, value: formData.harvesterExitMaxSizeB.toString() },
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

    // Also remove environment variables from the selected container
    const container = containers[formData.selectedContainerIndex];
    const basePath = `/spec/template/spec/containers/${formData.selectedContainerIndex}/env`;

    const envVarsToRemove = [
      AGENT_ENV_VARS.JAVA_OPTS_VAR,
      AGENT_ENV_VARS.HARVESTER_TEMPLATE,
      AGENT_ENV_VARS.HARVESTER_EXIT_MAX_AGE_MS,
      AGENT_ENV_VARS.HARVESTER_EXIT_MAX_SIZE_B,
      AGENT_ENV_VARS.LOG_LEVEL,
    ];

    // Collect indices and sort in descending order to avoid index shifting issues
    const indicesToRemove: number[] = [];
    for (const envVarName of envVarsToRemove) {
      const existingIndex = getEnvVarIndex(container, envVarName);
      if (existingIndex !== -1) {
        indicesToRemove.push(existingIndex);
      }
    }

    // Sort descending so we remove from highest index first
    indicesToRemove.sort((a, b) => b - a);

    for (const index of indicesToRemove) {
      patches.push({
        op: 'remove',
        path: `${basePath}/${index}`,
      });
    }

    patchResource(patches);
  }

  function handleFormSubmit() {
    const instanceValue = formData.cryostatInstance !== EMPTY_VALUE ? formData.cryostatInstance : formSelectValue;

    const hasInstanceChanged = formSelectValue !== initialValue || formData.cryostatInstance !== initialValue;
    const hasJavaOptsChanged = formData.javaOptsVar !== initialFormData.javaOptsVar;
    const hasHarvesterChanged = formData.harvesterTemplate !== initialFormData.harvesterTemplate;
    const hasHarvesterExitMaxAgeChanged = formData.harvesterExitMaxAgeMs !== initialFormData.harvesterExitMaxAgeMs;
    const hasHarvesterExitMaxSizeChanged = formData.harvesterExitMaxSizeB !== initialFormData.harvesterExitMaxSizeB;
    const hasLogLevelChanged = formData.logLevel !== initialFormData.logLevel;
    const hasAnyChange =
      hasInstanceChanged ||
      hasJavaOptsChanged ||
      hasHarvesterChanged ||
      hasHarvesterExitMaxAgeChanged ||
      hasHarvesterExitMaxSizeChanged ||
      hasLogLevelChanged;

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
      const quickRegisterData: WizardFormData = {
        cryostatInstance: formSelectValue,
        selectedContainerIndex: 0,
        selectedContainerName: containers[0]?.name || '',
        javaOptsVar: 'JAVA_TOOL_OPTIONS',
        harvesterTemplate: HARVESTER_TEMPLATES.CONTINUOUS,
        harvesterExitMaxAgeMs: 30000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.OFF,
      };

      setFormData(quickRegisterData);

      const instanceValue = quickRegisterData.cryostatInstance;
      if (instanceValue !== EMPTY_VALUE) {
        const patches: Patch[] = [
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1name',
            value: cryostats[instanceValue].metadata?.name,
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1namespace',
            value: cryostats[instanceValue].metadata?.namespace,
          },
        ];

        const envVarPatches = generateEnvVarPatchesForData(quickRegisterData);
        patches.push(...envVarPatches);
        patchResource(patches);
      }

      closeModal();
    }
  };

  function generateEnvVarPatchesForData(data: WizardFormData): Patch[] {
    const patches: Patch[] = [];
    const container = containers[data.selectedContainerIndex];
    const basePath = `/spec/template/spec/containers/${data.selectedContainerIndex}/env`;

    const envVarUpdates = [
      { name: AGENT_ENV_VARS.JAVA_OPTS_VAR, value: data.javaOptsVar },
      { name: AGENT_ENV_VARS.HARVESTER_TEMPLATE, value: data.harvesterTemplate },
      { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_AGE_MS, value: data.harvesterExitMaxAgeMs.toString() },
      { name: AGENT_ENV_VARS.HARVESTER_EXIT_MAX_SIZE_B, value: data.harvesterExitMaxSizeB.toString() },
      { name: AGENT_ENV_VARS.LOG_LEVEL, value: data.logLevel },
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

  const handleContainerChange = (index: number) => {
    const container = containers[index];
    const agentConfig = getAgentConfig(container);

    setFormData((prev) => ({
      ...prev,
      selectedContainerIndex: index,
      selectedContainerName: container.name,
      javaOptsVar: agentConfig?.javaOptsVar || 'JAVA_TOOL_OPTIONS',
      harvesterTemplate: agentConfig?.harvesterTemplate || HARVESTER_TEMPLATES.CONTINUOUS,
      harvesterExitMaxAgeMs: agentConfig?.harvesterExitMaxAgeMs || 30000,
      harvesterExitMaxSizeB: agentConfig?.harvesterExitMaxSizeB || 20971520,
      logLevel: agentConfig?.logLevel || LOG_LEVELS.OFF,
    }));
  };

  const handleJavaOptsVarChange = (value: string) => {
    setFormData((prev) => ({ ...prev, javaOptsVar: value }));
  };

  const handleHarvesterChange = (template: HarvesterTemplate, maxAge: number, maxSize: number) => {
    setFormData((prev) => ({
      ...prev,
      harvesterTemplate: template,
      harvesterExitMaxAgeMs: maxAge,
      harvesterExitMaxSizeB: maxSize,
    }));
  };

  const handleLogLevelChange = (level: LogLevel) => {
    setFormData((prev) => ({ ...prev, logLevel: level }));
  };

  const selectedInstance = formData.cryostatInstance !== EMPTY_VALUE ? cryostats[formData.cryostatInstance] : null;
  const selectedContainer = containers[formData.selectedContainerIndex] || null;

  const steps = [
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
        />
      ),
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
      id: 'java-opts-config',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_JAVA_OPTS'),
      component: <JavaOptsConfigStep javaOptsVar={formData.javaOptsVar} onChange={handleJavaOptsVarChange} />,
      canJumpTo: formSelectValue !== EMPTY_VALUE && !isDisabled,
    },
    {
      id: 'harvester-config',
      name: t('DEPLOYMENT_ACTION_WIZARD_STEP_HARVESTER'),
      component: (
        <HarvesterConfigStep
          harvesterTemplate={formData.harvesterTemplate}
          harvesterExitMaxAgeMs={formData.harvesterExitMaxAgeMs}
          harvesterExitMaxSizeB={formData.harvesterExitMaxSizeB}
          onChange={handleHarvesterChange}
        />
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
          javaOptsVar={formData.javaOptsVar}
          harvesterTemplate={formData.harvesterTemplate}
          harvesterExitMaxAgeMs={formData.harvesterExitMaxAgeMs}
          harvesterExitMaxSizeB={formData.harvesterExitMaxSizeB}
          logLevel={formData.logLevel}
        />
      ),
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
      <Wizard
        onClose={closeModal}
        onSave={handleFormSubmit}
        footer={
          <WizardCustomFooter
            onQuickRegister={handleQuickRegister}
            onSubmit={handleFormSubmit}
            onCancel={closeModal}
            isValid={formSelectValue !== EMPTY_VALUE && !isDisabled}
          />
        }
      >
        {steps.map((step) => (
          <WizardStep key={step.id} id={step.id} name={step.name}>
            {step.component}
          </WizardStep>
        ))}
      </Wizard>
    </Modal>
  );
};
