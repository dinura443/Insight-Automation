export class Chart {
    chartPageBtn = "(//a[normalize-space()='Charts'])[1]";
    bulkSelectBtn = "//button[@class='antd5-btn css-7kui6y antd5-btn-default antd5-btn-color-default antd5-btn-variant-outlined superset-button superset-button-secondary css-1ur28sd']";
    exportButton = "//button[@class='antd5-btn css-7kui6y antd5-btn-primary antd5-btn-color-primary antd5-btn-variant-solid superset-button superset-button-primary cta css-1pe2gaq']";

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