import type { Answer } from './types';

export type ChatEvent =
	| { type: 'stage'; stage: string; message: string }
	| { type: 'draft'; text: string }
	| { type: 'final'; answer: Answer }
	| { type: 'error'; message: string };

/** Decode complete lines while preserving UTF-8 characters split across network chunks. */
export async function* streamLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let pending = '';
	try {
		while (true) {
			const { value, done } = await reader.read();
			pending += decoder.decode(value, { stream: !done });
			let newline: number;
			while ((newline = pending.indexOf('\n')) >= 0) {
				yield pending.slice(0, newline).replace(/\r$/, '');
				pending = pending.slice(newline + 1);
			}
			if (done) break;
		}
		if (pending) yield pending;
	} finally {
		await reader.cancel().catch(() => {});
		reader.releaseLock();
	}
}

/** Read the available prefix of a top-level JSON string without exposing its surrounding schema. */
export function partialTextField(json: string): string {
	let depth = 0;
	for (let i = 0; i < json.length; i++) {
		if (json[i] === '{' || json[i] === '[') depth++;
		else if (json[i] === '}' || json[i] === ']') depth--;
		else if (json[i] === '"') {
			let end = i + 1;
			for (; end < json.length; end++) {
				if (json[end] === '\\') end++;
				else if (json[end] === '"') break;
			}
			if (end >= json.length) return '';
			if (depth === 1 && json.slice(i, end + 1) === '"text"') {
				const rest = json.slice(end + 1);
				const start = /^\s*:\s*"/.exec(rest);
				if (start) return decodeStringPrefix(rest.slice(start[0].length));
			}
			i = end;
		}
	}
	return '';
}
function decodeStringPrefix(input: string): string {
	let text = '';
	for (let i = 0; i < input.length; i++) {
		const char = input[i];
		if (char === '"') break;
		if (char !== '\\') {
			text += char;
			continue;
		}
		const escaped = input[++i];
		if (!escaped) break;
		if (escaped === 'u') {
			const hex = input.slice(i + 1, i + 5);
			if (!/^[\da-fA-F]{4}$/.test(hex)) break;
			text += String.fromCharCode(parseInt(hex, 16));
			i += 4;
		} else {
			const escapes: Record<string, string> = {
				'"': '"',
				'\\': '\\',
				'/': '/',
				b: '\b',
				f: '\f',
				n: '\n',
				r: '\r',
				t: '\t'
			};
			if (!(escaped in escapes)) break;
			text += escapes[escaped];
		}
	}
	return /[\uD800-\uDBFF]$/.test(text) ? text.slice(0, -1) : text;
}
