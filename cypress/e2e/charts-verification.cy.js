
describe("Verify uploaded charts on instance 2 via REST API", () => {
    let sessionCookie = null;
    let chartNames = [];
    const instanceUrl = Cypress.env("instance2Login");
  
    beforeEach(() => {
      cy.readFile("cypress/fixtures/session_instance2.json").then((session) => {
        sessionCookie = session.value;
      });
  
      const envList = Cypress.env("CHART_NAMES");
      if (!envList || typeof envList !== "string") {
        throw new Error("No chart names provided. Set CHART_NAMES env var.");
      }
  
      chartNames = envList.split(",").map((name) => name.trim());
    });
  
    it("Should verify all expected charts exist on instance 2", () => {
      const foundCharts = [];
  
      cy.wrap(null).then(() => {
        return Cypress.Promise.each(chartNames, (chartName) => {
          const query = encodeURIComponent(
            JSON.stringify({
              filters: [{ col: "slice_name", opr: "eq", value: chartName }],
            })
          );
  
          return cy.request({
            method: "GET",
            url: `${instanceUrl}/api/v1/chart/?q=${query}`,
            headers: {
              Cookie: `session=${sessionCookie}`,
              Accept: "application/json",
            },
            failOnStatusCode: false,
          }).then((res) => {
            if (res.status === 200 && res.body.result.length > 0) {
              const chartId = res.body.result[0].id;
              cy.log(`Found chart: ${chartName} (ID: ${chartId})`);
              foundCharts.push(chartName);
            } else {
              throw new Error(` Chart not found: ${chartName}`);
            }
          });
        });
      }).then(() => {
        cy.log(`Verified ${foundCharts.length}/${chartNames.length} charts.`);
      });
    });
  });
  