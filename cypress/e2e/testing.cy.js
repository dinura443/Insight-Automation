import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard";

const login = new LoginPage();
const dashboard = new DashBoard();

describe("Bulk Dashboard Export", () => {
    const dashboardNames = ["Overview 6.0", "Factory View 6.0", "dinura"];
  
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