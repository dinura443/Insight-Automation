export class Chart {
    chartPageBtn = "(//a[normalize-space()='Charts'])[1]";
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
    visitChartPage(): void {
        cy.log("Navigating to the chart page...");
        cy.xpath(this.chartPageBtn).click();
        cy.wait(10000);
    }

    clickBulkSelectBtn(): void {
        cy.log("Clicking the 'Bulk Select' button...");
        cy.xpath(this.bulkSelectBtn)
            .should('exist')
            .and('be.visible')
            .click();

    }



    
    findRowByItemName(itemName: string) {
        cy.log(`Searching for item name (exact match): "${itemName}"`);
      
        return cy.get("td a").filter((index, el) => {
          return el.textContent?.trim() === itemName;
        }).first().closest("tr");
      }

      clickItemName(itemName: string) {
        cy.log(`Clicking on item name: "${itemName}"`);
        cy.contains(this.itemNameSelector, itemName, { timeout: 10000 })
          .should('exist')
          .and('be.visible')
          .click({ force: true });
        cy.log(`Successfully clicked on item name: "${itemName}"`);
      }

    uploadSpecificFile(relativeFilePath: string) {
        cy.xpath(this.importButtonSelector, { timeout: 10000 })
          .should('exist')
          .and('be.visible')
          .then(($button) => {
            cy.wrap($button).click({ force: true });
          });
      
        // ✅ Use relative path directly with attachFile()
        cy.get(this.selectFileInputSelector).attachFile({ filePath: relativeFilePath });
      
        cy.xpath(this.importbutton, { timeout: 10000 }).should("be.visible").click({ timeout: 5000 });
      }

    bulkExportChart(chartNames: string[]): void {
        cy.log(`Starting bulk export for ${chartNames.length} Charts`);

        cy.xpath(this.bulkSelectBtn).click({ force: true });
        cy.wait(5000);

        const foundChartNames: string[] = [];

        cy.get("td a")
            .each(($el) => {
                const name = $el.text().trim();
                if (name !== "") {
                    foundChartNames.push(name);
                }
            })
            .then(() => {
                cy.log("Found Chart List:", JSON.stringify(foundChartNames));

                const indicesToCheck = chartNames
                    .map((name) => {
                        const index = foundChartNames.indexOf(name);
                        if (index === -1) {
                            cy.log(`Dashboard "${name}" not found in list.`);
                            return null;
                        }
                        return index;
                    })
                    .filter((index) => index !== null);

                if (indicesToCheck.length === 0) {
                    throw new Error("No valid chart names found to export.");
                }

                indicesToCheck.forEach((index) => {
                    const checkboxXPath = `(//input[@id='${index}'])[1]`;
                    cy.xpath(checkboxXPath)
                        .should("exist")
                        .check({ force: true })
                        .log(`Checked chart at index ${index}: "${foundChartNames[index]}"`);
                    cy.wait(1000);
                });

                cy.xpath(this.exportButton)
                    .should("be.visible")
                    .click({ force: true });

                cy.log("Bulk export completed successfully.");
                cy.wait(5000);
            });
    }

}



