import { oneLine, stripIndents } from "common-tags";
import path from "path";
import fs from "fs";

let logo = "Logo failed to load??";
try {
	logo = fs.readFileSync(path.join(__dirname, "../../assets/logo.txt"), {
		encoding: "utf-8",
	});
} catch (error) {
	logo = fs.readFileSync(path.join(__dirname, "../assets/logo.txt"), {
		encoding: "utf-8",
	});
}
console.log(`\n${logo}\n`);

import c from "ansi-colors";

// @ts-expect-error - Types
const processPkgEntrypoint = process["pkg"]?.entrypoint;
const packageJsonPath =
	processPkgEntrypoint != undefined
		? path.join(__dirname, "../../package.json")
		: "package.json";
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath).toString());
const version = packageJson["version"];
console.log(
	stripIndents`
	GitHub: ${c.underline("https://github.com/some1chan/obs-stream-sync")}
	Running ${c.bold("obs-stream-sync")} version ${version}`
);

import OBSWebSocket, {
	OBSRequestTypes,
	OBSResponseTypes,
	RequestBatchExecutionType,
} from "obs-websocket-js";
import * as Logger from "./logger";
import { Config } from "./config";
import { processImage } from "./process_image";

import type { TimestampMillisecondData, SourceData } from "./global_types";

const obs = new OBSWebSocket();
const config = new Config();

import { compareVersions } from "compare-versions";
import { gcd } from "./aspect_ratio";

/**
 * Connects to OBS via WebSockets.
 */
async function _connect() {
	const { obsWebSocketVersion, negotiatedRpcVersion } = await obs.connect(
		config.parser.get(config.OBS_HEADER, config.SERVER_URL),
		config.parser.get(config.OBS_HEADER, config.SERVER_PASSWORD),
		{ rpcVersion: 1 }
	);
	console.log(
		`Connected to server ${obsWebSocketVersion} (using RPC ${negotiatedRpcVersion})`
	);
	const versionData = await obs.call("GetVersion");
	console.log(`OBS Studio ${versionData.obsVersion} detected.`);
	if (compareVersions(obsWebSocketVersion, obsWebSocketVersion) < 0) {
		Logger.warn(oneLine`This program is running an
		outdated obs-websocket version (${obsWebSocketVersion}),
		hopefully you can update the program. If not, good luck!`);
	}
}

enum HandleStreamDelayMode {
	Get,
	Timestamp,
	SelectiveSync,
	Delay,
	Reset,
	Sync,
}

import {
	autoCompletePrompt,
	confirmPrompt,
	mathPrompt,
	multiSelectPrompt,
	togglePrompt,
} from "./cli_utils";
import { calculateDelay } from "./sync";

function _getShorthand(command: string) {
	return command.trim().slice(0, command.indexOf(" ")).trim().toLowerCase();
}

/**
 * The entrypoint of the program.
 * Start here for trying to figure out this cursed thing.
 * @param reload
 */
async function runProgram(reload = false) {
	while (true) {
		await config.loadConfig();
		try {
			// Attempt to connect. If succeeds, exit the while loop
			await _connect();
			break;
		} catch (error) {
			const err = error as Error;
			Logger.error(`Failed to connect: ${err.message}`);

			try {
				const result = await togglePrompt({
					message: "Reload config and try again?",
					enabled: "Quit", // These are flipped because ordering is bad
					disabled: "Reload",
				});
				if (result) process.exit(0);
			} catch (error) {
				// Clean exit upon Ctrl+C
				process.exit(0);
			}
		}
	}
	if (reload) console.log("Reloaded config and connection!");

	await import("jsqr");

	// Main command handler
	let triggeredReload = false;
	while (!triggeredReload) {
		try {
			console.log();
			const command = await autoCompletePrompt({
				name: "command",
				message: "Enter a command:",
				choices: [
					"1 - Get timestamps and sync",
					"2 - Immediately sync all active livestreams",
					"3 - Sync audio/video feeds to another",
					"4 - Reset all livestream syncs",
					"5 - Mass change elements",
					"6 - Get applied delays",
					"7 - Crop sources in the preview scene (16:10 -> 16:9)",
					"8 - Uncrop sources in the preview scene (16:9 -> 16:10)",
					"Reload config.ini and OBS connection",
					"Quit the application",
				],
			});
			const shorthand = _getShorthand(command);
			switch (shorthand) {
				case "1":
					await handleStreamDelays(HandleStreamDelayMode.Timestamp);
					break;
				case "2":
					await handleStreamDelays(HandleStreamDelayMode.Sync);
					break;
				case "3":
					await handleStreamDelays(
						HandleStreamDelayMode.SelectiveSync
					);
					break;
				case "4":
					await handleStreamDelays(HandleStreamDelayMode.Reset);
					break;
				case "5":
					await massCommandHandler();
					break;
				case "6":
					await handleStreamDelays(HandleStreamDelayMode.Get);
					break;
				case "7":
					await setCrop([16, 9]);
					break;
				case "8":
					await setCrop([16, 10]);
					break;
				case "reload":
					triggeredReload = true;
					break;
				case "quit":
					console.log("Good bye!");
					process.exit();
				case "":
					break;
				default:
					console.log("Unknown command.");
					break;
			}
		} catch (error) {
			if (typeof error == "string" && error == "") continue;
			Logger.error(error);
		}
	}
	if (triggeredReload) runProgram(true);
}

async function massCommandHandler() {
	let exit = false;
	while (!exit) {
		const command = await autoCompletePrompt({
			name: "command",
			message: "What element should all be changed:",
			choices: [
				"1 - Change delays",
				"2 - Restart playback when source becomes active - Set TRUE (Media Source)",
				"3 - Restart playback when source becomes active - Set FALSE (Media Source)",
				"4 - Use hardware decoding when available - Set TRUE (Media Source)",
				"5 - Use hardware decoding when available - Set FALSE (Media Source)",
				"6 - RESUME Playback (Media Source, VLC Media Source)",
				"7 - PAUSE Playback (Media Source, VLC Media Source)",
				"0 - Back",
			],
		});
		const shorthand = _getShorthand(command);
		switch (shorthand) {
			case "1":
				await handleStreamDelays(HandleStreamDelayMode.Delay);
				break;
			case "2":
			case "3":
			case "4":
			case "5": {
				const sourceList = await _generateSourceData();
				for (const sourceData of sourceList) {
					try {
						const inputSettings = await obs.call(
							"GetInputSettings",
							{ inputName: sourceData.name }
						);
						const util = await import("util");
						console.log(
							util.inspect(inputSettings, undefined, 4, true)
						);

						if (inputSettings.inputKind != "ffmpeg_source") {
							continue;
						}

						switch (shorthand) {
							case "2":
							case "3":
								await obs.call("SetInputSettings", {
									inputName: sourceData.name,
									overlay: true,
									inputSettings: {
										restart_on_activate: shorthand == "2",
									},
								});
								break;
							case "4":
							case "5":
								await obs.call("SetInputSettings", {
									inputName: sourceData.name,
									overlay: true,
									inputSettings: {
										hw_decode: shorthand == "4",
									},
								});
								break;
							default:
								exit = true;
								Logger.error("Unknown command");
						}
					} catch (error) {
						Logger.error(error);
					}
				}
				break;
			}
			case "6":
			case "7":
				const sourceList = await _generateSourceData();
				const requestData: {
					requestType: "TriggerMediaInputAction";
					requestId: string;
					requestData: {
						inputName: string;
						mediaAction: string;
					};
				}[] = [];
				for (const sourceData of sourceList) {
					requestData.push({
						requestType: "TriggerMediaInputAction",
						requestId: sourceData.name,
						requestData: {
							inputName: sourceData.name,
							mediaAction:
								shorthand == "6"
									? "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY"
									: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE",
						},
					});
				}

				const batchResponse = await obs.callBatch(requestData, {
					haltOnFailure: false,
				});
				for (const response of batchResponse) {
					if (!response.requestStatus.result) {
						Logger.error(
							`For "${response.requestId}": received code ` +
								`${response.requestStatus.code}: ${response.requestStatus.comment}`
						);
					}
				}

				break;
			default:
				exit = true;
				Logger.error("Unknown command.");
			case "0":
				exit = true;
				break;
		}
	}
}

async function selectiveSyncCommandHandler(sources: SourceData[]) {
	const choices = sources.map(s => s.name);
	if (choices.length <= 1) {
		throw new RangeError(
			"You'll need more than one source in order to use this function!"
		);
	}

	let sourcesToSync: string[] = [];
	while (sourcesToSync.length == 0) {
		sourcesToSync = await multiSelectPrompt({
			name: "sourceToSync",
			message:
				"Select the sources you'd like to change the delay on. ^C to cancel.",
			choices: choices,
			limit: choices.length - 2,
		});
	}

	const sourceToSyncTo: string = await autoCompletePrompt({
		name: "command",
		message: `Select the source you'd like ${sourcesToSync} to sync towards. ^C to cancel.`,
		choices: choices.filter(c => !sourcesToSync.includes(c)),
	});
	return {
		sourcesToSync: sources.filter(s => sourcesToSync.includes(s.name)),
		sourceToSyncTo: sources.find(s => s.name == sourceToSyncTo),
	};
}

/**
 * Handles stream delay, depending on what mode is used.
 * This function will log data to the console.
 * @param mode
 */
async function handleStreamDelays(mode: HandleStreamDelayMode) {
	// If in get mode, it'll print out audio video data into the console
	let sourceList = await _generateSourceData(mode);
	if (mode == HandleStreamDelayMode.Get) return;

	let timestampMsData: TimestampMillisecondData[] = [];
	if (
		mode == HandleStreamDelayMode.Sync ||
		mode == HandleStreamDelayMode.Timestamp ||
		mode == HandleStreamDelayMode.SelectiveSync
	) {
		if (mode == HandleStreamDelayMode.SelectiveSync) {
			const { sourcesToSync, sourceToSyncTo } =
				await selectiveSyncCommandHandler(sourceList);
			if (sourcesToSync.length == 0) {
				throw new Error("sourceToSync is empty");
			} else if (sourceToSyncTo == undefined) {
				throw new Error("sourceToSyncTo is undefined");
			}
			sourceList = [...sourcesToSync, sourceToSyncTo];
			timestampMsData = await _fetchAndParseScreenshots(
				sourceList,
				sourceToSyncTo
			);
		} else {
			timestampMsData = await _fetchAndParseScreenshots(sourceList);
		}
	}

	if (
		mode == HandleStreamDelayMode.Timestamp ||
		mode == HandleStreamDelayMode.SelectiveSync
	) {
		if (timestampMsData.length == 0) {
			const noActiveSources = !sourceList.some(s => s.active)
				? " " +
				  oneLine`All valid sources to parse from,
				  seem to not be showing in OBS.`
				: "";
			console.log(
				`No timestamps found in any of the screenshots!${noActiveSources}`
			);
			return;
		}

		for (const sourceData of sourceList) {
			const timestamp = timestampMsData.find(
				t => t.name == sourceData.name
			);
			if (!timestamp || timestamp.ms == -1) {
				if (sourceData.active) {
					Logger.warn(
						`No timestamp found for timestamp ${sourceData.name}!`
					);
				}
				continue;
			}

			let textBuffer = "";

			const screenshotDelayMs =
				sourceData.screenshotDelay != undefined &&
				!Number.isNaN(sourceData.screenshotDelay)
					? Logger.ms(sourceData.screenshotDelay)
					: undefined;
			if (screenshotDelayMs != undefined)
				textBuffer += `- Screenshot delay: ${screenshotDelayMs}\n`;

			const timestampMs = timestamp.ms;
			if (!Number.isNaN(timestampMs)) {
				const timestampMsText =
					timestampMs > 0
						? Logger.ms(timestampMs)
						: c.bgRed(Logger.ms(timestampMs));

				textBuffer += `- Timestamp: ${timestampMsText}\n`;
			} else {
				textBuffer += `- No valid QR code found\n`;
			}

			const visualOffsetMs =
				timestamp.visualOffsetMs != undefined &&
				!Number.isNaN(timestamp.visualOffsetMs)
					? Logger.ms(timestamp.visualOffsetMs)
					: undefined;
			if (visualOffsetMs != undefined)
				textBuffer += `- Visual offset: ${visualOffsetMs}\n`;

			const timestampOffsetMs = timestamp.offsetMs ?? 0;
			const offsetMs = !Number.isNaN(timestampOffsetMs)
				? Logger.ms(timestampOffsetMs)
				: undefined;
			if (offsetMs != undefined) {
				const videoDelayString = Logger.ms(sourceData.videoDelay);
				const offsetMsColor = Logger.colorDelayMs(timestampOffsetMs);
				textBuffer += `- Would apply: ${videoDelayString} -> ${offsetMsColor}`;
			}

			const indicatorAndName = `${Logger.getIndicator(sourceData)} ${
				!sourceData.active ? c.gray(sourceData.name) : sourceData.name
			}`;
			textBuffer = textBuffer.trim();
			console.log(
				sourceData.active
					? `${indicatorAndName}\n${textBuffer}`
					: `${indicatorAndName}\n${c.grey(textBuffer)}`
			);
		}

		if (timestampMsData.length == 0) return;

		// Screenshot handling
		if (
			config.parser.getInt(
				config.IMAGE_HEADER,
				config.SCREENSHOT_ALLOW
			) == 1
		) {
			console.log();
			console.log(stripIndents`
				${oneLine`Would you like to save all screenshots
				to a screenshots folder in your working directory?`}
				${oneLine`This will make a folder named "screenshots"
				in ${process.cwd()}.`}`);
			const screenshotInput = await confirmPrompt({
				message: "Save screenshot?",
				initial: false,
			});
			if (screenshotInput) {
				await _saveScreenshots(timestampMsData);
			}
		}

		console.log();
		console.log(
			oneLine`Would you like to sync the streams with the following data above?`
		);
		const syncInput = await confirmPrompt({
			name: "syncInput",
			message: "Sync streams?",
			initial: false,
		});
		if (!syncInput) {
			return;
		}
	}

	// Sets delays
	for (let i = 0; i < sourceList.length; i++) {
		const sourceData = sourceList[i];
		let newDelay = -1;

		if (!sourceData.active) continue;

		if (mode == HandleStreamDelayMode.Reset) {
			newDelay = 0;
		} else if (mode == HandleStreamDelayMode.Delay) {
			const newDelayRaw = await mathPrompt({
				name: "newDelayRaw",
				message: `For ${sourceData.name}, type a value between 0 and 20,000:`,
				initial: sourceData.videoDelay ?? 0,
			});
			try {
				_validateNumberInput(newDelayRaw, { min: 0, max: 20_000 });
				newDelay = newDelayRaw;
			} catch (error) {
				Logger.error(error);
				newDelay = sourceData.videoDelay;
			}
			if (newDelay == sourceData.videoDelay) {
				console.log("Skipping setting the new value...");
				continue;
			}
		} else {
			newDelay =
				timestampMsData.find(t => t.name == sourceData.name)
					?.offsetMs ?? 0;
		}

		if (Number.isNaN(newDelay)) continue;

		// Filter newDelay to not use decimals,
		// as audioDelay doesn't support it.
		newDelay = Math.round(newDelay);

		// Log to console
		const setOrReset =
			mode == HandleStreamDelayMode.Reset ? "Reset" : "Set";
		const header = `${Logger.getIndicator(sourceData)} ${sourceData.name}`;
		if (mode == HandleStreamDelayMode.Sync) {
			const element = timestampMsData.find(
				t => t.name == sourceData.name
			);
			const timestampMs = element?.ms ?? 0;
			const offsetMs = element?.offsetMs ?? 0;
			console.log(oneLine`${header} -
			${Logger.millisecondsToTimestamp(timestampMs)} -
			${Logger.ms(element?.offsetMs)} = ${Logger.millisecondsToTimestamp(
				timestampMs - offsetMs
			)}`);
		} else {
			console.log(header);
		}

		const amountOfDelayString = Logger.ms(newDelay);

		// (Re)set audio
		try {
			const audioDelay = await obs.call("GetInputAudioSyncOffset", {
				inputName: sourceData.name,
			});
			if (audioDelay) {
				await obs.call("SetInputAudioSyncOffset", {
					inputName: sourceData.name,
					inputAudioSyncOffset: newDelay,
				});

				const audioDelayString = Logger.ms(sourceData.audioDelay);
				console.log(oneLine`
					- ${setOrReset} audio sync offset:
					${audioDelayString} -> ${amountOfDelayString}`);
			}
		} catch (error) {
			Logger.debug(error);
		}

		// (Re)set video
		if (sourceData.videoFilterName == undefined) {
			sourceData.videoFilterName = "Video Delay (Async)";
			await obs.call("CreateSourceFilter", {
				sourceName: sourceData.name,
				filterKind: "async_delay_filter",
				filterName: sourceData.videoFilterName,
				filterSettings: { delay_ms: newDelay },
			});
		}
		await obs.call("SetSourceFilterSettings", {
			sourceName: sourceData.name,
			filterName: sourceData.videoFilterName,
			filterSettings: { delay_ms: newDelay },
			overlay: true,
		});

		const videoDelayString = Logger.ms(sourceData.videoDelay);
		console.log(oneLine`
			- ${setOrReset} video delay offset:
			${videoDelayString} -> ${amountOfDelayString}`);

		if (mode == HandleStreamDelayMode.Delay) console.log();
	}
}

function _validateNumberInput(
	num: number,
	options: { min: number; max: number }
) {
	if (Number.isNaN(num)) {
		throw new Error(`You didn't input a number!`);
	} else if (num < options.min) {
		throw new Error("Number too small!");
	} else if (num > options.max) {
		throw new Error("Number too big!");
	}
}

/**
 * Generates source data, including scene item names,
 * along with their currently set audio and video delays in OBS.
 * @param mode If set to HandleStreamDelayMode.Get,
 * this will output to console of what was found.
 * @returns Source data
 */
async function _generateSourceData(
	mode?: HandleStreamDelayMode
): Promise<SourceData[]> {
	// Get all the scene items, in a certain scene group/folder.
	const streamSourcesScene =
		config.parser.get(config.OBS_HEADER, config.SOURCES_SCENE) ??
		config.SOURCES_SCENE_VALUE;
	const sceneItemList = await obs.call("GetSceneItemList", {
		sceneName: streamSourcesScene,
	});

	// Then, builds a request to fetch all source filters all at once
	// and build request for audio delay
	const sourceFilterListRequest: {
		requestType: "GetSourceFilterList";
		requestData: OBSRequestTypes["GetSourceFilterList"];
		requestId: string;
	}[] = [];
	const inputAudioOffsetListRequest: {
		requestType: "GetInputAudioSyncOffset";
		requestData: OBSRequestTypes["GetInputAudioSyncOffset"];
		requestId: string;
	}[] = [];
	const sourceList: SourceData[] = [];
	for (const sceneItem of sceneItemList.sceneItems) {
		const validSceneItems = ["ffmpeg_source", "vlc_source"];
		if (!validSceneItems.includes(sceneItem["inputKind"] as string)) {
			console.log(
				c.grey(
					`Found scene item of type ${sceneItem["inputKind"]}, ignoring`
				)
			);
			continue;
		}
		const sourceName = sceneItem["sourceName"] as string;
		sourceFilterListRequest.push({
			requestType: "GetSourceFilterList",
			requestData: { sourceName: sourceName },
			requestId: sourceName,
		});
		inputAudioOffsetListRequest.push({
			requestType: "GetInputAudioSyncOffset",
			requestData: { inputName: sourceName },
			requestId: sourceName,
		});
	}

	// Get video filters data and audio sync data
	const [sourceFilterListData, audioSyncResults] = await Promise.all([
		obs.callBatch(sourceFilterListRequest, {
			executionType: RequestBatchExecutionType.SerialRealtime,
		}),
		obs.callBatch(inputAudioOffsetListRequest, {
			executionType: RequestBatchExecutionType.SerialRealtime,
		}),
	]);

	// Create sourceList template, which includes source name and audio sync offset
	for (const audioDelay of audioSyncResults) {
		if (!audioDelay.requestStatus.result) {
			throw new Error(
				`${audioDelay.requestStatus.code}: ${audioDelay.requestStatus.comment}`
			);
		}
		const responseData =
			audioDelay.responseData as OBSResponseTypes["GetInputAudioSyncOffset"];
		sourceList.push({
			name: audioDelay.requestId,
			audioDelay: responseData.inputAudioSyncOffset,
			videoDelay: 0,
		});
	}

	// From Video Filters data, and attaches scene item names
	// to the filters, in sourceData
	for (let i = 0; i < sourceFilterListData.length; i++) {
		const sourceFilter = sourceFilterListData[i];
		const sourceName = sourceFilterListRequest[i].requestData.sourceName;
		if (sourceFilter.requestType != "GetSourceFilterList") {
			continue;
		}

		for (const f of sourceFilter.responseData.filters) {
			const filter = f as {
				filterEnabled: boolean;
				filterIndex: number;
				filterKind: string;
				filterName: string;
				filterSettings: { delay_ms: number };
			};

			if (filter.filterKind != "async_delay_filter") continue;
			const sourceData = sourceList.find(s => s.name == sourceName);
			if (sourceData) {
				sourceData.videoDelay = filter.filterSettings.delay_ms ?? 0;
				sourceData.videoFilterName = filter.filterName;
			}
		}
	}

	// Get sources that are active
	const sourceActiveListRequest: {
		requestId: string;
		requestType: "GetSourceActive";
		requestData: OBSRequestTypes["GetSourceActive"];
	}[] = [];
	for (const sourceData of sourceList) {
		sourceActiveListRequest.push({
			requestId: sourceData.name,
			requestType: "GetSourceActive",
			requestData: { sourceName: sourceData.name },
		});
	}
	const sourceActiveResults = await obs.callBatch(sourceActiveListRequest, {
		executionType: RequestBatchExecutionType.SerialRealtime,
	});
	for (const sourceActiveData of sourceActiveResults) {
		if (!sourceActiveData.requestStatus.result) {
			throw new Error(
				`${sourceActiveData.requestStatus.code}: ${sourceActiveData.requestStatus.comment}`
			);
		}
		const responseData =
			sourceActiveData.responseData as OBSResponseTypes["GetSourceActive"];
		const sourceData = sourceList.find(
			s => s.name == sourceActiveData.requestId
		);
		if (!sourceData) {
			throw new Error(
				`Source data missing: ${sourceActiveData.requestId}`
			);
		}
		sourceData.active = responseData.videoShowing;

		// Logs them if in GET mode
		if (mode == HandleStreamDelayMode.Get) {
			const indicator = Logger.getIndicator(sourceData);
			let textBuffer = "";
			if (sourceData.audioDelay != undefined) {
				textBuffer += `- Audio set at ${Logger.colorDelayMs(
					sourceData.audioDelay
				)} delay offset\n`;
			}
			if (sourceData.videoDelay != undefined) {
				textBuffer += `- Video set at ${Logger.colorDelayMs(
					sourceData.videoDelay
				)} delay offset`;
			}
			const base = `${sourceData.name}\n${textBuffer}`;
			console.log(
				sourceData.active
					? `${indicator} ${base}`
					: `${indicator} ${c.grey(base)}`
			);
		}
	}

	// Sorts object array alphanumerically
	if (
		config.parser.getInt(
			config.OBS_HEADER,
			config.USE_DEFAULT_SOURCES_SORT
		) != 1
	) {
		_sortObjectArrayAlphanumerically(sourceList);
	}

	return sourceList;
}

/**
 * Sorts an array with objects, with the key "name" in each element,
 * alphanumerically depending on settings. This function edits the
 * original array.
 * @param array
 * @returns Sorted array
 */
function _sortObjectArrayAlphanumerically(array: { name: string }[]) {
	return array.sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { numeric: true })
	);
}

/**
 * Takes screenshots, recognizes the text, and generates timestamp data.
 * @param sourceList Audio Video Data
 * @returns Timestamp data
 */
async function _fetchAndParseScreenshots(
	sourceList: SourceData[],
	sourceToSyncTo?: SourceData
) {
	let timestampMsList: TimestampMillisecondData[] = [];

	try {
		Logger.time("Fetch screenshots from OBS");
		const obsScreenshotResults = await _takeScreenshots(sourceList);

		timestampMsList = await _getTimestampDataFromQRCodes(
			obsScreenshotResults
		);

		// Applies screenshotDelayMs from audio/video data, into timestamp data
		// and applies screenshot data
		for (const timestamp of timestampMsList) {
			const obsScreenshotResult = obsScreenshotResults.find(
				r => r.requestId == timestamp.name
			);
			timestamp.imageData = obsScreenshotResult?.responseData.imageData;
		}

		calculateDelay(sourceList, timestampMsList, {
			logging: true,
			sourceToSyncTo: sourceToSyncTo,
			roundToFramerate:
				config.parser.getInt(
					config.OBS_HEADER,
					config.ROUND_DELAYS_TO_FRAMERATE
				) != 0
					? {
							framerate:
								config.parser.getInt(
									config.OBS_HEADER,
									config.FRAMERATE
								) ?? config.FRAMERATE_VALUE,
					  }
					: undefined,
		});
	} catch (error) {
		const err = error as Error;
		Logger.warn(err.stack);
	}

	return timestampMsList;
}

//#region QR functions

async function _getTimestampDataFromQRCodes(
	obsScreenshotResults: OBSScreenshotResult[]
) {
	const jsQR = (await import("jsqr")).default;
	Logger.time("QR code recognize");
	const results = await Promise.all(
		obsScreenshotResults.map(async result => {
			const responseData = result.responseData as {
				imageData: string;
			};
			return {
				jobId: result.requestId,
				jimpResults: await processImage(responseData.imageData, config),
			};
		})
	);

	const timestampData: TimestampMillisecondData[] = [];
	for (const { jobId, jimpResults } of results) {
		const bitmap = jimpResults.bitmap;
		const code = jsQR(
			new Uint8ClampedArray(bitmap.data),
			bitmap.height,
			bitmap.width,
			{ inversionAttempts: "dontInvert" }
		);

		if (!code) {
			Logger.warn(`${jobId} - QR Code NOT FOUND!`);
		} else {
			Logger.debug(`${jobId} - QR Code v${code.version} - ${code.data}`);
		}

		timestampData.push({
			name: jobId,
			ms: code == undefined ? -1 : Number(code.data),
		});
	}
	Logger.timeEnd("QR code recognize");

	return timestampData;
}

//#endregion

interface OBSScreenshotResult {
	requestId: string;
	requestStatus: { code: number; result: boolean };
	requestType: "GetSourceScreenshot";
	responseData: { imageData: string };
}

/**
 * Requests OBS to retrieve screenshots of scene items.
 * @param sourceList
 * @returns OBSScreenshotResult[]
 */
async function _takeScreenshots(sourceList: SourceData[]) {
	const { imageWidth, imageHeight, imageFormat, compressionQuality } =
		config.getImageConfigData();

	let screenshotDelayMsTimes: number[] = [];
	let obsScreenshotResults: OBSScreenshotResult[];

	const executionTypeRaw =
		config.parser.getInt(
			config.OBS_HEADER,
			config.FETCH_REQUEST_BATCH_EXECUTION_TYPE
		) ?? RequestBatchExecutionType.Parallel;
	const executionType =
		!Number.isNaN(executionTypeRaw) &&
		executionTypeRaw > 0 &&
		executionTypeRaw <= 2
			? executionTypeRaw
			: RequestBatchExecutionType.Parallel;
	const screenshotBatch = executionType != RequestBatchExecutionType.Parallel;

	if (screenshotBatch) {
		// Builds screenshot batch request
		const screenshotRequests: {
			requestType: "GetSourceScreenshot";
			requestId?: string;
			requestData: {
				sourceName: string;
				imageFormat: string;
				imageWidth?: number | undefined;
				imageHeight?: number | undefined;
				imageCompressionQuality?: number | undefined;
			};
		}[] = [];
		for (let i = 0; i < sourceList.length; i++) {
			const sourceData = sourceList[i];
			if (!sourceData.active) continue;
			screenshotRequests.push({
				requestType: "GetSourceScreenshot",
				requestId: sourceData.name,
				requestData: {
					sourceName: sourceData.name,
					imageFormat,
					imageWidth,
					imageHeight,
				},
			});
		}
		const startTime = process.hrtime.bigint();

		obsScreenshotResults = (await obs.callBatch(screenshotRequests, {
			executionType,
			haltOnFailure: false,
		})) as any;

		const delay = process.hrtime.bigint() - startTime;
		const delayMs = Number(delay) / 1_000_000;
		screenshotDelayMsTimes.push(delayMs);
		Logger.debug(`Took ${delayMs}ms to screenshot`);
	}
	// Fallback to non-batching
	else {
		obsScreenshotResults = [];
		const startTime = process.hrtime.bigint();
		for (let i = 0; i < sourceList.length; i++) {
			const sourceData = sourceList[i];
			if (!sourceData.active) continue;
			const screenshot = await obs.call("GetSourceScreenshot", {
				sourceName: sourceData.name,
				imageFormat,
				imageWidth,
				imageHeight,
				imageCompressionQuality: compressionQuality,
			});
			obsScreenshotResults.push({
				requestId: sourceData.name,
				requestStatus: { code: 100, result: true },
				requestType: "GetSourceScreenshot",
				responseData: { imageData: screenshot.imageData },
			});
			const delay = process.hrtime.bigint() - startTime;
			const delayMs = Number(delay) / 1_000_000;
			screenshotDelayMsTimes.push(delayMs);
			Logger.debug(
				`${sourceData.name} - Took ${delayMs}ms to screenshot`
			);
			sourceData.screenshotDelay = delayMs;
		}
	}
	Logger.timeEnd("Fetch screenshots from OBS");

	return obsScreenshotResults;
}

/**
 * Save screenshots to disk.
 * @param timestampMsData
 */
async function _saveScreenshots(timestampMsData: TimestampMillisecondData[]) {
	console.log("Preparing save...");

	const [dayjs] = await Promise.all([(await import("dayjs")).default]);

	const { imageFormat } = config.getImageConfigData();
	for (const timestampMs of timestampMsData) {
		if (!timestampMs.imageData) {
			Logger.warn(`Couldn't find image data for ${timestampMs.name}!`);
			continue;
		}

		try {
			const posixCompliantName = timestampMs.name
				.trim()
				.replace("(", "")
				.replace(")", "")
				.replace(/(?:\.(?![^.]+$)|[^\w.])+/g, "-");
			const dateFormattingRaw = config.parser.get(
				config.IMAGE_HEADER,
				config.SCREENSHOT_FILENAME_FORMATTING
			);
			const dateFormatting =
				dateFormattingRaw == undefined || dateFormattingRaw.length == 0
					? config.SCREENSHOT_FILENAME_FORMATTING_VALUE
					: dateFormattingRaw;
			const dateString = dayjs()
				.format(dateFormatting)
				.replace("{name}", posixCompliantName);
			const filename = `${process.cwd()}${path.sep}screenshots${
				path.sep
			}${dateString}.${imageFormat}`;
			console.log(`Saving screenshot to ${c.underline(filename)}`);
			const result = await processImage(timestampMs.imageData, config);
			await result.writeAsync(filename);

			const fullScreenshotFilename = `${process.cwd()}${
				path.sep
			}screenshots${path.sep}${dateString}_full.${imageFormat}`;
			console.log(`Saving screenshot to ${filename}`);
			const fullScreenshotResult = await processImage(
				timestampMs.imageData,
				config,
				true
			);
			await fullScreenshotResult.writeAsync(fullScreenshotFilename);

			console.log(`Saved!`);
		} catch (error) {
			Logger.error(error);
		}
	}
}

/**
 * Set scene item crops.
 * @param newAspectRatio
 */
async function setCrop(newAspectRatio: [number, number]) {
	// const streamSourcesGroup =
	// 	config.parser.get(config.OBS_HEADER, config.SOURCES_SCENE) ??
	// 	config.SOURCES_SCENE_VALUE;
	// const sceneItemList = await obs.call("GetSceneItemList", {
	// 	sceneName: streamSourcesGroup,
	// });

	const isStudio = await obs.call("GetStudioModeEnabled");

	const scene = isStudio.studioModeEnabled
		? (await obs.call("GetCurrentPreviewScene")).currentPreviewSceneName
		: (await obs.call("GetCurrentProgramScene")).currentProgramSceneName;
	const currentSceneItems = await obs.call("GetSceneItemList", {
		sceneName: scene,
	});

	for (const iterator of currentSceneItems.sceneItems) {
		const sceneItem = iterator as {
			sceneItemTransform: {
				sourceHeight: number;
				sourceWidth: number;
			};
			sourceName: string;
			sceneItemId: number;
		};
		const sourceWidth = sceneItem.sceneItemTransform.sourceWidth;
		const sourceHeight = sceneItem.sceneItemTransform.sourceHeight;
		if (!sourceWidth || !sourceHeight) {
			Logger.debug(
				`Skipping ${sceneItem.sourceName}, as its size doesn't seem to be valid`
			);
			continue;
		}

		const sourceRatio = gcd(sourceWidth, sourceHeight);
		const sourceAspectRatio = [
			sourceWidth / sourceRatio,
			sourceHeight / sourceRatio,
		];

		// Hacky garbage
		if (sourceAspectRatio[0] == 8 && sourceAspectRatio[1] == 5) {
			sourceAspectRatio[0] = 16;
			sourceAspectRatio[1] = 10;
		}

		const newSourceHeight =
			(sourceHeight * newAspectRatio[1]) / sourceAspectRatio[1];
		const sourceName = sceneItem.sourceName;
		if (sourceHeight > newSourceHeight) {
			console.log(
				`Setting ${sourceName} to ${newAspectRatio[0]}:${newAspectRatio[1]}`
			);
			await obs.call("SetSceneItemTransform", {
				sceneItemId: sceneItem.sceneItemId,
				sceneName: scene,
				sceneItemTransform: {
					cropBottom: sourceHeight - newSourceHeight,
				},
			});
		} else {
			console.log(
				`Resetting ${sourceName} to ${newAspectRatio[0]}:${newAspectRatio[1]}`
			);
			await obs.call("SetSceneItemTransform", {
				sceneItemId: sceneItem.sceneItemId,
				sceneName: scene,
				sceneItemTransform: {
					cropBottom: 0,
				},
			});
		}
	}
}

runProgram();
