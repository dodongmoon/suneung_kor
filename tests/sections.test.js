import test from 'node:test';
import assert from 'node:assert/strict';
import {categories, getPoems, sourceLabel} from '../dist/catalog.js';
import {initialState, nextQuestion, answer, changeMode, makeOptions, restoreState} from '../dist/engine.js';
import {loadProgress, activateSection, saveProgress, storageKeys} from '../dist/progress.js';

function memoryStorage() {
  const data = new Map();
  return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value)};
}
test('classical catalog has all 33 source numbers, original locations and clear summary provenance', () => {
  const poems = getPoems('classical');
  assert.deepEqual(poems.map(p => p.id), Array.from({length:33}, (_,i) => i+1));
  for (const p of poems) {
    assert.equal(p.category,'classical');
    for (const key of ['author','title','theme','sourceRange','sourcePage']) assert.ok(p[key]);
  }
  assert.equal(new Set(poems.map(p => p.sourceRange)).size,7);
  assert.equal(poems.filter(p=>p.themeOrigin==='summary').length,1);
  assert.match(sourceLabel(poems[2]),/필기 요약/);
});
test('both choice counts draw exclusively from the question category with unique answers', () => {
  for (const category of categories) {
    const poems = getPoems(category);
    const themes = new Set(poems.map(p => p.theme));
    const foreign = new Set(categories.filter(c=>c!==category).flatMap(c=>getPoems(c).map(p=>p.theme)).filter(t=>!themes.has(t)));
    for (const count of [3,5]) for (const poem of poems) for (let n=0;n<25;n++) {
      const options=makeOptions(poem,count);
      assert.equal(options.length,count);
      assert.equal(new Set(options).size,count);
      assert.equal(options.filter(t=>t===poem.theme).length,1);
      assert.ok(options.every(t=>themes.has(t)));
      assert.ok(options.every(t=>!foreign.has(t)));
    }
  }
  const repeated = getPoems('classical').filter(p=>p.theme==='임에 대한 그리움');
  assert.equal(repeated.length,2);
  for (const p of repeated) assert.equal(makeOptions(p,5).filter(t=>t===p.theme).length,1);
});
test('classical rounds cover all 33 poems and wrong-review choices stay classical', () => {
  const state=initialState('classical'); const poems=getPoems('classical');
  for(let round=1;round<=5;round++) {
    const seen=[];
    for(let i=0;i<poems.length;i++) {
      nextQuestion(state); seen.push(state.current); assert.equal(state.round,round);
      const current=poems.find(p=>p.id===state.current);
      answer(state,state.options.findIndex(t=>t!==current.theme));
    }
    assert.equal(new Set(seen).size,poems.length);
  }
  changeMode(state,'wrong');
  assert.ok(state.options.every(t=>poems.some(p=>p.theme===t)));
  const id=state.current;
  answer(state,state.options.indexOf(poems.find(p=>p.id===id).theme));
  assert.ok(!state.wrong.includes(id));
});
test('section switches and reloads preserve each question, choice count, stats, and wrong list independently', () => {
  const storage=memoryStorage(); const progress=loadProgress(storage);
  activateSection(progress,'modern');
  const modern=progress.states.modern; answer(modern,0); saveProgress(storage,progress);
  const modernSnapshot=JSON.stringify(modern);
  activateSection(progress,'classical');
  const classical=progress.states.classical;
  classical.count=5;classical.options=makeOptions(getPoems('classical').find(p=>p.id===classical.current),5);
  const classicalSnapshot=JSON.stringify(classical);saveProgress(storage,progress);
  activateSection(progress,'modern');
  assert.equal(JSON.stringify(progress.states.modern),modernSnapshot);
  activateSection(progress,'classical');
  assert.equal(JSON.stringify(progress.states.classical),classicalSnapshot);
  const restored=loadProgress(storage);
  assert.equal(restored.active,'classical');
  assert.equal(JSON.stringify(restored.states.modern),modernSnapshot);
  assert.equal(JSON.stringify(restored.states.classical),classicalSnapshot);
  progress.states.classical=initialState('classical');saveProgress(storage,progress);
  assert.equal(JSON.stringify(loadProgress(storage).states.modern),modernSnapshot);
});
test('existing pre-section modern records migrate without losing their answered question', () => {
  const storage=memoryStorage();const legacy=initialState();nextQuestion(legacy);answer(legacy,1);delete legacy.category;
  storage.setItem(storageKeys.modern,JSON.stringify(legacy));
  const progress=loadProgress(storage);
  assert.deepEqual(progress.states.modern,{...legacy,category:'modern'});
  assert.equal(progress.states.classical.total,0);
  assert.deepEqual(restoreState(JSON.stringify(legacy),'classical'),initialState('classical'));
});
test('foreign-category saves or answer choices are rejected and unavailable storage is safe', () => {
  const modern=initialState();nextQuestion(modern);
  assert.deepEqual(restoreState(JSON.stringify(modern),'classical'),initialState('classical'));
  modern.options[0]=getPoems('classical')[0].theme;
  assert.deepEqual(restoreState(JSON.stringify(modern)),initialState());
  const progress=loadProgress(undefined);
  activateSection(progress,'classical');assert.ok(progress.states.classical.current);
  activateSection(progress,'not-a-section');assert.equal(progress.active,'classical');
});
