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
  TextInput,
  NumberInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import * as React from 'react';

interface AgentConfigStepProps {
  javaOptsVar: string;
  callbackPort?: number;
  onJavaOptsVarChange: (value: string) => void;
  onCallbackPortChange: (value: number | undefined) => void;
}

export const AgentConfigStep: React.FC<AgentConfigStepProps> = ({
  javaOptsVar,
  callbackPort,
  onJavaOptsVarChange,
  onCallbackPortChange,
}) => {
  const { t } = useCryostatTranslation();

  const handleCallbackPortChange = (event: React.FormEvent<HTMLInputElement>) => {
    const value = (event.target as HTMLInputElement).value;
    if (value === '') {
      onCallbackPortChange(undefined);
    } else {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue > 0) {
        onCallbackPortChange(numValue);
      }
    }
  };

  const handleCallbackPortMinus = () => {
    if (callbackPort !== undefined && callbackPort > 1) {
      onCallbackPortChange(callbackPort - 1);
    }
  };

  const handleCallbackPortPlus = () => {
    if (callbackPort !== undefined) {
      onCallbackPortChange(callbackPort + 1);
    } else {
      onCallbackPortChange(1);
    }
  };

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_JAVA_OPTS_VAR_LABEL')} fieldId="java-opts-var">
        <TextInput
          id="java-opts-var"
          name="java-opts-var"
          value={javaOptsVar}
          onChange={(_event, value) => onJavaOptsVarChange(value)}
          placeholder="JAVA_TOOL_OPTIONS"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_JAVA_OPTS_VAR_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
      <FormGroup label={t('DEPLOYMENT_ACTION_CALLBACK_PORT_LABEL')} fieldId="callback-port">
        <NumberInput
          id="callback-port"
          value={callbackPort ?? ''}
          onMinus={handleCallbackPortMinus}
          onPlus={handleCallbackPortPlus}
          onChange={handleCallbackPortChange}
          min={1}
          widthChars={10}
          placeholder={t('DEPLOYMENT_ACTION_CALLBACK_PORT_PLACEHOLDER')}
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{t('DEPLOYMENT_ACTION_CALLBACK_PORT_HELPER')}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </Form>
  );
};
