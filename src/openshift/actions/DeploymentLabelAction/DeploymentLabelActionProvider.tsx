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
