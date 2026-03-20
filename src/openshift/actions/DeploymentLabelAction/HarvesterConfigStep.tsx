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
  NumberInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { HARVESTER_TEMPLATES, HarvesterTemplate } from './envVarUtils';

interface HarvesterConfigStepProps {
  harvesterTemplate: HarvesterTemplate;
  harvesterExitMaxAgeMs: number;
  harvesterExitMaxSizeB: number;
  onChange: (template: HarvesterTemplate, maxAge: number, maxSize: number) => void;
}

export const HarvesterConfigStep: React.FC<HarvesterConfigStepProps> = ({
  harvesterTemplate,
  harvesterExitMaxAgeMs,
  harvesterExitMaxSizeB,
  onChange,
}) => {
  const { t } = useCryostatTranslation();

  const handleTemplateChange = (template: HarvesterTemplate) => {
    onChange(template, harvesterExitMaxAgeMs, harvesterExitMaxSizeB);
  };

  const handleMaxAgeChange = (value: number) => {
    onChange(harvesterTemplate, value, harvesterExitMaxSizeB);
  };

  const handleMaxSizeChange = (value: number) => {
    onChange(harvesterTemplate, harvesterExitMaxAgeMs, value);
  };

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_LABEL')} fieldId="harvester-template">
        <Radio
          id="harvester-none"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.NONE}
          onChange={() => handleTemplateChange(HARVESTER_TEMPLATES.NONE)}
        />
        <Radio
          id="harvester-continuous"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.CONTINUOUS}
          onChange={() => handleTemplateChange(HARVESTER_TEMPLATES.CONTINUOUS)}
        />
        <Radio
          id="harvester-profiling"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.PROFILING}
          onChange={() => handleTemplateChange(HARVESTER_TEMPLATES.PROFILING)}
        />
      </FormGroup>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_AGE_LABEL')} fieldId="harvester-exit-max-age">
        <NumberInput
          id="harvester-exit-max-age"
          value={harvesterExitMaxAgeMs}
          onMinus={() => handleMaxAgeChange(Math.max(0, harvesterExitMaxAgeMs - 1000))}
          onPlus={() => handleMaxAgeChange(harvesterExitMaxAgeMs + 1000)}
          onChange={(event) => {
            const value = Number((event.target as HTMLInputElement).value);
            if (!isNaN(value) && value >= 0) {
              handleMaxAgeChange(value);
            }
          }}
          min={0}
          unit={t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_AGE_UNIT')}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_AGE_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_SIZE_LABEL')} fieldId="harvester-exit-max-size">
        <NumberInput
          id="harvester-exit-max-size"
          value={harvesterExitMaxSizeB}
          onMinus={() => handleMaxSizeChange(Math.max(0, harvesterExitMaxSizeB - 1048576))}
          onPlus={() => handleMaxSizeChange(harvesterExitMaxSizeB + 1048576)}
          onChange={(event) => {
            const value = Number((event.target as HTMLInputElement).value);
            if (!isNaN(value) && value >= 0) {
              handleMaxSizeChange(value);
            }
          }}
          min={0}
          unit={t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_SIZE_UNIT')}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_HARVESTER_EXIT_MAX_SIZE_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Form>
  );
};
