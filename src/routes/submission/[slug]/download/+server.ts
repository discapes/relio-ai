import { sessionContext } from '$lib/server/session';
import { submissionDocument } from '$lib/server/submission';
export function GET({ cookies, params }) {
	const document = submissionDocument(sessionContext(cookies), params.slug);
	return new Response(document.text, {
		headers: {
			'content-type': 'text/markdown; charset=utf-8',
			'content-disposition': `attachment; filename="${document.file}"`,
			'cache-control': 'private, no-store'
		}
	});
}
