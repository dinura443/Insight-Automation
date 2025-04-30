import { defineConfig } from "cypress";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { VerifyExporter } from "./page-objects-and-services/page-objects/file-Verification";
import { UiVerifier } from "./page-objects-and-services/page-objects/ui-Verification";

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

    archiveDir: "archives",

    

    
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    dashboard: process.env.DASHBOARD_NAME,
    downloadDir: process.env.DOWNLOAD_DIR,
    fixturesDir: process.env.FIXTURES,
    instance1DashboardDir: process.env.DASHBOARD_INSTANCE1,
    instance2DashboardDir: process.env.DASHBOARD_INSTANCE2,
    instance1Login: process.env.INSTANCE1_LOGIN,
    instance2Login: process.env.INSTANCE2_LOGIN,
    instance1Dashboard: process.env.INSTANCE1_DASHBOARD,
    instance2Dashboard: process.env.INSTANCE2_DASHBOARD,
    datapath: process.env.DASHBOARD_UI,
    backupDir: process.env.BACKUP,
    rootDir : process.env.ROOT_DIR,
    archiveInstance1: process.env.ARCHIVEINSTANCE1

  },
  e2e: {
    video: true, // Ensure videos are enabled
    screenshotOnRunFailure: true, // Ensure screenshots are generated on failure
    fixturesFolder: "cypress/fixtures",
    downloadsFolder: "cypress/downloads",
    defaultCommandTimeout: 3000,
    setupNodeEvents(on, config) {
      require("@cypress/grep/src/plugin")(config);
      require("cypress-terminal-report/src/installLogsPrinter")(on);




      on("task", {
        compareJsonFiles({ file1, file2 }) {
          try {
            const filePath1 = path.resolve(file1);
            const filePath2 = path.resolve(file2);

            const data1: ChartData[] = JSON.parse(fs.readFileSync(filePath1, "utf8"));
            const data2: ChartData[] = JSON.parse(fs.readFileSync(filePath2, "utf8"));

            if (data1.length !== data2.length) {
              return {
                success: false,
                message: `Mismatch: Instance 1 has ${data1.length} charts, while Instance 2 has ${data2.length} charts.`,
              };
            }

            let mismatchFound = false;
            const mismatches: { chartIndex: number; differences: any }[] = [];

            data1.forEach((chartData: ChartData, index) => {
              const instance2ChartData = data2[index];
              if (
                chartData.title !== instance2ChartData.title ||
                chartData.id !== instance2ChartData.id ||
                chartData.alignment !== instance2ChartData.alignment
              ) {
                mismatchFound = true;
                mismatches.push({
                  chartIndex: index + 1,
                  differences: {
                    title: chartData.title !== instance2ChartData.title
                      ? { instance1: chartData.title, instance2: instance2ChartData.title }
                      : undefined,
                    id: chartData.id !== instance2ChartData.id
                      ? { instance1: chartData.id, instance2: instance2ChartData.id }
                      : undefined,
                    alignment: chartData.alignment !== instance2ChartData.alignment
                      ? { instance1: chartData.alignment, instance2: instance2ChartData.alignment }
                      : undefined,
                  },
                });
              }
            });

            if (mismatchFound) {
              return {
                success: false,
                message: `Mismatch found in ${mismatches.length} chart(s):`,
                mismatches,
              };
            }

            return {
              success: true,
              message: "JSON files are consistent.",
            };
          } catch (error) {
            return {
              success: false,
              message: `Error comparing JSON files: ${(error as Error).message}`,
            };
          }
        },
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

            // Ensure the target is a file (not a directory)
            const stat = fs.statSync(targetPath);
            if (stat.isDirectory()) {
              return `Path is a directory, not a file: ${targetPath}`;
            }

            // Delete the file
            fs.unlinkSync(targetPath);
            return `Deleted file: ${targetPath}`;
          } catch (error) {
            return `Error deleting file: ${(error as Error).message}`;
          }
        },
      });
      // Task: Verify folders exist
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
        verifySupersetFiles({ extractedFilesDir, importVerifyDir }) {
          const verifier = new VerifyExporter(extractedFilesDir, importVerifyDir);
          const result = verifier.compare();
          return result;
        },
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
  deleteOldBackupFiles(backupsDir: string) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 7); 

      const files = fs.readdirSync(backupsDir);

      files.forEach((file) => {
        const filePath = path.join(backupsDir, file);
        const stat = fs.statSync(filePath);

        if (stat.isFile() && stat.mtime < cutoffDate) {
          console.log(`Deleting old backup file: ${filePath}`);
          fs.unlinkSync(filePath); 
        }
      });

      return "Old backup files deleted successfully.";
    } catch (error) {
      return `Error deleting old backup files: ${(error as Error).message}`;
    }
  },
});

      on("task", {
        verifyUiContents({ dataPath, itemName }) {
          const uiVerifier = new UiVerifier(dataPath, itemName);
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
          const filePath = path.join(__dirname, '..', '..', 'fixtures', 'data', filename);
          if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
          } else {
            return null;
          }
        },
      });

      return config;
    },
  },
});