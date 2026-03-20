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
import { Form, FormGroup, TextInput, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import * as React from 'react';

interface JavaOptsConfigStepProps {
  javaOptsVar: string;
  onChange: (value: string) => void;
}

export const JavaOptsConfigStep: React.FC<JavaOptsConfigStepProps> = ({ javaOptsVar, onChange }) => {
  const { t } = useCryostatTranslation();

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_JAVA_OPTS_VAR_LABEL')} fieldId="java-opts-var">
        <TextInput
          id="java-opts-var"
          name="java-opts-var"
          value={javaOptsVar}
          onChange={(_event, value) => onChange(value)}
          placeholder="JAVA_TOOL_OPTIONS"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_JAVA_OPTS_VAR_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Form>
  );
};
