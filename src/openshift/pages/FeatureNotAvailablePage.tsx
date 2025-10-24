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
import '@app/app.css';
import { useCryostatTranslation } from '@i18n/i18nextUtil';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

type FeatureNotAvailablePageProps = {
  currentVersion: String;
  requiredVersion: String;
};

export const FeatureNotAvailablePage: React.FC<FeatureNotAvailablePageProps> = ({
  currentVersion,
  requiredVersion,
}) => {
  const { t } = useCryostatTranslation();
  return (
    <EmptyState variant="full">
      <EmptyStateHeader
        titleText={t('FEATURE_NOT_AVAILABLE_PAGE_TITLE')}
        icon={<EmptyStateIcon icon={ExclamationTriangleIcon} />}
        headingLevel="h1"
      />
      <EmptyStateBody>
        <TextContent>
          <Text component={TextVariants.p}>
            {t('CURRENT_VERSION', {
              currentVersion: currentVersion,
            })}
          </Text>
          <Text component={TextVariants.p}>
            {t('REQUIRED_VERSION', {
              requiredVersion: requiredVersion,
            })}
          </Text>
        </TextContent>
      </EmptyStateBody>
    </EmptyState>
  );
};
