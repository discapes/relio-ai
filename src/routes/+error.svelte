<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · Workspace</title></svelte:head>
<div class="page-heading">
	<div>
		<p class="eyebrow">{page.status}</p>
		<h1>{page.error?.message ?? 'Something went wrong'}</h1>
		<p><a href="/">Return to the overview</a></p>
	</div>
</div>
