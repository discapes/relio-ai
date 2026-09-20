<section class="extended-slides" aria-labelledby="slides-title">
	<div class="slides-heading">
		<h1 id="slides-title">Extended slides</h1>
		<div class="slides-actions">
			<a class="button secondary" href="/relio_pitch.pdf" target="_blank" rel="noopener noreferrer"
				>Open PDF</a
			>
			<a class="button secondary" href="/relio_pitch.pdf" download="relio_pitch.pdf">Download</a>
		</div>
	</div>
	<iframe class="slides-viewer" src="/relio_pitch.pdf" title="Extended slides PDF"></iframe>
</section>

<style>
	.extended-slides {
		width: 100%;
		min-width: 0;
	}
	.slides-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 18px;
		margin-bottom: 24px;
	}
	h1 {
		margin: 0;
		font-size: clamp(30px, 3vw, 40px);
		line-height: 1.2;
	}
	.slides-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.slides-viewer {
		display: block;
		width: 100%;
		height: max(460px, calc(100dvh - 230px));
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--surface-subtle);
	}
	@media (max-width: 600px) {
		.slides-viewer {
			height: 70dvh;
			min-height: 420px;
		}
	}
</style>
