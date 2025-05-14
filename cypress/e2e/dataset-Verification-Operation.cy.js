describe("Verify datasets", () => {
    const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE1");
    const targetDirectory2 = Cypress.env("FILECOMPONENTS_INSTANCE2");
  
    const desiredPath = "FILECOMPONENTS_INSTANCE1";
    const desiredPathInstance2 = "FILECOMPONENTS_INSTANCE2";
  
    const dashboardInstance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
    const dashboardInstance2Archive = Cypress.env("ARCHIVE_INSTANCE2");
  
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

  describe("Bulk Dataset Verification Process", () => {
    it("Verifies dataset export structure between Instance 1 and Instance 2", () => {
      const instance1Dir = Cypress.env("FILECOMPONENTS_INSTANCE1"); 
      const instance2Dir = Cypress.env("FILECOMPONENTS_INSTANCE2"); 
  
      cy.task("verifyDatasetExportStructure", {
        dir1: instance1Dir,
        dir2: instance2Dir,
      }).then(({ success, message }) => {
        if (!success) {
          throw new Error(message);
        }
        expect(success, message).to.be.true;
      });
    });
  });