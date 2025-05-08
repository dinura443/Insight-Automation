export class chart{

    chartPagebtn = "'//a[normalize-space()='Charts']'";
    bulkselectionbtn = "(//button[@class='antd5-btn css-7kui6y antd5-btn-default antd5-btn-color-default antd5-btn-variant-outlined superset-button superset-button-secondary css-1ur28sd'])[1]";
    exportButton = "//button[@class='antd5-btn css-7kui6y antd5-btn-primary antd5-btn-color-primary antd5-btn-variant-solid superset-button superset-button-primary cta css-1pe2gaq']";


    visitChartPage() {
        cy.log("Navigating to the chart page...");
        cy.xpath(this.chartPagebtn)
          .should('exist')
          .and('be.visible')
          .click();
      }


    clickBulkSelectBtn() {
        cy.log("Clicking the 'Bulk Select' button...");
        cy.xpath(this.bulkselectionbtn)
          .should('exist')
          .and('be.visible')
          .click();


    }

    bulkExportChart(chartNames: string[]): void {
        cy.log(`Starting bulk export for ${chartNames.length} Charts`);
    
        // Step 1: Click "Bulk Select" button
        cy.xpath(this.bulkselectionbtn).click({ force: true });
        cy.wait(5000); // Small delay to ensure checkboxes are visible
    
        // Step 2: Get all dashboard names in order from the DOM
        const foundChartNames: string[] = [];
    
        cy.get("td a").each(($el) => {
          const name = $el.text().trim();
          if (name !== "") {
            foundChartNames.push(name);
          }
        }).then(() => {
          // Log full list for debugging
          cy.log("Found Dashboard List:", JSON.stringify(foundChartNames));
    
          // Step 3: Map desired names to their indices
          const indicesToCheck = foundChartNames
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
            throw new Error("No valid dashboard names found to export.");
          }
    
          indicesToCheck.forEach((index) => {
            const checkboxXPath = `(//input[@id='${index}'])[1]`;
            cy.xpath(checkboxXPath)
              .should("exist")
              .check({ force: true })
              .log(`Checked dashboard at index ${index}: "${foundChartNames[index]}"`);
              cy.wait(1000); // Small delay to ensure checkbox is checked
          });
    
          // Step 5: Click Export button
          cy.xpath(this.exportButton)
            .should("be.visible")
            .click({ force: true });
    
          cy.log("✔️ Bulk export completed successfully.");
          cy.wait(5000); // Wait for the export to complete
        });
      }
    


}