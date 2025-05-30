export class DashBoard {
  instance1Dashboard = Cypress.env("instance1Dashboard");
  instance2Dashboard = Cypress.env("instance2Dashboard");
  tableRowSelector = 'tr[role="row"]';
  itemNameSelector = "td a";
  shareButtonSelector = 'span[aria-label="share"]';
  singleDeleteButtonSelector = 'anticon css-1lff5bx';
  importButtonSelector = 'button > span[aria-label="import"]';
  selectFileInputSelector = "#modelFile";
  importDialogImportButtonSelector = 'button[type="submit"][data-title="Import"]';
  dashboardbtn = "//a[normalize-space()='Dashboards']";
  deleteBtn = "(//span[@aria-label='trash'])[1]";
  deleteTxtBox = "(//input[@id='delete'])[1]";
  deleteConfirmBtn = "//div[@class='antd5-modal-root css-7kui6y']//button[2]";
  bulkSelectBtn = "//button[@class='antd5-btn css-7kui6y antd5-btn-default antd5-btn-color-default antd5-btn-variant-outlined superset-button superset-button-secondary css-1ur28sd']";
  importbutton = "//span[normalize-space()='Import']";
  exportButton = "//button[@class='antd5-btn css-7kui6y antd5-btn-primary antd5-btn-color-primary antd5-btn-variant-solid superset-button superset-button-primary cta css-1pe2gaq']";
  overwriteInputSelector = "#overwrite";
  overwriteButtonSelector = 'button:contains("Overwrite")';
  gridViewbtn = "(//div[@class='toggle-button active'])[1]";
  deletebulkbtn = "(//button[@class='antd5-btn css-7kui6y antd5-btn-primary antd5-btn-dangerous antd5-btn-color-dangerous antd5-btn-variant-solid superset-button superset-button-danger cta css-1pe2gaq'])[1]";


  clickBulkSelectButton() {
    cy.log("Clicking the 'Bulk Select' button...");
    cy.xpath(this.bulkSelectBtn)
      .should('exist')
      .and('be.visible')
      .click();
  }




  Deletedashboard(){
    cy.log("Clicking the 'Delete' button...");
    cy.xpath(this.deletebulkbtn)
      .should('exist')
      .and('be.visible')
      .click();
      cy.xpath(this.deleteTxtBox, { timeout: 2000 })
      .should('exist')
      .and('be.visible')
      .type('DELETE')
      .then(() => {
        cy.log('Typed "DELETE" into the input field.');
      });

    cy.xpath(this.deleteConfirmBtn, { timeout: 2000 })
      .should('exist')
      .and('be.visible')
      .click();
    cy.log('Clicked the "Confirm" button.');
  }
  visitDashboard() {
    cy.log("Navigating to the dashboard...");
    cy.wait(2000);
    cy.xpath(this.dashboardbtn).click();
    cy.wait(2000);
  }

  clickGridViewButton() {
    cy.log("Clicking the 'Grid View' button...");
    cy.xpath(this.gridViewbtn)
      .should('exist')
      .and('be.visible')
      .click();
    cy.log("Grid view button clicked.");
    cy.wait(5000);
  }

  confirmOverwrite() {
    cy.get(this.overwriteInputSelector)
      .should('be.visible')
      .clear()
      .type('OVERWRITE');
    cy.get(this.overwriteButtonSelector)
      .should('exist')
      .and('be.visible')
      .click();
  }



  singleExportDashboard(dashboardName: string): void {
    cy.log(`Starting single export for dashboard: ${dashboardName}`);

    cy.xpath(this.bulkSelectBtn).click({ force: true });
    cy.wait(1000); 

    const foundDashboardNames: string[] = [];

    cy.get("td a").each(($el) => {
      const name = $el.text().trim();
      if (name !== "") {
        foundDashboardNames.push(name);
      }
    }).then(() => {
      cy.log("Found Dashboard List:", JSON.stringify(foundDashboardNames));

      const index = foundDashboardNames.indexOf(dashboardName);
      if (index === -1) {
        throw new Error(`Dashboard "${dashboardName}" not found in list.`);
      }

      const checkboxXPath = `(//input[@id='${index}'])[1]`;
      cy.xpath(checkboxXPath)
        .should("exist")
        .check({ force: true })
        .log(`Checked dashboard at index ${index}: "${foundDashboardNames[index]}"`);

      cy.xpath(this.exportButton)
        .should("be.visible")
        .click({ force: true });

      cy.log("Single export completed.");
    });
  }
  bulkExportDashboards(dashboardNames: string[]): void {
    cy.log(`Starting bulk export for ${dashboardNames.length} dashboards`);

    cy.xpath(this.bulkSelectBtn).click({ force: true });
    cy.wait(5000);
    const foundDashboardNames: string[] = [];

    cy.get("td a")
      .each(($el) => {
        const name = $el.text().trim();
        if (name !== "") {
          foundDashboardNames.push(name);
        }
      })
      .then(() => {
        cy.log("Found Dashboard List:", JSON.stringify(foundDashboardNames));

        const indicesToCheck = dashboardNames
          .map((name) => {
            const index = foundDashboardNames.indexOf(name);
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
            .log(`Checked dashboard at index ${index}: "${foundDashboardNames[index]}"`);
          cy.wait(1000); 
        });

        cy.xpath(this.exportButton)
          .should("be.visible")
          .click({ force: true });

        cy.log("✔️ Bulk export completed successfully.");
        cy.wait(5000);
      });
  }

  findRowByItemName(itemName: string) {
    cy.log(`Searching for item name (exact match): "${itemName}"`);
  
    return cy.get("td a").filter((index, el) => {
      return el.textContent?.trim() === itemName;
    }).first().closest("tr");
  }

  clickItemName(itemName: string) {
    cy.log(`Clicking on item name: "${itemName}"`);
    cy.get(this.itemNameSelector, { timeout: 10000 })
      .filter((index, el) => el.textContent?.trim() === itemName)
      .should('have.length.greaterThan', 0)
      .first()
      .scrollIntoView()
      .click({ force: true });
    cy.log(`Successfully clicked on item name: "${itemName}"`);
  }
  

  clickShareButtonForRow(itemName: string) {
    this.findRowByItemName(itemName)
      .should("exist")
      .within(() => {
        cy.get(this.shareButtonSelector)
          .should("exist")
          .click()
          .then(() => {
            cy.log("Share button clicked. Waiting for file download...");
          });
      });
  }



  DeleteSingleDashboard(itemName: string) {
    this.findRowByItemName(itemName)
      .should("exist")
      .within(() => {
        cy.get(this.singleDeleteButtonSelector)
          .should("exist")
          .click()
          .then(() => {
            cy.log("Delete button clicked");
          });
      });
  }
  analyzeDashboardlist(dashboard: string) {
    cy.get('body').then(($body) => {
      const matchingRow = $body.find(`tr:contains("${dashboard}")`);

      if (matchingRow.length > 0) {
        cy.log(`${dashboard} exists in the dashboard list.`);
        this.deleteDashboard(dashboard);
      } else {
        cy.log(`${dashboard} does NOT exist in the dashboard list.`);
      }
    });
  }

  typeInputAndPressEnter(text: string): void {
    cy.get('.ant-input-affix-wrapper.css-1ij993o', { timeout: 10000 })
      .find('input')
      .should('be.visible')
      .type(`${text}{enter}`);
  }

  deleteDashboard(itemName: string) {
    this.findRowByItemName(itemName)
      .should("exist")
      .within(() => {
        cy.xpath(this.deleteBtn, { timeout: 2000 })
          .should('exist')
          .click();
        cy.log('Clicked the "Delete" button.');

        cy.xpath(this.deleteTxtBox, { timeout: 2000 })
          .should('exist')
          .and('be.visible')
          .type('DELETE')
          .then(() => {
            cy.log('Typed "DELETE" into the input field.');
          });

        cy.xpath(this.deleteConfirmBtn, { timeout: 2000 })
          .should('exist')
          .and('be.visible')
          .click();
        cy.log('Clicked the "Confirm" button.');
      });
  }

  getDashboardCharts(itemName: string) {
    const scrapedCharts: any[] = [];

    return cy.get('.chart-slice[data-test-chart-id]').then(($charts) => {
      const chartCount = $charts.length;
      cy.log(`Total number of charts detected: ${chartCount}`);

      $charts.each((index: number, chartEl: HTMLElement) => {
        const $chart = Cypress.$(chartEl);

        const chartId = $chart.attr('data-test-chart-id');
        const chartName = $chart.attr('data-test-chart-name');

        const extractTitle = () => {
          return $chart.find('.header-title .editable-title a').text().trim();
        };

        let title = extractTitle();

        if (!title) {
          cy.wait(500);
          title = extractTitle();
        }

        if (!title) {
          cy.log(`Warning: Chart ${index + 1} (ID: ${chartId}) does not have a valid title.`);
        } else {
          cy.log(`Chart ${index + 1}: Title - ${title}`);
        }

        cy.log(`Chart ${index + 1}: ID - ${chartId}`);
        cy.log(`Chart ${index + 1}: Name - ${chartName}`);

        const alignment = $chart.closest('.dragdroppable-column').length
          ? `Column ${$chart.closest('.dragdroppable-column').index() + 1}`
          : 'Unknown Alignment';
        cy.log(`Chart ${index + 1}: Alignment - ${alignment}`);

        scrapedCharts.push({
          index: index + 1,
          id: chartId,
          name: chartName,
          title: title,
          alignment: alignment,
        });
      });

      cy.log(`Scraping complete: Found ${chartCount} charts for dashboard "${itemName}"`);
      return cy.wrap(scrapedCharts);
    });
  }

  uploadSpecificFile(filePath: string) {
    cy.get(this.importButtonSelector, { timeout: 10000 })
      .should('exist')
      .and('be.visible')
      .then(($button) => {
        cy.log('Found the "Import" button:', $button);
        cy.wrap($button).click({ force: true });
      });

    cy.get(this.selectFileInputSelector).attachFile({
      filePath: filePath,
      fileName: filePath.split('/').pop(),
    });

    cy.xpath(this.importbutton, { timeout: 10000 })
      .should("be.visible")
      .click({ timeout: 5000 });
  }
}

