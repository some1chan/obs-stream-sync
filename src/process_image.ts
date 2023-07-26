import Jimp from "jimp";
import { Config } from "./Config";
import * as Logger from "./logger";

export async function processImage(
	imageData: string,
	config: Config,
	noProcessing = false
) {
	if (!imageData) throw new ReferenceError("No timestampMs.imageData found!");
	if (false) {
		try {
			const Logger = await import("./logger");
			Logger.debug("Debug pulling image data to clipboard...");
			const child_process = await import("child_process");
			child_process.spawn("clip").stdin.end(imageData);
		} catch (error) {
			console.error(error);
		}
	}

	const { imageFormat, rectLeft, rectTop, rectWidth, rectHeight } =
		config.getImageConfigData();

	const buffer = Buffer.from(
		imageData.replace(`data:image/${imageFormat};base64,`, ""),
		"base64"
	);

	const result = await Jimp.read(buffer);
	result.quality(100);

	let canScale = true;
	if (result.getWidth() <= 1) {
		Logger.error(
			`Screenshot width is less than or equal to 1, QR reading will definitely fail.`
		);
		canScale = false;
	}
	if (result.getHeight() <= 1) {
		Logger.error(
			`Screenshot height is less than or equal to 1, QR reading will definitely fail.`
		);
		canScale = false;
	}
	if (!noProcessing) {
		result.crop(rectLeft, rectTop, rectWidth, rectHeight);
	}

	if (canScale) {
		// https://github.com/cozmo/jsQR/issues/177
		const minWidthHeight = 32;
		const widthMultiplier = Math.ceil(minWidthHeight / result.getWidth());
		const heightMultiplier = Math.ceil(minWidthHeight / result.getHeight());
		if (widthMultiplier != 0 && heightMultiplier != 0)
			result.resize(
				result.getWidth() * widthMultiplier,
				result.getHeight() * heightMultiplier,
				Jimp.RESIZE_NEAREST_NEIGHBOR
			);
	}

	return result;
}
