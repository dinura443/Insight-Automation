import { LoginPage } from "../../page-objects-and-services/page-objects/Login";
import { DataSet } from "../../page-objects-and-services/page-objects/dataset-Objects";

const loginPage = new LoginPage();
const dataset = new DataSet();

let datasetName = [];

before(() => {
  const envList = Cypress.env("DATASET_NAMES");
  if (!envList || typeof envList !== "string") {
    throw new Error("No dataset names provided. Set DATASET_NAMES env var.");
  }
  datasetName = envList.split(",").map((name) => name.trim());
});

describe("Export datasets from the 1st instance", () => {
  before(() => {
    loginPage.visitInstance1();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    dataset.visitDatasetPage();
    cy.wait(5000);

    cy.getCookie("session").should("exist").then((cookie) => {
      let sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.datasetNames = Cypress.env("DATASET_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export each dataset by name dynamically", function () {
    const supersetUrl = Cypress.env("instance1Login");

    this.datasetNames.forEach((datasetName) => {
      const encodedQuery = encodeURIComponent(
        JSON.stringify({
          filters: [
            {
              col: "table_name",
              opr: "eq",
              value: datasetName,
            },
          ],
        })
      );

      cy.request({
        method: "GET",
        url: `${supersetUrl}/api/v1/dataset/?q=${encodedQuery}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          return;
        }

        const datasetId = res.body.result[0].id;
        const idListRison = `!(${datasetId})`;
        const exportUrl = `${supersetUrl}/api/v1/dataset/export/?q=${encodeURIComponent(idListRison)}`;

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
            `cypress/fixtures/ARCHIVE_INSTANCE1/${datasetName.replace(/\s+/g, "_")}_dataset_export.zip`,
            exportRes.body,
            { encoding: "binary" }
          );
        });
      });
    });
  });
});

describe("Backup datasets from Instance 2", () => {
  let sessionCookie;

  before(() => {
    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(5000);
    dataset.visitDatasetPage();
    cy.wait(5000);

    cy.getCookie("session").should("exist").then((cookie) => {
      sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.datasetNames = Cypress.env("DATASET_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should back up existing datasets in Instance 2 (if any)", function () {
    this.datasetNames.forEach((datasetName) => {
      const encodedQuery = encodeURIComponent(
        JSON.stringify({
          filters: [
            {
              col: "table_name",
              opr: "eq",
              value: datasetName,
            },
          ],
        })
      );

      cy.request({
        method: "GET",
        url: `${Cypress.env("instance2Login")}/api/v1/dataset/?q=${encodedQuery}`,
        headers: {
          Cookie: `session=${this.sessionCookie}`,
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          return;
        }

        const datasetId = res.body.result[0].id;
        const risonFilter = `!(${datasetId})`;
        const exportUrl = `${Cypress.env("instance2Login")}/api/v1/dataset/export/?q=${encodeURIComponent(risonFilter)}`;

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
            return;
          }

          cy.writeFile(
            `cypress/fixtures/backups/pre-import/datasets/${datasetName.replace(/\s+/g, "_")}_dataset_backup.zip`,
            exportRes.body,
            { encoding: "binary" }
          );

          cy.request({
            method: "DELETE",
            url: `${Cypress.env("instance2Login")}/api/v1/dataset/${datasetId}`,
            headers: {
              Cookie: `session=${this.sessionCookie}`,
              Accept: "application/json",
            },
            failOnStatusCode: false,
          });
        });
      });
    });
  });
});

describe("Import datasets to Instance 2 from Instance 1", () => {
  const archiveDir = Cypress.env("ARCHIVE_INSTANCE1");

  it("Should import all dataset ZIP files from ARCHIVE_INSTANCE1 into Instance 2", function () {
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

      dataset.visitDatasetPage();
      cy.wait(5000);

      if (zipFiles && zipFiles.length > 0) {
        zipFiles.forEach((fullFilePath) => {
          const relativePath = fullFilePath.replace(/^.*fixtures[\\\/]/, "");
          const fileName = relativePath.split("/").pop();

          if (!fileName.includes("_dataset_")) {
            return;
          }

          dataset.uploadSpecificFile(relativePath);
          cy.wait(3000);
          cy.reload();
        });
      }
    });
  });
});

describe("Export datasets from the 2nd instance for verification", () => {
  before(() => {
    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    dataset.visitDatasetPage();
    cy.wait(5000);

    cy.getCookie("session").should("exist").then((cookie) => {
      let sessionCookie = cookie.value;
      cy.writeFile("cypress/fixtures/superset_session.json", { value: sessionCookie });
    });
  });

  beforeEach(function () {
    cy.fixture("superset_session.json").then((session) => {
      this.sessionCookie = session.value;
    });

    this.datasetNames = Cypress.env("DATASET_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export each dataset by name dynamically", function () {
    const supersetUrl = Cypress.env("instance2Login");

    this.datasetNames.forEach((datasetName) => {
      const encodedQuery = encodeURIComponent(
        JSON.stringify({
          filters: [
            {
              col: "table_name",
              opr: "eq",
              value: datasetName,
            },
          ],
        })
      );

      cy.request({
        method: "GET",
        url: `${supersetUrl}/api/v1/dataset/?q=${encodedQuery}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          return;
        }

        const datasetId = res.body.result[0].id;
        const idListRison = `!(${datasetId})`;
        const exportUrl = `${supersetUrl}/api/v1/dataset/export/?q=${encodeURIComponent(idListRison)}`;

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
            `cypress/fixtures/ARCHIVE_INSTANCE2/${datasetName.replace(/\s+/g, "_")}_dataset_export.zip`,
            exportRes.body,
            { encoding: "binary" }
          );
        });
      });
    });
  });
});
