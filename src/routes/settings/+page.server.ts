import { fail } from '@sveltejs/kit';
import { saveWorkspaceName } from '$lib/server/database';
import type { Actions } from './$types';
export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const name = form.get('name');
		if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) {
			return fail(400, { error: 'Enter a name between 1 and 60 characters.', saved: false });
		}
		saveWorkspaceName(name);
		return { saved: true, error: '' };
	}
};
