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
import { isVersionEqualOrGreaterThan } from '@console-plugin/utils/utils';
import '@testing-library/jest-dom';

describe('Utils', () => {
  const targetVersion = '4.1.0';

  it('isVersionEqualOrGreaterThan() should return false if the compared version is less', async () => {
    expect(isVersionEqualOrGreaterThan('4.0.0-dev', targetVersion)).toBe(false);
  });

  it('isVersionEqualOrGreaterThan() should return true if the compared version is equal', async () => {
    expect(isVersionEqualOrGreaterThan('4.1.0', targetVersion)).toBe(true);
  });

  it('isVersionEqualOrGreaterThan() should return true if the compared version is higher', async () => {
    expect(isVersionEqualOrGreaterThan('4.1.1', targetVersion)).toBe(true);
  });

  it('isVersionEqualOrGreaterThan() should return false if the compared version is not a version string', async () => {
    expect(isVersionEqualOrGreaterThan('not-a-version', targetVersion)).toBe(false);
  });
});
