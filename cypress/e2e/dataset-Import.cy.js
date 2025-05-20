import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DataSet } from "../../page-objects-and-services/page-objects/dataset-Objects";

const loginPage = new LoginPage();
const datasetPage = new DataSet();
const dataset = new DataSet();


describe("Dataset Migration Between Superset Instances", () => {
  let sessionCookies = {
    instance1: null,
    instance2: null,
  };

  before(() => {
    // Load session cookies from previously saved files
    cy.readFile("cypress/fixtures/session_instance1.json").then(data => {
      sessionCookies.instance1 = data.value;
    });

    cy.readFile("cypress/fixtures/session_instance2.json").then(data => {
      sessionCookies.instance2 = data.value;
    });
  });
});

describe("Dataset Migration Between Superset Instances", () => {
  let datasetNames = [];

  const envList = Cypress.env("DATASET_NAMES");
  if (!envList || typeof envList !== "string") {
    throw new Error("No dataset names provided. Set DATASET_NAMES env var.");
  }

  datasetNames = envList.split(",").map(name => name.trim());

  it("Export the components from instance1", () => {
    const supersetUrl = Cypress.env("instance1Login");

    cy.readFile("cypress/fixtures/session_instance1.json").then(session => {
      const instance1Session = session.value;

      datasetNames.forEach(datasetName => {
        const encodedQuery = encodeURIComponent(
          JSON.stringify({
            filters: [{ col: "table_name", opr: "eq", value: datasetName }],
          })
        );

        cy.request({
          method: "GET",
          url: `${supersetUrl}/api/v1/dataset/?q=${encodedQuery}`,
          headers: {
            Cookie: `session=${instance1Session}`,
            Accept: "application/json",
          },
          failOnStatusCode: false,
        }).then(res => {
          if (res.status !== 200 || !res.body.result?.length) return;

          const datasetId = res.body.result[0].id;
          const exportUrl = `${supersetUrl}/api/v1/dataset/export/?q=${encodeURIComponent(`!(${datasetId})`)}`;

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
              `cypress/fixtures/ARCHIVE_INSTANCE1/${datasetName.replace(/\s+/g, "_")}.zip`,
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

      datasetNames.forEach(datasetName => {
        const encodedQuery = encodeURIComponent(
          JSON.stringify({
            filters: [{ col: "table_name", opr: "eq", value: datasetName }],
          })
        );

        // Step 1: Get dataset info by name
        cy.request({
          method: "GET",
          url: `${instance2BaseUrl}/api/v1/dataset/?q=${encodedQuery}`,
          headers: {
            Cookie: `session=${instance2Session}`,
            Accept: "application/json",
          },
          failOnStatusCode: false,
        }).then(res => {
          if (res.status !== 200 || !res.body.result?.length) return;

          const datasetId = res.body.result[0].id;

          // Step 2: Export dataset ZIP backup
          const exportUrl = `${instance2BaseUrl}/api/v1/dataset/export/?q=${encodeURIComponent(`!(${datasetId})`)}`;
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
                `cypress/fixtures/backups/pre-import/${datasetName.replace(/\s+/g, "_")}_dataset_backup.zip`,
                exportRes.body,
              { encoding: "binary" }
            );

            // Step 3: DELETE the dataset after backup
            cy.request({
              method: "DELETE",
              url: `${instance2BaseUrl}/api/v1/dataset/${datasetId}`,
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
    let zipFiles;
    const archiveDir = Cypress.env("ARCHIVE_INSTANCE1");


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

      dataset.visitDatasetPage();
      cy.wait(5000);

      if (zipFiles && zipFiles.length > 0) {
        zipFiles.forEach((fullFilePath) => {
          const relativePath = fullFilePath.replace(/^.*fixtures[\\\/]/, "");
          const fileName = relativePath.split("/").pop();

          

          dataset.uploadSpecificFile(relativePath);
          cy.wait(3000);
          cy.reload();
        });
      }
    });
  });
});
