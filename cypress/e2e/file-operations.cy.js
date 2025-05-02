import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DashBoard } from "../../page-objects-and-services/page-objects/dashboard";

const login = new LoginPage();
const dashboard = new DashBoard();


describe("Export the Dashboard (instance: 1)", () => {
  const downloadDirectory = Cypress.env("downloadDir");
  const targetDirectory = Cypress.env("instance1DashboardDir");
  const desiredDownloadPath = "instance1Archive";
  const extractDir = targetDirectory;

  it("exporting the file", () => {
    cy.log("username : ", Cypress.env("username"));
    cy.log("Logging in...");
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);


    dashboard.visitDashboard();
    cy.wait(5000);

    cy.log("Navigating to the dashboard page...");


    const itemName = Cypress.env("dashboard");
    cy.log(`Finding dashboard name: ${itemName}`);
    dashboard.findRowByItemName(itemName);
    cy.wait(2000);
    cy.log("Clicking on the item name...");

    cy.log("Downloading the dashboard...");
    dashboard.clickShareButtonForRow(itemName);
    cy.wait(2000);

    cy.log("Extracting to the dashboard_instance1 file...");
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
        cy.task("getLatestFile", extractDir).then((extractDir) => {
          if (!extractDir) {
            throw new Error(`No project directory found in the extracted directory: ${extractDir}`);
          }
          cy.log(`Unzipped project directory: ${extractDir}`);
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
});

describe("Backup the Dashboard File to The Server (instance: 2)", () => {
  const downloadDirectory = Cypress.env("downloadDir");
  const statusFile = "cypress/fixtures/test-status.json";

  it("Download and save dashboard backup", () => {
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);


    const itemName = Cypress.env("dashboard");
    dashboard.findRowByItemName(itemName);
    cy.wait(2000);
    dashboard.clickShareButtonForRow(itemName);
    cy.wait(2000);

    cy.task("getLatestFile", downloadDirectory).then((latestFilePath) => {
      if (!latestFilePath) {
        cy.writeFile(statusFile, { backupTestPassed: false });
        throw new Error(`No files found in directory: ${downloadDirectory}`);
      }

      const fileName = Cypress._.last(latestFilePath.split("/"));
      const originalFilePath = latestFilePath;
      const destinationPath = `cypress/fixtures/backups/${fileName}`;

      cy.task("moveFile", {
        source: originalFilePath,
        destination: destinationPath,
      }).then((result) => {
        cy.log(result);
        cy.writeFile(statusFile, { backupTestPassed: true });
      });
      
      cy.writeFile("cypress/fixtures/filename.txt", fileName);
    });
  });
});



describe("Scrape the dashboard details from the instance1 dashboard (instance: 1)", () => {
  it("Collect the dashboard details and save them to a JSON file in the UIComponents directory", () => {
    cy.log("Logging in...");
    login.visitInstance1();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);


    dashboard.visitDashboard();
    cy.wait(5000);


    const itemName = Cypress.env("dashboard");
    const instanceLabel = "instance1";
    const fileName = `${instanceLabel}_${itemName}_charts.json`;
    const fixturesFilePath = `cypress/fixtures/UIComponents/${fileName}`;
    cy.log(`Searching for the dashboard name: "${itemName}"`);
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
});



describe("Import the dashboard from the instance1 (instance: 2)", () => {
  const statusFile = "cypress/fixtures/test-status.json";
  const targetUrl = Cypress.env("instance2Dashboard");
  const dashboardInstance1Archive = Cypress.env("archiveInstance1");
  const desiredDownloadPath = "instance1Archive";
  const dashboardName = Cypress.env("dashboard");

  it("Importing the dashboard file from instance one", () => {
    cy.readFile(statusFile).then((status) => {
      if (!status.backupTestPassed) {
        throw new Error("Backup test failed — skipping import.");
      }

      cy.log("Logging in...");
      login.visitInstance2();
      login.enterUsername(Cypress.env("username"));
      login.enterPassword(Cypress.env("password"));
      login.clickLoginButton();
    cy.wait(2000);


      dashboard.visitDashboard();
      cy.log("Navigating to the dashboard page...");
      cy.wait(5000);

      dashboard.analyzeDashboardlist(dashboardName);

      cy.task("getLatestFile", dashboardInstance1Archive).then((latestFilePath) => {
        if (!latestFilePath) {
          throw new Error(`No files found in directory: ${dashboardInstance1Archive}`);
        }

        const fileName = Cypress._.last(latestFilePath.split("/"));
        const desiredFilePath = `${desiredDownloadPath}/${fileName}`;

        cy.log("Uploading the dashboard file...");
        dashboard.uploadSpecificFile(targetUrl, desiredFilePath);
        cy.wait(2000);

        cy.log("Dashboard import completed successfully.");
      });
    });
  });
});


describe("Scrape the dashboard details from the instance2 dashboard ( instance : 2 )", () => {

  const itemName = Cypress.env("dashboard");
  const instanceLabel = 'instance2'; 
  const fileName = `${instanceLabel}_${itemName}_charts.json`;
  const fixturesFilePath = `cypress/fixtures/UIComponents/${fileName}`;

  it("Collect the dashboard details and save them to a json file in the UIComponents directory ", () => {
    cy.log("Logging in...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);




    dashboard.visitDashboard();
    cy.log("Navigating to the dashboard page...");
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
});



describe("Export a dashboard from the instance two for verification purposes ( instance : 2 )", () => {
  const originalDownloadPath = Cypress.env("downloadDir");
  const archiveInstance2 = Cypress.env("archiveInstance2");
  const itemName = Cypress.env("dashboard");
  const desiredDownloadPath = "instance2Archive";
  const instance2Dir = Cypress.env("instance2DashboardDir");


  it("export a file to the file dashboard_instance2", () => {
    cy.log("Logging in...");
    login.visitInstance2();
    login.enterUsername(Cypress.env("username"));
    login.enterPassword(Cypress.env("password"));
    login.clickLoginButton();
    cy.wait(2000);

    dashboard.visitDashboard();
    cy.wait(5000);
    cy.log("Navigating to the dashboard page...");


    cy.log(`Using dashboard name: ${itemName}`);
    dashboard.findRowByItemName(itemName);
    cy.wait(2000);


    dashboard.clickShareButtonForRow(itemName);
    cy.log("Downloading the dashboard..."); 
    cy.wait(2000);

    cy.log("Extracting to the dashboard_instance2 dir...");
    cy.task("getLatestFile", originalDownloadPath).then((latestFilePath) => {
      if (!latestFilePath) {
        throw new Error(`No files found in directory: ${originalDownloadPath}`);
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
          cy.task("getLatestFile", extractDir).then((extractDir) => {
            if (!extractDir) {
              throw new Error(`No project directory found in the extracted directory: ${extractDir}`);
            }
            cy.log(`Unzipped project directory: ${extractDir}`);
          });
        });
      });
      cy.wait(1000);
    });
    cy.log("Exporting the dashboard from the instance two completed successfully.");
  });
});






