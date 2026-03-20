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
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  Form,
  FormGroup,
  Radio,
  HelperText,
  HelperTextItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import * as React from 'react';
import { Container, getAgentConfig, formatAgentConfig } from './envVarUtils';

interface ContainerSelectionStepProps {
  containers: Container[];
  selectedContainerIndex: number;
  onChange: (index: number) => void;
}

export const ContainerSelectionStep: React.FC<ContainerSelectionStepProps> = ({
  containers,
  selectedContainerIndex,
  onChange,
}) => {
  const { t } = useCryostatTranslation();

  if (containers.length === 1) {
    const container = containers[0];
    const agentConfig = getAgentConfig(container);

    return (
      <Form>
        <FormGroup>
          <HelperText>
            <HelperTextItem variant="indeterminate">
              {t('DEPLOYMENT_ACTION_CONTAINER_SINGLE_AUTO_SELECTED')}
            </HelperTextItem>
          </HelperText>
          <DescriptionList isHorizontal>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('DEPLOYMENT_ACTION_CONTAINER_NAME')}</DescriptionListTerm>
              <DescriptionListDescription>{container.name}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('DEPLOYMENT_ACTION_CONTAINER_IMAGE')}</DescriptionListTerm>
              <DescriptionListDescription>{container.image}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>{t('DEPLOYMENT_ACTION_CONTAINER_CURRENT_CONFIG')}</DescriptionListTerm>
              <DescriptionListDescription>{formatAgentConfig(agentConfig)}</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </FormGroup>
      </Form>
    );
  }

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_CONTAINER_SELECT_LABEL')} fieldId="container-selection">
        <HelperText>
          <HelperTextItem variant="indeterminate">{t('DEPLOYMENT_ACTION_CONTAINER_MUST_SELECT_ONE')}</HelperTextItem>
        </HelperText>
        {containers.map((container, index) => {
          const agentConfig = getAgentConfig(container);
          return (
            <div key={index} style={{ marginBottom: '1rem' }}>
              <Radio
                id={`container-${index}`}
                name="container-selection"
                label={container.name}
                isChecked={selectedContainerIndex === index}
                onChange={() => onChange(index)}
              />
              <div style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                <DescriptionList isCompact isHorizontal>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('DEPLOYMENT_ACTION_CONTAINER_IMAGE')}</DescriptionListTerm>
                    <DescriptionListDescription>{container.image}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{t('DEPLOYMENT_ACTION_CONTAINER_CURRENT_CONFIG')}</DescriptionListTerm>
                    <DescriptionListDescription>{formatAgentConfig(agentConfig)}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </div>
            </div>
          );
        })}
      </FormGroup>
    </Form>
  );
};
