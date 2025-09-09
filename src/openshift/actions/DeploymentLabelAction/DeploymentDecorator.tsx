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
import { cryostatInstanceResource } from '@console-plugin/utils/utils';
import {
  k8sGet,
  K8sResourceCommon,
  K8sResourceKind,
  useK8sModel,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk';
import { Node } from '@patternfly/react-topology';
import * as React from 'react';
import CryostatIcon from './CryostatIcon';

type DeploymentDecoratorProps = {
  element: Node;
  radius: number;
  x: number;
  y: number;
};

export const DeploymentDecorator: React.FC<DeploymentDecoratorProps> = ({ element, radius, x, y }) => {
  const [instances] = useK8sWatchResource<K8sResourceCommon[]>(cryostatInstanceResource);
  const [routeModel] = useK8sModel({ group: 'route.openshift.io', version: 'v1', kind: 'Route' });
  const routeUrl = React.useRef('');
  if (element['resourceKind'] === 'apps~v1~Deployment') {
    const resource: K8sResourceKind = element['resource'];
    const labels = resource.spec?.template.metadata.labels;
    if (labels['cryostat.io/name'] && labels['cryostat.io/namespace']) {
      for (let i = 0; i < instances.length; i++) {
        if (
          instances[i].metadata?.name === labels['cryostat.io/name'] &&
          instances[i].metadata?.namespace === labels['cryostat.io/namespace']
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
      }
      return (
        <a
          className="odc-decorator__link"
          href={`${routeUrl.current}/topology`}
          target="_blank"
          rel="noopener noreferrer"
          role="button"
          aria-label="Open Cryostat"
        >
          <g className="pf-topology__node__decorator odc-decorator">
            <circle className="pf-topology__node__decorator__bg" cx={x} cy={y} r={radius}></circle>
            <g transform={`translate(${x}, ${y})`}>
              <g transform="translate(-6.5, -6.5)">
                <CryostatIcon width={`${radius}px`} height={`${radius}px`}></CryostatIcon>
              </g>
            </g>
          </g>
        </a>
      );
    }
  }
  return <></>;
};

export default DeploymentDecorator;
