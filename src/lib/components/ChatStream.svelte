<script lang="ts">
	import { getContext, tick } from 'svelte';
	import { inferencePaused, inferencePausedMessage } from '$lib/inference';
	import { ArrowUp, ArrowUpRight, ShieldCheck } from '@lucide/svelte';
	import { chatSessionKey, type ChatSession } from '$lib/chat-session.svelte';
	import type { Context } from '$lib/types';
	let { context, disabled = false }: { context: Context; disabled?: boolean } = $props();
	const chat = getContext<ChatSession>(chatSessionKey);
	const progress = chat.state;
	let progressElement = $state<HTMLElement | undefined>();
	async function ask(event?: SubmitEvent) {
		event?.preventDefault();
		if (inferencePaused || disabled) return;
		const pending = chat.ask();
		await tick();
		progressElement?.scrollIntoView({
			block: 'nearest',
			behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
		});
		await pending;
	}
</script>

<div class="suggestions">
	{#each ['What exactly did Acme approve in the UAT sign-off?', 'When is the bakery evidence review?', 'What decisions are needed from Acme?'] as suggestion}
		<button
			type="button"
			disabled={inferencePaused || progress.running || disabled}
			onclick={() => ((progress.question = suggestion), (progress.meetingId = ''))}
			>{suggestion}<ArrowUpRight size={14} /></button
		>
	{/each}
</div>
<form class="ask-form" onsubmit={ask}>
	<label class="sr-only" for="question">Question about Acme</label>
	<textarea
		id="question"
		name="question"
		bind:value={progress.question}
		oninput={() => (progress.meetingId = '')}
		required
		maxlength="8000"
		rows="3"
		disabled={inferencePaused || progress.running || disabled}
		placeholder={inferencePaused
			? inferencePausedMessage
			: 'Ask about Acme, or tell me what you want to follow…'}></textarea>
	<div>
		<small><ShieldCheck size={14} />L{context.level} evidence · Your personal memory</small>
		<button
			class="button"
			disabled={inferencePaused || progress.running || disabled}
			aria-label="Ask project question"><ArrowUp size={18} />Ask</button
		>
	</div>
</form>
{#if progress.running}
	<section class="chat-progress" aria-label="Answer progress" bind:this={progressElement}>
		<div class="progress-heading">
			<span class="activity-spinner" aria-hidden="true"></span><strong
				>Working on your question</strong
			><span class="elapsed">{progress.elapsed}s</span><button
				type="button"
				class="text-button"
				onclick={() => chat.stop()}>Stop</button
			>
		</div>
		<p class="stage" role="status" aria-live="polite">{progress.stage}</p>
		{#if progress.activities.length > 1}<details>
				<summary>Activity · {progress.activities.length} updates</summary>
				<ol>
					{#each progress.activities as activity}<li>{activity}</li>{/each}
				</ol>
			</details>{/if}
	</section>
{/if}
{#if progress.draft && progress.running}
	<section class="stream-draft" aria-label="Provisional answer">
		<strong>Draft · source checks pending</strong>
		<p class="draft-note">This text may change while its supporting sources are checked.</p>
		<div class="draft-text">{progress.draft.replace(/\[\d+(?:\s*[,–-]\s*\d+)*\]/g, '')}</div>
	</section>
{/if}
{#if progress.error}<div class="chat-error" role="alert">
		<p>{progress.error}</p>
		<button
			type="button"
			class="button secondary"
			disabled={inferencePaused || progress.running || disabled}
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
