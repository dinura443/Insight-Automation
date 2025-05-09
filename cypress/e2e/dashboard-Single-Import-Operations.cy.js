import cypress from "cypress";
import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard-Objects";
const login = new LoginPage();
const dashboard = new DashBoard();

describe("Import Single Dashboard and Verify", () => {
  const downloadDirectory = Cypress.env("downloadDir");
  const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE1");
  const desiredDownloadPath = "ARCHIVE_INSTANCE2";
  const extractDir = targetDirectory;
  const dashboardInstance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
  const archiveInstance2 = Cypress.env("ARCHIVE_INSTANCE2");
  const archiveInstance1 = Cypress.env("ARCHIVE_INSTANCE1");
  const instance2Dir = Cypress.env("FILECOMPONENTS_INSTANCE2");
  const itemName = Cypress.env("DASHBOARD_NAMES");
  const instanceLabel1 = "instance1";
  const instanceLabel2 = "instance2";

  it("Export the Dashboard (instance: 1)", () => {
    const extractDir = cypress.env("ARCHIVE_INSTANCE1");
    cy.log("Logging in...");
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);
    cy.log("Navigating to the dashboard page...");

    dashboard.typeInputAndPressEnter(itemName);
    cy.wait(2000);
    cy.log(`Finding dashboard name: ${itemName}`);
    dashboard.findRowByItemName(itemName);
    cy.wait(2000);
    cy.log("Clicking on the item name...");
    cy.log("Downloading the dashboard...");
    dashboard.clickShareButtonForRow(itemName);
    cy.wait(2000);

    cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${downloadDirectory}`);
      }

      const zipPath = latestFilePath;
      const fileName = Cypress._.last(latestFilePath.split("/"));
      const originalFilePath = latestFilePath;
      const desiredFilePath = `${desiredDownloadPath}/${fileName}`;

      cy.log(`Unzipping ZIP file: ${zipPath}`);
      cy.task("unzipFile", { zipPath, extractDir }).then((result) => {
        cy.log(result);
        cy.log("Verifying the unzipped project directory...");
        cy.task("getLatestFile", extractDir).then((extractDirResult) => {
          if (!extractDirResult) {
            throw new Error(`No project directory found in the extracted directory: ${extractDir}`);
          }
          cy.log(`Unzipped project directory: ${extractDirResult}`);
        });
      });

      cy.log("Moving the file to instance1Archive...");
      cy.task("moveFile", {
        source: originalFilePath,
        destination: `cypress/fixtures/${desiredFilePath}`,
      }).then((result) => {
        cy.log(result);
      });

      cy.log("Downloading the dashboard from the instance1 completed successfully.");
    });
  });

  it("Scrape the dashboard details from the instance1 dashboard (instance: 1)", () => {
    const fileName = `${instanceLabel1}_${itemName}_charts.json`;
    const fixturesFilePath = `cypress/fixtures/UIComponents/${fileName}`;

    cy.log("Logging in...");
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);

    cy.log(`Searching for the dashboard name: "${itemName}"`);
    cy.wait(2000);
    dashboard.typeInputAndPressEnter(itemName);
    cy.wait(2000);

    dashboard.findRowByItemName(itemName)
      .should("exist")
      .and("be.visible")
      .then(() => {
        cy.log(`Found "${itemName}" on the dashboard.`);
        dashboard.clickItemName(itemName);
        cy.wait(10000); // wait 10 seconds (adjust as needed)
        cy.log("Waiting for dashboard charts to load...");
        cy.get(".dashboard-component", { timeout: 2000 }).should("exist");
        cy.log("Scraping charts on the specific dashboard...");
        dashboard.getDashboardCharts(itemName);
        cy.wait(1000);
      });

    dashboard.getDashboardCharts(itemName).then((scrapedChartData) => {
      cy.task("writeJson", {
        filename: fixturesFilePath,
        data: scrapedChartData,
      });
      cy.wait(2000);
    });

    cy.log("Scraping the dashboard details completed successfully.");
  });

  it("Backup the Dashboard File to The Server (instance: 2)", () => {
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);

    dashboard.typeInputAndPressEnter(itemName);
    cy.wait(2000);
    dashboard.findRowByItemName(itemName);
    cy.wait(2000);
    dashboard.clickShareButtonForRow(itemName);
    cy.wait(2000);

    cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${downloadDirectory}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const originalFilePath = latestFilePath;
      const destinationPath = `cypress/fixtures/backups/pre-import/${fileName}`;

      cy.task("moveFile", {
        source: originalFilePath,
        destination: destinationPath,
      }).then((result) => {
        cy.log(result);
        cy.log("File moved to the backup directory successfully.");
      });
    });
  });

  it("Import the dashboard from the instance1 (instance: 2)", () => {
    cy.log("Logging in...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.log("Navigating to the dashboard page...");
    cy.wait(5000);


    cy.task("getLatestFile", dashboardInstance1Archive).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${dashboardInstance1Archive}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const desiredFilePath = `${desiredDownloadPath}/${fileName}`;
      cy.log("Uploading the dashboard file...");
      dashboard.uploadSpecificFile(desiredFilePath);
      cy.wait(2000);
      cy.log("Dashboard import completed successfully.");
    });
  });

  it("Scrape the dashboard details from the instance2 dashboard (instance: 2)", () => {
    const fileName = `${instanceLabel2}_${itemName}_charts.json`;
    const fixturesFilePath = `cypress/fixtures/UIComponents/${fileName}`;

    cy.log("Logging in...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.log("Navigating to the dashboard page...");
    cy.wait(5000);

    dashboard.typeInputAndPressEnter(itemName);
    cy.wait(5000);
    cy.log(`Searching for item name: "${itemName}"`);

    dashboard.findRowByItemName(itemName)
      .should("exist")
      .and("be.visible")
      .then(() => {
        cy.log(`Found "${itemName}" on the dashboard.`);
        dashboard.clickItemName(itemName);
        cy.log("Waiting for dashboard charts to load...");
        cy.get('.dashboard-component', { timeout: 10000 }).should('exist');
        cy.log("Scraping charts on the specific dashboard...");
        dashboard.getDashboardCharts(itemName);
      });

    cy.log("Scraping the dashboard details...");
    dashboard.getDashboardCharts(itemName).then((scrapedChartData) => {
      cy.task('writeJson', {
        filename: fixturesFilePath, 
        data: scrapedChartData,
      });
      cy.log("Scraping the dashboard details completed successfully.");
    });
  });
  it("Export a dashboard from the instance two for verification purposes (instance: 2)", () => {
    cy.log("Logging in...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);
    cy.log("Navigating to the dashboard page...");

    dashboard.typeInputAndPressEnter(itemName);
    cy.wait(2000);
    cy.log(`Using dashboard name: ${itemName}`);

    dashboard.findRowByItemName(itemName);
    cy.wait(2000);
    dashboard.clickShareButtonForRow(itemName);
    cy.log("Downloading the dashboard..."); 
    cy.wait(2000);

    cy.log("Extracting to the dashboard_instance2 dir...");
    cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${downloadDirectory}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const originalFilePath = latestFilePath;
      const desiredFilePath = `${desiredDownloadPath}/${fileName}`;

      cy.task("moveFile", {
        source: originalFilePath,
        destination: `cypress/fixtures/${desiredFilePath}`,
      }).then((result) => {
        cy.log(result);
      });

      cy.task("getLatestFile", archiveInstance2).then((latestFilePath) => {
        if (!latestFilePath) {
          throw new Error(`No files found in directory: ${archiveInstance2}`);
        }

        const zipPath = latestFilePath;
        const extractDir = instance2Dir;

        cy.log(`Unzipping ZIP file: ${zipPath}`);
        cy.task("unzipFile", { zipPath, extractDir }).then((result) => {
          cy.log(result);
          cy.log("Identifying the unzipped project directory...");
          cy.task("getLatestFile", extractDir).then((extractDirResult) => {
            if (!extractDirResult) {
              throw new Error(`No project directory found in the extracted directory: ${extractDirResult}`);
            }
            cy.log(`Unzipped project directory: ${extractDirResult}`);
          });
        });
      });

      cy.wait(1000);
    });

    cy.log("Exporting the dashboard from the instance two completed successfully.");
  });
});