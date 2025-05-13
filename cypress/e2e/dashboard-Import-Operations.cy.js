import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard-Objects";

const login = new LoginPage();
const dashboard = new DashBoard();
const instance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
const desiredDownloadPathInstance1 = "ARCHIVE_INSTANCE1";
const backupDir = "cypress/fixtures/backups/pre-import";
let dashboardNames = [];
before(() => {
  const envList = Cypress.env("ITEM_NAMES");
if (!envList || typeof envList !== "string") {
  throw new Error("No dashboard names provided. Set ITEM_NAME env var.");
}
dashboardNames = envList.split(",").map((name) => name.trim());
});

  
describe("Export dashboards from the 1st instance", () => {
  before(() => {
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();



    cy.getCookie("session").should("exist").then((cookie) => {
      let sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.DASHBOARD_NAMES = Cypress.env("ITEM_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export all dashboards in bulk", function () {
    const supersetUrl = Cypress.env("instance1Login");
    const dashboardNames = this.DASHBOARD_NAMES;
    const dashboardIds = [];

    // Fetch dashboard IDs one by one
    cy.wrap(null).then(() => {
      return Cypress.Promise.each(dashboardNames, (dashboardName) => {
        const encodedQuery = encodeURIComponent(
          JSON.stringify({
            filters: [
              {
                col: "dashboard_title",
                opr: "eq",
                value: dashboardName,
              },
            ],
          })
        );

        return cy
          .request({
            method: "GET",
            url: `${supersetUrl}/api/v1/dashboard/?q=${encodedQuery}`,
            headers: {
              Accept: "application/json",
            },
            failOnStatusCode: false,
          })
          .then((res) => {
            if (res.status === 200 && res.body.result?.length) {
              const dashboardId = res.body.result[0].id;
              dashboardIds.push(dashboardId);
            } else {
              Cypress.log({
                name: "Dashboard not found",
                message: dashboardName,
              });
            }
          });
      });
    }).then(() => {
      if (!dashboardIds.length) {
        throw new Error("No dashboards found to export.");
      }

      const idListRison = `!(${dashboardIds.join(",")})`;
      const exportUrl = `${supersetUrl}/api/v1/dashboard/export/?q=${encodeURIComponent(idListRison)}`;

      // Export dashboards as ZIP
      cy.request({
        method: "GET",
        url: exportUrl,
        headers: {
          Accept: "application/zip",
        },
        encoding: "binary",
      }).then((exportRes) => {
        expect(exportRes.status).to.eq(200);

        cy.writeFile(
          `cypress/fixtures/ARCHIVE_INSTANCE1/dashboards_export.zip`,
          exportRes.body,
          { encoding: "binary" }
        );
      });
    });
  });
});

describe("Backup existing dashboards in Instance 2 using REST API", () => {
  before(() => {
    cy.log("Logging into Instance 2...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(3000);
  });



  it("Should back up and delete matching dashboards before import", function () {
    const supersetUrl = Cypress.env("instance2Login");
    const dashboardNamesToImport = Cypress.env("ITEM_NAMES")
      .split(",")
      .map((name) => name.trim());

    const foundDashboardIds = [];
    const matchedDashboardNames = [];

    cy.wrap(null).then(() => {
      // Use REST API to fetch all dashboards
      return cy.request({
        method: "GET",
        url: `${supersetUrl}/api/v1/dashboard/?q=${encodeURIComponent(JSON.stringify({ page_size: 1000 }))}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      });
    }).then((res) => {
      if (res.status !== 200 || !res.body.result?.length) {
        cy.log("No dashboards found in Instance 2.");
        return;
      }

      // Match by title and collect IDs
      res.body.result.forEach((dashboard) => {
        if (dashboardNamesToImport.includes(dashboard.dashboard_title)) {
          matchedDashboardNames.push(dashboard.dashboard_title);
          foundDashboardIds.push(dashboard.id);
        }
      });

      if (!foundDashboardIds.length) {
        cy.log("No matching dashboards found. Nothing to back up.");
        return;
      }

      cy.log(`Backing up dashboards: ${matchedDashboardNames.join(", ")}`);

      const idListRison = `!(${foundDashboardIds.join(",")})`;
      const exportUrl = `${supersetUrl}/api/v1/dashboard/export/?q=${encodeURIComponent(idListRison)}`;

      // Request export
      return cy.request({
        method: "GET",
        url: exportUrl,
        headers: {
          Accept: "application/zip",
        },
        encoding: "binary",
      });
    }).then((exportRes) => {
      if (!exportRes || exportRes.status !== 200) {
        cy.log("Export failed or skipped.");
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const exportPath = `cypress/fixtures/backups/pre-import`;

      // Save the backup to the 'pre-import' folder
      return cy.writeFile(exportPath, exportRes.body, { encoding: "binary" }).then(() => {
        cy.log("Backup ZIP saved successfully to pre-import directory.");

        // Optionally, move the file to another location, or continue processing if necessary
        return cy.task("moveFile", {
          source: exportPath,
          destination: `cypress/fixtures/backups/pre-import/${dashboardNames.replace(/\s+/g, "_")}_backup.zip`,
        });
      });
    }).then(() => {
      if (foundDashboardIds.length) {
        cy.log("Deleting matched dashboards...");
        return Cypress.Promise.each(foundDashboardIds, (dashboardId) => {
          return cy.request({
            method: "DELETE",
            url: `${supersetUrl}/api/v1/dashboard/${dashboardId}`,
            headers: {
              Accept: "application/json",
            },
            failOnStatusCode: false,
          }).then((res) => {
            if (res.status === 200) {
              cy.log(`Deleted dashboard ID: ${dashboardId}`);
            }
          });
        });
      }
    });
  });
});

describe("Import the dashboard from instance1 ", () =>{
  it("Import the dashboard from Instance 1 (instance: 2)", () => {
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
describe("Export dashboards from the 2nd instance for verification", () => {
  before(() => {
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();



    cy.getCookie("session").should("exist").then((cookie) => {
      let sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.DASHBOARD_NAMES = Cypress.env("ITEM_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export all dashboards in bulk", function () {
    const supersetUrl = Cypress.env("instance2Login");
    const dashboardNames = this.DASHBOARD_NAMES;
    const dashboardIds = [];

    // Fetch dashboard IDs one by one
    cy.wrap(null).then(() => {
      return Cypress.Promise.each(dashboardNames, (dashboardName) => {
        const encodedQuery = encodeURIComponent(
          JSON.stringify({
            filters: [
              {
                col: "dashboard_title",
                opr: "eq",
                value: dashboardName,
              },
            ],
          })
        );

        return cy
          .request({
            method: "GET",
            url: `${supersetUrl}/api/v1/dashboard/?q=${encodedQuery}`,
            headers: {
              Accept: "application/json",
            },
            failOnStatusCode: false,
          })
          .then((res) => {
            if (res.status === 200 && res.body.result?.length) {
              const dashboardId = res.body.result[0].id;
              dashboardIds.push(dashboardId);
            } else {
              Cypress.log({
                name: "Dashboard not found",
                message: dashboardName,
              });
            }
          });
      });
    }).then(() => {
      if (!dashboardIds.length) {
        throw new Error("No dashboards found to export.");
      }

      const idListRison = `!(${dashboardIds.join(",")})`;
      const exportUrl = `${supersetUrl}/api/v1/dashboard/export/?q=${encodeURIComponent(idListRison)}`;

      // Export dashboards as ZIP
      cy.request({
        method: "GET",
        url: exportUrl,
        headers: {
          Accept: "application/zip",
        },
        encoding: "binary",
      }).then((exportRes) => {
        expect(exportRes.status).to.eq(200);

        cy.writeFile(
          `cypress/fixtures/ARCHIVE_INSTANCE2/dashboards_export.zip`,
          exportRes.body,
          { encoding: "binary" }
        );
      });
    });
  });
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

    // Read the instance1 JSON file
    cy.readFile("cypress/fixtures/UIComponents/instance1UIComponents.json").then((instance1Data) => {
      cy.log("Instance 1 Data: ", instance1Data);

      // Read the instance2 JSON file
      cy.readFile("cypress/fixtures/UIComponents/instance2UIComponents.json").then((instance2Data) => {
        cy.log("Instance 2 Data: ", instance2Data);

        // Verify the number of dashboards are the same
        expect(instance1Data.length).to.eq(instance2Data.length, "The number of dashboards should be the same in both instances.");

        // Compare dashboards from instance 1 and instance 2
        instance1Data.forEach((dashboard1) => {
          const dashboard2 = instance2Data.find(d => d.dashboard === dashboard1.dashboard);

          // Log if the dashboard is missing in instance2
          if (!dashboard2) {
            cy.log(`Mismatch: Dashboard "${dashboard1.dashboard}" is missing in Instance 2.`);
            throw new Error(`Dashboard "${dashboard1.dashboard}" is missing in Instance 2.`);
          } else {
            // Log if dashboard exists in both instances, but compare the chart details
            cy.log(`Comparing charts for dashboard: "${dashboard1.dashboard}"`);

            // Verify the number of charts are the same
            expect(dashboard1.details.length).to.eq(dashboard2.details.length, 
              `The number of charts for dashboard "${dashboard1.dashboard}" should be the same in both instances.`);

            // Compare the individual charts
            dashboard1.details.forEach((chart1, index) => {
              const chart2 = dashboard2.details[index];

              // Log if a chart is missing or if there's a mismatch
              if (!chart2) {
                cy.log(`Mismatch: Chart ${index + 1} (ID: ${chart1.chart_id}) is missing in dashboard "${dashboard1.dashboard}" on Instance 2.`);
                throw new Error(`Chart ${index + 1} (ID: ${chart1.chart_id}) is missing in dashboard "${dashboard1.dashboard}" on Instance 2.`);
              }

              // Check if chart IDs and titles match
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





