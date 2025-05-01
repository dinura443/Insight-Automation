
import * as fs from "fs";
import path from "path";

export class UiVerifier {
  private dashboardUi: string;
  private itemName: string;

  constructor(dashboardUi: string, itemName: string) {
    this.dashboardUi = dashboardUi; 
    this.itemName = itemName; 
  }

 
  private loadJson(filePath: string): any {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const fileContent = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } 

 
  private compareUiElements(instance1Data: any[], instance2Data: any[]): { success: boolean; summary: any } {
    const differences: string[] = [];

    if (instance1Data.length !== instance2Data.length) {
      differences.push(`Mismatch in number of charts: Instance 1 has ${instance1Data.length}, Instance 2 has ${instance2Data.length}`);
    }

    instance1Data.forEach((chart1, index) => {
      const chart2 = instance2Data[index];

      if (!chart2) {
        differences.push(`Chart at index ${index} is missing in Instance 2`);
        return;
      }

      if (chart1.title !== chart2.title) {
        differences.push(`Title mismatch at index ${index}: Instance 1=${chart1.title}, Instance 2=${chart2.title}`);
      }

      if (chart1.id !== chart2.id) {
        differences.push(`ID mismatch at index ${index}: Instance 1=${chart1.id}, Instance 2=${chart2.id}`);
      }

      if (chart1.alignment !== chart2.alignment) {
        differences.push(`Alignment mismatch at index ${index}: Instance 1=${chart1.alignment}, Instance 2=${chart2.alignment}`);
      }
    });

    return {
      success: differences.length === 0,
      summary: {
        differences,
      },
    };
  }

  
  public verify(): { success: boolean; summary: any } {
    const instance1FilePath = path.join(this.dashboardUi, `instance1_${this.itemName}_charts.json`);
    const instance2FilePath = path.join(this.dashboardUi, `instance2_${this.itemName}_charts.json`);

    console.log(`Comparing UI contents for: ${this.itemName}`);
    console.log(`Instance 1 file path: ${instance1FilePath}`);
    console.log(`Instance 2 file path: ${instance2FilePath}`);

    const instance1Data = this.loadJson(instance1FilePath);
    const instance2Data = this.loadJson(instance2FilePath);

    console.log("Loaded Instance 1 data:", instance1Data);
    console.log("Loaded Instance 2 data:", instance2Data);

    return this.compareUiElements(instance1Data, instance2Data);
  }
}
