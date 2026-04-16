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
import {
  Button,
  Modal,
  ModalVariant,
  Wizard,
  WizardStep,
  WizardHeader,
  WizardFooterWrapper,
  useWizardContext,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';

import { ContainerSelectionStep } from './ContainerSelectionStep';
import { Container, HARVESTER_TEMPLATES, LOG_LEVELS, HarvesterTemplate, LogLevel, parseDuration } from './utils';
import { HarvesterConfigStep } from './HarvesterConfigStep';
import { InstanceSelectionStep } from './InstanceSelectionStep';
import { JavaOptsConfigStep } from './JavaOptsConfigStep';
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
  javaOptsVar: string;
  harvesterTemplate: HarvesterTemplate;
  harvesterPeriodMs: number;
  harvesterMaxFiles: number;
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
  harvesterPeriodMs: 900000,
  harvesterMaxFiles: 4,
  harvesterExitMaxAgeMs: 300000,
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
    const deploymentLabels = resource.spec?.template?.metadata?.labels || {};
    return (resource.spec?.template?.spec?.containers || []).map((container: any) => ({
      name: container.name,
      image: container.image,
      labels: deploymentLabels,
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
      const deploymentLabels = resource.spec?.template.metadata.labels;
      const logLevelFromLabel = (deploymentLabels?.['cryostat.io/log-level'] as LogLevel) || LOG_LEVELS.OFF;
      const javaOptsVarFromLabel = deploymentLabels?.['cryostat.io/java-options-var'] || 'JAVA_TOOL_OPTIONS';
      const harvesterTemplateFromLabel =
        (deploymentLabels?.['cryostat.io/harvester-template'] as HarvesterTemplate) || HARVESTER_TEMPLATES.CONTINUOUS;
      const harvesterPeriodFromLabel = deploymentLabels?.['cryostat.io/harvester-period'];
      const harvesterMaxFilesFromLabel = deploymentLabels?.['cryostat.io/harvester-max-files'];
      const harvesterExitMaxAgeFromLabel = deploymentLabels?.['cryostat.io/harvester-exit-max-age'];
      const harvesterExitMaxSizeFromLabel = deploymentLabels?.['cryostat.io/harvester-exit-max-size'];

      setFormData((prev) => {
        const newData = {
          ...prev,
          selectedContainerIndex: 0,
          selectedContainerName: firstContainer.name,
          javaOptsVar: javaOptsVarFromLabel,
          harvesterTemplate: harvesterTemplateFromLabel,
          harvesterPeriodMs: parseDuration(harvesterPeriodFromLabel, 900000),
          harvesterMaxFiles: harvesterMaxFilesFromLabel ? parseInt(harvesterMaxFilesFromLabel, 10) : 4,
          harvesterExitMaxAgeMs: parseDuration(harvesterExitMaxAgeFromLabel, 300000),
          harvesterExitMaxSizeB: harvesterExitMaxSizeFromLabel ? parseInt(harvesterExitMaxSizeFromLabel, 10) : 20971520,
          logLevel: logLevelFromLabel,
        };
        setInitialFormData(newData);
        return newData;
      });
    }
  }, [containers, resource]);

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
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1log-level',
        value: formData.logLevel,
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1java-options-var',
        value: formData.javaOptsVar,
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-template',
        value: formData.harvesterTemplate,
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-period',
        value: `${formData.harvesterPeriodMs}ms`,
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-max-files',
        value: formData.harvesterMaxFiles.toString(),
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-exit-max-age',
        value: `${formData.harvesterExitMaxAgeMs}ms`,
      },
      {
        op: 'replace',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-exit-max-size',
        value: formData.harvesterExitMaxSizeB.toString(),
      },
    ];

    patchResource(patches);
  }

  function removeMetadataLabels() {
    const patches: Patch[] = [];
    const deploymentLabels = resource.spec?.template.metadata.labels;

    // Only remove labels that exist
    if (deploymentLabels?.['cryostat.io/name']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1name',
      });
    }
    if (deploymentLabels?.['cryostat.io/namespace']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1namespace',
      });
    }
    if (deploymentLabels?.['cryostat.io/log-level']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1log-level',
      });
    }
    if (deploymentLabels?.['cryostat.io/java-options-var']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1java-options-var',
      });
    }
    if (deploymentLabels?.['cryostat.io/harvester-template']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-template',
      });
    }
    if (deploymentLabels?.['cryostat.io/harvester-period']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-period',
      });
    }
    if (deploymentLabels?.['cryostat.io/harvester-max-files']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-max-files',
      });
    }
    if (deploymentLabels?.['cryostat.io/harvester-exit-max-age']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-exit-max-age',
      });
    }
    if (deploymentLabels?.['cryostat.io/harvester-exit-max-size']) {
      patches.push({
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1harvester-exit-max-size',
      });
    }

    patchResource(patches);
  }

  function handleFormSubmit() {
    const instanceValue = formData.cryostatInstance !== EMPTY_VALUE ? formData.cryostatInstance : formSelectValue;

    const hasInstanceChanged = formSelectValue !== initialValue || formData.cryostatInstance !== initialValue;
    const hasJavaOptsChanged = formData.javaOptsVar !== initialFormData.javaOptsVar;
    const hasHarvesterChanged = formData.harvesterTemplate !== initialFormData.harvesterTemplate;
    const hasHarvesterPeriodChanged = formData.harvesterPeriodMs !== initialFormData.harvesterPeriodMs;
    const hasHarvesterMaxFilesChanged = formData.harvesterMaxFiles !== initialFormData.harvesterMaxFiles;
    const hasHarvesterExitMaxAgeChanged = formData.harvesterExitMaxAgeMs !== initialFormData.harvesterExitMaxAgeMs;
    const hasHarvesterExitMaxSizeChanged = formData.harvesterExitMaxSizeB !== initialFormData.harvesterExitMaxSizeB;
    const hasLogLevelChanged = formData.logLevel !== initialFormData.logLevel;
    const hasAnyChange =
      hasInstanceChanged ||
      hasJavaOptsChanged ||
      hasHarvesterChanged ||
      hasHarvesterPeriodChanged ||
      hasHarvesterMaxFilesChanged ||
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
        harvesterPeriodMs: 900000,
        harvesterMaxFiles: 4,
        harvesterExitMaxAgeMs: 300000,
        harvesterExitMaxSizeB: 20971520,
        logLevel: LOG_LEVELS.OFF,
      };

      setFormData(quickRegisterData);

      const instanceValue = quickRegisterData.cryostatInstance;
      if (instanceValue !== EMPTY_VALUE) {
        const cryostatInstance: K8sResourceKind = cryostats[instanceValue];
        const patches: Patch[] = [
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1name',
            value: cryostatInstance.metadata?.name,
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1namespace',
            value: cryostatInstance.metadata?.namespace,
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1harvester-template',
            value: quickRegisterData.harvesterTemplate,
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1harvester-period',
            value: `${quickRegisterData.harvesterPeriodMs}ms`,
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1harvester-max-files',
            value: quickRegisterData.harvesterMaxFiles.toString(),
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1harvester-exit-max-age',
            value: `${quickRegisterData.harvesterExitMaxAgeMs}ms`,
          },
          {
            op: 'replace',
            path: '/spec/template/metadata/labels/cryostat.io~1harvester-exit-max-size',
            value: quickRegisterData.harvesterExitMaxSizeB.toString(),
          },
        ];
        if (cryostatInstance.metadata?.labels?.['cryostat.io/log-level']) {
          patches.push({
            op: 'remove',
            path: '/spec/template/metadata/labels/cryostat.io~1log-level',
          });
        }
        if (cryostatInstance.metadata?.labels?.['cryostat.io/java-options-var']) {
          patches.push({
            op: 'remove',
            path: '/spec/template/metadata/labels/cryostat.io~1java-options-var',
          });
        }
        patchResource(patches);
      }

      closeModal();
    } else {
      removeMetadataLabels();
      closeModal();
    }
  };

  const handleContainerChange = (index: number) => {
    const container = containers[index];
    const deploymentLabels = resource.spec?.template.metadata.labels;
    const logLevelFromLabel = (deploymentLabels?.['cryostat.io/log-level'] as LogLevel) || LOG_LEVELS.OFF;
    const javaOptsVarFromLabel = deploymentLabels?.['cryostat.io/java-options-var'] || 'JAVA_TOOL_OPTIONS';
    const harvesterTemplateFromLabel =
      (deploymentLabels?.['cryostat.io/harvester-template'] as HarvesterTemplate) || HARVESTER_TEMPLATES.CONTINUOUS;
    const harvesterPeriodFromLabel = deploymentLabels?.['cryostat.io/harvester-period'];
    const harvesterMaxFilesFromLabel = deploymentLabels?.['cryostat.io/harvester-max-files'];
    const harvesterExitMaxAgeFromLabel = deploymentLabels?.['cryostat.io/harvester-exit-max-age'];
    const harvesterExitMaxSizeFromLabel = deploymentLabels?.['cryostat.io/harvester-exit-max-size'];

    setFormData((prev) => ({
      ...prev,
      selectedContainerIndex: index,
      selectedContainerName: container.name,
      javaOptsVar: javaOptsVarFromLabel,
      harvesterTemplate: harvesterTemplateFromLabel,
      harvesterPeriodMs: parseDuration(harvesterPeriodFromLabel, 900000),
      harvesterMaxFiles: harvesterMaxFilesFromLabel ? parseInt(harvesterMaxFilesFromLabel, 10) : 4,
      harvesterExitMaxAgeMs: parseDuration(harvesterExitMaxAgeFromLabel, 300000),
      harvesterExitMaxSizeB: harvesterExitMaxSizeFromLabel ? parseInt(harvesterExitMaxSizeFromLabel, 10) : 20971520,
      logLevel: logLevelFromLabel,
    }));
  };

  const handleJavaOptsVarChange = (value: string) => {
    setFormData((prev) => ({ ...prev, javaOptsVar: value }));
  };

  const handleHarvesterChange = (
    template: HarvesterTemplate,
    periodMs: number,
    maxFiles: number,
    maxAge: number,
    maxSize: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      harvesterTemplate: template,
      harvesterPeriodMs: periodMs,
      harvesterMaxFiles: maxFiles,
      harvesterExitMaxAgeMs: maxAge,
      harvesterExitMaxSizeB: maxSize,
    }));
  };

  const handleLogLevelChange = (level: LogLevel) => {
    setFormData((prev) => ({ ...prev, logLevel: level }));
  };

  const selectedInstance = formData.cryostatInstance !== EMPTY_VALUE ? cryostats[formData.cryostatInstance] : null;
  const selectedContainer = containers[formData.selectedContainerIndex] || null;

  const InstanceSelectionFooter = () => {
    const { goToNextStep } = useWizardContext();

    return (
      <WizardFooterWrapper>
        <Button
          variant="primary"
          onClick={handleQuickRegister}
          isDisabled={
            !(
              (formSelectValue === EMPTY_VALUE && initialValue !== EMPTY_VALUE) ||
              (formSelectValue !== EMPTY_VALUE && !isDisabled)
            )
          }
        >
          {formSelectValue === EMPTY_VALUE && initialValue !== EMPTY_VALUE
            ? t('DEPLOYMENT_ACTION_DEREGISTER')
            : t('DEPLOYMENT_ACTION_QUICK_REGISTER')}
        </Button>
        <Button variant="secondary" onClick={goToNextStep} isDisabled={formSelectValue === EMPTY_VALUE || isDisabled}>
          {t('NEXT')}
        </Button>
        <Button variant="link" onClick={closeModal}>
          {t('CANCEL')}
        </Button>
      </WizardFooterWrapper>
    );
  };

  return (
    <Modal
      variant={ModalVariant.large}
      isOpen={true}
      onClose={closeModal}
      aria-label={t('DEPLOYMENT_ACTION_TITLE')}
      ouiaId="CryostatDeploymentActionWizard"
    >
      <Wizard
        onClose={closeModal}
        onSave={handleFormSubmit}
        header={
          <WizardHeader title={t('DEPLOYMENT_ACTION_TITLE')} onClose={closeModal} closeButtonAriaLabel={t('CLOSE')} />
        }
      >
        <WizardStep
          id="instance-selection"
          name={t('DEPLOYMENT_ACTION_WIZARD_STEP_INSTANCE')}
          footer={<InstanceSelectionFooter />}
        >
          <InstanceSelectionStep
            cryostats={cryostats}
            formSelectValue={formSelectValue}
            onChange={handleInstanceChange}
            validated={validated}
            helperText={helperText}
          />
        </WizardStep>
        <WizardStep
          id="container-selection"
          name={t('DEPLOYMENT_ACTION_WIZARD_STEP_CONTAINER')}
          footer={{
            isNextDisabled: isDisabled,
          }}
        >
          <ContainerSelectionStep
            containers={containers}
            selectedContainerIndex={formData.selectedContainerIndex}
            onChange={handleContainerChange}
            logLevel={formData.logLevel}
            javaOptsVar={formData.javaOptsVar}
          />
        </WizardStep>
        <WizardStep
          id="java-opts-config"
          name={t('DEPLOYMENT_ACTION_WIZARD_STEP_JAVA_OPTS')}
          footer={{
            isNextDisabled: isDisabled,
          }}
        >
          <JavaOptsConfigStep javaOptsVar={formData.javaOptsVar} onChange={handleJavaOptsVarChange} />
        </WizardStep>
        <WizardStep
          id="harvester-config"
          name={t('DEPLOYMENT_ACTION_WIZARD_STEP_HARVESTER')}
          footer={{
            isNextDisabled: isDisabled,
          }}
        >
          <HarvesterConfigStep
            harvesterTemplate={formData.harvesterTemplate}
            harvesterPeriodMs={formData.harvesterPeriodMs}
            harvesterMaxFiles={formData.harvesterMaxFiles}
            harvesterExitMaxAgeMs={formData.harvesterExitMaxAgeMs}
            harvesterExitMaxSizeB={formData.harvesterExitMaxSizeB}
            onChange={handleHarvesterChange}
          />
        </WizardStep>
        <WizardStep
          id="log-level-config"
          name={t('DEPLOYMENT_ACTION_WIZARD_STEP_LOG_LEVEL')}
          footer={{
            isNextDisabled: isDisabled,
          }}
        >
          <LogLevelConfigStep logLevel={formData.logLevel} onChange={handleLogLevelChange} />
        </WizardStep>
        <WizardStep
          id="review"
          name={t('DEPLOYMENT_ACTION_WIZARD_STEP_REVIEW')}
          footer={{
            nextButtonText: t('DEPLOYMENT_ACTION_REGISTER'),
          }}
        >
          <ReviewStep
            selectedInstance={selectedInstance}
            selectedContainer={selectedContainer}
            javaOptsVar={formData.javaOptsVar}
            harvesterTemplate={formData.harvesterTemplate}
            harvesterPeriodMs={formData.harvesterPeriodMs}
            harvesterMaxFiles={formData.harvesterMaxFiles}
            harvesterExitMaxAgeMs={formData.harvesterExitMaxAgeMs}
            harvesterExitMaxSizeB={formData.harvesterExitMaxSizeB}
            logLevel={formData.logLevel}
          />
        </WizardStep>
      </Wizard>
    </Modal>
  );
};
