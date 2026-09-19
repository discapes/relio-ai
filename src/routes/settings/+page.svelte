<script lang="ts">
	import { enhance } from '$app/forms';
	import Card from '$lib/components/Card.svelte';
	let { data, form } = $props();
</script>

<svelte:head><title>Settings · Workspace</title></svelte:head>
<div class="page-heading">
	<div>
		<p class="eyebrow">MAKE IT YOURS</p>
		<h1>Workspace settings</h1>
		<p>A name for the place where your work happens.</p>
	</div>
</div>
<div class="settings-width">
	<Card title="General" description="This name is shared across this starter instance."
		><form method="POST" use:enhance class="settings-form">
			<label for="name">Workspace name</label><input
				id="name"
				name="name"
				value={data.workspaceName}
				required
				maxlength="60"
				aria-describedby="name-help"
			/><small id="name-help">Use between 1 and 60 characters.</small>{#if form?.error}<p
					role="alert"
					class="error"
				>
					{form.error}
				</p>{/if}{#if form?.saved}<p role="status">Workspace name saved.</p>{/if}<button
				class="button"
				type="submit">Save changes</button
			>
		</form></Card
	>
</div>
