import { chart } from "../../page-objects-and-services/page-objects/chart-Obects";
import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
const chartPage = new chart();
const login = new LoginPage();



describe("Chart Operations", () => {

    let chartNames = [];

    before(() => {
      const envList = Cypress.env("CHART_NAMES");
      if (!envList || typeof envList !== "string") {
        throw new Error("No dashboard names provided. Set ITEM_NAMES env var.");
      }
      chartNames = envList.split(",").map((name) => name.trim());
    });

    it("e", () => {

        cy.log("Logging in...");
        login.visitInstance1();
        login.enterUsername(Cypress.env("username"));
        login.enterPassword(Cypress.env("password"));
        login.clickLoginButton();
        cy.wait(2000);

        chartPage.visitChartPage();
        cy.wait(5000);

        chartPage.bulkExportChart(chartNames);



    });


});