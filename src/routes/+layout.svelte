<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/relio_icon.svg';
	import { setContext, onDestroy } from 'svelte';
	import { page, navigating } from '$app/state';
	import { invalidateAll } from '$app/navigation';
	import { chatSessionKey, createChatSession } from '$lib/chat-session.svelte';
	let { children } = $props();
	const chat = createChatSession(invalidateAll);
	setContext(chatSessionKey, chat);
	const awayFromChat = $derived(
		page.url.pathname !== '/' ||
			!['', 'workspace'].includes(page.url.searchParams.get('view') || '')
	);
	$effect.pre(() => {
		const data = page.data;
		const context = data.context;
		const scope = context
			? {
					workspaceId: context.workspaceId,
					epoch: context.epoch,
					personaId: context.persona.id,
					level: context.level
				}
			: data.workspaceId
				? {
						workspaceId: data.workspaceId,
						epoch: data.epoch,
						personaId: data.personaId,
						level: data.level
					}
				: undefined;
		chat.setScope(scope);
	});
	$effect(() => {
		if (!awayFromChat && !navigating.to && chat.state.unread) chat.state.unread = false;
	});
	onDestroy(() => chat.stop(true));
</script>

<svelte:head><link rel="icon" type="image/svg+xml" href={favicon} /></svelte:head>

{@render children()}
{#if awayFromChat && (chat.state.running || chat.state.unread)}
	<aside class="chat-return" aria-label="Your question">
		<a href="/?view=workspace#conversation"
			>{chat.state.running
				? 'Working on your question'
				: chat.state.error
					? 'Your question needs attention'
					: 'Your answer is ready'}<span aria-hidden="true"> →</span></a
		>
		{#if chat.state.running}<button type="button" class="text-button" onclick={() => chat.stop()}
				>Stop</button
			>{/if}
	</aside>
{/if}

<style>
	.chat-return {
		position: fixed;
		bottom: 20px;
		right: 20px;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 18px;
		max-width: calc(100vw - 40px);
		padding: 12px 16px;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface);
		box-shadow: 0 3px 14px #0002;
		font-size: 15px;
	}
	.chat-return a {
		color: var(--text);
	}
</style>
