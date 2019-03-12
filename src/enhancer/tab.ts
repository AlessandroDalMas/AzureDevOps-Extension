import Controls = require("VSS/Controls");
import TFS_Build_Contracts = require("TFS/Build/Contracts");
import TFS_Build_Extension_Contracts = require("TFS/Build/ExtensionContracts");
import DT_Client = require("TFS/DistributedTask/TaskRestClient");

export class InfoTab extends Controls.BaseControl {
	constructor() {
		super();
	}

	/**
	 * Initialize: recover parent extension configuration
	 */
	public initialize(): void {
		super.initialize();
		// Recover parent extension configuration
		let sharedConfig: TFS_Build_Extension_Contracts.IBuildResultsViewExtensionConfig = VSS.getConfiguration();
		if (sharedConfig) {
			// Register the extension to the host through callback
			sharedConfig.onBuildChanged((build: TFS_Build_Contracts.Build) => {
				this._initBuildStatus(build);
			});
		}
	}

	/**
	 * Initalize: print a different message for each build
	 * result. If completed shows the results.
	 * @param build Build to register
	 */
	private _initBuildStatus(build: TFS_Build_Contracts.Build) {
		let buildStatus = TFS_Build_Contracts.BuildStatus;
		let buildResult = TFS_Build_Contracts.BuildResult;
		let textResBuild = "Waiting analysis..."
		$("#spanRes").text(textResBuild);

		if (build.status === buildStatus.InProgress) {
			textResBuild = "Analysis ongoing...";
		}
		else if (build.status === buildStatus.Completed) {
			if (build.result === buildResult.Succeeded ||
				build.result === buildResult.PartiallySucceeded ||
				build.result === buildResult.Failed) {
				textResBuild = "Analysis completed."
				this.getAnalysisResult(build, (err: any, res: any) => {
					if (err)
						throw err;
					else if (res)
						this.showResults(res);
					else
						textResBuild = "No analysis results have been found."
				});
			} else if (build.result === buildResult.Canceled) {
				textResBuild = "Analysis aborted.";
			} else if (build.result === buildResult.None) {
				textResBuild = "Analysis not found.";
			}
		}

		$("#spanRes").text(textResBuild);
	}

	/**
	 * Get list of attachments, contents and return as JSON
	 * @param build Build registered
	 * @param callback Callback
	 */
	private getAnalysisResult(build: TFS_Build_Contracts.Build, callback: any): any {
		// Recover list of build attachments
		let vsoContext = VSS.getWebContext();
		let taskClient = DT_Client.getClient();
		taskClient.getPlanAttachments(vsoContext.project.id, "build", build.orchestrationPlan.planId, "json").then((taskAttachments) => {
			taskAttachments.forEach((taskAttachment) => {
				if (taskAttachment._links && taskAttachment._links.self && taskAttachment._links.self.href && taskAttachment.name == "analysisResult") {
					let attachmentName = taskAttachment.name;
					let recId = taskAttachment.recordId;
					let timelineId = taskAttachment.timelineId;
					// Recover the attachment content in ArrayBuffer format
					taskClient.getAttachmentContent(vsoContext.project.id, "build", build.orchestrationPlan.planId, timelineId, recId, "json", attachmentName).then((attachementContent) => {
						let str = "";
						let obj = {};
						// Parse the attachment. ref: https://ourcodeworld.com/articles/read/164/how-to-convert-an-uint8array-to-string-in-javascript
						if (TextDecoder) {
							console.log("TextDecoder found");
							str = new TextDecoder("utf-8").decode(attachementContent);
							obj = JSON.parse(str);
							return callback(null, obj);
						} else {
							console.log("Blob used");
							this.largeuint8ArrToString(attachementContent, function (text: any) {
								obj = JSON.parse(text);
								return callback(null, obj);
							});
						}
					});
				}
			});

			return callback(null, null);
		});
	}

	/**
	 * Transform ArrayBuffer into string, used for big dataset
	 * @param uint8arr Arraybuffer
	 * @param callback Callback
	 */
	private largeuint8ArrToString(uint8arr: any, callback: any) {
		let bb = new Blob([uint8arr]);
		let f = new FileReader();
		f.onload = function (e: any) {
			callback(e.target.result);
		};

		f.readAsText(bb);
	}

	/**
	 * Calls all methods to show data results
	 * @param data JSON results
	 */
	private showResults(data: any) {
		this.showAnalysisParams(data);
		this.showWarningsPie(data.Declarations);
		this.showDeclarationsBar(data.Declarations);
		this.showDeclarationsTable(data.Declarations);
		$('#spanRes').html("");
	}

	/**
	 * Insert params
	 * @param data Anlysis parameters 
	 */
	private showAnalysisParams(data: any) {
		$('#tableParam').append(
			$('<tr>').append(
				$('<td>').text(`Param 1`),
				$('<td>').text(data.Param1),
			),
			$('<tr>').append(
				$('<td>').text(`Param 2`),
				$('<td>').text(data.Param2),
			),
		);
	}

	/**
	 * Create warnings pie
	 * @param data Array of declarations analyzed
	 */
	private showWarningsPie(data: any) {
		$('.pieGraph').append(
			$('<h2>').text('Warnings'),
			$('<br>'),
			$('<canvas>').attr('id', 'myPieChart').css('margin-bottom', '50px'),
		)

		let canvas = <HTMLCanvasElement>document.getElementById("myPieChart");
		let ctx = canvas.getContext('2d');
		let arrayLabels: string[] = ["Label1", "Label2", "Label3"];
		let arrayColors: string[] = ['rgba(16, 124, 16, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 0, 0, 1)'];
		let arrayBorders: string[] = ['rgba(15, 113, 15, 1)', 'rgba(230, 230, 0, 1)', 'rgba(230, 0, 0, 1)'];
		let arrayData: number[] = [0, 0, 0];
		let arraySpareColors: string[] = ['rgba(0, 0, 255, 1)', 'rgba(255, 153, 0, 1)', 'rgba(0, 153, 153, 1)', 'rgba(153, 153, 102, 1)', 'rgba(184, 0, 230, 1)'];
		let arraySpareBorders: string[] = ['rgba(0, 0, 230, 1)', 'rgba(230, 138, 0, 1)', 'rgba(0, 128, 128, 1)', 'rgba(138, 138, 92, 1)', 'rgba(163, 0, 204, 1)'];
		data.forEach((element: any) => {
			let add = true;
			for (let i = 0; i < arrayLabels.length; i++) {
				if (element.Warning == arrayLabels[i]) {
					add = false;
					arrayData[i]++;
				}
			}
			// Supports till 8 different warnings
			if (add) {
				if (arraySpareColors.length > 0 && arraySpareBorders.length > 0) {
					arrayLabels.push(element.Warning);
					arrayData.push(1);
					arrayColors.push(arraySpareColors[0]);
					arraySpareColors.slice();
					arrayBorders.push(arraySpareBorders[0]);
					arraySpareBorders.slice();
				}
			}
		});

		let myPieChart = new Chart(ctx, {
			type: 'pie',
			data: {
				labels: arrayLabels,
				datasets: [{
					label: 'Declarations',
					data: arrayData,
					backgroundColor: arrayColors,
					borderColor: arrayBorders,
					borderWidth: 0,
				}]
			},
			options: {
				tooltips: {
					callbacks: {
						label: function (tooltipItem: any, data: any) {
							let allData = data.datasets[tooltipItem.datasetIndex].data;
							let tooltipLabel = data.labels[tooltipItem.index];
							let tooltipData = allData[tooltipItem.index];
							let total = 0;
							for (let i in allData) {
								total += allData[i];
							};

							let tooltipPercentage = Math.round((tooltipData / total) * 100);
							return tooltipLabel + ': ' + tooltipData + ' (' + tooltipPercentage + '%)';
						}
					}
				}
			}
		});
		
		myPieChart.update();
	}

	/**
	 * Create bar chart
	 * @param data Array of analyzed declarations
	 */
	private showDeclarationsBar(data: any) {
		$('.hBarGraph').append(
			$('<h2>').text('Types of declarations analyzed'),
			$('<br>'),
			$('<canvas>').attr('id', 'myBarChart').css('margin-bottom', '50px'),
		)

		let canvas = <HTMLCanvasElement>document.getElementById("myBarChart")
		let ctx = canvas.getContext('2d');
		let arrayLabels: string[] = ["Functions", "Triggers", "Procedures", "Views"];
		let arrayColors: string[] = ['rgba(16, 124, 16, 1)', 'rgba(255, 255, 0, 1)', 'rgba(255, 153, 0, 1)', 'rgba(0, 0, 255, 1)'];
		let arrayBorders: string[] = ['rgba(15, 113, 15, 1)', 'rgba(230, 230, 0, 1)', 'rgba(230, 138, 0, 1)', 'rgba(0, 0, 230, 1)'];
		let arrayData: number[] = [0, 0, 0, 0];
		let arraySpareColors: string[] = ['rgba(0, 153, 153, 1)', 'rgba(153, 153, 102, 1)', 'rgba(255, 0, 0, 1)', 'rgba(184, 0, 230, 1)'];
		let arraySpareBorders: string[] = ['rgba(0, 128, 128, 1)', 'rgba(138, 138, 92, 1)', 'rgba(230, 0, 0, 1)', 'rgba(163, 0, 204, 1)'];
		data.forEach((element: any) => {
			let add = true;
			for (let i = 0; i < arrayLabels.length; i++) {
				if (element.Tipo == arrayLabels[i]) {
					add = false;
					arrayData[i]++;
				}
			}
			// This method allows to support till 8 different types of declarations
			if (add) {
				if (arraySpareColors.length > 0 && arraySpareBorders.length > 0) {
					arrayLabels.push(element.Tipo);
					arrayData.push(1);
					arrayColors.push(arraySpareColors[0]);
					arrayBorders.push(arraySpareBorders[0]);
					arraySpareColors.slice();
					arraySpareBorders.slice();
				}
			}
		});

		let myBarChart = new Chart(ctx, {
			type: 'horizontalBar',
			data: {
				labels: arrayLabels,
				datasets: [{
					label: 'Declarations',
					data: arrayData,
					backgroundColor: arrayColors,
					borderColor: arrayBorders,
					borderWidth: 1,
				}]
			},
			options: {
				scales: {
					yAxes: [{
						ticks: {
							beginAtZero: true
						}
					}]
				},
				legend: false,
				tooltips: {
					callbacks: {
						label: function (tooltipItem: any, data: any) {
							let allData = data.datasets[tooltipItem.datasetIndex].data;
							let tooltipLabel = data.labels[tooltipItem.index];
							let tooltipData = allData[tooltipItem.index];
							let total = 0;
							for (let i in allData) {
								total += allData[i];
							};

							let tooltipPercentage = Math.round((tooltipData / total) * 100);
							return tooltipLabel + ': ' + tooltipData + ' (' + tooltipPercentage + '%)';
						}
					}
				}
			}
		});
		
		myBarChart.update();
	}

	/**
	 * Create a table with list of declarations
	 * @param data Array of analyzed declarations
	 */
	private showDeclarationsTable(data: any) {
		let table = $('#tableRes');
		data.forEach((element: any) => {
			table.append(
				$('<tr>').append(
					$('<td>').text(element.Type),
					$('<td>').text(element.Name),
					$('<td>').text(element.CC),
				),
			);
		});
	}
}

InfoTab.enhance(InfoTab, $(".task-contribution"), {});

// Notify the parent frame that the host has been loaded
VSS.notifyLoadSucceeded();