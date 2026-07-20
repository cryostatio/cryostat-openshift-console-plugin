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
import type { DeploymentKind } from '@openshift/api-types/dist/kubernetes/apps/v1';
import type { ServiceKind } from '@openshift/api-types/dist/kubernetes/core/v1';
import { K8sResourceKind } from '@openshift-console/dynamic-plugin-sdk';

export const mockDeploymentWithLabels = {
  metadata: { name: 'test-app', namespace: 'test-namespace' },
  kind: 'Deployment',
  apiVersion: 'apps/v1',
  spec: {
    template: {
      metadata: {
        labels: {
          'cryostat.io/name': 'cryostat-operator',
          'cryostat.io/namespace': 'cryostat-operator-ns',
        },
      },
      spec: {
        containers: [
          {
            name: 'app-container',
            image: 'quay.io/app:latest',
            env: [],
          },
        ],
      },
    },
  },
} as unknown as DeploymentKind;

export const mockDeploymentWithHelmLabels = {
  metadata: { name: 'test-app', namespace: 'test-namespace' },
  spec: {
    template: {
      metadata: {
        labels: {
          'cryostat.io/name': 'cryostat-helm',
          'cryostat.io/namespace': 'cryostat-helm-ns',
        },
      },
      spec: {
        containers: [
          {
            name: 'app-container',
            image: 'quay.io/app:latest',
            env: [],
          },
        ],
      },
    },
  },
} as unknown as DeploymentKind;

export const mockDeploymentWithoutLabels = {
  metadata: { name: 'test-app', namespace: 'test-namespace' },
  kind: 'Deployment',
  apiVersion: 'apps/v1',
  spec: {
    template: {
      metadata: { labels: {} },
      spec: {
        containers: [
          {
            name: 'app-container',
            image: 'quay.io/app:latest',
            env: [],
          },
        ],
      },
    },
  },
} as unknown as DeploymentKind;

export const mockCryostatList = [
  { metadata: { name: 'cryostat-operator', namespace: 'cryostat-operator-ns' } },
  { metadata: { name: 'cryostat-helm', namespace: 'cryostat-helm-ns' } },
] as ServiceKind[];

export const mockOperatorCryostatList = [
  {
    metadata: { name: 'cryostat-operator', namespace: 'cryostat-operator-ns' },
    spec: { targetNamespaces: ['test-namespace'] },
  },
] as K8sResourceKind[];

export const mockOperatorCryostatListWithoutTargetNamespaces = [
  {
    metadata: { name: 'cryostat-operator', namespace: 'cryostat-operator-ns' },
    spec: { targetNamespaces: [] },
  },
] as K8sResourceKind[];
