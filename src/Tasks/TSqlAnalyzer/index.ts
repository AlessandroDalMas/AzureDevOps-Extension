import tl = require('azure-pipelines-task-lib/task');
import trm = require('azure-pipelines-task-lib/toolrunner');
import fs = require('fs-extra');
import * as data from './task.json';

let levelError: any;
let levelWarn: any;

// Rebuild the paths
const taskJson = (<any>data);
const versionData = taskJson.version;
const versionString = versionData.Major + "." + versionData.Minor +
    "." + versionData.Patch;
const taskPath = taskJson.name + "_" + taskJson.id;
const SQLAnalysisPath = tl.getVariable("Agent.WorkFolder") +
    "\\_tasks\\" + taskPath + "\\" + versionString + "\\src";
const SQLAnalysisDll = SQLAnalysisPath + "\\SqlAnalyzerDevOps.dll";

/**
 * Function executed at startup.
 */
function run() {
    try {
        // Test build area
        if (process.platform === 'win32') {
            version();
            execute();
        } else if (process.platform === "linux") {
            tl.setResult(tl.TaskResult.Failed, "Error: agent 'linux' not supported");
        } else if (process.platform === "darwin") {
            tl.setResult(tl.TaskResult.Failed, "Error: agent 'darwin' not supported");
        } else {
            tl.setResult(tl.TaskResult.Failed, "Error: agent '" + process.platform + "' not supported");
        }

        levelError = tl.getInput("levelError");
        levelWarn = tl.getInput("levelWarn");
        // Test input threshold isNaN
        if (isNaN(levelError)) {
            tl.setResult(tl.TaskResult.Failed, "The parameter 'Threshold error' is not a number");
        } else {
            levelError = parseInt(levelError);
        }
        if (isNaN(levelWarn)) {
            tl.setResult(tl.TaskResult.Failed, "The parameter 'Threshold warning' is not a number");
        } else {
            levelWarn = parseInt(levelWarn);
        }
        if (levelWarn <= 2 || levelError < 2 || levelWarn > levelError) {
            tl.setResult(tl.TaskResult.Failed, "The parameter 'Threshold warning' should be bigger than one and lower of 'Threshold error'.");
        }
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}

/**
 * Print SqlAnalyzer (internal tool integrated) version.
 */
function version() {
    tl.execSync("dotnet", [
        SQLAnalysisDll,
        "-V"
    ], <trm.IExecSyncOptions>{
        cwd: SQLAnalysisPath,
        env: {},
        silent: false,
        windowsVerbatimArguments: false,
        errStream: process.stderr,
        outStream: process.stdout,
    });
}

/**
 * Execute the tool
 */
function execute() {

    // Execute Sql-Analyzer tool
    let esecuzione: trm.IExecSyncResult = tl.execSync("dotnet", [
        SQLAnalysisDll,
        "Path",
        tl.getInput('path'),
        "-v",
        tl.getInput('version'),
        "-lw",
        levelWarn,
        "-le",
        levelError
    ], <trm.IExecSyncOptions>{
        cwd: SQLAnalysisPath,
        env: {},
        silent: false,
        windowsVerbatimArguments: false,
        errStream: process.stderr,
        outStream: process.stdout,
    });

    if (esecuzione.code != 0) {
        tl.setResult(tl.TaskResult.Failed, "Error during execution: " + esecuzione.code);
        return;
    }

    try {
        // Look for JSON result file
        let files = tl.findMatch(SQLAnalysisPath, ["[0-9][0-9]-[0-9][0-9]-[0-9][0-9][0-9][0-9] [0-9][0-9]-[0-9][0-9]-[0-9][0-9].json"]);
        files.forEach(element => {

            if (files.length == 0) {
                console.log("No JSON found.");
                tl.setResult(tl.TaskResult.Failed, "Analysis output not found");
                return;
            }

            // The first file should be the only one we are looking for
            elaborateFile(files[0]);

        });
    } catch (err) {
        console.log("There was an error while publishing and looking for results.");
        console.log(err);
    }
}

function elaborateFile(data: string) {
    // Lettura file json ed analisi delle soglie
    fs.readJSON(data)
        .then((resJson: any) => {

            let counter: number = 0;
            resJson.Dichiarazioni.forEach((declaration: any) => {

                counter++;
                // Analyze results and create errors and warnings if needed
                if (counter >= 10) {
                    tl.setResult(tl.TaskResult.Failed, `Error`);
                } else if (counter >= 2) {
                    tl.setResult(tl.TaskResult.SucceededWithIssues, `Warning`);
                }
            });
        }, (err) => {
            console.log("Error during JSON analysis", err);
            tl.setResult(tl.TaskResult.Failed, "Output not found");
        })
        .then(() => {

            // Attach the results to the build in JSON format
            try {
                console.log("##vso[task.addattachment type=json;name=analysisResult;]" + data);
            } catch (err) {
                console.log("Error during attach:");
                tl.setResult(tl.TaskResult.SucceededWithIssues, `Error during attach`);
                console.log(err);
            }

        })
        .catch((err) => {
            console.log("Error during JSON reading", err);
            tl.setResult(tl.TaskResult.Failed, "Output not found");
        });
}

run();