// Import commands.js using ES2015 syntax:
import './login';
import { ConsoleWindowType } from './types';

export const checkErrors = () =>
  cy.window().then((win: ConsoleWindowType) => {
    assert.isTrue(!win.windowError, win.windowError);
  });
