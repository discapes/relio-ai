<script lang="ts">
	import type { Answer } from '$lib/types';
	let { answer, compact = false }: { answer: Answer; compact?: boolean } = $props();
	let copied = $state(false);
	let exporting = $state(false);
	let exportError = $state('');
	let expanded = $state(false);
	const briefParts = $derived(
		answer.text.split(/\n\n+/).filter((paragraph) => paragraph.length > 60)
	);
	const shownText = $derived(
		answer.kind === 'brief' && !expanded && answer.text.length > 2000
			? briefParts.slice(0, 3).join('\n\n')
			: answer.text
	);
	const sourceLink = (id: string) => `/source/${encodeURIComponent(id)}`;
	function exportText() {
		return `${answer.text}\n\n${answer.citations.map((c, i) => `[${i + 1}] ${c.title} · ${c.date} · ${c.author}\n${c.quote}`).join('\n\n')}\n\nGenerated ${answer.createdAt}. Customer-shareable evidence. Downloaded copies remain outside application erasure.`;
	}
	async function copy() {
		try {
			await navigator.clipboard.writeText(exportText());
			copied = true;
		} catch {
			copied = false;
		}
	}
	async function download() {
		exporting = true;
		exportError = '';
		try {
			const family = getComputedStyle(document.documentElement).fontFamily;
			const bodyFont = `400 24px ${family}`;
			const headingFont = `700 34px ${family}`;
			await Promise.all([
				document.fonts.load(bodyFont, exportText()),
				document.fonts.load(headingFont, 'Acme · Evidence card')
			]);
			const theme = getComputedStyle(document.documentElement);
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			canvas.width = 1200;
			ctx.font = bodyFont;
			const lines: string[] = [];
			for (const paragraph of exportText().split('\n')) {
				let line = '';
				for (const word of paragraph.split(' ')) {
					const next = line ? `${line} ${word}` : word;
					if (ctx.measureText(next).width > 1040 && line) {
						lines.push(line);
						line = word;
					} else line = next;
				}
				lines.push(line);
			}
			canvas.height = 200 + lines.length * 36;
			ctx.fillStyle = theme.getPropertyValue('--surface').trim();
			ctx.fillRect(0, 0, 1200, canvas.height);
			ctx.fillStyle = theme.getPropertyValue('--text').trim();
			ctx.font = headingFont;
			ctx.fillText('Acme · Evidence card', 80, 80);
			ctx.font = bodyFont;
			ctx.fillStyle = theme.getPropertyValue('--text').trim();
			lines.forEach((line, i) => ctx.fillText(line, 80, 145 + i * 36));
			const a = document.createElement('a');
			a.download = 'acme-evidence.png';
			a.href = canvas.toDataURL('image/png');
			a.click();
		} catch {
			exportError = 'The evidence image could not be prepared. Please try again.';
		} finally {
			exporting = false;
		}
	}
</script>

<div class:compact class="evidence">
	{#if answer.question && ['chat', 'share'].includes(answer.kind)}<p class="question-text">
			{answer.question}
		</p>{/if}
	<div class="answer-text">{shownText}</div>
	{#if answer.kind === 'brief' && answer.text.length > 2000}<button
			type="button"
			class="text-button brief-expand"
			onclick={() => (expanded = !expanded)}
			>{expanded ? 'Show key items' : 'Read complete briefing'}</button
		>{/if}
	{#if answer.citations.length}<details class="receipts" open={!compact}>
			<summary
				>{answer.citations.length} source receipt{answer.citations.length === 1 ? '' : 's'}</summary
			>
			<div class="receipt-list">
				{#each answer.citations as citation, i}<a
						class="receipt"
						href={sourceLink(citation.sourceId)}
						><span class="receipt-number">{i + 1}</span>
						<div>
							<strong>{citation.title}</strong><small
								>{citation.date} · {citation.author} · {citation.position}</small
							>
							<blockquote>{citation.quote}</blockquote>
						</div>
						<span aria-hidden="true">↗</span></a
					>{/each}
			</div>
		</details>{/if}
	{#if answer.trace.length}<details class="trace">
			<summary>How this answer was prepared</summary>
			<ol>
				{#each answer.trace as step}<li>{step}</li>{/each}
			</ol>
		</details>{/if}
	<small class="generation-date"
		>Prepared {new Intl.DateTimeFormat('en-GB', {
			dateStyle: 'medium',
			timeStyle: 'short',
			timeZone: 'Europe/Helsinki'
		}).format(new Date(answer.createdAt))} Helsinki · L{answer.level}</small
	>
	{#if answer.kind === 'share'}<div class="export-actions">
			<button type="button" class="button secondary" onclick={copy}
				>{copied ? 'Copied' : 'Copy text'}</button
			><button type="button" class="button" onclick={download} disabled={exporting}
				>{exporting ? 'Preparing image…' : 'Download PNG'}</button
			>
		</div>
		{#if exportError}<p class="error" role="alert">{exportError}</p>{/if}
		<small>Downloaded copies remain outside subsequent application erasure.</small>{/if}
</div>
