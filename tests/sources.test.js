import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {categories, getPoems} from '../dist/catalog.js';
import {sourceDocument, sourcePageCount} from '../dist/sources.js';

test('every work opens its own existing PDF from page one', () => {
  const urls = new Set();
  for (const category of categories) {
    for (const poem of getPoems(category)) {
      const url = sourceDocument(poem);
      assert.ok(!urls.has(url), `${category} ${poem.title} shares a PDF`);
      urls.add(url);
      assert.ok(url.endsWith('#page=1&view=FitH'));
      const file = new URL(`../dist/${url.split('#')[0]}`, import.meta.url);
      assert.equal(readFileSync(file).subarray(0,5).toString(), '%PDF-');
      assert.ok(sourcePageCount(poem) >= 1);
    }
  }
  assert.equal(urls.size, 69);
  const classical = getPoems('classical');
  assert.equal(sourcePageCount(classical.find(p => p.title === '성패관천운')), 1);
  assert.equal(sourcePageCount(classical.find(p => p.title === '면앙정가')), 3);
});
