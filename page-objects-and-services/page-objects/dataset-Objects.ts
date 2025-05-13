export class DataSet {
    datasetPageBtn = "//a[normalize-space()='Datasets']";
    bulkSelectBtn = "//button[@class='antd5-btn css-7kui6y antd5-btn-default antd5-btn-color-default antd5-btn-variant-outlined superset-button superset-button-secondary css-1ur28sd']";
    exportButton = "//button[@class='antd5-btn css-7kui6y antd5-btn-primary antd5-btn-color-primary antd5-btn-variant-solid superset-button superset-button-primary cta css-1pe2gaq']";
    importButtonSelector = "(//button[@class='antd5-btn css-7kui6y antd5-btn-link antd5-btn-color-primary antd5-btn-variant-link superset-button superset-button-link css-1ckc79t'])[1]";
    selectFileInputSelector = "#modelFile";
    importbutton = "(//button[@class='antd5-btn css-7kui6y antd5-btn-primary antd5-btn-color-primary antd5-btn-variant-solid superset-button superset-button-primary cta css-1pe2gaq'])[1]";
    itemNameSelector = "td a";
    menuItemSelector = "(//button[@aria-label='Menu actions trigger'])";
    viewquerySelector = "//body//div//li[10]";
    copyquerySelector = "(//button[@class='antd5-btn css-7kui6y antd5-btn-default antd5-btn-color-default antd5-btn-variant-outlined superset-button superset-button-undefined css-1s3j1k9'])[1]";
   TypeinsertSelector = "(//span[@class='ant-input-affix-wrapper css-1ij993o'])[1]";
   sqlEditorSelector = "//div[@class='ace_content']";


    visitDatasetPage(): void {
        cy.log("Navigating to the dataset page...");
        cy.xpath(this.datasetPageBtn).click();
        cy.wait(10000);
    }

    uploadSpecificFile(relativeFilePath: string) {
        cy.xpath(this.importButtonSelector, { timeout: 10000 })
          .should('exist')
          .and('be.visible')
          .then(($button) => {
            cy.wrap($button).click({ force: true });
          });
      
        cy.get(this.selectFileInputSelector).attachFile({ filePath: relativeFilePath });
      
        cy.xpath(this.importbutton, { timeout: 10000 }).should("be.visible").click({ timeout: 5000 });
      }


}

