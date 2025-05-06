import { checkErrors } from '../support';

export const isLocalDevEnvironment = Cypress.config('baseUrl')?.includes('localhost');

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
