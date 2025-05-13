/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       login(email: string, password: string): Chainable<void>
//       drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
//       visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
//     }
//   }
// }
require('cypress-downloadfile/lib/downloadFileCommand');

// @ts-ignore
Cypress.Commands.add('resolve_promise', (timeout) => {
    // Log the wait time if needed
    // cy.log(⁠ Custom wait for ${timeout} ms ⁠);

    // Use Cypress.Promise to simulate the wait without logging
    return new Cypress.Promise(resolve => {

        setTimeout(() => {
            resolve();
            // @ts-ignore
        }, timeout);
    });
});
// @ts-ignore
Cypress.Commands.add('launch_makeit', () => {
    cy.visit({
        url: 'https://productionadminqa.makeitmes.com/homepage', // Replace with your website URL
        failOnStatusCode: false,
    });
});
