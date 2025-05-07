import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard";

const login = new LoginPage();
const dashboard = new DashBoard();

describe("Bulk Dashboard Export", () => {

    let dashboardNames = [];

    before(() => {
        const envNames = Cypress.env("DASHBOARD_NAMES");
        if (envNames && typeof envNames === "string") {
          dashboardNames = envNames.split(",").map((name) => name.trim());
        } else {
          cy.fixture("default-dashboards.json").then((data) => {
            dashboardNames = data.dashboards; // ["Sales Overview", ...]
            Cypress.env("dashboardsToExport", dashboardNames);
          });
        }
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