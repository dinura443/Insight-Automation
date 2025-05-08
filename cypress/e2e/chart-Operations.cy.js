import { chart } from "../../page-objects-and-services/page-objects/chart-Obects";
import { login } from "../../page-objects-and-services/page-objects/login-Objects";

const chartPage = new chart();
const login = new login();

chartPage.visitChartPage();


describe("Chart Operations", () => {

    it("", () => {

        cy.log("Logging in...");
        login.visitInstance1();
        login.enterUsername(Cypress.env("username"));
        login.enterPassword(Cypress.env("password"));
        login.clickLoginButton();
        cy.wait(2000);

        chartPage.visitChartPage();
        cy.wait(2000);

        chartPage.bulkExportChart();



    });


});