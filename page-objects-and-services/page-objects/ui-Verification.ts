import * as fs from "fs";
import path from "path";

export class UiVerifier {
  private dashboardUi: string;
  private itemName: string;

  constructor(dashboardUi: string, itemName: string) {
    this.dashboardUi = dashboardUi; 
    this.itemName = itemName; 
  }

  /**
   * Loads JSON data from a file
   * @param filePath Path to the JSON file
   * @returns Parsed JSON data
   */
  private loadJson(filePath: string): any {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      return JSON.parse(fileContent);
    } catch (error) {
      throw new Error(`Error parsing JSON file: ${filePath} - ${error}`);
    }
  }

  /**
   * Compares UI elements between two instances
   * @param instance1Data Data from Instance 1
   * @param instance2Data Data from Instance 2
   * @returns Verification result with success status and summary
   */
  private compareUiElements(instance1Data: any[], instance2Data: any[]): { success: boolean; summary: any } {
    const differences: string[] = [];

    // Compare number of charts
    if (instance1Data.length !== instance2Data.length) {
      differences.push(`Mismatch in number of charts: Instance 1 has ${instance1Data.length}, Instance 2 has ${instance2Data.length}`);
    }

    // Match charts by ID instead of index
    const instance1ById = instance1Data.reduce((acc, chart) => {
      acc[chart.id] = chart;
      return acc;
    }, {} as Record<string, any>);

    instance2Data.forEach((chart2) => {
      const chart1 = instance1ById[chart2.id];

      if (!chart1) {
        differences.push(`Chart with ID ${chart2.id} is missing in Instance 1`);
        return;
      }

      if (chart1.title !== chart2.title) {
        differences.push(`Title mismatch for chart ID ${chart2.id}: Instance 1=${chart1.title}, Instance 2=${chart2.title}`);
      }

      if (chart1.alignment !== chart2.alignment) {
        differences.push(`Alignment mismatch for chart ID ${chart2.id}: Instance 1=${chart1.alignment}, Instance 2=${chart2.alignment}`);
      }
    });

    return {
      success: differences.length === 0,
      summary: {
        differences,
      },
    };
  }

  /**
   * Verifies UI components between Instance 1 and Instance 2
   * @returns Verification result with success status and summary
   */
  public verify(): { success: boolean; summary: any } {
    // Generate dynamic file paths based on itemName
    const instance1FilePath = path.join(this.dashboardUi, `instance1UIComponents.json`);
    const instance2FilePath = path.join(this.dashboardUi, `instance2UIComponents.json`);

    console.log(`Comparing UI contents for: ${this.itemName}`);
    console.log(`Instance 1 file path: ${instance1FilePath}`);
    console.log(`Instance 2 file path: ${instance2FilePath}`);

    // Load JSON data
    let instance1Data: any[];
    let instance2Data: any[];

    try {
      instance1Data = this.loadJson(instance1FilePath);
      instance2Data = this.loadJson(instance2FilePath);
    } catch (error) {
      console.error(`Error loading JSON files: ${error}`);
      throw error;
    }

    console.log("Loaded Instance 1 data:", instance1Data);
    console.log("Loaded Instance 2 data:", instance2Data);

    // Perform comparison
    const result = this.compareUiElements(instance1Data, instance2Data);

    // Log summary
    if (result.success) {
      console.log("UI verification passed successfully.");
    } else {
      console.log("UI verification failed:");
      result.summary.differences.forEach((diff: string) => console.log(`- ${diff}`));
    }

    return result;
  }
}