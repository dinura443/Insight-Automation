import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard";

const login = new LoginPage();
const dashboard = new DashBoard();

describe("Bulk Dashboard Export", () => {
    let dashboardNames = [];

    before(() => {
      // Get dashboard names from env
      const envList = Cypress.env("DASHBOARD_NAMES");
  
      // Ensure we got something valid
      if (!envList || typeof envList !== "string" || envList.trim() === "") {
        throw new Error("No dashboard names provided! Set DASHBOARD_NAMES env var.");
      }
  
      // Split into array and trim whitespace
      dashboardNames = envList.split(",").map((name) => name.trim());
  
      cy.log(`Dashboards to export: ${dashboardNames.join(", ")}`);
    });
    beforeEach(() => {
      login.visitInstance1();
      login.enterUsername(Cypress.env("username"));
      login.enterPassword(Cypress.env("password"));
      login.clickLoginButton();
      dashboard.visitDashboard();
    });
  
    it("Should export selected dashboards in bulk", () => {
      dashboard.bulkExportDashboards(dashboardNames);
    });
  });