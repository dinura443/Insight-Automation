import { LoginPage } from "../../page-objects-and-services/page-objects/Login";

const loginPage = new LoginPage();

describe("Initialize session cookies", () => {
  it("Login to Instance 1 and save session", () => {
    loginPage.visitInstance1();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    cy.getCookie("session").should("exist").then((cookie) => {
      cy.writeFile("cypress/fixtures/session_instance1.json", { value: cookie.value });
    });
  });

  it("Login to Instance 2 and save session", () => {
    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    cy.getCookie("session").should("exist").then((cookie) => {
      cy.writeFile("cypress/fixtures/session_instance2.json", { value: cookie.value });
    });
  });
});
