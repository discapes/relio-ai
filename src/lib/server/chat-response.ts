import type { Context } from '../types';
import type { ChatEvent } from '../chat-stream';
import { epoch, isSuppressed } from './memory';
import { answerQuestion, generateBrief } from './workflows';
import { registerChat, withChatActivity } from './chat-activity';

export function chatResponse(
	ctx: Context,
	question: string,
	requestSignal: AbortSignal,
	meetingId?: string
) {
	const abort = new AbortController();
	const unregister = registerChat(ctx.workspaceId, abort);
	const disconnect = () => abort.abort();
	requestSignal.addEventListener('abort', disconnect, { once: true });
	if (requestSignal.aborted) abort.abort();
	let closed = false;
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			const check = () => {
				abort.signal.throwIfAborted();
				if (epoch(ctx.workspaceId) !== ctx.epoch)
					throw new Error('Project access changed. Reload before continuing.');
			};
			const emit = (event: ChatEvent) => {
				check();
				if (event.type === 'draft' && ctx.epoch > 0) {
					if (isSuppressed(ctx.workspaceId, event.text))
						throw new Error(
							'The draft referred to erased information and was withdrawn. Please retry using surviving project evidence.'
						);
					// Hold trailing words so a split multiword identity is checked before display.
					event = { ...event, text: event.text.replace(/(?:\S+\s*){1,5}$/, '') };
				}
				if (!closed) controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
			};
			const timer = setInterval(() => {
				if (epoch(ctx.workspaceId) !== ctx.epoch) abort.abort();
			}, 300);
			void withChatActivity({ signal: abort.signal, emit }, async () => {
				emit({
					type: 'stage',
					stage: 'starting',
					message: meetingId
						? 'Checking your project access and preparing the meeting.'
						: 'Checking your project access and preparing the question.'
				});
				const answer = meetingId
					? await generateBrief(ctx, meetingId)
					: await answerQuestion(ctx, question);
				emit({ type: 'final', answer });
			})
				.catch((error) => {
					if (!closed && !requestSignal.aborted) {
						controller.enqueue(
							encoder.encode(
								JSON.stringify({
									type: 'error',
									message: abort.signal.aborted
										? 'The request stopped because your session or project access changed. Please try again in the current view.'
										: error instanceof Error
											? error.message
											: 'The answer could not be completed. Please retry.'
								} satisfies ChatEvent) + '\n'
							)
						);
					}
				})
				.finally(() => {
					clearInterval(timer);
					unregister();
					requestSignal.removeEventListener('abort', disconnect);
					if (!closed) {
						closed = true;
						controller.close();
					}
				});
		},
		cancel() {
			closed = true;
			abort.abort();
		}
	});
	return new Response(stream, {
		headers: {
			'content-type': 'application/x-ndjson; charset=utf-8',
			'cache-control': 'private, no-store, no-transform',
			'x-accel-buffering': 'no',
			'x-content-type-options': 'nosniff'
		}
	});
}
