import { workspaceName } from '$lib/server/database';
export const load = () => ({ workspaceName: workspaceName() });
