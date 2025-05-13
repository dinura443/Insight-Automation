describe("Import Single Dashboard", () => {
    const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE1");
    const targetDirectory2 = Cypress.env("FILECOMPONENTS_INSTANCE2");
  
    const dashboardInstance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
    const dashboardInstance2Archive = Cypress.env("ARCHIVE_INSTANCE2");
  
    const extractAllZipsFromArchive = (archiveDir, extractDir, instanceName) => {
      cy.wrap(null).then(async () => {
        const zipFiles = await cy.task("getFilesInDirectory", archiveDir);
  
        if (!zipFiles || zipFiles.length === 0) {
          throw new Error(`No ZIP files found in directory: ${archiveDir}`);
        }
  
        cy.log(`Found ${zipFiles.length} ZIP file(s) in ${instanceName}. Extracting...`);
  
        // Use for...of to allow await inside
        for (const zipPath of zipFiles) {
          const fileName = zipPath.split("/").pop();
  
          cy.log(`Unzipping ZIP file: ${zipPath} into ${extractDir}`);
          await cy.task("unzipFile", { zipPath, extractDir });
  
          cy.log(`Verifying unzipped content for ${fileName}...`);
          const extractedFolder = await cy.task("getLatestFile", extractDir);
          cy.log(`Successfully extracted to folder: ${extractedFolder}`);
        }
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
    it("Verifies chart export structure between Instance 1 and Instance 2", () => {
      const instance1Dir = Cypress.env("FILECOMPONENTS_INSTANCE1"); // e.g., cypress/fixtures/instance1FileComponents
      const instance2Dir = Cypress.env("FILECOMPONENTS_INSTANCE2"); // e.g., cypress/fixtures/instance2FileComponents
  
      cy.task("verifyChartExportStructure", {
        dir1: instance1Dir,
        dir2: instance2Dir,
      }).then(({ success, message }) => {
        // Log detailed failure reason to Cypress UI
        if (!success) {
          throw new Error(message || "Folder structure verification failed");
        }
        expect(success, message).to.be.true;
      });
    });
  });