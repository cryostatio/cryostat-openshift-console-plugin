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
import { checkErrors } from '../support';

describe('Cryostat OpenShift Console Plugin tests', () => {
  before(() => {
    cy.login();
  });

  beforeEach(() => {
    cy.reload();
  });

  afterEach(() => {
    checkErrors();
  });

  after(() => {
    cy.logout();
  });

  it('should visit each page without errors', () => {
    const pages = ['About', 'Dashboard', 'Topology', 'Automated Rules', 'Archives', 'Events', 'Security'];
    cy.contains('[class="pf-v5-c-nav__link"]', 'Cryostat').click();
    pages.forEach((page) => {
      cy.get('[class="pf-v5-c-nav__link"]').get('[href^="/cryostat"]').contains(page).click();
      checkErrors();
    });
  });
});
