import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard-Objects";

const login = new LoginPage();
const dashboard = new DashBoard();

describe("Bulk Import Operation ", () => {
  const downloadDirectory = Cypress.env("downloadDir");
  const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE1");
  const desiredDownloadPath = "ARCHIVE_INSTANCE1";
  const extractDir = targetDirectory;
  let dashboardNames = [];

  before(() => {
    const envList = Cypress.env("DASHBOARD_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No dashboard names provided. Set DASHBOARD_NAMES env var.");
    }
    dashboardNames = envList.split(",").map((name) => name.trim());
  });

  xit("Bulk Export Dashboards (instance: 1)", () => {
    cy.log("Logging in...");
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
      const desiredFilePath = `${desiredDownloadPath}/${fileName}`;

      cy.log(`Unzipping ZIP file: ${latestFilePath}`);
      cy.task("unzipFile", { zipPath: latestFilePath, extractDir }).then((result) => {
        cy.log(result);
        cy.log("Verifying the unzipped project directory...");
        cy.task("getLatestFile", extractDir).then((extractedFolder) => {
          if (!extractedFolder) {
            throw new Error(`No project directory found in the extracted directory: ${extractDir}`);
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
});


describe("Bulk Import Operation ", () => {
  xit("Scrape dashboard details from all dashboards (instance: 1)", () => {
    cy.log("Logging in...");
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);

    const dashboardNames = Cypress.env("DASHBOARD_NAMES").split(",").map((name) => name.trim());
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
describe("Bulk Import Operation ", () => {
  const dashboardInstance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
  const desiredDownloadPath = "ARCHIVE_INSTANCE1";
  const statusFile = "cypress/fixtures/test-status.json";
  const backupDir = "cypress/fixtures/backups/pre-import";
  let dashboardNamesToImport = [];

  before(() => {
    const envList = Cypress.env("DASHBOARD_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No dashboard names provided. Set DASHBOARD_NAMES env var.");
    }
    dashboardNamesToImport = envList.split(",").map((name) => name.trim());
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
    dashboard.clickBulkSelectButton();
    cy.wait(1000);

    const foundDashboardNames = [];
    dashboard.clickBulkSelectButton();

    cy.get("td a").each(($el) => {
      foundDashboardNames.push($el.text().trim());
    }).then(() => {
      const dashboardsAlreadyExist = dashboardNamesToImport.filter(name =>
        foundDashboardNames.includes(name)
      );



      cy.log(`Backing up these dashboards: ${dashboardsAlreadyExist.join(", ")}`);
      dashboard.bulkExportDashboards(dashboardsAlreadyExist);
      cy.wait(3000);


      cy.task("getLatestFile", Cypress.env("downloadDir")).then((latestFilePath) => {
        if (!latestFilePath) {
          cy.log("No files found to back up.");
          cy.writeFile(statusFile, { backupTestPassed: false });
          return;
        }

        const fileName = Cypress._.last(latestFilePath.split("/"));
        const backupDestination = `${backupDir}/${fileName}`;
        cy.task("moveFile", {
          source: latestFilePath,
          destination: backupDestination,
        })

        cy.log("Pre-import backup completed successfully.");

        dashboard.Deletedashboard();
        cy.log("Deleting existing dashboards...");
        
        cy.wait(2000);
      });
    });
  });


  
  it("Import the dashboard from Instance 1 (instance: 2)", () => {


      cy.log("Logging in...");
      login.visitInstance2();
      login.enterUsername(Cypress.env("username"));
      login.enterPassword(Cypress.env("password"));
      login.clickLoginButton();
      cy.wait(2000);

      dashboard.visitDashboard();
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
  });

describe("Bulk Import Operation ", () => {
  it("Scrape dashboard details from all dashboards from the instance 2 (instance: 2)", () => {
    cy.log("Logging in...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);

    const dashboardNames = Cypress.env("DASHBOARD_NAMES").split(",").map((name) => name.trim());
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

describe("Bulk Import Operation ", () => {
  const downloadDirectory = Cypress.env("downloadDir");
  const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE2");
  const desiredDownloadPath = "ARCHIVE_INSTANCE2";
  const extractDir = targetDirectory;
  let dashboardNames = [];

  before(() => {
    const envList = Cypress.env("DASHBOARD_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No dashboard names provided. Set DASHBOARD_NAMES env var.");
    }
    dashboardNames = envList.split(",").map((name) => name.trim());
  });

  it("Bulk Export Dashboards for verification (instance: 2)", () => {
    cy.log("Logging in...");
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
      const desiredFilePath = `${desiredDownloadPath}/${fileName}`;

      cy.log(`Unzipping ZIP file: ${latestFilePath}`);
      cy.task("unzipFile", { zipPath: latestFilePath, extractDir }).then((result) => {
        cy.log(result);
        cy.log("Verifying the unzipped project directory...");
        cy.task("getLatestFile", extractDir).then((extractedFolder) => {
          if (!extractedFolder) {
            throw new Error(`No project directory found in the extracted directory: ${extractDir}`);
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
});

