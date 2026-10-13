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
import { HeapDumpAnalysis } from '@app/Diagnostics/Analysis/HeapDumps/HeapDumpAnalysis';
import { CryostatContainer } from '@console-plugin/components/CryostatContainer';
import '@app/app.css';
import { VersionGate } from '@console-plugin/components/VersionGate';

export default function HeapDumpAnalysisPage() {
  return (
    <CryostatContainer>
      <VersionGate requiredVersion={'4.3.0'}>
        <HeapDumpAnalysis />
      </VersionGate>
    </CryostatContainer>
  );
}
