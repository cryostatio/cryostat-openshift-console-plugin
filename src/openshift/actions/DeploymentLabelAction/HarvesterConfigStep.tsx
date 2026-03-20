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
import { Form, FormGroup, Radio } from '@patternfly/react-core';
import * as React from 'react';
import { HARVESTER_TEMPLATES, HarvesterTemplate } from './envVarUtils';

interface HarvesterConfigStepProps {
  harvesterTemplate: HarvesterTemplate;
  onChange: (template: HarvesterTemplate) => void;
}

export const HarvesterConfigStep: React.FC<HarvesterConfigStepProps> = ({ harvesterTemplate, onChange }) => {
  const { t } = useCryostatTranslation();

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_LABEL')} fieldId="harvester-template">
        <Radio
          id="harvester-none"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.NONE}
          onChange={() => onChange(HARVESTER_TEMPLATES.NONE)}
        />
        <Radio
          id="harvester-continuous"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.CONTINUOUS}
          onChange={() => onChange(HARVESTER_TEMPLATES.CONTINUOUS)}
        />
        <Radio
          id="harvester-profiling"
          name="harvester-template"
          label={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING')}
          description={t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING_DESC')}
          isChecked={harvesterTemplate === HARVESTER_TEMPLATES.PROFILING}
          onChange={() => onChange(HARVESTER_TEMPLATES.PROFILING)}
        />
      </FormGroup>
    </Form>
  );
};
