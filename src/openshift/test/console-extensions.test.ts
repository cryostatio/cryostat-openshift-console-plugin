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

describe('console extensions', () => {
  it('registers the console.context-provider extension with the service context hook', () => {
    const provider = extensions.find((e) => e.type === 'console.context-provider');

    expect(provider).toBeDefined();
    expect(provider?.properties).toMatchObject({
      provider: { $codeRef: 'CryostatContextProvider' },
      useValueHook: { $codeRef: 'useCryostatServiceContextValue' },
    });
    expect(pluginMetadata.exposedModules?.CryostatContextProvider).toBe(
      './openshift/components/CryostatServiceContext',
    );
    expect(pluginMetadata.exposedModules?.useCryostatServiceContextValue).toBe(
      './openshift/components/CryostatServiceContext',
    );
  });

  it('registers the hidden thread dump analysis route', () => {
    const route = extensions.find(
      (extension) =>
        extension.type === 'console.page/route' && extension.properties.path === '/cryostat/analyze-thread-dumps',
    );

    expect(route).toBeDefined();
    expect(route?.properties).toMatchObject({
      exact: true,
      component: { $codeRef: 'ThreadDumpAnalysisPage' },
    });
    expect(pluginMetadata.exposedModules?.ThreadDumpAnalysisPage).toBe('./openshift/pages/ThreadDumpAnalysisPage');
  });

  it('registers the dashboard route at /cryostat/dashboard, not /cryostat/', () => {
    const route = extensions.find(
      (e) =>
        e.type === 'console.page/route' &&
        (e.properties as { component: unknown }).component?.['$codeRef'] === 'DashboardPage',
    );

    expect(route).toBeDefined();
    expect((route?.properties as { path: string }).path).toBe('/cryostat/dashboard');
    expect((route?.properties as { path: string }).path).not.toBe('/cryostat/');
  });

  it('restricts dashboard nav item active-highlighting to dashboard-only paths via startsWith', () => {
    const navItem = extensions.find(
      (e) => e.type === 'console.navigation/href' && (e.properties as { id: string }).id === 'dashboard',
    );

    expect(navItem).toBeDefined();
    expect((navItem?.properties as { href: string }).href).toBe('/cryostat/dashboard');
    expect((navItem?.properties as { startsWith: string[] }).startsWith).toEqual([
      '/cryostat/dashboard',
      '/cryostat/d-solo',
    ]);
  });

  it('labels dump archive navigation items as archives', () => {
    expect(common['Navigation.ThreadDumps']).toBe('Thread Dump Archives');
    expect(common['Navigation.HeapDumps']).toBe('Heap Dump Archives');
  });
});
