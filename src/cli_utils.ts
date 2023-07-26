// @ts-ignore Enquirer has bad typings, Inquirer has bugs. Not much good choices.
import { Input, Form, Select, Confirm, Password, NumberPrompt } from "enquirer";
// @ts-ignore Prettier doesn't make it easy to make @ts-ignore sane, either.
import { AutoComplete, MultiSelect, Toggle } from "enquirer";
import c from "ansi-colors";

export async function inputPrompt(options: {
	name?: string;
	message: string;
	initial?: string;
}): Promise<string> {
	const prompt = new Input(options);
	return prompt.run();
}

export async function formPrompt(options: {
	name?: string;
	message: string;
	choices: { name: string; message: string; initial?: string }[];
}) {
	const prompt = new Form(options);
	return prompt.run();
}

export async function selectPrompt(options: {
	name?: string;
	message: string;
	choices: string[];
}) {
	const prompt = new Select(options);
	return prompt.run();
}

export async function multiSelectPrompt(options: {
	name?: string;
	message: string;
	limit?: number;
	choices: string[];
}) {
	const prompt = new MultiSelect(options);
	return prompt.run();
}

export async function confirmPrompt(options: {
	name?: string;
	message: string;
	initial?: boolean;
}) {
	const prompt = new Confirm(options);
	return prompt.run();
}

export async function passwordPrompt(options: {
	name?: string;
	message: string;
}): Promise<string> {
	const prompt = new Password(options);
	return prompt.run();
}

export async function numberPrompt(options: {
	name?: string;
	message: string;
	initial?: number;
}) {
	const prompt = new NumberPrompt(options);
	return prompt.run();
}

export async function mathPrompt(options: {
	name?: string;
	message: string;
	initial?: number;
}) {
	const prompt = new Input(options);
	const str: string = await prompt.run();
	const num = Number(str);

	if (Number.isNaN(num)) {
		console.log(c.grey("Loading mathjs for parsing, please wait..."));
		const { evaluate } = await import("mathjs");
		const result = evaluate(str);
		if (typeof result == "number") return result;
		throw new TypeError(`Result is typeof ${typeof result}`);
	}

	return num;
}

export async function autoCompletePrompt(options: {
	name?: string;
	message: string;
	limit?: number;
	initial?: number;
	choices: string[];
}): Promise<string> {
	const prompt = new AutoComplete(options);
	return prompt.run();
}

export async function togglePrompt(options: {
	message: string;
	enabled: string;
	disabled: string;
}): Promise<boolean> {
	const prompt = new Toggle(options);
	return prompt.run();
}
