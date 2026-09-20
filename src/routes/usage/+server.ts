import { browserUsageEvents, recordUsage, usageEnabled } from '$lib/server/usage';

// Collection only; no route exposes stored events.
export async function POST({ request, url }) {
	if (!usageEnabled()) return new Response(null, { status: 204 });
	try {
		if (request.headers.get('origin') !== url.origin) return new Response(null, { status: 204 });
		const reader = request.body?.getReader();
		if (!reader) return new Response(null, { status: 204 });
		let size = 0;
		const chunks: Uint8Array[] = [];
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.length;
			if (size > 32 * 1024) {
				await reader.cancel();
				return new Response(null, { status: 204 });
			}
			chunks.push(value);
		}
		const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
		for (const item of browserUsageEvents(payload.events)) {
			const { kind, ...detail } = item;
			recordUsage(`browser.${kind}`, { browser: detail });
		}
	} catch {
		/* Bad telemetry does not change application state. */
	}
	return new Response(null, { status: 204 });
}
