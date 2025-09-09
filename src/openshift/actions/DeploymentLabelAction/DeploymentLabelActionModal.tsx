import { CryostatPluginUtilsConfig } from '@console-plugin/utils/CryostatPluginUtilsConfig';
import { cryostatInstanceResource } from '@console-plugin/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { isUtilsConfigSet, k8sPatchResource, setUtilsConfig } from '@openshift/dynamic-plugin-sdk-utils';
import {
  K8sModel,
  K8sResourceCommon,
  K8sResourceKind,
  Patch,
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
import React from 'react';

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
  const [instances] = useK8sWatchResource<K8sResourceCommon[]>(cryostatInstanceResource);

  React.useLayoutEffect(() => {
    const deploymentLabels = resource.spec?.template.metadata.labels;
    const name = deploymentLabels['cryostat.io/name'];
    const namespace = deploymentLabels['cryostat.io/namespace'];
    for (let i = 0; i < instances.length; i++) {
      if (instances[i].metadata?.name === name && instances[i].metadata?.namespace === namespace) {
        setFormSelectValue(i.toString());
        setInitialValue(i.toString());
        return;
      }
    }
  }, [instances, resource]);

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
        addMetadataLabels(instances[formSelectValue]);
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
      setValidated(ValidatedOptions.warning);
    }
  };

  return (
    <React.Fragment>
      <Modal
        variant={ModalVariant.small}
        title={t('DEPLOYMENT_ACTION_TITLE')}
        isOpen={true}
        onClose={closeModal}
        actions={[
          <Button key="submit" variant="primary" onClick={handleFormSubmit}>
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
              {instances.map((instance, index) => {
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
