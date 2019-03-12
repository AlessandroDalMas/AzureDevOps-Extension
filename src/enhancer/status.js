define(["require", "exports", "VSS/Controls", "TFS/Build/Contracts", "TFS/DistributedTask/TaskRestClient"], function (require, exports, Controls, TFS_Build_Contracts, DT_Client) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class StatusSection extends Controls.BaseControl {
        constructor() {
            super();
        }
        /**
         * Initialize: recover configuration, list of attachments, works the attachment
         * created by the task, works the JSON, launch elaboration process.
         */
        initialize() {
            super.initialize();
            // Recover parent extension configuration
            let sharedConfig = VSS.getConfiguration();
            let vsoContext = VSS.getWebContext();
            if (sharedConfig) {
                // Register the extension to the host with callback
                sharedConfig.onBuildChanged((build) => {
                    let textResBuild = "Waiting analisys ...";
                    $("#spanSumRes").text(textResBuild);
                    // Recover list of build attachments
                    let taskClient = DT_Client.getClient();
                    taskClient.getPlanAttachments(vsoContext.project.id, "build", build.orchestrationPlan.planId, "json").then((taskAttachments) => {
                        taskAttachments.forEach(taskAttachment => {
                            if (taskAttachment._links && taskAttachment._links.self && taskAttachment._links.self.href && taskAttachment.name == "analysisResult") {
                                let attachmentName = taskAttachment.name;
                                let recId = taskAttachment.recordId;
                                let timelineId = taskAttachment.timelineId;
                                // Recover the attachment content in ArrayBuffer format
                                taskClient.getAttachmentContent(vsoContext.project.id, "build", build.orchestrationPlan.planId, timelineId, recId, "json", attachmentName).then((attachementContent) => {
                                    let str = "";
                                    let attachment = {};
                                    // Parse the attachment. ref: https://ourcodeworld.com/articles/read/164/how-to-convert-an-uint8array-to-string-in-javascript
                                    if (TextDecoder) {
                                        console.log("TextDecoder found");
                                        str = new TextDecoder("utf-8").decode(attachementContent);
                                        attachment = JSON.parse(str);
                                        this._initBuildStatus(build, attachment);
                                    }
                                    else {
                                        console.log("Blob used");
                                        this.largeuint8ArrToString(attachementContent, (str) => {
                                            attachment = JSON.parse(str);
                                            this._initBuildStatus(build, attachment);
                                        });
                                    }
                                });
                            }
                        });
                        this._initBuildStatus(build, null);
                    });
                });
            }
        }
        /**
         * Initalize: print a different message for each build
         * result. If completed shows a summary.
         * @param build Build to register to
         * @param aggregato JSON analysis result
         */
        _initBuildStatus(build, attachment) {
            let buildStatus = TFS_Build_Contracts.BuildStatus;
            let buildResult = TFS_Build_Contracts.BuildResult;
            let textResBuild = "Waiting analysis...";
            $("#spanSumRes").text(textResBuild);
            if (build.status === buildStatus.InProgress) {
                textResBuild = "Analysis ongoing...";
            }
            else if (build.status === buildStatus.Completed) {
                if (build.result === buildResult.Succeeded ||
                    build.result === buildResult.PartiallySucceeded ||
                    build.result === buildResult.Failed) {
                    textResBuild = "Analysis completed.";
                    if (attachment)
                        this.initResults(attachment);
                    else
                        textResBuild = "No analysis results have been found";
                }
                else if (build.result === buildResult.Canceled) {
                    textResBuild = "Analysis aborted.";
                }
                else if (build.result === buildResult.None) {
                    textResBuild = "Analysis not found.";
                }
            }
            $("#spanSumRes").text(textResBuild);
            VSS.resize();
        }
        /**
         * Show results summary
         * @param attachment JSON analysis result
         */
        initResults(attachment) {
            // Elaborate your attachment here
        }
        ;
        /**
         * Transform ArrayBuffer into string, used for big dataset
         * @param uint8arr Arraybuffer
         * @param callback Callback
         */
        largeuint8ArrToString(uint8arr, callback) {
            let bb = new Blob([uint8arr]);
            let f = new FileReader();
            f.onload = (e) => {
                callback(e.target.result);
            };
            f.readAsText(bb);
        }
    }
    exports.StatusSection = StatusSection;
    StatusSection.enhance(StatusSection, $(".task-contribution"), {});
    // Notify the parent frame that the host has been loaded
    VSS.notifyLoadSucceeded();
});
