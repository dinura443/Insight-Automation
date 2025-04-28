
describe("Verify the Dashboard file contents of export & import", () => {
  it("should match latest exported and imported dashboard files", () => {
    const instance1DashboardDir = Cypress.env("instance1DashboardDir");
    const instance2DashboardDir = Cypress.env("instance2DashboardDir");

    cy.log(`Comparing extracted files directory: ${instance1DashboardDir}`);
    cy.log(`With imported files directory: ${instance2DashboardDir}`);

    cy.task("isDirectoryEmpty", instance1DashboardDir).then((isEmpty) => {
      if (isEmpty) {
        throw new Error(`The extracted files directory is empty: ${instance1DashboardDir}`);
      }
    });

    cy.task("isDirectoryEmpty", instance2DashboardDir).then((isEmpty) => {
      if (isEmpty) {
        throw new Error(`The imported files directory is empty: ${instance2DashboardDir}`);
      }
    });

    cy.task("verifySupersetFiles", {
      extractedFilesDir: instance1DashboardDir,
      importVerifyDir: instance2DashboardDir,
    }).then((result) => {
      if (!result.success) {
        cy.task("log", "YAML verification failed. Summary:", result.summary);
        result.summary.differences.forEach((diff) => {
          cy.task("log", diff);
        });
      }

      expect(result.success, "YAML verification passed").to.be.true;
    });
  });
});
  describe("Compare Instance 1 and Instance 2 Chart Data", () => {
    it("Should compare the chart data between instance 1 and instance 2", () => {
      const dataPath = Cypress.env("datapath");
    const itemName = Cypress.env("dashboard");
  
      cy.log(`Comparing chart data for item: ${itemName}`);
      cy.log(`Data path: ${dataPath}`);
  
      cy.task("verifyUiContents", {
        dataPath,
        itemName,
      }).then((result) => {
        if (!result.success) {
          cy.task("log", "UI verification failed. Summary:", result.summary);
          result.summary.differences.forEach((diff) => {
            cy.task("log", diff);
          });
        }
  
        expect(result.success, "UI verification passed").to.be.true;
      });
    });
  });


  describe("End-to-End Clean Up", () => {
    it("clean up",() => {
      const downloadDir = Cypress.env("fixturesDir"); 
      const instance1Dir = Cypress.env("instance1DashboardDir"); 
      const instance2Dir = Cypress.env("instance2DashboardDir"); 
  
      cy.log("Clearing contents of downloads directory...");
      cy.task("clearDirectoryContents", downloadDir).then((result) => {
        cy.log(result);
      });
  
      cy.log("Clearing contents of instance 1 dashboard directory...");
      cy.task("clearDirectoryContents", instance1Dir).then((result) => {
        cy.log(result);
      });
  
      cy.log("Clearing contents of instance 2 dashboard directory...");
      cy.task("clearDirectoryContents", instance2Dir).then((result) => {
        cy.log(result);
      });
    });
  });