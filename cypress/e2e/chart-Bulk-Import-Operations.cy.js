import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { Chart } from "../../page-objects-and-services/page-objects/chart-Obects";

const loginPage = new LoginPage();
const chartPage = new Chart();


let chartName = [];

before(() => {
  const envList = Cypress.env("DASHBOARD_NAMES");
  if (!envList || typeof envList !== "string") {
    throw new Error("No dashboard names provided. Set DASHBOARD_NAMES env var.");
  }
  chartName = envList.split(",").map((name) => name.trim());
});

describe("Export charts from the 1st instance", () => {
  before(() => {
    cy.log("Logging in and saving session...");

    loginPage.visitInstance1();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    chartPage.visitChartPage();
    cy.wait(5000);

    // Capture session cookie
    cy.getCookie("session").should("exist").then((cookie) => {
      let sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
      cy.log("Session cookie captured.");
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.chartNames = Cypress.env("CHART_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export each chart by name dynamically", function () {
    const supersetUrl = Cypress.env("instance1Login");

    this.chartNames.forEach((chartName) => {
      cy.log(`Searching for chart: "${chartName}"`);

      const encodedQuery = encodeURIComponent(
        JSON.stringify({
          filters: [
            {
              col: "slice_name",
              opr: "eq",
              value: chartName,
            },
          ],
        })
      );

      // Step 1: Search chart by name to get its ID
      cy.request({
        method: "GET",
        url: `${supersetUrl}/api/v1/chart/?q=${encodedQuery}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          cy.log(`Chart "${chartName}" not found.`);
          return;
        }

        const chartId = res.body.result[0].id;
        cy.log(`Found chart "${chartName}" with ID: ${chartId}`);

        // Step 2: Export chart using simple ID list in RISON format
        const idListRison = `!(${chartId})`;
        const exportUrl = `${supersetUrl}/api/v1/chart/export/?q=${encodeURIComponent(idListRison)}`;

        cy.log(`Exporting chart via URL: ${exportUrl}`);

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
            `cypress/fixtures/ARCHIVE_INSTANCE1/${chartName.replace(/\s+/g, "_")}_export.zip`,
            exportRes.body,
            { encoding: "binary" }
          );
          cy.log(`Chart "${chartName}" exported successfully.`);
        });
      });
    });
  });
});

describe("Backup charts from Instance 2", () => {
  let sessionCookie;

  before(() => {
    cy.log("🔐 Logging in and saving session...");

    // Step 1: Visit and log in to Instance 2
    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(5000);

    // Step 2: Navigate to chart list page
    chartPage.visitChartPage();
    cy.wait(5000);

    // Step 3: Capture session cookie
    cy.getCookie("session").should("exist").then((cookie) => {
      sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
      cy.log("✅ Session cookie captured.");
    });
  });

  beforeEach(function () {
    // Load session cookie
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    // Load chart names
    this.chartNames = Cypress.env("CHART_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should back up existing charts in Instance 2 (if any)", function () {
    this.chartNames.forEach((chartName) => {
      cy.log(`🔍 Checking if chart "${chartName}" exists in Instance 2`);

      const encodedQuery = encodeURIComponent(
        JSON.stringify({
          filters: [
            {
              col: "slice_name",
              opr: "eq",
              value: chartName,
            },
          ],
        })
      );

      cy.request({
        method: "GET",
        url: `${Cypress.env("instance2Login")}/api/v1/chart/?q=${encodedQuery}`,
        headers: {
          Cookie: `session=${this.sessionCookie}`,
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          cy.log(`🚫 Chart "${chartName}" not found in Instance 2. Skipping.`);
          return;
        }

        const chartId = res.body.result[0].id;
        cy.log(`🗂️ Chart "${chartName}" found in Instance 2 with ID: ${chartId}`);

        // Step 2: Export chart using correct RISON format
        const risonFilter = `!(${chartId})`;
        const exportUrl = `${Cypress.env("instance2Login")}/api/v1/chart/export/?q=${encodeURIComponent(risonFilter)}`;

        cy.log(`📤 Exporting chart "${chartName}" from Instance 2`);

        cy.request({
          method: "GET",
          url: exportUrl,
          headers: {
            Cookie: `session=${this.sessionCookie}`,
            Accept: "application/zip",
          },
          encoding: "binary",
        }).then((exportRes) => {
          if (exportRes.status !== 200) {
            cy.log(`🚫 Failed to export "${chartName}" from Instance 2`);
            return;
          }

          cy.writeFile(
            `cypress/fixtures/backups/pre-import/charts/${chartName.replace(/\s+/g, "_")}_backup.zip`,
            exportRes.body,
            { encoding: "binary" }
          );

          cy.log(`💾 Chart "${chartName}" backed up from Instance 2.`);

          // ✅ NEW STEP: DELETE chart from Instance 2 after backup
          cy.log(`🗑️ Deleting chart "${chartName}" from Instance 2...`);
          cy.request({
            method: "DELETE",
            url: `${Cypress.env("instance2Login")}/api/v1/chart/${chartId}`,
            headers: {
              Cookie: `session=${this.sessionCookie}`,
              Accept: "application/json",
            },
            failOnStatusCode: false,
          }).then((deleteRes) => {
            if (deleteRes.status === 200) {
              cy.log(`✅ Chart "${chartName}" deleted from Instance 2`);
            } else {
              cy.log(`⚠️ Failed to delete chart "${chartName}". Status: ${deleteRes.status}`);
            }
          });
        });
      });
    });
  });
});

describe("Import charts to Instance 2 from the instance1", () => {
  const archiveDir = Cypress.env("ARCHIVE_INSTANCE1"); // e.g., "cypress/fixtures/ARCHIVE_INSTANCE1"

  it("Should import all ZIP files from ARCHIVE_INSTANCE1 into Instance 2", function () {
    let zipFiles;

    cy.task("getFilesInDirectory", archiveDir).then((files) => {
      zipFiles = files;
      if (!zipFiles || zipFiles.length === 0) {
        cy.log(`📂 No ZIP files found in ${archiveDir}. Skipping.`);
        return;
      }

      cy.log(`📦 Found ${zipFiles.length} ZIP files:`);
      zipFiles.forEach((filePath) => {
        const fileName = filePath.split("/").pop();
        cy.log(` - ${fileName}`);
      });

      // Log in to Instance 2
      loginPage.visitInstance2();
      loginPage.enterUsername(Cypress.env("username"));
      loginPage.enterPassword(Cypress.env("password"));
      loginPage.clickLoginButton();
      cy.wait(5000);

      chartPage.visitChartPage();
      cy.wait(5000);

      // Import each ZIP file using relative path only
      if (zipFiles && zipFiles.length > 0) {
        zipFiles.forEach((fullFilePath) => {
          const relativePath = fullFilePath.replace(/^.*fixtures[\\\/]/, ""); // Make it relative
          const fileName = relativePath.split("/").pop();

          cy.log(`📤 Uploading: ${fileName}`);

          // ✅ Now we use only relative path like "ARCHIVE_INSTANCE1/chart_export_20250511T122315.zip"
          chartPage.uploadSpecificFile(relativePath); // Pass relative path to page object

          cy.wait(3000);
          cy.reload(); // Optional: reload page between imports
        });

        cy.log("🎉 Chart imports completed successfully.");
      }
    });
  });
});

describe("Export The charts from instance2 for verification", () => {
  before(() => {
    cy.log("Logging in and saving session...");

    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    chartPage.visitChartPage();
    cy.wait(5000);

    // Capture session cookie
    cy.getCookie("session").should("exist").then((cookie) => {
      let sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
      cy.log("Session cookie captured.");
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.chartNames = Cypress.env("CHART_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export each chart by name dynamically", function () {
    const supersetUrl = Cypress.env("instance2Login");

    this.chartNames.forEach((chartName) => {
      cy.log(`Searching for chart: "${chartName}"`);

      const encodedQuery = encodeURIComponent(
        JSON.stringify({
          filters: [
            {
              col: "slice_name",
              opr: "eq",
              value: chartName,
            },
          ],
        })
      );

      // Step 1: Search chart by name to get its ID
      cy.request({
        method: "GET",
        url: `${supersetUrl}/api/v1/chart/?q=${encodedQuery}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          cy.log(`Chart "${chartName}" not found.`);
          return;
        }

        const chartId = res.body.result[0].id;
        cy.log(`Found chart "${chartName}" with ID: ${chartId}`);

        // Step 2: Export chart using simple ID list in RISON format
        const idListRison = `!(${chartId})`;
        const exportUrl = `${supersetUrl}/api/v1/chart/export/?q=${encodeURIComponent(idListRison)}`;

        cy.log(`Exporting chart via URL: ${exportUrl}`);

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
            `cypress/fixtures/ARCHIVE_INSTANCE2/${chartName.replace(/\s+/g, "_")}_export.zip`,
            exportRes.body,
            { encoding: "binary" }
          );
          cy.log(`Chart "${chartName}" exported successfully.`);
        });
      });
    });
  });
});

