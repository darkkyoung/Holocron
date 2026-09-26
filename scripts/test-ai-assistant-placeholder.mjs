import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

const newsroom = await source('../app/newsroom.tsx');
const assistant = await source('../components/news/ai-assistant-placeholder.tsx');
const styles = await source('../components/news/ai-assistant-placeholder.module.css');
const assistantApiRoute = new URL('../app/api/assistant/route.ts', import.meta.url);

assert.doesNotMatch(newsroom, /^['"]use client['"]/m, 'Newsroom remains a server-compatible component');
assert.match(newsroom, /import AiAssistantPlaceholder from '@\/components\/news\/ai-assistant-placeholder'/, 'Newsroom imports the isolated placeholder');

const sourceListEnd = newsroom.indexOf('</a>)}<AiAssistantPlaceholder/>');
const aiCard = newsroom.indexOf('<AiAssistantPlaceholder/>');
const explainer = newsroom.indexOf('<div className="archive-explainer">');
const railFooter = newsroom.indexOf('<div className="rail-foot">');
assert.ok(sourceListEnd >= 0 && sourceListEnd < aiCard && aiCard < explainer && explainer < railFooter, 'sidebar order remains sources, AI card, grouped-story explainer, footer');
assert.match(newsroom, /같은 소식은 하나로\./, 'the existing archive explainer remains');

assert.match(assistant, /AI 도우미 열기/, 'the AI entry button is present');
assert.match(assistant, /aria-haspopup="dialog"/, 'the entry button identifies its dialog');
assert.match(assistant, /<DialogTrigger asChild>/, 'the entry button uses the existing dialog pattern');
assert.match(assistant, /COMING SOON/, 'the dialog clearly marks the placeholder');
assert.match(assistant, /AI 도우미는 준비 중입니다\./, 'the dialog says the assistant is not ready');
assert.match(assistant, /DialogClose asChild[\s\S]*?닫기/, 'the dialog has a labelled close button');
assert.match(assistant, /showCloseButton=\{false\}/, 'the visible close control has a Korean label');
assert.doesNotMatch(assistant, /\bfetch\s*\(|XMLHttpRequest|\/api\/|OPENAI_API_KEY|openai/i, 'the placeholder makes no AI/API request');
assert.match(styles, /max-width:\s*calc\(100vw - 2rem\)/, 'the dialog stays within narrow viewports');

let apiRouteExists = true;
try {
  await access(assistantApiRoute);
} catch {
  apiRouteExists = false;
}
assert.equal(apiRouteExists, false, 'there is no AI assistant API route');

console.log('AI assistant beta placeholder: 14 assertions passed');
