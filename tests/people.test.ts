import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameParts, affiliation } from '../src/lib/people';
const people = [
	{ id: 'ana', name: 'Ana Duarte', aliases: ['Ana', 'ana.duarte@relexsolutions.example'] },
	{ id: 'lena', name: 'Lena Fischer', aliases: ['Lena', 'Fischer'] }
];
test('recorded names match case insensitively, longest first, preserving exact safe text', () => {
	const text =
		'ANA DUARTE to Lena: Ana, ana.duarte@relexsolutions.example <script>Lena</script> banana.';
	const parts = nameParts(text, people);
	assert.equal(parts.map((p) => p.text).join(''), text);
	assert.deepEqual(
		parts.filter((p) => p.personId).map((p) => [p.text, p.personId]),
		[
			['ANA DUARTE', 'ana'],
			['Lena', 'lena'],
			['Ana', 'ana'],
			['ana.duarte@relexsolutions.example', 'ana'],
			['Lena', 'lena']
		]
	);
	assert.equal(
		nameParts('https://example.org/Ana https://Lena.example', people).filter((p) => p.personId)
			.length,
		0
	);
});
test('ambiguous aliases remain plain and omitted scoped identities cannot become links', () => {
	const shared = [...people, { id: 'ana2', name: 'Ana Other', aliases: ['Ana'] }];
	assert.equal(nameParts('Ana', shared)[0].personId, undefined);
	assert.equal(nameParts('Ana Duarte', shared)[0].personId, 'ana');
	assert.equal(nameParts('Lena Fischer', [people[0]])[0].personId, undefined);
	assert.equal(nameParts('Ana and Lena', []).filter((p) => p.personId).length, 0);
});
test('affiliation distinguishes customer, team, partner, unknown and conflicts', () => {
	assert.equal(affiliation({ email: 'ana@relexsolutions.example', aliases: [] }).kind, 'relex');
	assert.equal(affiliation({ email: 'lena@acme-org.example', aliases: [] }).kind, 'customer');
	assert.equal(
		affiliation({ email: 'ivan@meridian-consulting.example', aliases: [] }).kind,
		'partner'
	);
	assert.equal(affiliation({ email: 'vendor@elsewhere.example', aliases: [] }).kind, 'other');
	assert.equal(affiliation({ email: '', aliases: ['Ana'] }).kind, 'unknown');
	assert.equal(
		affiliation({ email: 'ana@relexsolutions.example', aliases: ['ana@acme-org.example'] }).kind,
		'unknown'
	);
});
