import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard-Objects";

const login = new LoginPage();
const dashboard = new DashBoard();

describe("Bulk Import and Export Operations", () => {
  const downloadDirectory = Cypress.env("downloadDir");
  const targetDirectoryInstance1 = Cypress.env("FILECOMPONENTS_INSTANCE1");
  const targetDirectoryInstance2 = Cypress.env("FILECOMPONENTS_INSTANCE2");
  const instance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
  const instance2Archive = Cypress.env("ARCHIVE_INSTANCE2");
  const desiredDownloadPathInstance1 = "ARCHIVE_INSTANCE1";
  const desiredDownloadPathInstance2 = "ARCHIVE_INSTANCE2";
  const extractDirInstance1 = targetDirectoryInstance1;
  const extractDirInstance2 = targetDirectoryInstance2;
  const statusFile = "cypress/fixtures/test-status.json";
  const backupDir = "cypress/fixtures/backups/pre-import";
  let dashboardNames = [];
  let dashboardNamesToImport = [];

  before(() => {
    const envList = Cypress.env("DASHBOARD_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No dashboard names provided. Set DASHBOARD_NAMES env var.");
    }
    dashboardNames = envList.split(",").map((name) => name.trim());
    dashboardNamesToImport = [...dashboardNames];
  });

  it("Bulk Export Dashboards (instance: 1)", () => {
    cy.log("Logging in to Instance 1...");
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);
    cy.log("Navigating to the dashboard page...");

    dashboard.bulkExportDashboards(dashboardNames);
    cy.wait(5000);

    cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${downloadDirectory}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const originalFilePath = latestFilePath;
      const desiredFilePath = `${desiredDownloadPathInstance1}/${fileName}`;

      cy.log(`Unzipping ZIP file: ${latestFilePath}`);
      cy.task("unzipFile", { zipPath: latestFilePath, extractDir: extractDirInstance1 }).then((result) => {
        cy.log(result);
        cy.log("Verifying the unzipped project directory...");
        cy.task("getLatestFile", extractDirInstance1).then((extractedFolder) => {
          if (!extractedFolder) {
            throw new Error(`No project directory found in the extracted directory: ${extractDirInstance1}`);
          }
          cy.log(`Unzipped project directory: ${extractedFolder}`);
        });
      });

      cy.log("Moving the file to instance1Archive...");
      cy.task("moveFile", {
        source: originalFilePath,
        destination: `cypress/fixtures/${desiredFilePath}`,
      }).then((result) => {
        cy.log(result);
      });

      cy.log("Bulk dashboard export completed successfully.");
    });
  });

  it("Backup Existing Dashboards in Instance 2 (before import)", () => {
    cy.log("Checking if any dashboards already exist in Instance 2...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);

    cy.log("Clicking Bulk Select to prepare for pre-import backup...");

    const foundDashboardNames = [];
    cy.get("td a").each(($el) => {
      foundDashboardNames.push($el.text().trim());
    }).then(() => {
      const dashboardsAlreadyExist = dashboardNamesToImport.filter(name =>
        foundDashboardNames.includes(name)
      );

      cy.log(`Backing up these dashboards: ${dashboardsAlreadyExist.join(", ")}`);
      dashboard.bulkExportDashboards(dashboardsAlreadyExist);
      cy.wait(3000);

      cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
        if (!latestFilePath) {
          cy.log("No files found to back up.");
          cy.writeFile(statusFile, { backupTestPassed: false });
          return;
        }

        const fileName = Cypress._.last(latestFilePath.split("/"));
        const originalFilePath = latestFilePath;
        const backupDestination = `${backupDir}/${fileName}`;
        cy.task("moveFile", {
          source: originalFilePath,
          destination: backupDestination,
        }).then((result) => {
          cy.log(result);
          cy.log("File moved to the backup directory successfully.");
        });

        cy.log("Pre-import backup completed successfully.");

        dashboard.Deletedashboard();
        cy.log("Deleting existing dashboards...");
        cy.wait(2000);
      });
    });
  });

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

  it("Scrape dashboard details from all dashboards (instance: 1)", () => {
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

  it("Scrape dashboard details from all dashboards (instance: 2)", () => {
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

  it("Bulk Export Dashboards for verification (instance: 2)", () => {
    cy.log("Logging in to Instance 2...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);
    cy.log("Navigating to the dashboard page...");

    dashboard.bulkExportDashboards(dashboardNames);
    cy.wait(3000);

    cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${downloadDirectory}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const originalFilePath = latestFilePath;
      const desiredFilePath = `${desiredDownloadPathInstance2}/${fileName}`;

      cy.log(`Unzipping ZIP file: ${latestFilePath}`);
      cy.task("unzipFile", { zipPath: latestFilePath, extractDir: extractDirInstance2 }).then((result) => {
        cy.log(result);
        cy.log("Verifying the unzipped project directory...");
        cy.task("getLatestFile", extractDirInstance2).then((extractedFolder) => {
          if (!extractedFolder) {
            throw new Error(`No project directory found in the extracted directory: ${extractDirInstance2}`);
          }
          cy.log(`Unzipped project directory: ${extractedFolder}`);
        });
      });

      cy.log("Moving the file to instance2Archive...");
      cy.task("moveFile", {
        source: originalFilePath,
        destination: `cypress/fixtures/${desiredFilePath}`,
      }).then((result) => {
        cy.log(result);
      });

      cy.log("Bulk dashboard export completed successfully.");
    });
  });
});

