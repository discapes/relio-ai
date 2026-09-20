import { cp, mkdir, rename, symlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve('.releases');
await mkdir(root, { recursive: true });
const revision = `${new Date().toISOString().replaceAll(/[:.]/g, '-')}-${randomUUID()}`;
await cp('build', resolve(root, revision), { recursive: true });
const staged = resolve(root, `next-${revision}`);
await symlink(revision, staged);
await rename(staged, resolve(root, 'current'));
console.log(`Production build ready: ${revision}. Restart receipt-workspace.service to activate it.`);
