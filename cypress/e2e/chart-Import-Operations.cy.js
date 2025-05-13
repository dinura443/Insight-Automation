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
//
describe("Export charts from the 1st instance", () => {
  before(() => {
    loginPage.visitInstance1();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    chartPage.visitChartPage();
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

    this.chartNames = Cypress.env("CHART_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export each chart by name dynamically", function () {
    const supersetUrl = Cypress.env("instance1Login");

    this.chartNames.forEach((chartName) => {
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
        url: `${supersetUrl}/api/v1/chart/?q=${encodedQuery}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          return;
        }

        const chartId = res.body.result[0].id;
        const idListRison = `!(${chartId})`;
        const exportUrl = `${supersetUrl}/api/v1/chart/export/?q=${encodeURIComponent(idListRison)}`;

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
        });
      });
    });
  });
});

describe("Backup charts from Instance 2", () => {
  let sessionCookie;

  before(() => {
    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(5000);
    chartPage.visitChartPage();
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

    this.chartNames = Cypress.env("CHART_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should back up existing charts in Instance 2 (if any)", function () {
    this.chartNames.forEach((chartName) => {
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
          return;
        }

        const chartId = res.body.result[0].id;
        const risonFilter = `!(${chartId})`;
        const exportUrl = `${Cypress.env("instance2Login")}/api/v1/chart/export/?q=${encodeURIComponent(risonFilter)}`;

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
            `cypress/fixtures/backups/pre-import/charts/${chartName.replace(/\s+/g, "_")}_backup.zip`,
            exportRes.body,
            { encoding: "binary" }
          );

          cy.request({
            method: "DELETE",
            url: `${Cypress.env("instance2Login")}/api/v1/chart/${chartId}`,
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

describe("Import charts to Instance 2 from the instance1", () => {
  const archiveDir = Cypress.env("ARCHIVE_INSTANCE1");

  it("Should import all ZIP files from ARCHIVE_INSTANCE1 into Instance 2", function () {
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

describe("Export The charts from instance2 for verification", () => {
  before(() => {
    loginPage.visitInstance2();
    loginPage.enterUsername(Cypress.env("username"));
    loginPage.enterPassword(Cypress.env("password"));
    loginPage.clickLoginButton();

    cy.wait(2000);
    chartPage.visitChartPage();
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

    this.chartNames = Cypress.env("CHART_NAMES")
      .split(",")
      .map((name) => name.trim());
  });

  it("Should export each chart by name dynamically", function () {
    const supersetUrl = Cypress.env("instance2Login");

    this.chartNames.forEach((chartName) => {
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
        url: `${supersetUrl}/api/v1/chart/?q=${encodedQuery}`,
        headers: {
          Accept: "application/json",
        },
        failOnStatusCode: false,
      }).then((res) => {
        if (res.status !== 200 || !res.body.result?.length) {
          return;
        }

        const chartId = res.body.result[0].id;
        const idListRison = `!(${chartId})`;
        const exportUrl = `${supersetUrl}/api/v1/chart/export/?q=${encodeURIComponent(idListRison)}`;

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
        });
      });
      cy.wait(10000)
    });
  });
});

