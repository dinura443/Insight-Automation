import * as fs from "fs";
import * as path from "path";

export class DatasetStructureVerifier {
  private dir1: string;
  private dir2: string;

  constructor(dir1: string, dir2: string) {
    this.dir1 = dir1;
    this.dir2 = dir2;
  }

  private getExportFolders(baseDir: string): string[] {
    return fs.readdirSync(baseDir)
      .filter(name => fs.statSync(path.join(baseDir, name)).isDirectory());
  }

  private countYamlsInSubdir(targetDir: string): number {
    if (!fs.existsSync(targetDir)) return 0;
    return fs.readdirSync(targetDir).filter(file => file.endsWith(".yaml")).length;
  }

  private verifyExportPair(folder1Path: string, folder2Path: string): { success: boolean; diff?: any } {
    const result = {
      databases: {
        instance1: this.countYamlsInSubdir(path.join(folder1Path, "databases")),
        instance2: this.countYamlsInSubdir(path.join(folder2Path, "databases")),
      },
      datasets: {
        instance1: this.countYamlsInSubdir(path.join(folder1Path, "datasets", "ClickHouse_Superset")),
        instance2: this.countYamlsInSubdir(path.join(folder2Path, "datasets", "ClickHouse_Superset")),
      },
    };

    const mismatchedKeys = Object.keys(result).filter(
      key => result[key as keyof typeof result].instance1 !== result[key as keyof typeof result].instance2
    );

    if (mismatchedKeys.length > 0) {
      const diff: any = {};
      mismatchedKeys.forEach(key => {
        diff[key] = {
          instance1: result[key as keyof typeof result].instance1,
          instance2: result[key as keyof typeof result].instance2,
        };
      });

      return { success: false, diff };
    }

    return { success: true };
  }

  public verify(): { success: boolean; summary?: any } {
    const dir1Exports = this.getExportFolders(this.dir1);
    const dir2Exports = this.getExportFolders(this.dir2);

    if (dir1Exports.length !== dir2Exports.length) {
      console.error(
        ` Mismatch: Number of export folders differ:\nInstance1: ${dir1Exports.length}\nInstance2: ${dir2Exports.length}`
      );
      return { success: false };
    }

    let allMatch = true;
    const summary = {
      matches: [] as string[],
      mismatches: [] as Array<{ folder1: string; folder2: string; diff: any }>,
    };

    for (let i = 0; i < dir1Exports.length; i++) {
      const folder1 = dir1Exports[i];
      const folder2 = dir2Exports[i];

      const fullPath1 = path.join(this.dir1, folder1);
      const fullPath2 = path.join(this.dir2, folder2);

      const result = this.verifyExportPair(fullPath1, fullPath2);

      if (!result.success) {
        allMatch = false;
        summary.mismatches.push({
          folder1,
          folder2,
          diff: result.diff,
        });
      } else {
        summary.matches.push(`${folder1} ↔ ${folder2}`);
      }
    }

    if (!allMatch) {
      console.error("Mismatches found:");
      summary.mismatches.forEach(({ folder1, folder2, diff }) => {
        console.error(`\nBetween "${folder1}" and "${folder2}":`);
        Object.entries(diff!).forEach(([category, counts]: [string, any]) => {
          console.error(` - ${category}: ${counts.instance1} (Instance 1) vs ${counts.instance2} (Instance 2)`);
        });
      });

      return { success: false, summary };
    }

    console.log(" All dataset export structures match!");
    return { success: true, summary };
  }
}