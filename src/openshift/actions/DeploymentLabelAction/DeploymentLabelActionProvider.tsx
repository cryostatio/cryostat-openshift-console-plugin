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
import { Action, K8sResourceKind, useK8sModel, useModal } from '@openshift-console/dynamic-plugin-sdk';
import * as React from 'react';
import { DeploymentLabelActionModal } from './DeploymentLabelActionModal';

const DeploymentLabelActionProvider = (resource: K8sResourceKind) => {
  const [kindObj, inFlight] = useK8sModel({ group: 'apps', version: 'v1', kind: 'Deployment' });
  const { t } = useCryostatTranslation();
  const launcher = useModal();
  const actions = React.useMemo<Action[]>(
    () => [
      {
        id: 'cryostat-deployment-action',
        label: t('DEPLOYMENT_ACTION_TITLE'),
        cta: () => {
          launcher(DeploymentLabelActionModal, { kind: kindObj, resource });
        },
      },
    ],
    [kindObj, launcher, resource, t],
  );
  return [actions, !inFlight];
};

export default DeploymentLabelActionProvider;
