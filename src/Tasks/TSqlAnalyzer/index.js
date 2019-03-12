"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const fs = require("fs-extra");
const data = require("./task.json");
let levelError;
let levelWarn;
let tempLvErr = 0;
let tempLvWarn = 0;
let noBreak = true;
// Rebuild the paths
const taskJson = data;
const versionData = taskJson.version;
const versionString = versionData.Major + "." + versionData.Minor + "." + versionData.Patch;
const taskPath = taskJson.name + "_" + taskJson.id;
const TSqlAnalyzerPath = tl.getVariable("Agent.WorkFolder") + "\\_tasks\\" + taskPath + "\\" + versionString + "\\src";
const TSqlAnalyzerDll = TSqlAnalyzerPath + "\\TSqlAnalyzerDevOps.dll";
function isNormalInteger(str) {
    return /^\+?(0|[1-9]\d*)$/.test(str);
}
/**
 * Function executed at startup.
 */
function run() {
    try {
        noBreak = tl.getBoolInput("noBreak");
        // Testing parameters levels
        levelError = tl.getInput("levelError");
        levelWarn = tl.getInput("levelWarn");
        // Test input threshold isNaN
        if (!isNormalInteger(levelError)) {
            tl.setResult(tl.TaskResult.Failed, "The parameter 'Threshold error' is not a number");
        }
        else {
            tempLvErr = parseInt(levelError);
        }
        if (!isNormalInteger(levelWarn)) {
            tl.setResult(tl.TaskResult.Failed, "The parameter 'Threshold warning' is not a number");
        }
        else {
            tempLvWarn = parseInt(levelWarn);
        }
        if (tempLvWarn <= 2 || tempLvErr < 2 || tempLvWarn > tempLvErr) {
            tl.setResult(tl.TaskResult.Failed, "The parameter 'Threshold warning' should be bigger than one and lower of 'Threshold error'.");
        }
        // Test build area
        if (process.platform === 'win32') {
            version();
            execute();
        }
        else if (process.platform === "linux") {
            tl.setResult(tl.TaskResult.Failed, "Error: agent 'linux' not supported");
        }
        else if (process.platform === "darwin") {
            tl.setResult(tl.TaskResult.Failed, "Error: agent 'darwin' not supported");
        }
        else {
            tl.setResult(tl.TaskResult.Failed, "Error: agent '" + process.platform + "' not supported");
        }
    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, err);
    }
}
/**
 * Print T-Sql Analyzer (internal tool integrated) version.
 */
function version() {
    tl.execSync("dotnet", [
        TSqlAnalyzerDll,
        "-V"
    ], {
        cwd: TSqlAnalyzerPath,
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
    let params = [TSqlAnalyzerDll, "Path", tl.getInput('path'), "-v", tl.getInput('version'), "-w", levelWarn, "-e", levelError];
    if (noBreak) {
        params.push("-n");
    }
    let esecuzione = tl.execSync("dotnet", params, {
        cwd: TSqlAnalyzerPath,
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
        let files = tl.findMatch(TSqlAnalyzerPath, ["[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]-[0-9][0-9]-[0-9][0-9].json"]);
        if (files.length == 0) {
            console.log("No JSON found.");
            tl.setResult(tl.TaskResult.Failed, "Analysis output not found");
            return;
        }
        // The last file should be the one we are looking for.
        // Other analysis could have generated other files and
        // the folder can be not cleaned.
        elaborateFile(files[files.length - 1]);
    }
    catch (err) {
        console.log("There was an error while publishing and looking for results.");
        console.log(err);
    }
}
function elaborateFile(data) {
    // Lettura file json ed analisi delle soglie
    fs.readJSON(data)
        .then((resJson) => {
        let counter = 0;
        resJson.Dichiarazioni.forEach((declaration) => {
            counter++;
            // Analyze results and create errors and warnings if needed
            if (counter >= 10) {
                tl.setResult(tl.TaskResult.Failed, `Error`);
            }
            else if (counter >= 2) {
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
        }
        catch (err) {
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
