import {books, genres, sections, categoryFor, sectionTitle, getPoems, sourceLabel} from './catalog.js?v=suwan-1';
import {initialState, nextQuestion, previousQuestion, canGoPrevious, answer, changeMode, changeCount} from './engine.js?v=sequence-1';
import {loadProgress, activateSection, saveProgress} from './progress.js?v=sequence-1';
import {sourceDocument, sourcePageCount, sourceImages} from './sources.js?v=suwan-1';
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
  const section = sections[progress.active];
  const label = sectionTitle(progress.active);
  document.documentElement.dataset.category = progress.active;
  document.title = `시의 주제 · 2027 ${label}`;
  $('intro-category').textContent = `매일 조금씩, ${label} ${poems.length}편`;
  $('stats-category').textContent = `${label} 학습 기록`;
  $('footer-source').textContent = `2027 KBS ${label} 손필기 · ${poems.length}편`;
  $('library-heading').textContent = `${label} 모아보기`;
  $('library-count').textContent = poems.length;
  $('reset-title').textContent = `${label} 기록을 초기화할까요?`;
  $('reset-description').textContent = `${label}의 풀이 수, 정답률, 오답 목록과 반복 진도만 초기화됩니다.`;
  for (const book of Object.keys(books)) {
    $(`book-${book}`).checked = book === section.book;
  }
  for (const genre of genres) {
    $(`section-${genre}`).checked = genre === section.genre;
    $(`section-${genre}-count`).textContent = `${getPoems(categoryFor(section.book, genre)).length}편`;
  }
  $('stat-total').textContent = state.total.toLocaleString();
  $('stat-rate').textContent = state.total ? `${Math.round(state.correct / state.total * 100)}%` : '—';
  $('stat-streak').textContent = state.streak;
  $('wrong-count').textContent = state.wrong.length;
  $('wrong-list-count').textContent = state.wrong.length;
  $('previous').disabled = !canGoPrevious(state);
  $('empty-previous').hidden = !canGoPrevious(state);
  $('body-open').disabled = state.current === null;
  $('mode-all').setAttribute('aria-pressed', String(state.mode === 'all'));
  $('mode-wrong').setAttribute('aria-pressed', String(state.mode === 'wrong'));
  document.querySelectorAll('[name="count"]').forEach(input => {
    input.checked = Number(input.value) === (state.current ? state.options.length : state.count);
    // Finish reading the answer before generating a new set of choices.
    input.disabled = state.selected !== null;
  });
  $('key-count').textContent = state.current ? state.options.length : state.count;
  const roundIds = [...new Set([...state.seen, ...(state.current ? [state.current] : []), ...state.queue])];
  const total = state.mode === 'all' ? poems.length : roundIds.length;
  $('round-label').textContent = `${state.round || 1}번째 ${state.mode === 'all' ? '반복' : '복습'}`;
  $('round-progress').textContent = `${state.seen.length} / ${total}`;
  const dots = state.mode === 'all' ? poems.map(p => p.id) : roundIds;
  $('progress-dots').replaceChildren(...dots.map(id => element('span', '', state.seen.includes(id) ? 'done' : id === state.current ? 'current' : '')));
  $('round-note').textContent = state.mode === 'all' ? `1번부터 ${poems.length}번까지 순서대로 풀고, 다시 1번부터 이어집니다.` : '틀린 작품을 번호순으로 풀어요. 다시 맞히면 오답 목록에서 빠집니다.';
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
function previous() {
  if (!previousQuestion(state)) return;
  render();
  $('poem-title').focus({preventScroll:true});
}
function setMode(mode) {
  if (state.mode === mode) return;
  changeMode(state, mode); render();
  if (state.current) $('poem-title').focus({preventScroll:true});
}
$('next').addEventListener('click', next);
$('previous').addEventListener('click', previous);
$('empty-previous').addEventListener('click', previous);
$('mode-all').addEventListener('click', () => setMode('all'));
$('mode-wrong').addEventListener('click', () => setMode('wrong'));
$('back-all').addEventListener('click', () => setMode('all'));
function setSection(category) {
  save();
  activateSection(progress, category);
  state = progress.states[progress.active];
  poems = getPoems(progress.active);
  $('search').value = '';
  render();
  $('section-status').textContent = `${sectionTitle(progress.active)} ${poems.length}편으로 전환했습니다. 문제와 선지는 이 교재와 갈래에서만 나옵니다.`;
}
document.querySelectorAll('[name="book"]').forEach(input => input.addEventListener('change', () => {
  setSection(categoryFor(input.value, sections[progress.active].genre));
}));
document.querySelectorAll('[name="section"]').forEach(input => input.addEventListener('change', () => {
  setSection(categoryFor(sections[progress.active].book, input.value));
}));
document.querySelectorAll('[name="count"]').forEach(input => input.addEventListener('change', () => {
  changeCount(state, Number(input.value));
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
function renderWrongList() {
  $('wrong-list-category').textContent = sectionTitle(progress.active);
  $('wrong-list-total').textContent = state.wrong.length;
  $('wrong-list-start').disabled = state.wrong.length === 0;
  const items = poems.filter(p => state.wrong.includes(p.id)).sort((a,b)=>a.id-b.id).map(p => {
    const details = element('details', '', 'library-item wrong-item');
    const summary = element('summary', '');
    summary.append(element('span', `${String(p.id).padStart(2,'0')} · ${p.author} `), document.createTextNode(p.title));
    const content = element('div', '', 'wrong-answer');
    if (state.wrongAnswers[p.id]) content.append(element('p', `내 선택 · ${state.wrongAnswers[p.id]}`, 'wrong-choice'));
    content.append(element('p', `정답 · ${p.theme}`, 'right-choice'), element('small', sourceLabel(p)));
    const body = element('button', '본문 보기', 'body-button');
    body.setAttribute('aria-label', `${p.title} 본문 보기`);
    body.addEventListener('click', () => openBody(p));
    content.append(body);
    details.append(summary, content);
    return details;
  });
  $('wrong-list-items').replaceChildren(...(items.length ? items : [element('p', '아직 틀린 문제가 없어요. 틀리면 이곳에 자동으로 모입니다.', 'page-notice')]));
}
$('wrong-list-open').addEventListener('click', () => {renderWrongList(); $('wrong-list').showModal();});
$('wrong-list-close').addEventListener('click', () => $('wrong-list').close());
$('wrong-list-start').addEventListener('click', () => {
  $('wrong-list').close();
  setMode('wrong');
  if (state.current) $('poem-title').focus({preventScroll:true});
});
let bodyReturnFocus;
function openBody(poem) {
  if (!poem) return;
  bodyReturnFocus = document.activeElement;
  $('body-title').textContent = poem.title;
  $('body-author').textContent = poem.author;
  $('body-source').textContent = `이 작품만 ${sourcePageCount(poem)}쪽 · 원본 출처: ${sourceLabel(poem)}`;
  // Create page images only on demand; no browser PDF toolbar or sidebar.
  const pages = sourceImages(poem).map((page, index) => {
    const sheet = element('button', '', 'page-sheet');
    sheet.type = 'button';
    sheet.setAttribute('aria-label', `${poem.title} ${index + 1}쪽 확대`);
    sheet.setAttribute('aria-pressed', 'false');
    sheet.title = '페이지를 눌러 확대·축소';
    const img = document.createElement('img');
    img.alt = `${poem.author} · ${poem.title} 본문과 필기, ${index + 1}쪽`;
    img.width = page.width;
    img.height = page.height;
    img.decoding = 'async';
    img.loading = index === 0 ? 'eager' : 'lazy';
    const notice = element('p', `${index + 1}쪽을 불러오는 중이에요.`, 'page-notice');
    img.addEventListener('load', () => notice.remove(), {once:true});
    img.addEventListener('error', () => {
      sheet.hidden = true;
      notice.textContent = '페이지를 불러오지 못했어요. ';
      const link = element('a', '원본 PDF 열기');
      link.href = sourceDocument(poem);
      link.target = '_blank';
      link.rel = 'noopener';
      notice.append(link);
    }, {once:true});
    sheet.addEventListener('click', () => {
      const zoomed = sheet.classList.toggle('is-zoomed');
      sheet.setAttribute('aria-pressed', String(zoomed));
      sheet.setAttribute('aria-label', `${poem.title} ${index + 1}쪽 ${zoomed ? '축소' : '확대'}`);
    });
    sheet.append(img);
    img.src = page.src;
    const wrapper = element('div', '', 'page-wrapper');
    wrapper.append(notice, sheet);
    return wrapper;
  });
  $('body-viewer').replaceChildren(...pages);
  $('body-dialog').showModal();
  $('body-viewer').scrollTo(0, 0);
}
$('body-open').addEventListener('click', () => openBody(poems.find(p => p.id === state.current)));
$('body-close').addEventListener('click', () => $('body-dialog').close());
$('body-dialog').addEventListener('close', () => {
  // Release the page images without changing the question, choices, or score.
  $('body-viewer').replaceChildren();
  if (bodyReturnFocus?.isConnected) bodyReturnFocus.focus({preventScroll:true});
});
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
