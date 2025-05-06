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

export const isLocalDevEnvironment = Cypress.config('baseUrl').includes('localhost');

describe('Dashboard page tests', () => {
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

  it('should have the url /cryostat/', () => {
    cy.contains('[class="pf-v5-c-nav__link"]', 'Cryostat').click();
    cy.get('[data-test="nav"]').contains('Dashboard').click();
    cy.url().should('include', '/cryostat/');
  });

  it('should refresh the metrics charts after 10 seconds', () => {
    cy.contains('[class="pf-v5-c-nav__link"]', 'Cryostat').click();
    cy.contains('[class="pf-v5-c-nav__link"]', 'Cryostat').get('[data-test="nav"]').contains('Dashboard').click();

    // select the first Cryostat instance, and first target available
    cy.get('div[aria-label="cryostat-selector"]').find('button').click();
    cy.get('div[aria-label="cryostat-selector-dropdown"]').find('button[tabindex="0"]').click();

    // select the first Cryostat target available
    cy.get('button[aria-label="Select Target"]').find('[class="pf-v5-c-menu-toggle__text"]').click();
    cy.get('div[data-ouia-component-type="PF5/Dropdown"]')
      .find('button[tabindex="0"]')
      .find('span[class=pf-v5-c-menu__item-text]')
      .click();

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(11000); // charts update every 10 seconds
    cy.get('text[id="chart-axis-1-ChartLabel-0"]').find('tspan').first().should('not.contain.text', '5.0e-11');
  });

  it('should refresh the d-solo charts after 10 seconds', () => {
    cy.contains('[class="pf-v5-c-nav__link"]', 'Cryostat').click();
    cy.contains('[class="pf-v5-c-nav__link"]', 'Cryostat').get('[data-test="nav"]').contains('Dashboard').click();

    // select the first Cryostat instance, and first target available
    cy.get('div[aria-label="cryostat-selector"]').find('button').click();
    cy.get('div[aria-label="cryostat-selector-dropdown"]').find('button[tabindex="0"]').click();

    // select the first Cryostat target available
    cy.get('button[aria-label="Select Target"]').find('[class="pf-v5-c-menu-toggle__text"]').click();
    cy.get('div[data-ouia-component-type="PF5/Dropdown"]')
      .find('button[tabindex="0"]')
      .find('span[class=pf-v5-c-menu__item-text]')
      .click();

    // view the dashboard solo page of the first available metric card
    cy.get('button[aria-label="dashboard action toggle"]').first().click();
    cy.get('div[data-ouia-component-type="PF5/Dropdown"]').find('button[tabindex="0"]').first().click();

    cy.url().should('include', '/cryostat/d-solo');

    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(11000); // charts update every 10 seconds
    cy.get('text[id="chart-axis-1-ChartLabel-0"]').find('tspan').first().should('not.contain.text', '5.0e-11');
  });
});
