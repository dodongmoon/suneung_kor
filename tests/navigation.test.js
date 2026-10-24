import test from 'node:test';
import assert from 'node:assert/strict';
import {categories,getPoems} from '../dist/catalog.js';
import {initialState,nextQuestion,previousQuestion,canGoPrevious,answer,changeMode,changeCount,makeOptions,restoreState} from '../dist/engine.js';

function choose(state, correct=true) {
  const poem=getPoems(state.category).find(p=>p.id===state.current);
  return answer(state,state.options.findIndex(t=>correct ? t===poem.theme : t!==poem.theme));
}
const question = s => ({id:s.current,options:[...s.options],selected:s.selected,round:s.round,seen:[...s.seen]});

test('every category starts at 1 and repeats in exact numbered order',()=>{
  for(const category of categories) {
    const s=initialState(category);const expected=getPoems(category).map(p=>p.id).sort((a,b)=>a-b);
    for(let round=1;round<=3;round++) {
      const actual=[];
      for(const id of expected) {nextQuestion(s);actual.push(s.current);assert.equal(s.round,round);choose(s);}
      assert.deepEqual(actual,expected);
    }
    assert.equal(s.total,expected.length*3);
  }
});
test('back and forward retain exact choices and answer, never score twice, and preserve unfinished tail',()=>{
  const s=initialState();nextQuestion(s);
  assert.equal(canGoPrevious(s),false);
  assert.equal(previousQuestion(s),false);
  assert.equal(nextQuestion(s),false);
  choose(s,false);const first=question(s);nextQuestion(s);
  changeCount(s,5);const second=question(s);
  previousQuestion(s);assert.deepEqual(question(s),first);
  assert.equal(choose(s),false);assert.equal(changeCount(s,5),false);assert.equal(s.total,1);
  const restored=restoreState(JSON.stringify(s));assert.deepEqual(restored,s);
  nextQuestion(restored);assert.deepEqual(question(restored),second);
  choose(restored);assert.equal(restored.total,2);
  previousQuestion(restored);nextQuestion(restored);assert.equal(choose(restored),false);assert.equal(restored.total,2);
  nextQuestion(restored);assert.equal(restored.current,3);assert.equal(restored.options.length,5);
});
test('navigation across round boundaries preserves round progress and forward continuation',()=>{
  const s=initialState('suwan-modern');
  for(let i=0;i<12;i++){nextQuestion(s);choose(s);}
  const last=question(s);nextQuestion(s);const first=question(s);
  assert.equal(s.round,2);assert.equal(s.current,1);
  previousQuestion(s);assert.deepEqual(question(s),last);
  nextQuestion(s);assert.deepEqual(question(s),first);assert.equal(s.total,12);
  choose(s);nextQuestion(s);assert.equal(s.current,2);assert.equal(s.round,2);
});
test('wrong list stores the actual selected theme and review uses sorted unresolved ids',()=>{
  const s=initialState('suwan-modern');
  for(let i=1;i<=5;i++){nextQuestion(s);choose(s,![2,5].includes(i));}
  assert.deepEqual(s.wrong,[2,5]);assert.ok(s.wrongAnswers[2]);assert.ok(s.wrongAnswers[5]);
  changeMode(s,'wrong');assert.equal(s.current,2);assert.equal(canGoPrevious(s),false);
  choose(s);assert.deepEqual(s.wrong,[5]);assert.equal(s.wrongAnswers[2],undefined);
  nextQuestion(s);assert.equal(s.current,5);choose(s);nextQuestion(s);
  assert.equal(s.current,null);assert.deepEqual(s.wrong,[]);
  const total=s.total;previousQuestion(s);assert.equal(s.current,5);assert.equal(choose(s),false);
  nextQuestion(s);assert.equal(s.current,null);assert.equal(s.total,total);
  assert.deepEqual(restoreState(JSON.stringify(s)),initialState()); // reject a different category
  assert.deepEqual(restoreState(JSON.stringify(s),'suwan-modern'),s);
});
test('random-order v1 records migrate to question 1 while retaining scores and wrong ids',()=>{
  for(const category of categories) {
    const poem=getPoems(category)[4];const options=makeOptions(poem,5);
    const old={version:1,category,count:5,mode:'all',queue:[3,1,2],current:5,options,selected:options.findIndex(t=>t!==poem.theme),total:6,correct:3,streak:0,best:2,wrong:[3,5],round:1,seen:[3,5]};
    const migrated=restoreState(JSON.stringify(old),category);
    for(const key of ['count','total','correct','streak','best','wrong']) assert.deepEqual(migrated[key],old[key]);
    assert.equal(migrated.version,2);assert.equal(migrated.current,1);assert.equal(migrated.selected,null);
    assert.equal(migrated.wrongAnswers[5],old.options[old.selected]);
    choose(migrated);nextQuestion(migrated);assert.equal(migrated.current,2);
    assert.deepEqual(restoreState(JSON.stringify(migrated),category),migrated);
  }
});
test('corrupt saved history cannot restore a different answer or foreign choices',()=>{
  const s=initialState();nextQuestion(s);choose(s);nextQuestion(s);
  const corrupt=structuredClone(s);corrupt.history[0].options[0]='invalid';
  assert.deepEqual(restoreState(JSON.stringify(corrupt)),initialState());
  const mismatched=structuredClone(s);mismatched.selected=0;
  assert.deepEqual(restoreState(JSON.stringify(mismatched)),initialState());
});
