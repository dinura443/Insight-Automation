import * as fs from "fs";
import path from "path";
import yaml from "js-yaml";

// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
};

export class VerifyExporter {
  private ignoreFiles = ["metadata.yaml"];
  private extractedBase: string;
  private importBase: string;

  constructor(extractedBase: string, importBase: string) {
    this.extractedBase = extractedBase;
    this.importBase = importBase;
  }

  private getLatestSubDir(baseDir: string): string | null {
    const dirs = fs.readdirSync(baseDir)
      .map(name => path.join(baseDir, name))
      .filter(fullPath => fs.statSync(fullPath).isDirectory());

    if (dirs.length === 0) return null;

    dirs.sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    return dirs[0];
  }

  private getAllYamlFiles(dir: string, base = dir): string[] {
    const files: string[] = [];
    fs.readdirSync(dir).forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getAllYamlFiles(fullPath, base));
      } else if (file.endsWith(".yaml") && !this.ignoreFiles.includes(path.basename(file))) {
        files.push(path.relative(base, fullPath));
      }
    });
    return files;
  }

  private loadYaml(filePath: string): any {
    const content = fs.readFileSync(filePath, "utf8");
    return yaml.load(content);
  }

  private findDifferences(obj1: any, obj2: any, currentPath: string = ""): string[] {
    const differences: string[] = [];
    const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    allKeys.forEach(key => {
      if (key === "sqlalchemy_uri") return;

      const newPath = currentPath ? `${currentPath}.${key}` : key;

      if (!(key in obj1)) {
        differences.push(`${colors.red}Missing in exported: ${newPath}${colors.reset}`);
      } else if (!(key in obj2)) {
        differences.push(`${colors.red}Missing in imported: ${newPath}${colors.reset}`);
      } else if (typeof obj1[key] === "object" && typeof obj2[key] === "object") {
        differences.push(...this.findDifferences(obj1[key], obj2[key], newPath));
      } else if (obj1[key] !== obj2[key]) {
        differences.push(
          `${colors.red}Mismatch at ${newPath}:${colors.reset} Exported=${obj1[key]}, Imported=${obj2[key]}`
        );
      }
    });

    return differences;
  }

  public compare(): { success: boolean; summary: any } {
    const latestExtracted = this.getLatestSubDir(this.extractedBase);
    const latestImported = this.getLatestSubDir(this.importBase);
  
    if (!latestExtracted || !latestImported) {
      console.error(`${colors.red}Could not find latest export folders.${colors.reset}`);
      return { success: false, summary: "Missing folders" };
    }
  
    console.log(`${colors.bold}Comparing extracted: ${colors.reset}${latestExtracted}`);
    console.log(`${colors.bold}With imported:     ${colors.reset}${latestImported}`);
  
    const files1 = this.getAllYamlFiles(latestExtracted);
    const files2 = this.getAllYamlFiles(latestImported);
  
    // Helper to check if a path contains a chart_export_* folder
    const isDynamicChartExport = (filePath: string): boolean => {
      const parts = filePath.split(path.sep); // Split path into parts
      return parts.some(part => part.startsWith("chart_export_"));
    };
  
    // Filter out dashboard YAMLs and any file under a chart_export_* folder
    const filterFiles = (files: string[]) =>
      files.filter(file => {
        return (
          !file.startsWith("dashboards/") &&
          !isDynamicChartExport(file)
        );
      });
  
    const filteredFiles1 = filterFiles(files1);
    const filteredFiles2 = filterFiles(files2);
  
    const missingInDir2 = filteredFiles1.filter(f => !filteredFiles2.includes(f));
    const extraInDir2 = filteredFiles2.filter(f => !filteredFiles1.includes(f));
  
    console.log(`\n${colors.bold}Comparing folder structures...${colors.reset}`);
    if (missingInDir2.length || extraInDir2.length) {
      if (missingInDir2.length)
        console.warn(`${colors.yellow}Missing in import folder:${colors.reset}`, missingInDir2);
      if (extraInDir2.length)
        console.warn(`${colors.yellow}Extra in import folder:${colors.reset}`, extraInDir2);
    } else {
      console.log(`${colors.green}Folder structures match.${colors.reset}`);
    }
  
    console.log(`\n${colors.bold}Comparing YAML contents...${colors.reset}`);
    let differences = 0;
  
    filteredFiles1.forEach(file => {
      const file1 = path.join(latestExtracted, file);
      const file2 = path.join(latestImported, file);
  
      if (fs.existsSync(file2)) {
        const content1 = this.loadYaml(file1);
        const content2 = this.loadYaml(file2);
  
        const diff = this.findDifferences(content1, content2);
        if (diff.length > 0) {
          console.warn(`${colors.red}Content mismatch: ${file}${colors.reset}`);
          differences++;
          diff.forEach(d => console.log(d));
        }
      } else {
        console.warn(`${colors.red}File missing in imported: ${file}${colors.reset}`);
        differences++;
      }
    });
  
    if (!differences && missingInDir2.length === 0 && extraInDir2.length === 0) {
      console.log(`${colors.green}All files match!${colors.reset}`);
    }
  
    return {
      success: differences === 0 && missingInDir2.length === 0 && extraInDir2.length === 0,
      summary: {
        differences,
        missingInDir2,
        extraInDir2,
      },
    };
  }}