/// <reference types="cypress" />

describe("Verify uploaded datasets on instance 2 via REST API", () => {
    let sessionCookie = null;
    let datasetNames = [];
    const instanceUrl = Cypress.env("instance2Login");
  
    beforeEach(() => {
      cy.readFile("cypress/fixtures/session_instance2.json").then((session) => {
        sessionCookie = session.value;
      });
  
      const envList = Cypress.env("DATASET_NAMES");
      if (!envList || typeof envList !== "string") {
        throw new Error("No dataset names provided. Set DATASET_NAMES env var.");
      }
  
      datasetNames = envList.split(",").map((name) => name.trim());
    });
  
    it("Should verify all expected datasets exist on instance 2", () => {
      const foundDatasets = [];
  
      cy.wrap(null).then(() => {
        return Cypress.Promise.each(datasetNames, (datasetName) => {
          const query = encodeURIComponent(
            JSON.stringify({
              filters: [{ col: "table_name", opr: "eq", value: datasetName }],
            })
          );
  
          return cy.request({
            method: "GET",
            url: `${instanceUrl}/api/v1/dataset/?q=${query}`,
            headers: {
              Cookie: `session=${sessionCookie}`,
              Accept: "application/json",
            },
            failOnStatusCode: false,
          }).then((res) => {
            if (res.status === 200 && res.body.result.length > 0) {
              const datasetId = res.body.result[0].id;
              cy.log(`Found dataset: ${datasetName} (ID: ${datasetId})`);
              foundDatasets.push(datasetName);
            } else {
              throw new Error(`Dataset not found: ${datasetName}`);
            }
          });
        });
      }).then(() => {
        cy.log(`Verified ${foundDatasets.length}/${datasetNames.length} datasets.`);
      });
    });
  });
  