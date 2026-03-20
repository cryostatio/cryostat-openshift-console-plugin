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
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';
import {
  Form,
  FormGroup,
  FormSelect,
  FormSelectOption,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import * as React from 'react';

interface InstanceSelectionStepProps {
  cryostats: K8sResourceKind[];
  formSelectValue: string;
  onChange: (value: string) => void;
  validated: ValidatedOptions;
  helperText: string;
}

export const InstanceSelectionStep: React.FC<InstanceSelectionStepProps> = ({
  cryostats,
  formSelectValue,
  onChange,
  validated,
  helperText,
}) => {
  const { t } = useCryostatTranslation();
  const EMPTY_VALUE = '-1';

  const handleChange = (_event: React.FormEvent<HTMLSelectElement>, value: string) => {
    onChange(value);
  };

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_SELECT_LABEL')} type="string" fieldId="instance-selection">
        <FormSelect
          id="cryostat-selection"
          validated={validated}
          value={formSelectValue}
          onChange={handleChange}
          aria-label="Cryostat Instance Selection"
        >
          <FormSelectOption value={EMPTY_VALUE} label={t('DEPLOYMENT_ACTION_EMPTY_OPTION')} />
          {cryostats.map((instance, index) => {
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
  );
};
