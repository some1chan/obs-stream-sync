import { oneLine } from "common-tags";
import type { SourceData, TimestampMillisecondData } from "./global_types";
import * as Logger from "./logger";

/**
 * Takes screenshots, recognizes the text, and mutates timestamp data.
 * This function changes the following in timestampMsList:
 * - Sets screenshotDelayMs
 * - Mutates ms, subtracting screenshotDelayMs from it
 * - Sets visualOffsetMs
 * - Sets offsetMs
 * @param sourceList Audio Video Data
 * @param timestampMsList
 * @param options
 * @returns Timestamp data
 */
export function calculateDelay(
	sourceList: SourceData[],
	timestampMsList: TimestampMillisecondData[],
	options?: {
		logging?: boolean;
		sourceToSyncTo?: SourceData;
		roundToFramerate?: { framerate: number };
	}
) {
	// Applies screenshotDelayMs from audio/video data, into timestamp data
	// and applies screenshot data
	for (const timestamp of timestampMsList) {
		const sourceData = sourceList.find(s => s.name == timestamp.name);
		timestamp.screenshotDelayMs = sourceData?.screenshotDelay;
	}

	// Filters out any streams that doesn't contain a timestamp,
	// and would screw with the calculation
	const validTimestamps = timestampMsList.filter(t => t.ms > 0);
	const validSourceData = sourceList.filter(a =>
		validTimestamps.some(t => t.name == a.name)
	);

	// Apply screenshot delay
	for (const timestamp of validTimestamps) {
		timestamp.ms -= timestamp.screenshotDelayMs ?? 0;
	}

	// Get the most behind timestamp for delay applying calculations
	const mostBehindTimestamp = validTimestamps.sort((a, b) => {
		return a.ms - b.ms;
	})[0];

	if (options?.logging)
		Logger.debug(
			oneLine`mostBehindTimestamp:
			${mostBehindTimestamp.name} - ${mostBehindTimestamp.ms}`
		);

	// Calculate visual offset number
	for (const timestamp of validTimestamps) {
		timestamp.visualOffsetMs = timestamp.ms - mostBehindTimestamp.ms;
	}

	// Find the audio-video data, with the least amount of delay added
	const leastAddedDelay: SourceData | undefined = validSourceData.sort(
		(a, b) => a.audioDelay - b.audioDelay
	)[0];
	if (options?.logging)
		Logger.debug(
			oneLine`leastAddedDelay:
			${leastAddedDelay.name} - ${Logger.ms(leastAddedDelay.audioDelay)}`
		);

	// Set offset ms #1
	for (const timestamp of validTimestamps) {
		const audioVideoData = sourceList.find(a => a.name == timestamp.name);
		timestamp.offsetMs =
			// shouldn't be undefined, but just in case
			(timestamp.visualOffsetMs ?? 0) +
			(audioVideoData?.videoDelay ?? 0) -
			leastAddedDelay.audioDelay;
	}

	// Set final delays using the timestamp
	// correlated to the AV data passed in options...
	const timestampToSyncTo =
		(options?.sourceToSyncTo
			? validTimestamps.find(t => t.name == options.sourceToSyncTo?.name)
			: undefined) ??
		// ...or will find what will use the least amount of delay,
		// by finding the timestamp with the least offset.
		validTimestamps.sort((a, b) => {
			if (a.offsetMs == undefined || b.offsetMs == undefined) {
				return Number.POSITIVE_INFINITY;
			}
			return a.offsetMs - b.offsetMs;
		})[0];

	// Clone the object, so it can't be changed by
	// mutating offsetMs in the final offset ms pass.
	const timestampToSyncToClone: TimestampMillisecondData = JSON.parse(
		JSON.stringify(timestampToSyncTo)
	);
	if (options?.logging)
		Logger.debug(
			oneLine`leastFinalDelay:
			${timestampToSyncTo.name} - ${Logger.ms(timestampToSyncTo.offsetMs)}`
		);

	// Set offset ms #2
	for (const timestamp of validTimestamps) {
		const isValid = validTimestamps.some(a => a.name == timestamp.name);
		if (!isValid) continue;
		timestamp.offsetMs =
			// iterator.offsetMs shouldn't be undefined either
			(timestamp.offsetMs ?? 0) - (timestampToSyncToClone.offsetMs ?? 0);
	}

	// Apply rounding
	if (options?.roundToFramerate) {
		for (const timestamp of validTimestamps) {
			timestamp.offsetMs = _roundToFramerate(
				timestamp.offsetMs ?? 0,
				options.roundToFramerate.framerate
			);
		}
	}

	return timestampMsList;
}

function _roundToFramerate(ms: number, framerate: number): number {
	// Calculates the duration of one frame in ms
	// ex. 1000 ms / 60 fps = 16.67 ms per frame
	const frameTimeMs = 1000 / framerate;

	// Round the value to the nearest multiple of frameTimeMs
	// ex. 30 / 16.67 = 1.8
	//     Math.round(1.8) = 2
	//	   2 * 16.67 = 33.33
	const roundedValue = Math.round(ms / frameTimeMs) * frameTimeMs;

	// Check if rounding this result number could be more simplified:
	// ex. ms = 1000, but roundedValue = 1000.0000000000001 due to
	//     floating point imprecision
	if (Math.round(roundedValue) == ms) {
		return ms;
	}
	return roundedValue;
}
