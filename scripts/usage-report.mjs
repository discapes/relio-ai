import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const args = process.argv.slice(2);
const option = (name) => {
	const index = args.indexOf(name);
	return index < 0 ? undefined : args[index + 1];
};
const directory = resolve(
	option('--dir') || process.env.USAGE_LOG_DIR || resolve(process.env.DATA_DIR || 'data', 'usage')
);
const workspace = option('--workspace');
const browser = option('--browser');
const since = option('--since') || '';
const includeAutomation = args.includes('--include-automation');
const timeline = args.includes('--timeline');
const counts = new Map(),
	browsers = new Set(),
	workspaces = new Set(),
	visits = new Map();
let total = 0,
	skipped = 0,
	first = '',
	last = '';
const files = (await readdir(directory).catch(() => []))
	.filter((name) => /^events\.ndjson(?:\.\d+)?$/.test(name))
	.sort((a, b) => (Number(b.split('.').at(-1)) || 0) - (Number(a.split('.').at(-1)) || 0));
for (const file of files) {
	const lines = createInterface({
		input: createReadStream(resolve(directory, file)),
		crlfDelay: Infinity
	});
	for await (const line of lines) {
		let event;
		try {
			event = JSON.parse(line);
		} catch {
			continue;
		}
		if (!includeAutomation && event.automation) {
			skipped++;
			continue;
		}
		const id = event.workspaceId || event.cookieWorkspaceId || event.browser?.workspaceId;
		if (
			(since && event.at < since) ||
			(workspace && id !== workspace) ||
			(browser && event.browser?.clientId !== browser)
		)
			continue;
		total++;
		first = !first || event.at < first ? event.at : first;
		last = event.at > last ? event.at : last;
		counts.set(event.event, (counts.get(event.event) || 0) + 1);
		if (id) workspaces.add(id);
		if (event.browser?.clientId) browsers.add(event.browser.clientId);
		if (['page.open', 'browser.navigation'].includes(event.event)) {
			const path = event.browser?.path || event.path;
			visits.set(path, (visits.get(path) || 0) + 1);
		}
		if (timeline) process.stdout.write(JSON.stringify(event) + '\n');
	}
}
if (!timeline) {
	console.log(
		JSON.stringify(
			{
				directory,
				first,
				last,
				events: total,
				observedBrowsers: browsers.size,
				workspaces: workspaces.size,
				automationEventsExcluded: skipped,
				eventCounts: Object.fromEntries([...counts].sort((a, b) => b[1] - a[1])),
				pageVisits: Object.fromEntries([...visits].sort((a, b) => b[1] - a[1])),
				note: 'Browsers and workspaces are identifiers, not verified people. Page visits count HTML entries and completed client navigation. Clicks and submits describe intent; server action events record acceptance. Question completion is separate.'
			},
			null,
			2
		)
	);
}
