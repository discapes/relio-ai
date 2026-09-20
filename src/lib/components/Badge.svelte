<script lang="ts">
	import type { Snippet } from 'svelte';
	type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'suggestion';
	let {
		children,
		tone = 'neutral',
		status
	}: { children: Snippet; tone?: Tone; status?: string } = $props();
	const statusTones: Record<string, Tone> = {
		agreed: 'success',
		current: 'success',
		fulfilled: 'success',
		completed: 'success',
		proposed: 'suggestion',
		suggestion: 'suggestion',
		outstanding: 'warning',
		superseded: 'warning',
		stale: 'warning',
		corrected: 'danger',
		contradicted: 'danger',
		failed: 'danger'
	};
	const resolvedTone = $derived(status ? statusTones[status.toLowerCase()] || 'neutral' : tone);
</script>

<span class="badge {resolvedTone}">{@render children()}</span>
