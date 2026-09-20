<script lang="ts">
	import { beforeNavigate, invalidateAll } from '$app/navigation';
	import { onDestroy, tick } from 'svelte';
	import { ArrowUp, ArrowUpRight, ShieldCheck } from '@lucide/svelte';
	import { streamLines, type ChatEvent } from '$lib/chat-stream';
	import type { Answer, Context, Person } from '$lib/types';
	let {
		context,
		people: _people = [],
		onanswer,
		onbusy,
		disabled = false
	}: {
		context: Context;
		people?: Person[];
		onanswer: (answer: Answer) => void;
		onbusy?: (busy: boolean) => void;
		disabled?: boolean;
	} = $props();
	let question = $state('');
	let running = $state(false);
	let draft = $state('');
	let error = $state('');
	let stage = $state('');
	let activities = $state<string[]>([]);
	let elapsed = $state(0);
	let request: AbortController | undefined;
	let progressElement = $state<HTMLElement | undefined>();
	let version = 0;
	let activeContext = '';
	let observedContext = '';
	const snapshot = () => ({
		workspaceId: context.workspaceId,
		epoch: context.epoch,
		personaId: context.persona.id,
		level: context.level
	});
	const key = () => JSON.stringify(snapshot());
	function stop(clear = false) {
		version++;
		request?.abort();
		running = false;
		draft = '';
		stage = '';
		activities = [];
		error = clear ? '' : 'Request stopped. You can edit the question or try again.';
		onbusy?.(false);
	}
	beforeNavigate(() => {
		if (running) stop(true);
	});
	onDestroy(() => {
		request?.abort();
	});
	$effect(() => {
		const current = key();
		if (observedContext && observedContext !== current) {
			question = '';
			stop(true);
		}
		observedContext = current;
	});
	async function ask(event?: SubmitEvent) {
		event?.preventDefault();
		if (running || disabled || !question.trim()) return;
		const token = ++version;
		const controller = new AbortController();
		request = controller;
		const initial = snapshot();
		activeContext = JSON.stringify(initial);
		running = true;
		draft = '';
		error = '';
		stage = 'Connecting to your project assistant…';
		activities = [];
		elapsed = 0;
		onbusy?.(true);
		await tick();
		progressElement?.scrollIntoView({
			block: 'nearest',
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		});
		const started = Date.now();
		let checking = false;
		const timer = setInterval(async () => {
			elapsed = Math.floor((Date.now() - started) / 1000);
			if (checking || token !== version) return;
			checking = true;
			try {
				const state = await fetch('/state', { signal: controller.signal, cache: 'no-store' }).then(
					(r) => {
						if (!r.ok) throw new Error();
						return r.json();
					}
				);
				if (token !== version) return;
				if (Object.entries(initial).some(([name, value]) => state[name] !== value)) {
					stop(true);
					await invalidateAll();
				}
			} catch {
				if (token === version && !controller.signal.aborted) stop(true);
			} finally {
				checking = false;
			}
		}, 1000);
		try {
			const response = await fetch('/chat/stream', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ question, context: initial }),
				signal: controller.signal
			});
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				throw new Error(body.message || 'The request could not start. Please retry.');
			}
			if (!response.body) throw new Error('The response stream was unavailable. Please retry.');
			let complete = false;
			for await (const line of streamLines(response.body)) {
				if (token !== version || controller.signal.aborted || key() !== activeContext) break;
				if (!line.trim()) continue;
				const item: ChatEvent = JSON.parse(line);
				if (item.type === 'stage') {
					stage = item.message;
					activities = [...activities, item.message].slice(-8);
				} else if (item.type === 'draft') draft = item.text;
				else if (item.type === 'error') throw new Error(item.message);
				else if (item.type === 'final') {
					const state = await fetch('/state', {
						signal: controller.signal,
						cache: 'no-store'
					}).then((r) => r.json());
					if (token !== version) break;
					if (Object.entries(initial).some(([name, value]) => state[name] !== value)) {
						stop(true);
						break;
					}
					complete = true;
					draft = '';
					onanswer(item.answer);
					await invalidateAll();
					break;
				}
			}
			if (!complete && token === version && !controller.signal.aborted)
				throw new Error('The connection ended before the answer was checked. Please retry.');
		} catch (caught) {
			if (token === version && !controller.signal.aborted) {
				draft = '';
				error =
					caught instanceof Error
						? caught.message
						: 'The answer could not be completed. Please retry.';
			}
		} finally {
			clearInterval(timer);
			if (token === version) {
				running = false;
				onbusy?.(false);
			}
		}
	}
</script>

<div class="suggestions">
	{#each ['What exactly did Acme approve in the UAT sign-off?', 'When is the bakery evidence review?', 'What decisions are needed from Acme?'] as suggestion}
		<button type="button" disabled={running || disabled} onclick={() => (question = suggestion)}
			>{suggestion}<ArrowUpRight size={14} /></button
		>
	{/each}
</div>
<form class="ask-form" onsubmit={ask}>
	<label class="sr-only" for="question">Question about Acme</label>
	<textarea
		id="question"
		name="question"
		bind:value={question}
		required
		maxlength="8000"
		rows="3"
		disabled={running}
		placeholder="Ask about Acme, or tell me what you want to follow…"></textarea>
	<div>
		<small><ShieldCheck size={14} />L{context.level} evidence · Your personal memory</small>
		<button class="button" disabled={running || disabled} aria-label="Ask project question"
			><ArrowUp size={18} />Ask</button
		>
	</div>
</form>
{#if running}
	<section class="chat-progress" aria-label="Answer progress" bind:this={progressElement}>
		<div class="progress-heading">
			<span class="activity-spinner" aria-hidden="true"></span><strong
				>Working on your question</strong
			><span class="elapsed">{elapsed}s</span><button
				type="button"
				class="text-button"
				onclick={() => stop()}>Stop</button
			>
		</div>
		<p class="stage" role="status" aria-live="polite">{stage}</p>
		{#if activities.length > 1}<details>
				<summary>Activity · {activities.length} updates</summary>
				<ol>
					{#each activities as activity}<li>{activity}</li>{/each}
				</ol>
			</details>{/if}
	</section>
{/if}
{#if draft && running}
	<section class="stream-draft" aria-label="Provisional answer">
		<strong>Draft · source checks pending</strong>
		<p class="draft-note">This text may change while its supporting sources are checked.</p>
		<div class="draft-text">{draft.replace(/\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')}</div>
	</section>
{/if}
{#if error}<div class="chat-error" role="alert">
		<p>{error}</p>
		<button
			type="button"
			class="button secondary"
			disabled={running || disabled}
			onclick={() => ask()}>Try again</button
		>
	</div>{/if}

<style>
	.chat-progress,
	.stream-draft,
	.chat-error {
		margin-top: 18px;
		padding: 16px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-subtle);
		font-size: 15px;
	}
	.progress-heading {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}
	.elapsed {
		margin-left: auto;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.activity-spinner {
		width: 17px;
		height: 17px;
		border: 2px solid var(--border);
		border-top-color: var(--text);
		border-radius: 50%;
		animation: activity 0.8s linear infinite;
	}
	.stage {
		margin: 12px 0 0;
		line-height: 1.55;
	}
	details {
		margin-top: 12px;
	}
	summary {
		cursor: pointer;
		color: var(--text);
	}
	ol {
		padding-left: 22px;
		line-height: 1.6;
	}
	.draft-note {
		color: var(--muted);
		line-height: 1.5;
		margin: 8px 0 16px;
	}
	.draft-text {
		white-space: pre-wrap;
		line-height: 1.8;
		overflow-wrap: anywhere;
	}
	.chat-error p {
		margin: 0 0 12px;
	}
	@keyframes activity {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.activity-spinner {
			animation: none;
		}
	}
</style>
