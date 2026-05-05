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

  it('labels dump archive navigation items as archives', () => {
    expect(common['Navigation.ThreadDumps']).toBe('Thread Dump Archives');
    expect(common['Navigation.HeapDumps']).toBe('Heap Dump Archives');
  });
});
