import { AsyncLocalStorage } from 'node:async_hooks';
import type { ChatEvent } from '../chat-stream';

type Activity = { signal: AbortSignal; emit: (event: ChatEvent) => void };
const activity = new AsyncLocalStorage<Activity>();
const revisions = new Map<string, number>();
export const chatRevision = (workspaceId: string) => revisions.get(workspaceId) || 0;
export const withoutChatActivity = <T>(action: () => T) => activity.exit(action);
const streams = new Map<string, Set<AbortController>>();
export const withChatActivity = <T>(value: Activity, action: () => Promise<T>) =>
	activity.run(value, action);
export const chatActivity = () => activity.getStore();
export function assertChatCurrent() {
	activity.getStore()?.signal.throwIfAborted();
}
export function chatStage(stage: string, message: string) {
	assertChatCurrent();
	activity.getStore()?.emit({ type: 'stage', stage, message });
}
export function registerChat(workspaceId: string, controller: AbortController) {
	const group = streams.get(workspaceId) || new Set<AbortController>();
	group.add(controller);
	streams.set(workspaceId, group);
	return () => {
		group.delete(controller);
		if (!group.size) streams.delete(workspaceId);
	};
}
export function cancelChatStreams(workspaceId: string) {
	revisions.set(workspaceId, chatRevision(workspaceId) + 1);
	for (const controller of streams.get(workspaceId) || []) controller.abort();
}
