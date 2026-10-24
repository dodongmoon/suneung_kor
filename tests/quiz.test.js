import test from 'node:test';
import assert from 'node:assert/strict';
import {poems} from '../dist/poems.js';
import {initialState, nextQuestion, answer, changeMode, makeOptions, restoreState} from '../dist/engine.js';

test('36 source poems are complete, uniquely numbered, and have source locations', () => {
  assert.deepEqual(poems.map(p => p.id), Array.from({length:36}, (_,i) => i+1));
  for (const p of poems) for (const key of ['author','title','theme','sourceRange','sourcePage']) assert.ok(p[key]);
  assert.equal(poems[18].sourcePage, 4);
  assert.equal(poems[19].sourcePage, 3);
});
test('3 and 5 choices always contain exactly one correct answer and unique real distractors', () => {
  for (const count of [3,5]) for (const poem of poems) for (let n=0;n<30;n++) {
    const options = makeOptions(poem,count);
    assert.equal(options.length,count);
    assert.equal(new Set(options).size,count);
    assert.equal(options.filter(t => t===poem.theme).length,1);
    assert.ok(options.every(t => poems.some(p => p.theme===t)));
  }
});
test('infinite rounds cover all 36 poems without repeats and avoid boundary repetition', () => {
  const state = initialState(); let last = null;
  for (let round=1;round<=20;round++) {
    const seen = [];
    for (let i=0;i<36;i++) {
      nextQuestion(state);
      assert.notEqual(state.current,last);
      assert.equal(state.round,round);
      seen.push(state.current);last=state.current;
      const poem=poems.find(p=>p.id===state.current);
      answer(state,state.options.indexOf(poem.theme));
    }
    assert.equal(new Set(seen).size,36);
  }
  assert.equal(state.total,720);assert.equal(state.correct,720);
});
test('answers count only once; wrong poems are removed on a successful review', () => {
  const state=initialState();nextQuestion(state);
  const first=state.current;
  const poem=poems.find(p=>p.id===first);
  assert.equal(answer(state,99),false);
  answer(state,state.options.findIndex(t=>t!==poem.theme));
  assert.equal(answer(state,0),false);
  assert.equal(state.total,1);assert.deepEqual(state.wrong,[first]);
  changeMode(state,'wrong');assert.equal(state.current,first);
  answer(state,state.options.indexOf(poem.theme));
  assert.deepEqual(state.wrong,[]);
  nextQuestion(state);assert.equal(state.current,null);
  changeMode(state,'all');assert.ok(state.current);
});
test('saved answers survive refresh without recounting; corrupt storage falls back safely', () => {
  const state=initialState();state.count=5;nextQuestion(state);answer(state,0);
  const saved=restoreState(JSON.stringify(state));
  assert.deepEqual(saved,state);assert.equal(answer(saved,1),false);
  for(const raw of ['invalid','null','{}',JSON.stringify({...state,options:['bad']})]) assert.deepEqual(restoreState(raw),initialState());
});
