describe("Bulk Verification Process", () => {
  it("Performs YAML and UI verifications", () => {
    const instance1DashboardDir = Cypress.env("FILECOMPONENTS_INSTANCE1");
    const instance2DashboardDir = Cypress.env("FILECOMPONENTS_INSTANCE2");
    const dashboardUi = Cypress.env("dashboardUi");
    const itemName = Cypress.env("DASHBOARD_NAMES");

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
      extractedFilesDir: instance2DashboardDir,
      importVerifyDir: instance1DashboardDir,
    }).then((yamlResult) => {
      if (!yamlResult.success) {
        cy.task("log", `YAML verification failed.\nSummary:\n${JSON.stringify(yamlResult.summary, null, 2)}`);
      }
      expect(yamlResult.success, yamlResult.message || "YAML verification passed").to.be.true;

      // Only continue with UI verification if YAML passes
      cy.log(`Comparing chart data for item: ${itemName}`);
      cy.log(`Data path: ${dashboardUi}`);

      cy.task("verifyUiContents", {
        dashboardUi,
        itemName,
      }).then((uiResult) => {
        if (!uiResult.success) {
          cy.task("log", "UI verification failed. Summary:", uiResult.summary);
          uiResult.summary.differences.forEach((diff) => {
            cy.task("log", diff);
          });
        }
        expect(uiResult.success, "UI verification passed").to.be.true;
      });
    });
  });
});

/*
  it("End-to-End Clean Up", () => {
    const instance2Archive = Cypress.env("ARCHIVE_INSTANCE2");
    const instance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
    const dashboardUi = Cypress.env("dashboardUi");
    const instance1Dir = Cypress.env("FILECOMPONENTS_INSTANCE1");
    const instance2Dir = Cypress.env("FILECOMPONENTS_INSTANCE2");
    const backupStatusDir = Cypress.env("backupStatusDir");

    cy.log("Clearing contents of downloads directory...");
    cy.task("clearDirectoryContents", dashboardUi).then((result) => {
      cy.log(result);
    });

    cy.log("Clearing contents of downloads directory...");
    cy.task("clearDirectoryContents", instance1Archive).then((result) => {
      cy.log(result);
    });

    cy.log("Clearing contents of downloads directory...");
    cy.task("clearDirectoryContents", instance2Archive).then((result) => {
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

    cy.log("Clearing the rest of the temp directories...");
    cy.task("deleteFile", backupStatusDir).then((result) => {
      cy.log(result);
    });
  });
});


*/