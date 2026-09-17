import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Transpile only the pure domain module; do not load Cloudflare runtime bindings.
const source = await readFile(new URL('../lib/news/stories.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { buildStories } = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
const now = Date.parse('2026-09-17T12:00:00Z');
const article = (id, published, extra = {}) => ({ id, topic: 'one', published, status: 'published', title: 'News', ...extra });
const input = [
  article('later', '2026-09-16T10:00:00Z'),
  article('earlier', '2026-09-16T12:00:00+09:00'),
  article('excluded', '2026-09-15', { status: 'excluded' }),
  article('old', '2026-01-01'),
  article('invalid', 'unknown'),
  article('restored-review', '2026-09-17', { title: 'Review restored by admin', topic: 'manual' }),
  article('boundary', new Date(now - 90 * 86400000).toISOString(), { topic: 'boundary' }),
];
const original = JSON.stringify(input);
const stories = buildStories(input, now);
assert.equal(stories.length, 3);
assert.equal(stories[0].topic, 'manual');
assert.deepEqual(stories[1].articles.map(a => a.id), ['earlier', 'later']);
assert.equal(stories[0].articles[0].published, '2026-09-17');
assert.equal(JSON.stringify(input), original, 'Grouping must not mutate persisted articles');
assert.deepEqual(buildStories([], now), []);
assert.equal(buildStories([article('x', '2026-09-16', { topic: '__proto__' })], now)[0].topic, '__proto__');
console.log('Story projection: 8 assertions passed');
