import { TopologyDecoratorGetter } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/topology-types';
import { Node } from '@patternfly/react-topology';
import * as React from 'react';
import DeploymentDecorator from './DeploymentDecorator';

const getDeploymentDecorator: TopologyDecoratorGetter = (element: Node, radius: number, x: number, y: number) => {
  return <DeploymentDecorator key="cryostat-deployment-decorator" element={element} radius={radius} x={x} y={y} />;
};

export default getDeploymentDecorator;
