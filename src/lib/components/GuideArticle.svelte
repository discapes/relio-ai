<script lang="ts">
	import type { ReviewerDocument } from '$lib/types';
	let { document }: { document: ReviewerDocument } = $props();
	const blocks = $derived(document.text.trim().split(/\n\s*\n/).filter((block) => !/^# /.test(block)));
	const headingId = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	const headings = $derived(blocks.filter((block) => /^## /.test(block)).map((block) => block.slice(3)));
	function inline(text: string) {
		const pattern = /(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|(?:emails|transcripts|reports)\/[a-zA-Z0-9_-]+#(?:message|utterance|update)-[0-9]+)/g;
		return text.split(pattern).filter(Boolean).map((part) => {
			const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
			if (link) return { text: link[1], href: /^\/source\/[A-Za-z0-9%_.~-]+$/.test(link[2]) ? link[2] : '', strong: false };
			const clean = part.replace(/^`|`$/g, '').replace(/^\*\*|\*\*$/g, '');
			return { text: clean, href: /^(?:emails|transcripts|reports)\/[a-zA-Z0-9_-]+#(?:message|utterance|update)-[0-9]+$/.test(clean) ? `/source/${encodeURIComponent(clean)}` : '', strong: part.startsWith('**') };
		});
	}
	const rows = (block: string) => block.split('\n').filter((line) => !/^\|[\s:|-]+\|$/.test(line)).map((row) => row.split('|').slice(1, -1).map((cell) => cell.trim()));
</script>

{#snippet prose(text: string)}
	{#each inline(text) as token}{#if token.href}<a href={token.href}>{token.text}</a>{:else if token.strong}<strong>{token.text}</strong>{:else}{token.text}{/if}{/each}
{/snippet}

<article class="guide-article" aria-labelledby="guide-title">
	<h1 id="guide-title">{document.title}</h1>
	{#if document.unavailable}<p class="guide-unavailable" role="status">{document.unavailable}</p>
	{:else}
		{#if document.view === 'practice'}<nav aria-label="Practice questions" class="guide-contents">{#each headings as heading}<a href={`#${headingId(heading)}`}>{heading}</a>{/each}</nav>{/if}
		{#each blocks as block}
			{#if /^## /.test(block)}<h2 id={headingId(block.slice(3))}>{block.slice(3)}</h2>
			{:else if /^### /.test(block)}<h3>{block.slice(4)}</h3>
			{:else if block.startsWith('|')}
				{@const table = rows(block)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need access to horizontally scrollable reference tables.) -->
				<div class="guide-table" tabindex="0" role="region" aria-label="Reference figures and evidence">
					<table><thead><tr>{#each table[0] as cell}<th scope="col">{@render prose(cell)}</th>{/each}</tr></thead><tbody>{#each table.slice(1) as row}<tr>{#each row as cell}<td>{@render prose(cell)}</td>{/each}</tr>{/each}</tbody></table>
				</div>
			{:else if block.startsWith('- ')}<ul>{#each block.split('\n') as line}<li>{@render prose(line.replace(/^- /, ''))}</li>{/each}</ul>
			{:else if block.startsWith('> ')}<blockquote>{@render prose(block.replace(/^> ?/gm, ''))}</blockquote>
			{:else}<p>{@render prose(block)}</p>{/if}
		{/each}
	{/if}
</article>

<style>
	.guide-article { max-width: 800px; padding-bottom: 40px; color: var(--text); font-size: 16px; line-height: 1.75; overflow-wrap: anywhere; }
	h1 { font-size: clamp(30px, 3vw, 40px); line-height: 1.2; margin: 0 0 26px; }
	h2 { margin: 36px 0 12px; font-size: 23px; line-height: 1.35; scroll-margin-top: 28px; }
	h3 { margin: 26px 0 10px; font-size: 19px; }
	p { font-size: inherit; line-height: inherit; margin: 0 0 20px; color: var(--text); }
	a { color: var(--action-hover); text-decoration: underline; text-underline-offset: 3px; }
	li { margin-bottom: 12px; }
	ul { padding-left: 24px; margin: 16px 0 24px; }
	blockquote { margin: 22px 0; border-left: 3px solid var(--border-strong, var(--border)); padding-left: 20px; }
	.guide-contents { display: grid; gap: 8px; margin: 0 0 28px; padding: 0 0 24px; border-bottom: 1px solid var(--border); }
	.guide-contents a { padding: 0; display: block; font-size: 15px; }
	.guide-table { overflow-x: auto; margin: 20px 0 26px; }
	table { width: 100%; min-width: 580px; border-collapse: collapse; font-size: 15px; }
	th, td { padding: 12px; border-bottom: 1px solid var(--border); vertical-align: top; text-align: left; line-height: 1.6; }
	th { background: var(--surface-subtle); font-weight: 650; }
	.guide-unavailable { max-width: 650px; }
	@media print { .guide-article { max-width: none; font-size: 10pt; line-height: 1.35; } h1 { font-size: 20pt; margin-bottom: 12pt; } h2 { font-size: 13pt; margin: 14pt 0 6pt; } p { margin-bottom: 10pt; } }
</style>
