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
import CryostatIcon from '@console-plugin/assets/CryostatIcon';
import { k8sGet, K8sResourceKind, useK8sModel, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import { Node } from '@patternfly/react-topology';
import * as React from 'react';

type DeploymentDecoratorProps = {
  element: Node;
  radius: number;
  x: number;
  y: number;
};

export const DeploymentDecorator: React.FC<DeploymentDecoratorProps> = ({ element, radius, x, y }) => {
  const [routeModel] = useK8sModel({ group: 'route.openshift.io', version: 'v1', kind: 'Route' });
  const routeUrl = React.useRef('');
  const [isInTargetNamespaces, setIsInTargetNamespaces] = React.useState(true);
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [deployment, deploymentLoaded] = useK8sWatchResource<K8sResourceKind>({
    groupVersionKind: {
      group: 'apps',
      version: 'v1',
      kind: 'Deployment',
    },
    name: element['resource']?.metadata?.name || undefined,
    namespace: element['resource']?.metadata?.namespace || undefined,
  });
  const [cryostats] = useK8sWatchResource<K8sResourceKind[]>({
    groupVersionKind: {
      group: 'operator.cryostat.io',
      version: 'v1beta2',
      kind: 'Cryostat',
    },
    isList: true,
  });

  React.useEffect(() => {
    if (deploymentLoaded) {
      setIsInTargetNamespaces(true);
      const deploymentNamespace = deployment.metadata?.namespace || '';
      const deploymentLabels = deployment.spec?.template.metadata.labels;
      if (deploymentLabels && deploymentLabels['cryostat.io/name'] && deploymentLabels['cryostat.io/namespace']) {
        setIsRegistered(true);
        cryostats.forEach((cryostat) => {
          if (
            cryostat.metadata?.name == deploymentLabels['cryostat.io/name'] &&
            cryostat.metadata?.namespace == deploymentLabels['cryostat.io/namespace']
          ) {
            if (!(cryostat.spec?.targetNamespaces as string[]).includes(deploymentNamespace)) {
              setIsInTargetNamespaces(false);
              return;
            }
          }
        });
      }
    }
  }, [cryostats, deployment, deploymentLoaded]);

  React.useEffect(() => {
    if (deploymentLoaded) {
      const labels = deployment.spec?.template.metadata.labels;
      if (labels && labels['cryostat.io/name'] && labels['cryostat.io/namespace']) {
        cryostats.forEach((cryostat) => {
          if (
            cryostat.metadata?.name === labels['cryostat.io/name'] &&
            cryostat.metadata?.namespace === labels['cryostat.io/namespace']
          ) {
            k8sGet({
              model: routeModel,
              name: labels['cryostat.io/name'],
              ns: labels['cryostat.io/namespace'],
            })
              .catch(() => '')
              .then(
                (route: any) => {
                  const ingresses = route?.status?.ingress;
                  let res = '';
                  if (ingresses && ingresses?.length > 0 && ingresses[0]?.host) {
                    res = `http://${ingresses[0].host}`;
                  }
                  routeUrl.current = res;
                },
                () => {
                  routeUrl.current = '';
                },
              );
          }
        });
      }
    }
  }, [cryostats, deployment, deploymentLoaded, routeModel]);

  if (element['resourceKind'] === 'apps~v1~Deployment' && isRegistered) {
    return (
      <a
        className="odc-decorator__link"
        href={`${routeUrl.current}/topology`}
        target="_blank"
        rel="noopener noreferrer"
        role="button"
        aria-label="Open Cryostat"
      >
        <g className="pf-topology__node__decorator odc-decorator cryostat-decorator">
          <circle className="pf-topology__node__decorator__bg" cx={x} cy={y} r={radius}></circle>
          <g transform={`translate(${x}, ${y})`}>
            <g transform="translate(-6.5, -6.5)">
              <CryostatIcon width={`${radius}px`} height={`${radius}px`}></CryostatIcon>
            </g>
          </g>
          {!isInTargetNamespaces && (
            <g transform={`translate(${radius * 0.75})`}>
              <g transform="scale(0.5)">
                <ExclamationTriangleIcon style={{ fill: '#ffcc17' }} />
              </g>
            </g>
          )}
        </g>
      </a>
    );
  }
  return <></>;
};

export default DeploymentDecorator;
