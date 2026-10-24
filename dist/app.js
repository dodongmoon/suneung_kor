import {categories, sections, getPoems, sourceLabel} from './catalog.js';
import {initialState, nextQuestion, answer, changeMode, makeOptions} from './engine.js';
import {loadProgress, activateSection, saveProgress} from './progress.js';
const $ = id => document.getElementById(id);
let storage;
try {storage = window.localStorage;} catch {}
const progress = loadProgress(storage);
activateSection(progress, progress.active);
let state = progress.states[progress.active];
let poems = getPoems(progress.active);
function save() {
  try {saveProgress(storage, progress);}
  catch {$('save-status').textContent = '이 브라우저에서는 기록 저장이 어려워요. 현재 창에서는 계속 학습할 수 있어요.';}
}
function element(tag, text, className) {
  const el = document.createElement(tag); el.textContent = text;
  if (className) el.className = className;
  return el;
}
function render() {
  const label = sections[progress.active].label;
  document.documentElement.dataset.category = progress.active;
  document.title = `시의 주제 · 2027 수특 ${label}`;
  $('intro-category').textContent = `매일 조금씩, ${label} ${poems.length}편`;
  $('stats-category').textContent = `${label} 학습 기록`;
  $('footer-source').textContent = `2027 KBS 수특 ${label} 손필기 · ${poems.length}편`;
  $('library-heading').textContent = `${label} 모아보기`;
  $('library-count').textContent = poems.length;
  $('reset-title').textContent = `${label} 기록을 초기화할까요?`;
  $('reset-description').textContent = `${label}의 풀이 수, 정답률, 오답 목록과 반복 진도만 초기화됩니다.`;
  for (const category of categories) {
    $(`section-${category}`).checked = category === progress.active;
    $(`section-${category}-count`).textContent = `${getPoems(category).length}편`;
  }
  $('stat-total').textContent = state.total.toLocaleString();
  $('stat-rate').textContent = state.total ? `${Math.round(state.correct / state.total * 100)}%` : '—';
  $('stat-streak').textContent = state.streak;
  $('wrong-count').textContent = state.wrong.length;
  $('mode-all').setAttribute('aria-pressed', String(state.mode === 'all'));
  $('mode-wrong').setAttribute('aria-pressed', String(state.mode === 'wrong'));
  document.querySelectorAll('[name="count"]').forEach(input => {
    input.checked = Number(input.value) === state.count;
    // Finish reading the answer before generating a new set of choices.
    input.disabled = state.selected !== null;
  });
  $('key-count').textContent = state.count;
  const roundIds = [...new Set([...state.seen, ...(state.current ? [state.current] : []), ...state.queue])];
  const total = state.mode === 'all' ? poems.length : roundIds.length;
  $('round-label').textContent = `${state.round || 1}번째 ${state.mode === 'all' ? '반복' : '복습'}`;
  $('round-progress').textContent = `${state.seen.length} / ${total}`;
  const dots = state.mode === 'all' ? poems.map(p => p.id) : roundIds;
  $('progress-dots').replaceChildren(...dots.map(id => element('span', '', state.seen.includes(id) ? 'done' : id === state.current ? 'current' : '')));
  $('round-note').textContent = state.mode === 'all' ? `${poems.length}편을 한 번씩 풀면 다시 섞어서 이어집니다.` : '틀린 작품을 다시 맞히면 오답 목록에서 빠집니다.';
  $('empty-state').hidden = state.current !== null;
  $('question-content').hidden = state.current === null;
  $('feedback').replaceChildren();
  if (!state.current) {save(); return;}
  const poem = poems.find(p => p.id === state.current);
  $('poem-author').textContent = poem.author;
  $('poem-title').textContent = poem.title;
  $('poem-number').textContent = `NO. ${String(poem.id).padStart(2, '0')}`;
  const answered = state.selected !== null;
  $('options').replaceChildren(...state.options.map((theme, i) => {
    const isCorrect = theme === poem.theme;
    const button = element('button', '', 'option');
    button.type = 'button';
    button.setAttribute('aria-disabled', String(answered));
    if (answered && isCorrect) button.classList.add('correct');
    if (answered && state.selected === i && !isCorrect) button.classList.add('incorrect');
    button.append(element('span', answered && isCorrect ? '✓' : answered && state.selected === i ? '×' : String(i + 1), 'option-index'), element('span', theme, 'option-text'));
    if (answered && (isCorrect || state.selected === i)) button.append(element('span', isCorrect ? '정답' : '내 선택', 'answer-label'));
    button.addEventListener('click', () => choose(i));
    return button;
  }));
  $('next').disabled = !answered;
  if (answered) {
    const correct = state.options[state.selected] === poem.theme;
    $('feedback').classList.toggle('is-wrong', !correct);
    $('feedback').append(element('strong', correct ? '정답이에요. 한 편 더 기억했어요!' : '괜찮아요. 이 주제를 기억해 두세요.'), element('span', poem.theme), element('span', `출처 · ${sourceLabel(poem)}`, 'source'));
    if (poem.themeNote) $('feedback').append(element('span', poem.themeNote, 'source'));
  }
  save();
}
function choose(index) {
  if (!answer(state, index)) return;
  render();
  $('next').focus({preventScroll:true});
}
function next() {
  if (state.selected === null) return;
  nextQuestion(state); render();
  if (state.current) $('poem-title').focus({preventScroll:true});
  else $('back-all').focus({preventScroll:true});
}
function setMode(mode) {
  if (state.mode === mode) return;
  changeMode(state, mode); render();
  if (state.current) $('poem-title').focus({preventScroll:true});
}
$('next').addEventListener('click', next);
$('mode-all').addEventListener('click', () => setMode('all'));
$('mode-wrong').addEventListener('click', () => setMode('wrong'));
$('back-all').addEventListener('click', () => setMode('all'));
document.querySelectorAll('[name="section"]').forEach(input => input.addEventListener('change', () => {
  save();
  activateSection(progress, input.value);
  state = progress.states[progress.active];
  poems = getPoems(progress.active);
  $('search').value = '';
  render();
  $('section-status').textContent = `${sections[progress.active].label} ${poems.length}편으로 전환했습니다. 문제와 선지는 이 섹션에서만 나옵니다.`;
}));
document.querySelectorAll('[name="count"]').forEach(input => input.addEventListener('change', () => {
  state.count = Number(input.value);
  if (state.current) state.options = makeOptions(poems.find(p => p.id === state.current), state.count);
  render();
}));
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || document.querySelector('dialog[open]') || ['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)) return;
  if (/^[1-5]$/.test(event.key)) {event.preventDefault(); choose(Number(event.key) - 1);}
  // Enter on native buttons keeps its native action. Elsewhere it advances after an answer.
  if (event.key === 'Enter' && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A' && state.selected !== null) {event.preventDefault(); next();}
});
function renderLibrary() {
  const query = $('search').value.trim().toLocaleLowerCase();
  const filtered = poems.filter(p => `${p.title} ${p.author} ${p.theme}`.toLocaleLowerCase().includes(query));
  const items = filtered.map(p => {
    const details = element('details', '', 'library-item');
    const summary = element('summary', '');
    summary.append(element('span', `${String(p.id).padStart(2,'0')} · ${p.author} `), document.createTextNode(p.title));
    const theme = element('p', p.theme);
    theme.append(element('small', sourceLabel(p)));
    if (p.themeNote) theme.append(element('small', p.themeNote));
    details.append(summary, theme);
    return details;
  });
  $('library-list').replaceChildren(...(items.length ? items : [element('p', '검색 결과가 없어요. 다른 단어로 찾아보세요.', 'side-note')]));
}
$('library-open').addEventListener('click', () => {renderLibrary(); $('library').showModal();});
$('library-close').addEventListener('click', () => $('library').close());
$('search').addEventListener('input', renderLibrary);
$('reset-open').addEventListener('click', () => $('reset-dialog').showModal());
$('reset-cancel').addEventListener('click', () => $('reset-dialog').close());
$('reset-confirm').addEventListener('click', () => {
  const count = state.count;
  state = initialState(progress.active); state.count = count;
  progress.states[progress.active] = state;
  nextQuestion(state); render(); $('reset-dialog').close();
});
// Mobile keeps the learning card compact; offer the same reset action in the footer.
const mobileReset = element('button', '학습 기록 초기화', 'mobile-reset reset-link');
mobileReset.addEventListener('click', () => $('reset-dialog').showModal());
document.querySelector('.site-footer').append(mobileReset);
render();
