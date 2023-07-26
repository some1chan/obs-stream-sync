export interface SourceData {
	name: string;
	active?: boolean;
	audioDelay: number;
	videoDelay: number;
	screenshotDelay?: number;
	videoFilterName?: string;
}

export interface TimestampData {
	hours: number;
	minutes: number;
	seconds: number;
	milliseconds: number;
}

export interface TimestampMillisecondData {
	name: string;
	ms: number;
	offsetMs?: number;
	visualOffsetMs?: number;
	screenshotDelayMs?: number;
	imageData?: string;
}
