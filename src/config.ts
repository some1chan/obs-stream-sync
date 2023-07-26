import { stripIndents, oneLine } from "common-tags";
import ConfigParser from "configparser";
import c from "ansi-colors";
import * as Logger from "./logger";
import {
	confirmPrompt,
	inputPrompt,
	passwordPrompt,
	togglePrompt,
} from "./cli_utils";
import path from "path";

export class Config {
	readonly OBS_HEADER = "obs";
	//#region OBS
	readonly SERVER_URL = "server_url";
	readonly SERVER_URL_VALUE = "ws://127.0.0.1:4455";
	readonly SERVER_PASSWORD = "server_password";
	readonly SOURCES_SCENE = "sources_scene";
	readonly SOURCES_SCENE_VALUE = "Stream Sources";
	readonly FETCH_REQUEST_BATCH_EXECUTION_TYPE =
		"fetch_request_batch_execution_type";
	readonly USE_DEFAULT_SOURCES_SORT = "use_default_sources_sort";
	//#endregion

	readonly IMAGE_HEADER = "image";
	//#region Image
	readonly FETCH_IMAGE_WIDTH = "fetch_image_width";
	readonly FETCH_IMAGE_HEIGHT = "fetch_image_height";
	readonly FETCH_COMPRESSION_QUALITY = "fetch_compression_quality";
	readonly FETCH_COMPRESSION_QUALITY_VALUE = 100;
	readonly IMAGE_FORMAT = "image_format";

	readonly RECT_LEFT = "rect_left";
	readonly RECT_TOP = "rect_top";
	readonly RECT_LEFT_RATIO = "rect_left_ratio";
	readonly RECT_TOP_RATIO = "rect_top_ratio";
	readonly RECT_WIDTH = "rect_width";
	readonly RECT_HEIGHT = "rect_height";
	readonly RECT_WIDTH_RATIO = "rect_width_ratio";
	readonly RECT_HEIGHT_RATIO = "rect_height_ratio";

	readonly SCREENSHOT_ALLOW = "screenshot_allow";
	readonly SCREENSHOT_FILENAME_FORMATTING = "screenshot_filename_formatting";
	readonly SCREENSHOT_FILENAME_FORMATTING_VALUE =
		"[Screenshot] YYYY-MM-DD HH-mm-ss [{name}]";
	//#endregion

	readonly TWITCH_HEADER = "twitch";
	//#region LiveSplit
	readonly TWITCH_CHANNELS = "twitch_channels";
	readonly TWITCH_CHANNELS_VALUE = "obsstreamsync";
	// Values

	readonly LOGGING_HEADER = "logging";
	readonly DEBUG_LOG = "debug_log";

	public readonly parser = new ConfigParser();

	async loadConfig() {
		try {
			this.parser.read("config.ini");
		} catch (error) {
			const err = error as Error;
			if (!("code" in err && err.code == "ENOENT")) {
				console.error(error);
			}
		}

		Logger.changeDebugLogging(
			Boolean(this.parser.getInt(this.LOGGING_HEADER, this.DEBUG_LOG))
		);

		const password = this.parser.get(this.OBS_HEADER, this.SERVER_PASSWORD);
		if (
			password ==
			"Set me, please! (or set to empty if your local OBS instance is passwordless)"
		) {
			const os = await import("os");
			let enterKey = os.platform() == "darwin" ? "Return" : "Enter";

			Logger.error(
				`You forgot to set the \`server_password\` in your config!

If you don't know how to set this up:
 1. Rename your config.ini file to oldconfig.ini.
 2. In the program, press ${enterKey} here to enter initial setup.
 3. Once you're done with the setup, copy and paste parts from oldconfig.ini,
    into the auto-generated config.ini that was just created.` + "\n"
			);
			const result = await togglePrompt({
				message: "Reload config and try again?",
				enabled: "Quit", // These are flipped because ordering is bad
				disabled: "Reload",
			});
			if (result) process.exit(0);
			await this.loadConfig();
			return;
		}
		if (this.parser.hasSection(this.OBS_HEADER) && password != undefined) {
			return;
		}

		this.parser.addSection(this.OBS_HEADER);
		console.log
		console.log(
			stripIndents`
			Let's configure obs-stream-sync!
			If you haven't setup WebSocket Server Settings before:
			
			1. Launch OBS, and select ${c.bold("Tools > WebSocket Server Settings")}.
			2. Then, ${c.bold("Enable the WebSocket server")} under Plugin Settings.
			3. Next, select Show Connect Info, copy the Server Password, then paste it in here.
			
			${oneLine`If you're setting up this program on the same computer as OBS,
			use the default settings.`}
			${oneLine`If you get lost, please refer to the GitHub page linked above.`}`
		);
		console.log();

		let confirmed = false;
		while (!confirmed) {
			try {
				const url = await inputPrompt({
					name: "url",
					message: `Enter your OBS WebSocket URL, to connect to your local OBS.`,
					initial: this.SERVER_URL_VALUE,
				});
				const serverPassword = await passwordPrompt({
					name: "serverPassword",
					message: `Enter your OBS WebSocket Server Password:`,
				});

				// Set all the data
				this.parser.set(this.OBS_HEADER, this.SERVER_URL, url.trim());
				this.parser.set(
					this.OBS_HEADER,
					"server_password",
					serverPassword
				);
				this.parser.set(
					this.OBS_HEADER,
					this.SOURCES_SCENE,
					this.SOURCES_SCENE_VALUE
				);

				console.log(oneLine`Your new configuration will be saved to
				${c.underline(`${process.cwd()}${path.sep}config.ini`)}.`);
				confirmed = await confirmPrompt({
					message: `Are you sure you want to save?`,
					initial: true,
				});
			} catch (error) {
				if (typeof error == "string") {
					console.log(error);
					continue;
				}
				Logger.error((error as Error).stack);
			}
		}

		// Then write
		this.parser.write("config.ini");

		console.log("Set! You can edit these in auto-generated config.ini.");
	}

	getImageConfigData() {
		// 16:10 bottom layout text
		const defaultImageWidth = 384;
		const defaultImageHeight = 240;
		const defaultRectLeftRatio = 0;
		const defaultRectTopRatio = 9 / 10; // equivalent would be 540px width
		const defaultRectWidthRatio = 1 / 16; // equivalent would be 60px width
		const defaultRectHeightRatio = 1 / 10; // equivalent to 60px height

		// Image width, height, and format
		const imageWidthRaw =
			this.parser.getInt(this.IMAGE_HEADER, this.FETCH_IMAGE_WIDTH) ??
			defaultImageWidth;
		const imageWidth = !Number.isNaN(imageWidthRaw)
			? imageWidthRaw
			: defaultImageWidth;
		const imageHeightRaw =
			this.parser.getInt(this.IMAGE_HEADER, this.FETCH_IMAGE_HEIGHT) ??
			defaultImageHeight;
		const imageHeight = !Number.isNaN(imageHeightRaw)
			? imageHeightRaw
			: defaultImageHeight;
		const compressionQualityRaw = this.parser.getInt(
			this.IMAGE_HEADER,
			this.FETCH_COMPRESSION_QUALITY
		);
		const compressionQuality =
			compressionQualityRaw ?? this.FETCH_COMPRESSION_QUALITY_VALUE;
		const imageFormat =
			this.parser.get(this.IMAGE_HEADER, this.IMAGE_FORMAT) ?? "jpg";

		// General premise is to ratio if possible, else use absolutes, else use defaults

		// Rect left
		const rectLeftRatioRaw = this.parser.getFloat(
			this.IMAGE_HEADER,
			this.RECT_LEFT_RATIO
		);
		const rectLeftRatio = !Number.isNaN(rectLeftRatioRaw)
			? rectLeftRatioRaw
			: undefined;
		const rectLeftRaw =
			this.parser.getInt(this.IMAGE_HEADER, this.RECT_LEFT) ?? Number.NaN;
		const rectLeft = rectLeftRatio
			? imageWidth * rectLeftRatio
			: !Number.isNaN(rectLeftRaw)
			? rectLeftRaw
			: imageWidth * defaultRectLeftRatio;

		// Rect top
		const rectTopRatioRaw = this.parser.getFloat(
			this.IMAGE_HEADER,
			this.RECT_TOP_RATIO
		);
		const rectTopRatio = !Number.isNaN(rectTopRatioRaw)
			? rectTopRatioRaw
			: undefined;
		const rectTopRaw =
			this.parser.getInt(this.IMAGE_HEADER, this.RECT_TOP) ?? Number.NaN;
		const rectTop = rectTopRatio
			? imageHeight * rectTopRatio
			: !Number.isNaN(rectTopRaw)
			? rectTopRaw
			: imageHeight * defaultRectTopRatio;

		// Rect width
		const rectWidthRatioRaw = this.parser.getFloat(
			this.IMAGE_HEADER,
			this.RECT_WIDTH_RATIO
		);
		const rectWidthRatio = !Number.isNaN(rectWidthRatioRaw)
			? rectWidthRatioRaw
			: undefined;
		const rectWidthRaw =
			this.parser.getInt(this.IMAGE_HEADER, this.RECT_WIDTH) ??
			Number.NaN;
		const rectWidth = rectWidthRatio
			? imageWidth * rectWidthRatio
			: !Number.isNaN(rectWidthRaw)
			? rectWidthRaw
			: imageWidth * defaultRectWidthRatio;

		// Rect height
		const rectHeightRatioRaw = this.parser.getFloat(
			this.IMAGE_HEADER,
			this.RECT_HEIGHT_RATIO
		);
		const rectHeightRatio = !Number.isNaN(rectHeightRatioRaw)
			? rectHeightRatioRaw
			: undefined;
		const rectHeightRaw =
			this.parser.getInt(this.IMAGE_HEADER, this.RECT_HEIGHT) ??
			Number.NaN;
		const rectHeight = rectHeightRatio
			? imageHeight * rectHeightRatio
			: !Number.isNaN(rectHeightRaw)
			? rectHeightRaw
			: imageHeight * defaultRectHeightRatio;

		return {
			imageWidth,
			imageHeight,
			imageFormat,
			compressionQuality,
			rectLeft,
			rectTop,
			rectWidth,
			rectHeight,
		};
	}
}
