import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard-Objects";

const login = new LoginPage();
const dashboard = new DashBoard();
const instance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
const desiredDownloadPathInstance1 = "ARCHIVE_INSTANCE1";
const backupDir = "cypress/fixtures/backups/pre-import";

describe("Full Dashboard Migration Suite", () => {
  before(() => {
    const envList = Cypress.env("ITEM_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No dashboard names provided. Set ITEM_NAMES env var.");
    }

  });

  beforeEach(function () {
    cy.fixture("session_instance1.json").then((s1) => {
      this.instance1Session = s1.value;
    });
    cy.fixture("session_instance2.json").then((s2) => {
      this.instance2Session = s2.value;
    });
    this.DASHBOARD_NAMES = Cypress.env("ITEM_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Export the components from instance1", function () {
    const supersetUrl = Cypress.env("instance1Login");
    const dashboardIds = [];

    cy.wrap(null).then(() => {
      return Cypress.Promise.each(this.DASHBOARD_NAMES, (dashboardName) => {
        const encodedQuery = encodeURIComponent(
          JSON.stringify({
            filters: [{ col: "dashboard_title", opr: "eq", value: dashboardName }],
          })
        );

        return cy.request({
          method: "GET",
          url: `${supersetUrl}/api/v1/dashboard/?q=${encodedQuery}`,
          headers: {
            Accept: "application/json",
            Cookie: `session=${this.instance1Session}`,
          },
          failOnStatusCode: false,
        }).then((res) => {
          if (res.status === 200 && res.body.result?.length) {
            dashboardIds.push(res.body.result[0].id);
          }
        });
      });
    }).then(() => {
      if (!dashboardIds.length) throw new Error("No dashboards found to export.");

      const idListRison = `!(${dashboardIds.join(",")})`;
      const exportUrl = `${supersetUrl}/api/v1/dashboard/export/?q=${encodeURIComponent(idListRison)}`;

      cy.request({
        method: "GET",
        url: exportUrl,
        headers: {
          Accept: "application/zip",
          Cookie: `session=${this.instance1Session}`,
        },
        encoding: "binary",
      }).then((res) => {
        expect(res.status).to.eq(200);
        cy.writeFile(`cypress/fixtures/ARCHIVE_INSTANCE1/dashboards_export.zip`, res.body, {
          encoding: "binary",
        });
      });
    });
  });

  it("Backup existing components from Instance2", function () {
    const supersetUrl = Cypress.env("instance2Login");
    const matchedIds = [];

    cy.request({
      method: "GET",
      url: `${supersetUrl}/api/v1/dashboard/?q=${encodeURIComponent(JSON.stringify({ page_size: 1000 }))}`,
      headers: {
        Accept: "application/json",
        Cookie: `session=${this.instance2Session}`,
      },
    }).then((res) => {
      res.body.result.forEach((dashboard) => {
        if (this.DASHBOARD_NAMES.includes(dashboard.dashboard_title)) {
          matchedIds.push(dashboard.id);
        }
      });

      if (!matchedIds.length) {
        cy.log("No matching dashboards to back up.");
        return;
      }

      const idList = `!(${matchedIds.join(",")})`;
      const exportUrl = `${supersetUrl}/api/v1/dashboard/export/?q=${encodeURIComponent(idList)}`;

      return cy.request({
        method: "GET",
        url: exportUrl,
        headers: {
          Accept: "application/zip",
          Cookie: `session=${this.instance2Session}`,
        },
        encoding: "binary",
      }).then((res) => {
        expect(res.status).to.eq(200);
        const filename = res.headers["content-disposition"]?.match(/filename="?(.+?)"?$/)?.[1] || "dashboard_backup.zip";

        return cy.writeFile(`${backupDir}/${filename}`, res.body, { encoding: "binary" });
      });
    }).then(() => {
      return Cypress.Promise.each(matchedIds, (id) => {
        return cy.request({
          method: "DELETE",
          url: `${supersetUrl}/api/v1/dashboard/${id}`,
          headers: {
            Accept: "application/json",
            Cookie: `session=${this.instance2Session}`,
          },
        }).then((res) => {
          expect(res.status).to.eq(200);
        });
      });
    });
  });

  it("Import the components to instance2", () => {
    cy.log("Logging in to Instance 2...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);

    cy.task("getLatestFile", instance1Archive).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${instance1Archive}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const desiredFilePath = `${desiredDownloadPathInstance1}/${fileName}`;
      cy.log(`File to import: ${desiredFilePath}`);

      cy.log("Uploading the dashboard file...");
      dashboard.uploadSpecificFile(desiredFilePath);
      cy.wait(2000);

      cy.log("Dashboard import completed successfully.");
    });
  });

});

let dashboardNames = [];
before(() => {
  const envList = Cypress.env("ITEM_NAMES");
if (!envList || typeof envList !== "string") {
  throw new Error("No dashboard names provided. Set ITEM_NAME env var.");
}
dashboardNames = envList.split(",").map((name) => name.trim());
});

describe("Scrape dashboard details from selected dashboards ", () => {




    it("Scrape dashboard details from all dashboards from the instance1", () => {
      cy.log("Logging in to Instance 1...");
      login.visitInstance1();
      login.enterUsername(Cypress.env("username"));
      login.enterPassword(Cypress.env("password"));
      login.clickLoginButton();
      cy.wait(2000);
  
      dashboard.visitDashboard();
      cy.wait(5000);
  
      const scrapedData = [];
  
      dashboardNames.forEach((itemName) => {
        cy.log(`Searching for dashboard: "${itemName}"`);
        cy.wait(2000);
        dashboard.typeInputAndPressEnter(itemName);
        cy.wait(2000);
  
        dashboard.findRowByItemName(itemName)
          .should("exist")
          .and("be.visible")
          .then(() => {
            cy.log(`Found "${itemName}" on the dashboard.`);
            dashboard.clickItemName(itemName);
            cy.wait(10000);
            cy.log("Waiting for dashboard charts to load...");
            cy.get(".dashboard-component", { timeout: 2000 }).should("exist");
            cy.log("Scraping charts on the specific dashboard...");
  
            dashboard.getDashboardCharts(itemName).then((scrapedChartData) => {
              scrapedData.push({
                dashboard: itemName,
                details: scrapedChartData,
              });
            });
          });
        dashboard.visitDashboard();
      });
  
      cy.wait(1000);
  
      const fixturesFilePath = `cypress/fixtures/UIComponents/instance1UIComponents.json`;
      cy.task("writeJson", {
        filename: fixturesFilePath,
        data: scrapedData,
      });
  
      cy.log("Scraping all dashboard details completed successfully.");
    });
  
});
  
describe("Scrape dashboard details from selected dashboards ", () => {
  
  
    before(() => {
      const envList = Cypress.env("ITEM_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No dashboard names provided. Set ITEM_NAME env var.");
    }
    dashboardNames = envList.split(",").map((name) => name.trim());
    });
    it("Scrape dashboard details from all dashboards from the instance 2", () => {
      cy.log("Logging in to Instance 2...");
      login.visitInstance2();
      login.enterUsername(Cypress.env("username"));
      login.enterPassword(Cypress.env("password"));
      login.clickLoginButton();
      cy.wait(2000);
  
      dashboard.visitDashboard();
      cy.wait(5000);
  
      const scrapedData = [];
  
      dashboardNames.forEach((itemName) => {
        cy.log(`Searching for dashboard: "${itemName}"`);
        cy.wait(2000);
        dashboard.typeInputAndPressEnter(itemName);
        cy.wait(2000);
  
        dashboard.findRowByItemName(itemName)
          .should("exist")
          .and("be.visible")
          .then(() => {
            cy.log(`Found "${itemName}" on the dashboard.`);
            dashboard.clickItemName(itemName);
            cy.wait(10000);
            cy.log("Waiting for dashboard charts to load...");
            cy.get(".dashboard-component", { timeout: 2000 }).should("exist");
            cy.log("Scraping charts on the specific dashboard...");
  
            dashboard.getDashboardCharts(itemName).then((scrapedChartData) => {
              scrapedData.push({
                dashboard: itemName,
                details: scrapedChartData,
              });
            });
          });
        dashboard.visitDashboard();
      });
  
      cy.wait(1000);
  
      const fixturesFilePath = `cypress/fixtures/UIComponents/instance2UIComponents.json`;
      cy.task("writeJson", {
        filename: fixturesFilePath,
        data: scrapedData,
      });
  
      cy.log("Scraping all dashboard details completed successfully.");
    });
});
  
  
describe("Verify dashboard details from Instance 1 and Instance 2", () => {
  
  
  
  
    it("Verify that dashboard data from instance1 matches instance2", () => {
      cy.log("Reading JSON files for instance 1 and instance 2...");
  
      cy.readFile("cypress/fixtures/UIComponents/instance1UIComponents.json").then((instance1Data) => {
        cy.log("Instance 1 Data: ", instance1Data);
  
        cy.readFile("cypress/fixtures/UIComponents/instance2UIComponents.json").then((instance2Data) => {
          cy.log("Instance 2 Data: ", instance2Data);
  
          expect(instance1Data.length).to.eq(instance2Data.length, "The number of dashboards should be the same in both instances.");
  
          instance1Data.forEach((dashboard1) => {
            const dashboard2 = instance2Data.find(d => d.dashboard === dashboard1.dashboard);
  
            if (!dashboard2) {
              cy.log(`Mismatch: Dashboard "${dashboard1.dashboard}" is missing in Instance 2.`);
              throw new Error(`Dashboard "${dashboard1.dashboard}" is missing in Instance 2.`);
            } else {
              cy.log(`Comparing charts for dashboard: "${dashboard1.dashboard}"`);
  
              expect(dashboard1.details.length).to.eq(dashboard2.details.length, 
                `The number of charts for dashboard "${dashboard1.dashboard}" should be the same in both instances.`);
  
              dashboard1.details.forEach((chart1, index) => {
                const chart2 = dashboard2.details[index];
  
                if (!chart2) {
                  cy.log(`Mismatch: Chart ${index + 1} (ID: ${chart1.chart_id}) is missing in dashboard "${dashboard1.dashboard}" on Instance 2.`);
                  throw new Error(`Chart ${index + 1} (ID: ${chart1.chart_id}) is missing in dashboard "${dashboard1.dashboard}" on Instance 2.`);
                }
  
                expect(chart1.chart_id).to.eq(chart2.chart_id, 
                  `Chart ID for "${dashboard1.dashboard}" should match for chart ${index + 1}`);
                expect(chart1.chart_title).to.eq(chart2.chart_title, 
                  `Chart title for "${dashboard1.dashboard}" should match for chart ${index + 1}`);
              });
            }
          });
  
          cy.log("JSON files verified successfully, dashboard data matches across instances.");
        });
      });
    });
  
});
  