import { defineConfig } from "cypress";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { VerifyExporter } from "./page-objects-and-services/page-objects/dashboard-File-Verification";
import { UiVerifier } from "./page-objects-and-services/page-objects/dashboard-Ui-Verification";
import { SingleUiVerifier } from "./page-objects-and-services/page-objects/dashboard-Single-Ui-Verification";
import { FolderStructureVerifier } from "./page-objects-and-services/page-objects/chart-File-Verification";
import { DatasetStructureVerifier } from "./page-objects-and-services/page-objects/dataset-File-Verification";
const unzipper = require("unzipper");
const axios = require("axios");
const FormData = require("form-data");

dotenv.config();

interface ChartData {
  title: string;
  id: string;
  alignment: string;
}

export default defineConfig({
  chromeWebSecurity: false,
  retries: {
    runMode: 0,
    openMode: 0,
  },
  env: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    dashboard: process.env.ITEM_NAMES,
    chart: process.env.ITEM_NAMES,
    dataset: process.env.ITEM_NAMES,
    downloadDir: process.env.DOWNLOAD_DIR,
    ARCHIVE_INSTANCE1: process.env.ARCHIVE_INSTANCE1,
    ARCHIVE_INSTANCE2: process.env.ARCHIVE_INSTANCE2,
    FILECOMPONENTS_INSTANCE1: process.env.FILECOMPONENTS_INSTANCE1,
    FILECOMPONENTS_INSTANCE2: process.env.FILECOMPONENTS_INSTANCE2,
    FILECOMPONENTS_INSTANCE1CHARTS : process.env.FILECOMPONENTS_INSTANCE1CHARTS,
    FILECOMPONENTS_INSTANCE2CHARTS : process.env.FILECOMPONENTS_INSTANCE2CHARTS,
    instance1Login: process.env.INSTANCE1_LOGIN,
    instance2Login: process.env.INSTANCE2_LOGIN,
    dashboardUi: process.env.DASHBOARD_UI,
    backupDir: process.env.BACKUP,
    rootDir: process.env.ROOT_DIR,
    backupStatusDir: process.env.BACKUPSTATUSDIR,
    DASHBOARD_NAMES: process.env.ITEM_NAMES,
    DATASET_NAMES: process.env.ITEM_NAMES,
    CHART_NAMES: process.env.ITEM_NAMES,
    ITEM_NAMES : process.env.ITEM_NAMES
  },
  e2e: {
    video: true,
    screenshotOnRunFailure: true,
    fixturesFolder: "cypress/fixtures",
    downloadsFolder: "cypress/downloads",
    defaultCommandTimeout: 3000,

    
    setupNodeEvents(on, config) {
      config.env.instance1Login = process.env.INSTANCE1_LOGIN;
      config.env.instance2Login = process.env.INSTANCE2_LOGIN;
      require("@cypress/grep/src/plugin")(config);
      require("cypress-terminal-report/src/installLogsPrinter")(on);

      on("task", {
        fileExists(filePath: string) {
          return fs.existsSync(filePath);
        },
      });




      on("task", {
        importDashboardViaApi({ filePath, supersetUrl, sessionCookie }) {
          const form = new FormData();
          form.append("formData", fs.createReadStream(filePath));

          return fetch(`${supersetUrl}/api/v1/dashboard/import/`, {
            method: "POST",
            headers: {
              Cookie: `session=${sessionCookie}`,
              ...form.getHeaders(),
            },
            body: form,
          })
            .then(async (res) => {
              const result = await res.text();
              return { status: res.status, body: result };
            })
            .catch((error) => {
              console.error("Import error:", error);
              throw error;
            });
        },

        getLatestFile(directoryPath) {
          const files = fs.readdirSync(directoryPath)
            .map(file => ({
              file,
              time: fs.statSync(path.join(directoryPath, file)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time);

          if (files.length === 0) return null;
          return path.join(directoryPath, files[0].file);
        }
      });


      

        // Register custom tasks
        on("task", {
          // Returns all .zip file paths in a given directory
          getFilesInDirectory(dirPath) {
            try {
              return fs
                .readdirSync(dirPath)
                .filter((file) => file.endsWith(".zip"))
                .map((file) => path.join(dirPath, file));
            } catch (err) {
              throw new Error(`Error reading directory: ${dirPath} - ${(err as Error).message}`);
            }
          },
  
          // Unzips a given ZIP file into the specified directory
          unzipFile({ zipPath, extractDir }) {
            return new Promise((resolve, reject) => {
              interface UnzipFileResult {
                success: boolean;
                message: string;
                error?: string;
              }

              interface UnzipFileParams {
                zipPath: string;
                extractDir: string;
              }

              fs.createReadStream((zipPath as UnzipFileParams["zipPath"]))
                .pipe(unzipper.Extract({ path: (extractDir as UnzipFileParams["extractDir"]) }))
                .on("close", () => {
                  resolve({ success: true, message: `Extracted ${zipPath} to ${extractDir}` } as UnzipFileResult);
                })
                .on("error", (err: Error) => {
                  reject({ success: false, message: `Failed to unzip ${zipPath}`, error: err.message } as UnzipFileResult);
                });
            });
          },
  
          // Lists all files/folders in a directory
          listDirectoryContents(dirPath) {
            try {
              return fs.readdirSync(dirPath);
            } catch (err) {
              throw new Error(`Error listing contents of ${dirPath} - ${(err as Error).message}`);
            }
          }
        });

      on("task", {
        verifyDatasetExportStructure({ dir1, dir2 }) {
          const verifier = new DatasetStructureVerifier(dir1, dir2);
          const result = verifier.verify();
      
          if (!result.success) {
            const errorMessage = [
              "❌ Dataset structure verification failed.",
              ...(result.summary?.mismatches || []).map((mismatch: any) => {
                return `\nBetween "${mismatch.folder1}" and "${mismatch.folder2}":\n` +
                  Object.entries(mismatch.diff)
                    .map(([category, counts]: [string, any]) =>
                      ` - ${category}: ${counts.instance1} (Instance 1) vs ${counts.instance2} (Instance 2)`
                    )
                    .join("\n");
              })
            ].join("\n");
      
            console.error(errorMessage); // For terminal
            return { success: false, message: errorMessage };
          }
      
          return { success: true, message: "✅ All dataset export structures matched!" };
        },
      });
      on('task', {
        getFilesInDirectory(directoryPath) {
          if (!fs.existsSync(directoryPath)) {
            throw new Error(`Directory does not exist: ${directoryPath}`);
          }

          const zipFiles = fs.readdirSync(directoryPath)
                             .filter(file => file.endsWith('.zip'))
                             .map(file => path.join(directoryPath, file));

          return zipFiles;
        }
      });



      on("task", {
        compareChartExports({ dir1, dir2 }) {
          const fs = require("fs");
          const path = require("path");
      
            function getAllFiles(folder: string): string[] {
            const out: string[] = [];
            function walk(dir: string): void {
              fs.readdirSync(dir).forEach((f: string) => {
              const fullPath: string = path.join(dir, f);
              if (fs.statSync(fullPath).isDirectory()) {
                walk(fullPath);
              } else {
                out.push(path.relative(folder, fullPath));
              }
              });
            }
            walk(folder);
            return out;
            }
      
          try {
            const files1 = getAllFiles(dir1).filter(f => !f.endsWith("metadata.yaml"));
            const files2 = getAllFiles(dir2).filter(f => !f.endsWith("metadata.yaml"));
      
            const allFiles = [...new Set([...files1, ...files2])];
            const mismatches: Array<{
              file: string;
              reason?: string;
              instance1Content?: string;
              instance2Content?: string;
            }> = [];
      
            allFiles.forEach((relativeFile) => {
              const file1 = path.join(dir1, relativeFile);
              const file2 = path.join(dir2, relativeFile);
      
              if (!fs.existsSync(file1)) {
                mismatches.push({ file: relativeFile, reason: "Missing in Instance 1" });
                return;
              }
      
              if (!fs.existsSync(file2)) {
                mismatches.push({ file: relativeFile, reason: "Missing in Instance 2" });
                return;
              }
      
              const content1 = fs.readFileSync(file1, "utf8").trim();
              const content2 = fs.readFileSync(file2, "utf8").trim();
      
              if (content1 !== content2) {
                mismatches.push({
                  file: relativeFile,
                  instance1Content: content1.substring(0, 50) + "...",
                  instance2Content: content2.substring(0, 50) + "...",
                });
              }
            });
      
            if (mismatches.length > 0) {
              return {
                success: false,
                summary: {
                  totalMismatches: mismatches.length,
                  differences: mismatches
                }
              };
            }
      
            return {
              success: true,
              summary: {
                message: " All files matched between instances"
              }
            };
      
          } catch (error) {
            return {
              success: false,
              summary: {
                error: error instanceof Error ? error.message : "Unknown error during verification",
                differences: []
              }
            };
          }
        }
      });


      on("task", {
        isDirectoryEmpty(directoryPath: string): boolean {
          try {
            if (!fs.existsSync(directoryPath)) {
              throw new Error(`Directory does not exist: ${directoryPath}`);
            }

            const files = fs.readdirSync(directoryPath);
            return files.length === 0;
          } catch (error) {
            throw new Error(`Error checking directory: ${(error as Error).message}`);
          }
        },
      });

      on("task", {
        deleteFile(targetPath: string) {
          try {
            if (!fs.existsSync(targetPath)) {
              return `File does not exist: ${targetPath}`;
            }

            const stat = fs.statSync(targetPath);
            if (stat.isDirectory()) {
              return `Path is a directory, not a file: ${targetPath}`;
            }

            fs.unlinkSync(targetPath);
            return `Deleted file: ${targetPath}`;
          } catch (error) {
            return `Error deleting file: ${(error as Error).message}`;
          }
        },
      });

      on("task", {
        verifyFoldersExist({ baseDir, folderNames }) {
          try {
            const missingFolders = [];
            for (const folderName of folderNames) {
              const folderPath = path.join(baseDir, folderName);
              if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
                missingFolders.push(folderName);
              }
            }
            if (missingFolders.length > 0) {
              return { success: false, message: `The following folders are missing: ${missingFolders.join(", ")}` };
            }
            return { success: true, message: `All required folders exist in ${baseDir}` };
          } catch (error) {
            const errorMessage = (error as Error).message;
            return `Error verifying folders: ${errorMessage}`;
          }
        },
      });

      on("task", {
        copyFile({ source, destination }) {
          try {
            const destDir = path.dirname(destination);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.copyFileSync(source, destination);
            return `File copied successfully from ${source} to ${destination}`;
          } catch (error) {
            const errorMessage = (error as Error).message;
            return `Error copying file: ${errorMessage}`;
          }
        },
      });

      on("task", {
        getLatestFile(downloadDir) {
          if (!fs.existsSync(downloadDir)) {
            console.error(`Directory not found: ${downloadDir}`);
            return null;
          }
          const files = fs.readdirSync(downloadDir);
          if (files.length === 0) {
            console.error(`No files found in directory: ${downloadDir}`);
            return null;
          }
          const filePaths = files.map((file) => path.join(downloadDir, file));
          const latestFile = filePaths.reduce((latest, current) =>
            fs.statSync(current).mtime > fs.statSync(latest).mtime ? current : latest
          );
          console.log(`Found latest file: ${latestFile}`);
          return latestFile;
        },
      });

      on("task", {
        moveFile({ source, destination }) {
          try {
            const destDir = path.dirname(destination);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }
            fs.renameSync(source, destination);
            return `File moved successfully from ${source} to ${destination}`;
          } catch (error) {
            const errorMessage = (error as Error).message;
            return `Error moving file: ${errorMessage}`;
          }
        },
      });

      on("task", {
        unzipFile({ zipPath, extractDir }) {
          try {
            if (!fs.existsSync(zipPath)) {
              throw new Error(`ZIP file not found: ${zipPath}`);
            }
            const AdmZip = require("adm-zip");
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractDir, true);
            return `Successfully extracted ZIP file to: ${extractDir}`;
          } catch (error) {
            const errorMessage = (error as Error).message;
            return `Error unzipping file: ${errorMessage}`;
          }
        },
      });

      on("task", {
        readYamlFile(filePath) {
          try {
            if (!fs.existsSync(filePath)) {
              throw new Error(`YAML file not found: ${filePath}`);
            }
            const yaml = require("js-yaml");
            const fileContent = fs.readFileSync(filePath, "utf8");
            return yaml.load(fileContent);
          } catch (error) {
            const errorMessage = (error as Error).message;
            return `Error reading YAML file: ${errorMessage}`;
          }
        },
      });

      on("task", {
        verifyChartExportStructure({ dir1, dir2 }) {
          const verifier = new FolderStructureVerifier(dir1, dir2);
          const result = verifier.verify();
      
          if (!result.success) {
            const errorMessage = [
              "❌ Folder structure verification failed.",
              ...(result.summary?.mismatches || []).map((mismatch: any) => {
                return `\nBetween "${mismatch.folder1}" and "${mismatch.folder2}":\n` +
                  Object.entries(mismatch.diff)
                    .map(([category, counts]: [string, any]) =>
                      ` - ${category}: ${counts.instance1} (Instance 1) vs ${counts.instance2} (Instance 2)`
                    )
                    .join("\n");
              })
            ].join("\n");
      
            console.error(errorMessage); // For terminal
            return { success: false, message: errorMessage };
          }
      
          return { success: true, message: "✅ All chart export structures matched!" };
        },
      });
      on("task", {
        verifySupersetFiles({ extractedFilesDir, importVerifyDir }) {
          const verifier = new VerifyExporter(extractedFilesDir, importVerifyDir);
          const result = verifier.compare();
      
            const missingNonCharts: string[] = result.summary.missingInDir2?.filter((f: string) => !f.startsWith("charts/")) || [];
            const extraNonCharts: string[] = result.summary.extraInDir2?.filter((f: string) => !f.startsWith("charts/")) || [];
      
            const detailedNonChartDiffs: Array<{
            file: string;
            differences: string[];
            }> = result.summary.detailed?.filter(
            (entry: { file: string; differences: string[] }) => !entry.file.startsWith("charts/")
            ) || [];
      
          const hasRelevantMismatch = (
            missingNonCharts.length > 0 ||
            extraNonCharts.length > 0 ||
            detailedNonChartDiffs.length > 0
          );
      
          if (hasRelevantMismatch) {
            const detailed: string = detailedNonChartDiffs.map((entry) => {
              return `Mismatch in "${entry.file}":\n${entry.differences.map((d) => `  - ${d}`).join("\n")}`;
            }).join("\n\n") || "";
      
            const message = [
              "YAML verification failed.",
              `Missing files: ${missingNonCharts.join(", ") || "None"}`,
              `Extra files: ${extraNonCharts.join(", ") || "None"}`,
              detailed
            ].join("\n\n");
      
            console.error(message);
            return { success: false, message };
          }
      
          console.log(" YAML verification passed!");
          return { success: true, message: "YAML verification passed!" };
        }
      });

      
      on("task", {
        log(message: string) {
          console.log(message);
          return null;
        },
      });

      on("task", {
        clearDirectoryContents(directoryPath: string) {
          try {
            if (!fs.existsSync(directoryPath)) {
              console.log(`Directory does not exist: ${directoryPath}`);
              return `Directory does not exist: ${directoryPath}`;
            }

            const files = fs.readdirSync(directoryPath);

            files.forEach((file) => {
              const filePath = path.join(directoryPath, file);
              const stat = fs.statSync(filePath);

              if (stat.isDirectory()) {
                console.log(`Deleting subdirectory: ${filePath}`);
                fs.rmSync(filePath, { recursive: true, force: true });
              } else {
                console.log(`Deleting file: ${filePath}`);
                fs.unlinkSync(filePath);
              }
            });

            return `Cleared contents of directory: ${directoryPath}`;
          } catch (error) {
            return `Error clearing directory contents: ${(error as Error).message}`;
          }
        },
      });

      on("task", {
        verifyUiContents({ dashboardUi, itemName }) {
          const uiVerifier = new UiVerifier(dashboardUi, itemName);
          const result = uiVerifier.verify();
          return result;
        },
      });


      on("task", {
        verifySingleImportUiContents({ dashboardUi, itemName }) {
          const uiVerifier = new SingleUiVerifier(dashboardUi, itemName);
          const result = uiVerifier.verify();
          return result;
        },
      });
      on("task", {
        writeJson({ filename, data }) {
          try {
            const dir = path.dirname(filename);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filename, JSON.stringify(data, null, 2), "utf8");
            return `File written successfully: ${filename}`;
          } catch (error) {
            return `Error writing file: ${(error as Error).message}`;
          }
        },
      });

      on("task", {
        readJsonFile({ filename }) {
          const filePath = path.join(__dirname, "..", "..", "fixtures", "data", filename);
          if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, "utf8"));
          } else {
            return null;
          }
        },
      });

      return config;
    },
  },
});



