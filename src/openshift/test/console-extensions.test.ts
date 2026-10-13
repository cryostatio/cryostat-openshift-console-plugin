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
import { extensions } from '../../../console-extensions';
import { pluginMetadata } from '../../../console-plugin-metadata';
import common from '../../../locales/en/common.json';

const findRoute = (path: string) =>
  extensions.find((extension) => extension.type === 'console.page/route' && extension.properties.path === path);

const findNavItem = (id: string) =>
  extensions.find((extension) => extension.type === 'console.navigation/href' && extension.properties.id === id);

describe('console extensions', () => {
  it.each([
    ['/cryostat/analyze-thread-dumps', 'ThreadDumpAnalysisPage'],
    ['/cryostat/analyze-heap-dumps', 'HeapDumpAnalysisPage'],
  ])('registers the hidden %s route', (path, codeRef) => {
    const route = findRoute(path);

    expect(route).toBeDefined();
    expect(route?.properties).toMatchObject({
      exact: true,
      component: { $codeRef: codeRef },
    });
    expect(pluginMetadata.exposedModules?.[codeRef]).toBe(`./openshift/pages/${codeRef}`);
    expect(findNavItem(path.replace('/cryostat/', ''))).toBeUndefined();
  });

  it.each([
    ['/cryostat/recording-analytics', 'RecordingAnalyticsPage', 'recording-analytics', 'Navigation.Analytics'],
    ['/cryostat/triggers', 'TriggersPage', 'triggers', 'Navigation.Triggers'],
  ])('registers the %s route and its navigation item', (path, codeRef, navId, labelKey) => {
    const route = findRoute(path);

    expect(route).toBeDefined();
    expect(route?.properties).toMatchObject({
      exact: true,
      component: { $codeRef: codeRef },
    });
    expect(pluginMetadata.exposedModules?.[codeRef]).toBe(`./openshift/pages/${codeRef}`);

    const navItem = findNavItem(navId);

    expect(navItem?.properties).toMatchObject({
      href: path,
      name: `%plugin__cryostat-plugin~${labelKey}%`,
      perspective: 'admin',
      section: 'cryostat-section',
    });
    expect(common[labelKey]).toBeDefined();
  });

  it('labels dump archive navigation items as archives', () => {
    expect(common['Navigation.ThreadDumps']).toBe('Thread Dump Archives');
    expect(common['Navigation.HeapDumps']).toBe('Heap Dump Archives');
  });

  it('exposes every routed component as a federated module', () => {
    const codeRefs = extensions
      .filter((extension) => extension.type === 'console.page/route')
      .map((extension) => (extension.properties.component as { $codeRef: string }).$codeRef);

    codeRefs.forEach((codeRef) => expect(pluginMetadata.exposedModules?.[codeRef]).toBeDefined());
  });
});
