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
import { ConsolePluginBuildMetadata } from '@openshift-console/dynamic-plugin-sdk-webpack';

export const pluginMetadata: ConsolePluginBuildMetadata = {
  name: 'cryostat-plugin',
  version: '4.2.0-dev',
  displayName: 'Cryostat OpenShift Console Plugin',
  description: 'OpenShift Console plugin for Cryostat',
  exposedModules: {
    AboutPage: './openshift/pages/AboutPage',
    DashboardPage: './openshift/pages/DashboardPage',
    DashboardSoloPage: './openshift/pages/DashboardSoloPage',
    TopologyPage: './openshift/pages/TopologyPage',
    AutomatedRulesPage: './openshift/pages/AutomatedRulesPage',
    ReportsPage: './openshift/pages/ReportsPage',
    RecordingsPage: './openshift/pages/RecordingsPage',
    ArchivesPage: './openshift/pages/ArchivesPage',
    EventsPage: './openshift/pages/EventsPage',
    InstrumentationPage: './openshift/pages/InstrumentationPage',
    DiagnosticsPage: './openshift/pages/DiagnosticsPage',
    ThreadDumpsPage: './openshift/pages/ThreadDumpsPage',
    HeapDumpsPage: './openshift/pages/HeapDumpsPage',
    CertificatesPage: './openshift/pages/CertificatesPage',
    CredentialsPage: './openshift/pages/CredentialsPage',
    DeploymentLabelActionProvider: './openshift/actions/DeploymentLabelAction/DeploymentLabelActionProvider',
    getDeploymentDecorator: './openshift/actions/DeploymentLabelAction/getDeploymentDecorator',
  },
  dependencies: {
    '@console/pluginAPI': '>=4.19.0-0',
  },
};
