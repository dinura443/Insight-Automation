export class LoginPage {
  usernameInput = "#username";
  passwordInput = "#password";
  loginButton = "#kc-login";

  instance1LoginUrl = Cypress.env("instance1Login");
  instance2LoginUrl = Cypress.env("instance2Login");

  visitInstance1() {
    cy.log(`Navigating to Instance 1 Login URL: ${this.instance1LoginUrl}`);
    cy.visit(this.instance1LoginUrl);
  }

  visitInstance2() {
    cy.log(`Navigating to Instance 2 Login URL: ${this.instance2LoginUrl}`);
    cy.visit(this.instance2LoginUrl);
  }

  enterUsername() {
    const username = Cypress.env("username"); 
    cy.log(`Entering username: ${username}`);
    cy.get(this.usernameInput).clear().type(username);
  }

  enterPassword() {
    const password = Cypress.env("password"); 
    cy.log(`Entering password: ${password}`);
    cy.get(this.passwordInput).clear().type(password);
  }

  clickLoginButton() {
    cy.log("Clicking the login button...");
    cy.get(this.loginButton, { timeout: 10000 })
      .should('be.visible')
      .click();
}
}