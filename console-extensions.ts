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

import {
  HrefNavItem,
  NavSection,
  ResourceActionProvider,
  RoutePage,
  Separator,
  TopologyDecoratorProvider,
} from '@openshift-console/dynamic-plugin-sdk';
import { EncodedExtension } from '@openshift-console/dynamic-plugin-sdk-webpack';

// Dashboard page route
const dashboardRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/',
    component: { $codeRef: 'DashboardPage' },
  },
};

// Dashboard solo page route
const dashboardSoloRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/d-solo',
    component: { $codeRef: 'DashboardSoloPage' },
  },
};

// Topology page route
const topologyRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/topology',
    component: { $codeRef: 'TopologyPage' },
  },
};

// Automated Rules page route
const rulesRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/rules',
    component: { $codeRef: 'AutomatedRulesPage' },
  },
};

// Reports page route
const reportsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/reports',
    component: { $codeRef: 'ReportsPage' },
  },
};

// Recordings page route
const recordingsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/recordings',
    component: { $codeRef: 'RecordingsPage' },
  },
};

// Archives page route
const archivesRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/archives',
    component: { $codeRef: 'ArchivesPage' },
  },
};

// Events page route
const eventsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/events',
    component: { $codeRef: 'EventsPage' },
  },
};

// Instrumentation page route
const instrumentationRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/instrumentation',
    component: { $codeRef: 'InstrumentationPage' },
  },
};

// Diagnostics page route
const diagnosticsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/diagnostics',
    component: { $codeRef: 'DiagnosticsPage' },
  },
};

// Thread Dumps page route
const threadDumpsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/thread-dumps',
    component: { $codeRef: 'ThreadDumpsPage' },
  },
};

// Heap Dumps page route
const heapDumpsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/heapdumps',
    component: { $codeRef: 'HeapDumpsPage' },
  },
};

// Certificates page route
const certificatesRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/certificates',
    component: { $codeRef: 'CertificatesPage' },
  },
};

// Credentials page route
const credentialsRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/credentials',
    component: { $codeRef: 'CredentialsPage' },
  },
};

// About page route
const aboutRoute: EncodedExtension<RoutePage> = {
  type: 'console.page/route',
  properties: {
    exact: true,
    path: '/cryostat/about',
    component: { $codeRef: 'AboutPage' },
  },
};

// Navigation section for Cryostat
const cryostatSection: EncodedExtension<NavSection> = {
  type: 'console.navigation/section',
  properties: {
    id: 'cryostat-section',
    perspective: 'admin',
    name: '%plugin__cryostat-plugin~Cryostat%',
  },
};

// Dashboard navigation link
const dashboardNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'dashboard',
    name: '%plugin__cryostat-plugin~Navigation.Dashboard%',
    href: '/cryostat/',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Topology navigation link
const topologyNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'topology',
    name: '%plugin__cryostat-plugin~Navigation.Topology%',
    href: '/cryostat/topology',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// First separator after topology
const firstSeparator: EncodedExtension<Separator> = {
  type: 'console.navigation/separator',
  properties: {
    id: 'pf-separator-1',
    section: 'cryostat-section',
    insertAfter: 'topology',
  },
};

// Recordings navigation link
const recordingsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'recordings',
    name: '%plugin__cryostat-plugin~Navigation.Recordings%',
    href: '/cryostat/recordings',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Archives navigation link
const archivesNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'archives',
    name: '%plugin__cryostat-plugin~Navigation.Archives%',
    href: '/cryostat/archives',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Events navigation link
const eventsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'events',
    name: '%plugin__cryostat-plugin~Navigation.Events%',
    href: '/cryostat/events',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Automated Rules navigation link
const rulesNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'rules',
    name: '%plugin__cryostat-plugin~Navigation.Automated_Rules%',
    href: '/cryostat/rules',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Reports navigation link
const reportsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'reports',
    name: '%plugin__cryostat-plugin~Navigation.Reports%',
    href: '/cryostat/reports',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Instrumentation navigation link
const instrumentationNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'instrumentation',
    name: '%plugin__cryostat-plugin~Navigation.Instrumentation%',
    href: '/cryostat/instrumentation',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Second separator after instrumentation
const secondSeparator: EncodedExtension<Separator> = {
  type: 'console.navigation/separator',
  properties: {
    id: 'pf-separator-2',
    section: 'cryostat-section',
    insertAfter: 'instrumentation',
  },
};

// Diagnostics navigation link
const diagnosticsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'diagnostics',
    name: '%plugin__cryostat-plugin~Navigation.Diagnostics%',
    href: '/cryostat/diagnostics',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Thread Dumps navigation link
const threadDumpsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'threaddumps',
    name: '%plugin__cryostat-plugin~Navigation.ThreadDumps%',
    href: '/cryostat/thread-dumps',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Heap Dumps navigation link
const heapDumpsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'heapdumps',
    name: '%plugin__cryostat-plugin~Navigation.HeapDumps%',
    href: '/cryostat/heapdumps',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Third separator after heap dumps
const thirdSeparator: EncodedExtension<Separator> = {
  type: 'console.navigation/separator',
  properties: {
    id: 'pf-separator-3',
    section: 'cryostat-section',
    insertAfter: 'heapdumps',
  },
};

// Certificates navigation link
const certificatesNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'certificates',
    name: '%plugin__cryostat-plugin~Navigation.Certificates%',
    href: '/cryostat/certificates',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Credentials navigation link
const credentialsNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'credentials',
    name: '%plugin__cryostat-plugin~Navigation.Credentials%',
    href: '/cryostat/credentials',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// About navigation link
const aboutNavItem: EncodedExtension<HrefNavItem> = {
  type: 'console.navigation/href',
  properties: {
    id: 'about',
    name: '%plugin__cryostat-plugin~Navigation.About%',
    href: '/cryostat/about',
    perspective: 'admin',
    section: 'cryostat-section',
  },
};

// Deployment label action provider
const deploymentActionProvider: EncodedExtension<ResourceActionProvider> = {
  type: 'console.action/resource-provider',
  properties: {
    model: {
      group: 'apps',
      version: 'v1',
      kind: 'Deployment',
    },
    provider: {
      $codeRef: 'DeploymentLabelActionProvider',
    },
  },
};

// Topology decorator for Cryostat-enabled deployments
const deploymentDecorator: EncodedExtension = {
  type: 'console.topology/decorator/provider',
  properties: {
    id: 'cryostat-deployment-decorator',
    priority: 100,
    quadrant: 'upperLeft',
    decorator: {
      $codeRef: 'getDeploymentDecorator',
    },
  },
};

export const extensions: EncodedExtension[] = [
  // Routes
  dashboardRoute,
  dashboardSoloRoute,
  topologyRoute,
  rulesRoute,
  reportsRoute,
  recordingsRoute,
  archivesRoute,
  eventsRoute,
  instrumentationRoute,
  diagnosticsRoute,
  threadDumpsRoute,
  heapDumpsRoute,
  certificatesRoute,
  credentialsRoute,
  aboutRoute,
  // Navigation
  cryostatSection,
  dashboardNavItem,
  topologyNavItem,
  firstSeparator,
  recordingsNavItem,
  archivesNavItem,
  eventsNavItem,
  rulesNavItem,
  reportsNavItem,
  instrumentationNavItem,
  secondSeparator,
  diagnosticsNavItem,
  threadDumpsNavItem,
  heapDumpsNavItem,
  thirdSeparator,
  certificatesNavItem,
  credentialsNavItem,
  aboutNavItem,
  // Actions and decorators
  deploymentActionProvider,
  deploymentDecorator,
];
