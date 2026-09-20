import type { Handle } from '@sveltejs/kit';
import {
	observeUsage,
	recordUsage,
	requestUsageKind,
	requestUsageMetadata,
	usageEnabled
} from '$lib/server/usage';

export const handle: Handle = async ({ event, resolve }) => {
	if (!usageEnabled()) return resolve(event);
	let metadata;
	try {
		metadata = requestUsageMetadata(event);
	} catch {
		return resolve(event);
	}
	return observeUsage(metadata, async () => {
		const kind = requestUsageKind(event.request, event.url);
		const started = performance.now();
		try {
			const response = await resolve(event);
			if (kind)
				recordUsage(kind, {
					status: response.status,
					durationMs: Math.round(performance.now() - started),
					outcome: response.status < 400 ? 'accepted' : 'rejected'
				});
			return response;
		} catch (error) {
			if (kind)
				recordUsage(kind, {
					outcome: 'error',
					durationMs: Math.round(performance.now() - started)
				});
			throw error;
		}
	});
};
