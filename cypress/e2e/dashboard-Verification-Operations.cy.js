describe("Verification Process", () => {

  it("Performing the file verification", () => {
    const instance1DashboardDir = Cypress.env("FILECOMPONENTS_INSTANCE1");
    const instance2DashboardDir = Cypress.env("FILECOMPONENTS_INSTANCE2");

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
      extractedFilesDir: Cypress.env("FILECOMPONENTS_INSTANCE1"),
      importVerifyDir: Cypress.env("FILECOMPONENTS_INSTANCE2"),
    }).then((result) => {
      if (!result.success) {
        cy.task("log", "YAML verification failed. Summary:", result.summary);
  
      }
      expect(result.success, "YAML verification passed").to.be.true;
    });
  });
});

describe("Verification Process", () => {
  it("Performing the UI Verification", () => {
    const dashboardUi = Cypress.env("dashboardUi");
    const itemName = Cypress.env("dashboard");

    cy.log(`Comparing chart data for item: ${itemName}`);
    cy.log(`Data path: ${dashboardUi}`);

    cy.task("verifyUiContents", {
      dashboardUi,
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


describe("Verification Process", () => {

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


