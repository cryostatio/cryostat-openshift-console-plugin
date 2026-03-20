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
import { LOG_LEVELS, LogLevel } from './envVarUtils';

interface LogLevelConfigStepProps {
  logLevel: LogLevel;
  onChange: (level: LogLevel) => void;
}

export const LogLevelConfigStep: React.FC<LogLevelConfigStepProps> = ({ logLevel, onChange }) => {
  const { t } = useCryostatTranslation();

  return (
    <Form>
      <FormGroup label={t('DEPLOYMENT_ACTION_LOG_LEVEL_LABEL')} fieldId="log-level">
        <Radio
          id="log-level-off"
          name="log-level"
          label={t('DEPLOYMENT_ACTION_LOG_LEVEL_OFF')}
          isChecked={logLevel === LOG_LEVELS.OFF}
          onChange={() => onChange(LOG_LEVELS.OFF)}
        />
        <Radio
          id="log-level-error"
          name="log-level"
          label={t('DEPLOYMENT_ACTION_LOG_LEVEL_ERROR')}
          isChecked={logLevel === LOG_LEVELS.ERROR}
          onChange={() => onChange(LOG_LEVELS.ERROR)}
        />
        <Radio
          id="log-level-warn"
          name="log-level"
          label={t('DEPLOYMENT_ACTION_LOG_LEVEL_WARN')}
          isChecked={logLevel === LOG_LEVELS.WARN}
          onChange={() => onChange(LOG_LEVELS.WARN)}
        />
        <Radio
          id="log-level-info"
          name="log-level"
          label={t('DEPLOYMENT_ACTION_LOG_LEVEL_INFO')}
          isChecked={logLevel === LOG_LEVELS.INFO}
          onChange={() => onChange(LOG_LEVELS.INFO)}
        />
        <Radio
          id="log-level-debug"
          name="log-level"
          label={t('DEPLOYMENT_ACTION_LOG_LEVEL_DEBUG')}
          isChecked={logLevel === LOG_LEVELS.DEBUG}
          onChange={() => onChange(LOG_LEVELS.DEBUG)}
        />
        <Radio
          id="log-level-trace"
          name="log-level"
          label={t('DEPLOYMENT_ACTION_LOG_LEVEL_TRACE')}
          isChecked={logLevel === LOG_LEVELS.TRACE}
          onChange={() => onChange(LOG_LEVELS.TRACE)}
        />
      </FormGroup>
    </Form>
  );
};
