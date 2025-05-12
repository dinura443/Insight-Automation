describe("Import Single Dashboard", () => {
    const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE1CHARTS");
    const targetDirectory2 = Cypress.env("FILECOMPONENTS_INSTANCE2CHARTS");
  
    const desiredPath = "FILECOMPONENTS_INSTANCE1CHARTS";
    const desiredPathInstance2 = "FILECOMPONENTS_INSTANCE2CHARTS";
  
    const dashboardInstance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
    const dashboardInstance2Archive = Cypress.env("ARCHIVE_INSTANCE2");
  
    // Helper function to extract all zip files in a given archive directory
    const extractAllZipsFromArchive = (archiveDir, extractDir, instanceName) => {
      cy.task("getFilesInDirectory", archiveDir).then((zipFiles) => {
        if (!zipFiles || zipFiles.length === 0) {
          throw new Error(`No ZIP files found in directory: ${archiveDir}`);
        }
  
        cy.log(`Found ${zipFiles.length} ZIP file(s) in ${instanceName}. Extracting...`);
  
        zipFiles.forEach((zipPath) => {
          const fileName = Cypress._.last(zipPath.split("/"));
          const desiredFilePath = `${desiredPath}/${fileName}`;
  
          cy.log(`Unzipping ZIP file: ${zipPath} into ${extractDir}`);
          cy.task("unzipFile", { zipPath, extractDir }).then((result) => {
            cy.log(result.message);
            cy.log(`Verifying unzipped content for ${fileName}...`);
            cy.task("getLatestFile", extractDir).then((extractedFolder) => {
              cy.log(`Successfully extracted to folder: ${extractedFolder}`);
            });
          });
        });
      });
    };
  
    it("Extracts all ZIP files to the 1st instance folder", () => {
      extractAllZipsFromArchive(dashboardInstance1Archive, targetDirectory, "Instance 1");
    });
  
    it("Extracts all ZIP files to the 2nd instance folder", () => {
      extractAllZipsFromArchive(dashboardInstance2Archive, targetDirectory2, "Instance 2");
    });
  });

  describe("Bulk Verification Process", () => {
    it("Performing the file verification", () => {
      const instance1DashboardDir = Cypress.env("FILECOMPONENTS_INSTANCE1CHARTS");
      const instance2DashboardDir = Cypress.env("FILECOMPONENTS_INSTANCE2CHARTS");
  
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
      }).then((result) => {
        if (!result.success) {
          cy.task("log", `YAML verification failed.\nSummary:\n${JSON.stringify(result.summary, null, 2)}`);
        }
        expect(result.success, result.message || "YAML verification passed").to.be.true;
      });
    });
  });