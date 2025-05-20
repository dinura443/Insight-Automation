describe("Verify charts", () => {
    const targetDirectory = Cypress.env("FILECOMPONENTS_INSTANCE1");
    const targetDirectory2 = Cypress.env("FILECOMPONENTS_INSTANCE2");

    const dashboardInstance1Archive = Cypress.env("ARCHIVE_INSTANCE1");
    const dashboardInstance2Archive = Cypress.env("ARCHIVE_INSTANCE2");

    const extractAllZipsFromArchive = (archiveDir, extractDir, instanceName) => {
        cy.task("getFilesInDirectory", archiveDir).then((zipFiles) => {
            if (!zipFiles || zipFiles.length === 0) {
                throw new Error(`No ZIP files found in directory: ${archiveDir}`);
            }

            cy.log(`Found ${zipFiles.length} ZIP file(s) in ${instanceName}. Extracting sequentially...`);

            Cypress._.each(zipFiles, (zipPath) => {
                const fileName = Cypress._.last(zipPath.split("/"));

                cy.log(`Unzipping file: ${fileName}`);

                cy.task("unzipFile", { zipPath, extractDir }).then((result) => {
                    cy.log(result.message || `Unzipped ${fileName}`);

                    cy.task("listDirectoryContents", extractDir).then((contents) => {
                        cy.log(`Contents of ${extractDir}: ${contents.join(", ")}`);
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
    it("Verifies chart export structure between Instance 1 and Instance 2", () => {
      const instance1Dir = Cypress.env("FILECOMPONENTS_INSTANCE1"); 
      const instance2Dir = Cypress.env("FILECOMPONENTS_INSTANCE2"); 
  
      cy.task("verifyChartExportStructure", {
        dir1: instance1Dir,
        dir2: instance2Dir,
      }).then(({ success, message }) => {
        if (!success) {
          throw new Error(message || "Folder structure verification failed");
        }
        expect(success, message).to.be.true;
      });
    });
  });