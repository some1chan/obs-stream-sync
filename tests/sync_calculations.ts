import test from "ava";
import { calculateDelay } from "../src/sync";
import type {
	SourceData,
	TimestampMillisecondData,
} from "../src/global_types";

test("Calculate delay", t => {
	const avDataList: SourceData[] = [
		{
			name: "Static 1",
			audioDelay: 2295,
			videoDelay: 2295,
			videoFilterName: "Video Delay (Async)",
			active: true,
			screenshotDelay: 13.1795,
		},
		{
			name: "Static 2",
			audioDelay: 0,
			videoDelay: 0,
			videoFilterName: "Video Delay (Async)",
			active: true,
			screenshotDelay: 26.5721,
		},
		{
			name: "Static 3",
			audioDelay: 757,
			videoDelay: 757,
			videoFilterName: "Video Delay (Async)",
			active: true,
			screenshotDelay: 40.9752,
		},
	];
	const timestampMsList: TimestampMillisecondData[] = [
		{
			name: "Static 1",
			ms: 1_684_006_697_435.87,
		},
		{
			name: "Static 2",
			ms: 1_684_006_697_388.87,
		},
		{
			name: "Static 3",
			ms: 1_684_006_696_971.87,
		},
	];

	const resultTimestampMsList = calculateDelay(avDataList, [
		...timestampMsList,
	]);
	t.deepEqual(resultTimestampMsList, [
		{
			name: "Static 1",
			ms: 1_684_006_697_422.6907,
			visualOffsetMs: 491.795654296875,
			offsetMs: 2_355.392578125,
			screenshotDelayMs: 13.1795,
		},
		{
			name: "Static 2",
			ms: 1_684_006_697_362.298,
			visualOffsetMs: 431.403076171875,
			offsetMs: 0,
			screenshotDelayMs: 26.5721,
		},
		{
			name: "Static 3",
			ms: 1_684_006_696_930.895,
			visualOffsetMs: 0,
			offsetMs: 325.596923828125,
			screenshotDelayMs: 40.9752,
		},
	]);
});
