import test from 'node:test';
import assert from 'node:assert/strict';
import {categories, categoryFor, getPoems, sectionTitle, sourceLabel} from '../dist/catalog.js';
import {initialState, nextQuestion, answer, changeMode, changeCount, restoreState} from '../dist/engine.js';
import {loadProgress, activateSection, saveProgress, storageKeys} from '../dist/progress.js';
import {sourcePageCount} from '../dist/sources.js';

test('both books map to distinct genres with complete source data', () => {
  assert.equal(categoryFor('sutek','modern'),'modern');
  assert.equal(categoryFor('sutek','classical'),'classical');
  assert.equal(categoryFor('suwan','modern'),'suwan-modern');
  assert.equal(categoryFor('suwan','classical'),'suwan-classical');
  for (const [category,count,pages] of [['suwan-modern',12,13],['suwan-classical',11,24]]) {
    const poems=getPoems(category);
    assert.deepEqual(poems.map(p=>p.id),Array.from({length:count},(_,i)=>i+1));
    assert.equal(poems.reduce((sum,p)=>sum+sourcePageCount(p),0),pages);
    for(const p of poems) {
      assert.equal(p.category,category);
      for(const key of ['title','author','theme','sourceRange']) assert.ok(p[key]);
      assert.equal(p.sourceEndPage-p.sourcePage+1,sourcePageCount(p));
      assert.match(sourceLabel(p),/수능완성/);
    }
    assert.match(sectionTitle(category),/수능완성/);
  }
});

test('all four question pools cover a whole round and wrong review stays in its book and genre', () => {
  for(const category of categories) {
    const state=initialState(category);const poems=getPoems(category);const seen=new Set();
    for(let i=0;i<poems.length;i++) {
      nextQuestion(state);seen.add(state.current);
      const poem=poems.find(p=>p.id===state.current);
      answer(state,state.options.findIndex(t=>t!==poem.theme));
    }
    assert.equal(seen.size,poems.length);
    changeMode(state,'wrong');
    assert.ok(state.options.every(t=>poems.some(p=>p.theme===t)));
    const poem=poems.find(p=>p.id===state.current);
    answer(state,state.options.indexOf(poem.theme));
    assert.ok(!state.wrong.includes(poem.id));
  }
});

test('four independent saves survive switching, reload and a single-section reset', () => {
  const data=new Map();const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  const progress=loadProgress(storage);const snapshots={};
  for(const [i,category] of categories.entries()) {
    activateSection(progress,category);const state=progress.states[category];
    changeCount(state,i%2 ? 5 : 3);
    answer(state,0);saveProgress(storage,progress);snapshots[category]=JSON.stringify(state);
  }
  assert.equal(new Set(Object.values(storageKeys)).size,4);
  const restored=loadProgress(storage);
  for(const category of categories) {
    activateSection(restored,category);
    assert.equal(JSON.stringify(restored.states[category]),snapshots[category]);
  }
  activateSection(restored,'suwan-modern');restored.states['suwan-modern']=initialState('suwan-modern');saveProgress(storage,restored);
  const reset=loadProgress(storage);
  assert.equal(reset.states['suwan-modern'].total,0);
  for(const category of categories.filter(c=>c!=='suwan-modern')) assert.equal(JSON.stringify(reset.states[category]),snapshots[category]);
  assert.deepEqual(restoreState(snapshots.modern,'suwan-modern'),initialState('suwan-modern'));
});
