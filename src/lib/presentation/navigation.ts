/** Preserve location only; source and destination always load fresh scoped data. */
export function sourceHref(id: string, origin: string, anchor = '') {
	const location = origin.split('#')[0];
	const target =
		(location === '/' ? '/?view=workspace' : location) +
		(anchor ? `#${encodeURIComponent(anchor)}` : '');
	return `/source/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(target)}`;
}

export function sourceReturn(value: string | null) {
	const fallback = { href: '/?view=memory', label: 'Project memory' };
	if (!value || !value.startsWith('/?') || /[\\\r\n]/.test(value)) return fallback;
	const url = new URL(value, 'https://relio.invalid');
	if (url.pathname !== '/') return fallback;
	const view = url.searchParams.get('view') || 'workspace';
	const labels: Record<string, string> = {
		workspace: 'My workspace',
		memory: 'Project memory',
		people: 'People',
		email: 'Email demo',
		practice: 'Practice answers'
	};
	if (!labels[view]) return fallback;
	return {
		href: url.pathname + url.search + url.hash,
		label: url.hash.startsWith('#answer-')
			? 'Back to answer'
			: view === 'memory' && url.searchParams.get('tab') === 'graph'
				? 'Back to graph'
				: labels[view]
	};
}
