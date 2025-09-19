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
  Modal,
  Button,
  ModalVariant,
  FormSelect,
  FormGroup,
  Form,
  FormSelectOption,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';

interface CryostatModalProps {
  kind: K8sModel;
  resource: K8sResourceKind;
  isOpen: boolean;
  closeModal: () => void;
}

export const DeploymentLabelActionModal: React.FC<CryostatModalProps> = ({ kind, resource, closeModal }) => {
  const EMPTY_VALUE = '-1';
  const { t } = useCryostatTranslation();
  const [initialValue, setInitialValue] = React.useState(EMPTY_VALUE);
  const [formSelectValue, setFormSelectValue] = React.useState(EMPTY_VALUE);
  const [helperText, setHelperText] = React.useState('');
  const [validated, setValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [isDisabled, setIsDisabled] = React.useState(false);
  const [allCryostats, allCryostatsLoaded] = useK8sWatchResource<K8sResourceKind[]>({
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

  const validateOption = React.useCallback(
    (value) => {
      // check to see if the deployment namespace is in the list of target Cryostat namespaces
      if (value !== '-1') {
        let deploymentNamespace: string = resource?.metadata?.namespace || '';
        operatorCryostats.forEach((cryostat) => {
          if (cryostat?.metadata?.namespace == operatorCryostats[value].metadata?.namespace) {
            if (!(cryostat.spec?.targetNamespaces as string[]).includes(deploymentNamespace)) {
              setHelperText(
                t('DEPLOYMENT_ACTION_NAMESPACE_NOT_A_TARGET_NAMESPACE', {
                  deploymentNamespace: deploymentNamespace,
                  cryostatName: cryostat.metadata?.name,
                }),
              );
              setValidated(ValidatedOptions.warning);
            }
          }
        });
      }
    },
    [operatorCryostats, resource?.metadata?.namespace, t],
  );

  React.useLayoutEffect(() => {
    if (!allCryostatsLoaded && !operatorCryostatsLoaded) {
      return;
    }
    const deploymentLabels = resource.spec?.template.metadata.labels;
    const name = deploymentLabels['cryostat.io/name'];
    const namespace = deploymentLabels['cryostat.io/namespace'];
    for (let i = 0; i < operatorCryostats.length; i++) {
      if (operatorCryostats[i].metadata?.name === name && operatorCryostats[i].metadata?.namespace === namespace) {
        setFormSelectValue(i.toString());
        setInitialValue(i.toString());
        validateOption(i.toString());
        return;
      }
    }
  }, [operatorCryostats, resource, canUpdateDeployment, validateOption, operatorCryostatsLoaded, allCryostatsLoaded, allCryostats]);

  React.useEffect(() => {
    if (!canUpdateDeploymentLoading && !canUpdateDeployment) {
      setValidated(ValidatedOptions.error);
      setHelperText(t('DEPLOYMENT_ACTION_NO_UPDATE_PERMISSIONS', { deploymentName: resource?.metadata?.name }));
      setIsDisabled(true);
    }
  }, [canUpdateDeployment, canUpdateDeploymentLoading, resource?.metadata?.name, t]);

  React.useEffect(() => {
    if (allCryostatsLoaded && operatorCryostatsLoaded) {
      if (operatorCryostats.length === 0) {
        setHelperText(t('DEPLOYMENT_ACTION_NO_CRYOSTAT_OPERATOR_CR'));
        setValidated(ValidatedOptions.error);
        setIsDisabled(true);
      }
    }
  }, [allCryostats, allCryostats.length, allCryostatsLoaded, operatorCryostats, operatorCryostats.length, operatorCryostatsLoaded, t]);

  function patchResource(patch: Patch[]) {
    if (!isUtilsConfigSet()) {
      setUtilsConfig(CryostatPluginUtilsConfig);
    }
    k8sPatchResource({
      // @ts-ignore
      model: kind,
      queryOptions: { name: resource.metadata?.name, ns: resource.metadata?.namespace },
      patches: patch,
    });
  }

  function addMetadataLabels(instance: K8sResourceCommon) {
    const patch: Patch[] = [
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
    patchResource(patch);
  }

  function removeMetadataLabels() {
    const patch: Patch[] = [
      {
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1name',
      },
      {
        op: 'remove',
        path: '/spec/template/metadata/labels/cryostat.io~1namespace',
      },
    ];
    patchResource(patch);
  }

  function handleFormSubmit() {
    if (formSelectValue !== initialValue) {
      if (formSelectValue !== EMPTY_VALUE) {
        addMetadataLabels(operatorCryostats[formSelectValue]);
      } else {
        removeMetadataLabels();
      }
    }
    closeModal();
  }

  const onChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    setFormSelectValue(value);
    setHelperText('');
    setValidated(ValidatedOptions.default);
    if (value === initialValue) {
      setHelperText(t('DEPLOYMENT_ACTION_ALREADY_REGISTERED'));
      setValidated(ValidatedOptions.success);
    }
    validateOption(value);
  };

  return (
    <React.Fragment>
      <Modal
        variant={ModalVariant.small}
        title={t('DEPLOYMENT_ACTION_TITLE')}
        isOpen={true}
        onClose={closeModal}
        actions={[
          <Button key="submit" variant="primary" onClick={handleFormSubmit} isDisabled={isDisabled}>
            {t('SUBMIT')}
          </Button>,
          <Button key="cancel" variant="secondary" onClick={closeModal}>
            {t('CANCEL')}
          </Button>,
        ]}
        ouiaId="CryostatDeploymentActionModal"
      >
        <Form>
          <FormGroup label={t('DEPLOYMENT_ACTION_SELECT_LABEL')} type="string" fieldId="selection">
            <FormSelect
              id="cryostat-selection"
              validated={validated}
              value={formSelectValue}
              onChange={onChange}
              aria-label="Cryostat Deployment Action FormSelect Input"
            >
              <FormSelectOption value={EMPTY_VALUE} label={t('DEPLOYMENT_ACTION_EMPTY_OPTION')} />
              {operatorCryostats.map((instance, index) => {
                return (
                  <FormSelectOption
                    key={index}
                    value={index}
                    label={`${instance.metadata?.name} (ns: ${instance.metadata?.namespace})`}
                  />
                );
              })}
            </FormSelect>
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant={validated}>{helperText}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </Form>
      </Modal>
    </React.Fragment>
  );
};
