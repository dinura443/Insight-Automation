import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { Chart } from "../../page-objects-and-services/page-objects/chart-Obects";
const loginPage = new LoginPage();
const chartPage = new Chart();

describe("Initialize sessioncookies", () => {
  let sessionCookies = {
    instance1: null,
    instance2: null,
  };

  before(() => {
    cy.readFile("cypress/fixtures/session_instance1.json").then(data => {
      sessionCookies.instance1 = data.value;
    });

    cy.readFile("cypress/fixtures/session_instance2.json").then(data => {
      sessionCookies.instance2 = data.value;
    });
  });
});

describe("Chart Migration Between Superset Instances", () => {
    let chartNames = [];

    const envList = Cypress.env("CHART_NAMES");
    if (!envList || typeof envList !== "string") {
      throw new Error("No chart names provided. Set CHART_NAMES env var.");
    }

    chartNames = envList.split(",").map(name => name.trim());

    it("Export the components from instance1", () => {
        const supersetUrl = Cypress.env("instance1Login");
      
        cy.readFile("cypress/fixtures/session_instance1.json").then(session => {
          const instance1Session = session.value;
      
          chartNames.forEach(chartName => {
            const encodedQuery = encodeURIComponent(JSON.stringify({
              filters: [{ col: "slice_name", opr: "eq", value: chartName }],
            }));
      
            cy.request({
              method: "GET",
              url: `${supersetUrl}/api/v1/chart/?q=${encodedQuery}`,
              headers: {
                Cookie: `session=${instance1Session}`,
                Accept: "application/json",
              },
              failOnStatusCode: false,
            }).then(res => {
              if (res.status !== 200 || !res.body.result?.length) return;
      
              const chartId = res.body.result[0].id;
              const exportUrl = `${supersetUrl}/api/v1/chart/export/?q=${encodeURIComponent(`!(${chartId})`)}`;
      
              cy.request({
                method: "GET",
                url: exportUrl,
                headers: {
                  Cookie: `session=${instance1Session}`,
                  Accept: "application/zip",
                },
                encoding: "binary",
              }).then(exportRes => {
                expect(exportRes.status).to.eq(200);
                cy.writeFile(
                  `cypress/fixtures/ARCHIVE_INSTANCE1/${chartName.replace(/\s+/g, "_")}_export.zip`,
                  exportRes.body,
                  { encoding: "binary" }
                );
              });
            });
          });
        });
      });
      
    it("Backup existing components from Instance2", () => {
        cy.readFile("cypress/fixtures/session_instance2.json").then(session => {
          const instance2Session = session.value;
          const instance2BaseUrl = Cypress.env("instance2Login");
      
          chartNames.forEach(chartName => {
            const encodedQuery = encodeURIComponent(JSON.stringify({
              filters: [{ col: "slice_name", opr: "eq", value: chartName }],
            }));
      
            cy.request({
              method: "GET",
              url: `${instance2BaseUrl}/api/v1/chart/?q=${encodedQuery}`,
              headers: {
                Cookie: `session=${instance2Session}`,
                Accept: "application/json",
              },
              failOnStatusCode: false,
            }).then(res => {
              if (res.status !== 200 || !res.body.result?.length) return;
      
              const chartId = res.body.result[0].id;
      
              const exportUrl = `${instance2BaseUrl}/api/v1/chart/export/?q=${encodeURIComponent(`!(${chartId})`)}`;
              cy.request({
                method: "GET",
                url: exportUrl,
                headers: {
                  Cookie: `session=${instance2Session}`,
                  Accept: "application/zip",
                },
                encoding: "binary",
              }).then(exportRes => {
                expect(exportRes.status).to.eq(200);
                cy.writeFile(
                  `cypress/fixtures/backups/pre-import/${chartName.replace(/\s+/g, "_")}_backup.zip`,
                  exportRes.body,
                  { encoding: "binary" }
                );
      
                // Step 3: DELETE the chart after backup
                cy.request({
                  method: "DELETE",
                  url: `${instance2BaseUrl}/api/v1/chart/${chartId}`,
                  headers: {
                    Cookie: `session=${instance2Session}`,
                    Accept: "application/json",
                  },
                  failOnStatusCode: false,
                }).then(deleteRes => {
                  expect([200, 204]).to.include(deleteRes.status);
                });
              });
            });
          });
        });
      });
      
      
    it("Import the components to instance2", function () {
            const archiveDir = Cypress.env("ARCHIVE_INSTANCE1");

          let zipFiles;
      
          cy.task("getFilesInDirectory", archiveDir).then((files) => {
            zipFiles = files;
            if (!zipFiles || zipFiles.length === 0) {
              return;
            }
      
            loginPage.visitInstance2();
            loginPage.enterUsername(Cypress.env("username"));
            loginPage.enterPassword(Cypress.env("password"));
            loginPage.clickLoginButton();
            cy.wait(5000);
      
            chartPage.visitChartPage();
            cy.wait(5000);
      
            if (zipFiles && zipFiles.length > 0) {
              zipFiles.forEach((fullFilePath) => {
                const relativePath = fullFilePath.replace(/^.*fixtures[\\\/]/, "");
                chartPage.uploadSpecificFile(relativePath);
                cy.wait(3000);
                cy.reload();
              });
            }
          });
      });  
      
});