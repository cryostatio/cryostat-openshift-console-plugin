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
import { formatBytes, formatDuration } from '@app/utils/utils';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
} from '@patternfly/react-core';
import * as React from 'react';
import { Container, HarvesterTemplate, LogLevel } from './utils';

interface ReviewStepProps {
  selectedInstance: K8sResourceKind | null;
  selectedContainer: Container | null;
  harvesterTemplate: HarvesterTemplate;
  harvesterPeriodMs: number;
  harvesterMaxFiles: number;
  harvesterExitMaxAgeMs: number;
  harvesterExitMaxSizeB: number;
  logLevel: LogLevel;
  javaOptsVar: string;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  selectedInstance,
  selectedContainer,
  harvesterTemplate,
  harvesterPeriodMs,
  harvesterMaxFiles,
  harvesterExitMaxAgeMs,
  harvesterExitMaxSizeB,
  logLevel,
  javaOptsVar,
}) => {
  const { t } = useCryostatTranslation();

  const getHarvesterDisplayName = (template: HarvesterTemplate): string => {
    if (!template) return t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_NONE');
    if (template === 'Continuous') return t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_CONTINUOUS');
    if (template === 'Profiling') return t('DEPLOYMENT_ACTION_HARVESTER_TEMPLATE_PROFILING');
    return template;
  };

  return (
    <DescriptionList isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_INSTANCE')}</DescriptionListTerm>
        <DescriptionListDescription>
          {selectedInstance
            ? `${selectedInstance.metadata?.name} (ns: ${selectedInstance.metadata?.namespace})`
            : t('DEPLOYMENT_ACTION_EMPTY_OPTION')}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_CONTAINER')}</DescriptionListTerm>
        <DescriptionListDescription>
          {selectedContainer ? `${selectedContainer.name} (${selectedContainer.image})` : '-'}
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_JAVA_OPTS_VAR')}</DescriptionListTerm>
        <DescriptionListDescription>{javaOptsVar}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_HARVESTER')}</DescriptionListTerm>
        <DescriptionListDescription>{getHarvesterDisplayName(harvesterTemplate)}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_HARVESTER_PERIOD')}</DescriptionListTerm>
        <DescriptionListDescription>{formatDuration(harvesterPeriodMs, 1)}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_HARVESTER_MAX_FILES')}</DescriptionListTerm>
        <DescriptionListDescription>{harvesterMaxFiles}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_HARVESTER_EXIT_MAX_AGE')}</DescriptionListTerm>
        <DescriptionListDescription>{formatDuration(harvesterExitMaxAgeMs, 1)}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_HARVESTER_EXIT_MAX_SIZE')}</DescriptionListTerm>
        <DescriptionListDescription>{formatBytes(harvesterExitMaxSizeB, 0)}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>{t('DEPLOYMENT_ACTION_REVIEW_LOG_LEVEL')}</DescriptionListTerm>
        <DescriptionListDescription>{logLevel.toUpperCase()}</DescriptionListDescription>
      </DescriptionListGroup>
    </DescriptionList>
  );
};
