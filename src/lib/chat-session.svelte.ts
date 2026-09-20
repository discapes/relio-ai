import { streamLines, type ChatEvent } from './chat-stream';
import type { Answer } from './types';

export const chatSessionKey = Symbol('chat-session');
export interface ChatScope {
	workspaceId: string;
	epoch: number;
	personaId: string;
	level: number;
}

/** One instance belongs to the browser layout and survives child-page navigation. */
export function createChatSession(refresh: () => Promise<void>) {
	const state = $state({
		question: '',
		running: false,
		draft: '',
		error: '',
		stage: '',
		activities: [] as string[],
		elapsed: 0,
		answer: null as Answer | null,
		unread: false,
		meetingId: ''
	});
	let scope: ChatScope | undefined;
	let request: AbortController | undefined;
	let timer: ReturnType<typeof setInterval> | undefined;
	let version = 0;
	const same = (a: ChatScope, b: ChatScope) =>
		a.workspaceId === b.workspaceId &&
		a.epoch === b.epoch &&
		a.personaId === b.personaId &&
		a.level === b.level;
	function stop(clear = false) {
		version++;
		request?.abort();
		clearInterval(timer);
		state.running = false;
		state.draft = '';
		state.stage = '';
		state.activities = [];
		state.unread = !clear;
		state.error = clear ? '' : 'Request stopped. You can edit the question or try again.';
	}
	function setScope(next: ChatScope | undefined) {
		if (scope && (!next || !same(scope, next))) {
			stop(true);
			state.question = '';
			state.meetingId = '';
			state.answer = null;
		}
		scope = next;
	}
	async function ask() {
		if (state.running || !state.question.trim() || !scope) return;
		const token = ++version;
		const controller = new AbortController();
		request = controller;
		const initial = { ...scope };
		const current = () =>
			token === version && !controller.signal.aborted && !!scope && same(scope, initial);
		const readScope = async (): Promise<ChatScope> => {
			const response = await fetch('/state', { signal: controller.signal, cache: 'no-store' });
			if (!response.ok)
				throw new Error('Your current project view could not be checked. Please retry.');
			return response.json();
		};
		state.running = true;
		state.draft = '';
		state.error = '';
		state.unread = false;
		state.stage = 'Connecting to your project assistant…';
		state.activities = [];
		state.elapsed = 0;
		const started = Date.now();
		let checking = false;
		timer = setInterval(async () => {
			state.elapsed = Math.floor((Date.now() - started) / 1000);
			if (checking || !current()) return;
			checking = true;
			try {
				const latest = await readScope();
				if (!current()) return;
				if (!same(initial, latest)) {
					setScope(latest);
					await refresh();
				}
			} catch {
				if (current()) stop();
			} finally {
				checking = false;
			}
		}, 1000);
		const activeTimer = timer;
		try {
			const response = await fetch('/chat/stream', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					question: state.question,
					context: initial,
					...(state.meetingId ? { meetingId: state.meetingId } : {})
				}),
				signal: controller.signal
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message || 'The request could not start. Please retry.');
			}
			if (!response.body) throw new Error('The response stream was unavailable. Please retry.');
			let complete = false;
			for await (const line of streamLines(response.body)) {
				if (!current()) break;
				if (!line.trim()) continue;
				const item: ChatEvent = JSON.parse(line);
				if (item.type === 'stage') {
					state.stage = item.message;
					state.activities = [...state.activities, item.message].slice(-8);
				} else if (item.type === 'draft') state.draft = item.text;
				else if (item.type === 'error') throw new Error(item.message);
				else if (item.type === 'final') {
					const latest = await readScope();
					if (!current()) break;
					if (!same(initial, latest)) {
						setScope(latest);
						await refresh();
						break;
					}
					complete = true;
					state.draft = '';
					state.answer = item.answer;
					state.unread = true;
					await refresh();
					break;
				}
			}
			if (!complete && current())
				throw new Error('The connection ended before the answer was checked. Please retry.');
		} catch (caught) {
			if (current()) {
				state.draft = '';
				state.unread = true;
				state.error =
					caught instanceof Error
						? caught.message
						: 'The answer could not be completed. Please retry.';
			}
		} finally {
			clearInterval(activeTimer);
			if (token === version) state.running = false;
		}
	}
	return { state, setScope, ask, stop };
}
export type ChatSession = ReturnType<typeof createChatSession>;
