// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:

import 'cypress-xpath';
import './commands'
import 'cypress-file-upload';
import 'cypress-xpath';
import '@mmisty/cypress-allure-adapter/support';
// @ts-ignore
import registerCypressGrep from '@cypress/grep'
registerCypressGrep()

//cypress terminal log
require('cypress-terminal-report/src/installLogsCollector')();
require('cypress-downloadfile/lib/downloadFileCommand');

Cypress.on("uncaught:exception", (err, runnable) => {
    if (err.message.includes("ResizeObserver loop limit exceeded")) {
      // Ignore ResizeObserver errors
      return false;
    }
    // Rethrow other errors
    return true;
  });

// void un-expected token and syntax errors while execute test
Cypress.on('uncaught:exception', (err, runnable) => {
    console.log(err);
    return false;
})
// Alternatively you can use CommonJS syntax:
// require('./commands')
// example adding host and thread to see in timeline
Cypress.Allure?.on('test:started', () => {
    Cypress.Allure.host('my-host');
    Cypress.Allure.thread(Cypress.env('thread') ?? '01');
    Cypress.Allure.parentSuite('cypress-ts');
})