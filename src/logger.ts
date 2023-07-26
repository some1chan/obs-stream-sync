import { SourceData } from "./global_types";
import c from "ansi-colors";
import util from "util";

let enableDebug = true;

export function changeDebugLogging(enable: boolean) {
	enableDebug = enable;
}

let enableTime = true;

export function changeTimeLogging(enable: boolean) {
	enableTime = enable;
}

export function getIndicator(avData: SourceData) {
	return avData.active ? c.green("[ACTIVE]") : c.grey("[HIDDEN]");
}

export function debug(message?: any, ...optionalParams: any[]) {
	if (!enableDebug) return;

	const textBuffer = c.blue("debug");
	if (optionalParams != undefined && optionalParams.length > 0) {
		process.stderr.write(`${textBuffer} `);
		console.log(message, ...optionalParams);
	} else {
		_logToConsole({
			message,
			logMethod: console.log,
			tagColor: c.blue,
			tagName: "debug",
			textColor: c.grey,
		});
	}
}

export function warn(message?: any, ...optionalParams: any[]) {
	const textBuffer = c.yellow("warn");
	if (optionalParams != undefined) {
		process.stderr.write(`${textBuffer} `);
		console.error(message, ...optionalParams);
	} else console.warn(`${textBuffer} ${c.yellow(message)}`);
}

export function error(message?: any, ...optionalParams: any[]) {
	const textBuffer = c.red("error");
	if (optionalParams != undefined) {
		process.stderr.write(`${textBuffer} `);
		console.error(message, ...optionalParams);
	} else console.error(`${textBuffer} ${c.red(message)}`);
}

function _logToConsole(options: {
	message?: any;
	logMethod: (message?: any) => void;
	tagName: string;
	tagColor: c.StyleFunction;
	textColor?: c.StyleFunction;
}) {
	const prefixBuffer = options.tagColor(options.tagName);
	const mainBuffer =
		typeof options.message == "string"
			? options.message
			: util.inspect(options.message);
	options.logMethod(
		`${prefixBuffer} ${
			options.textColor ? options.textColor(mainBuffer) : mainBuffer
		}`
	);
}

export function time(label: string | undefined) {
	if (enableTime) console.time(label);
}

export function timeEnd(label: string | undefined) {
	if (enableTime) console.timeEnd(label);
}

/**
 * Convert a number to a human-readable millisecond value.
 * @param number ms
 * @returns Human-readable ms value
 */
export function ms(number?: number) {
	if (number == undefined) number = Number.NaN;
	return `${number.toLocaleString(undefined, {
		maximumFractionDigits: 0,
	})}ms`;
}

/**
 * Convert a number to a human-readable millisecond value,
 * and colors it according to how much video delay is being added.
 * @param number ms
 * @returns Human-readable ms value, with color if high enough
 */
export function colorDelayMs(number?: number, maxMsg = "WILL NOT SYNC") {
	if (number == undefined) number = Number.NaN;
	const offsetMs = ms(number);
	return number > 20_000 || number < 0
		? c.bgRed(`${offsetMs}${maxMsg.length == 0 ? "" : ` ${maxMsg}`}`)
		: number > 15_000
		? c.red(offsetMs)
		: number > 8_000
		? c.yellow(offsetMs)
		: offsetMs;
}

/**
 * Prettifies a millisecond value.
 * @param ms Milliseconds
 * @returns Formatted timestamp string
 */
export function millisecondsToTimestamp(ms: number) {
	const milliseconds = Math.floor(ms % 1000);
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / 1000 / 60) % 60);
	const hours = Math.floor((ms / 1000 / 3600) % 24);

	return (
		`${hours.toString().padStart(2, "0")}:` +
		`${minutes.toString().padStart(2, "0")}:` +
		`${seconds.toString().padStart(2, "0")}.` +
		`${milliseconds.toString().padEnd(3, "0")}`
	);
}
