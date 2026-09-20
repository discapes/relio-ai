import type { Person } from './types';

export type Affiliation = {
	kind: 'relex' | 'customer' | 'partner' | 'other' | 'unknown';
	label: string;
	basis: string;
};
export function affiliation(person: Pick<Person, 'email' | 'aliases'>): Affiliation {
	const domains = [
		...new Set(
			[person.email, ...person.aliases].flatMap((value) =>
				[...value.matchAll(/[\w.%+-]+@([\w.-]+\.[A-Za-z]{2,})/g)].map((m) => m[1].toLowerCase())
			)
		)
	];
	if (!domains.length)
		return {
			kind: 'unknown',
			label: 'Organization unconfirmed',
			basis: 'No organization email is recorded in your accessible sources.'
		};
	if (domains.length > 1)
		return {
			kind: 'unknown',
			label: 'Multiple organizations recorded',
			basis: `Recorded email domains: ${domains.join(', ')}.`
		};
	const domain = domains[0];
	const known: Record<string, [Affiliation['kind'], string]> = {
		'relexsolutions.example': ['relex', 'RELEX'],
		'acme-org.example': ['customer', 'Acme · Customer'],
		'meridian-consulting.example': ['partner', 'Meridian · Partner']
	};
	const [kind, label] = known[domain] ?? ['other', domain];
	return { kind, label, basis: `Recorded email domain: ${domain}.` };
}

export type NamePart = { text: string; personId?: string; name?: string };
export function nameParts(
	text: string,
	people: Pick<Person, 'id' | 'name' | 'aliases'>[]
): NamePart[] {
	const names = new Map<string, Map<string, string>>();
	for (const person of people)
		for (const alias of [person.name, ...person.aliases]) {
			const key = alias.trim().toLowerCase();
			if (!key) continue;
			if (!names.has(key)) names.set(key, new Map());
			names.get(key)!.set(person.id, person.name);
		}
	// Include ambiguous aliases in matching so their shorter substrings cannot resolve arbitrarily.
	const aliases = [...names.keys()].sort((a, b) => b.length - a.length);
	if (!aliases.length) return [{ text }];
	const escaped = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	const pattern = new RegExp(
		`https?:\\/\\/[^\\s<>]+|[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}|(?<![\\p{L}\\p{N}_@])(?:${escaped.join('|')})(?![\\p{L}\\p{N}_@])`,
		'giu'
	);
	const result: NamePart[] = [];
	let offset = 0;
	for (const match of text.matchAll(pattern)) {
		if (match.index > offset) result.push({ text: text.slice(offset, match.index) });
		const owners = names.get(match[0].toLowerCase());
		const owner = owners?.size === 1 ? [...owners][0] : undefined;
		result.push({ text: match[0], ...(owner ? { personId: owner[0], name: owner[1] } : {}) });
		offset = match.index + match[0].length;
	}
	if (offset < text.length) result.push({ text: text.slice(offset) });
	return result;
}
