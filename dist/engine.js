import { categories, getPoems } from './catalog.js?v=suwan-1';
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeOptions(poem, count, random = Math.random) {
  const poems = getPoems(poem.category);
  const others = [...new Set(poems.map(p => p.theme))].filter(theme => theme !== poem.theme);
  return shuffle([poem.theme, ...shuffle(others, random).slice(0, count - 1)], random);
}
const HISTORY_LIMIT = 300;
const snapshot = state => ({current: state.current, options: [...state.options], selected: state.selected,
  round: state.round, seen: [...state.seen], queue: [...state.queue]});
function syncHistory(state) {
  if (state.cursor >= 0) state.history[state.cursor] = snapshot(state);
}
function visit(state, cursor) {
  state.cursor = cursor;
  const saved = state.history[cursor];
  Object.assign(state, {...saved, options: [...saved.options], seen: [...saved.seen], queue: [...saved.queue]});
}
function remember(state) {
  state.history.push(snapshot(state));
  if (state.history.length > HISTORY_LIMIT) state.history.shift();
  state.cursor = state.history.length - 1;
}
export function initialState(category = 'modern') {
  return {version: 2, category, count: 3, mode: 'all', queue: [], current: null, options: [], selected: null,
    total: 0, correct: 0, streak: 0, best: 0, wrong: [], wrongAnswers: {}, round: 0, seen: [], history: [], cursor: -1};
}
export function canGoPrevious(state) {return state.cursor > 0;}
export function previousQuestion(state) {
  if (!canGoPrevious(state)) return false;
  syncHistory(state);
  visit(state, state.cursor - 1);
  return true;
}
export function nextQuestion(state) {
  syncHistory(state);
  if (state.cursor < state.history.length - 1) {
    visit(state, state.cursor + 1);
    return true;
  }
  if (state.current !== null && state.selected === null) return false;
  const poems = getPoems(state.category);
  const pool = (state.mode === 'wrong' ? poems.filter(p => state.wrong.includes(p.id)) : poems).slice().sort((a,b) => a.id-b.id);
  if (!pool.length) {
    if (state.current === null && state.history.length) return false;
    state.current = null; state.options = []; state.selected = null;
    remember(state);
    return true;
  }
  state.queue = state.queue.filter(id => pool.some(p => p.id === id));
  if (!state.queue.length) {
    state.queue = pool.map(p => p.id);
    state.round++;
    state.seen = [];
  }
  state.current = state.queue.shift();
  state.options = makeOptions(poems.find(p => p.id === state.current), state.count);
  state.selected = null;
  remember(state);
  return true;
}
export function changeCount(state, count) {
  if (![3,5].includes(count) || state.selected !== null || state.cursor < state.history.length-1) return false;
  state.count = count;
  if (state.current) state.options = makeOptions(getPoems(state.category).find(p=>p.id===state.current),count);
  syncHistory(state);
  return true;
}
export function answer(state, index) {
  if (state.selected !== null || !state.current || state.cursor < state.history.length-1 || !Number.isInteger(index) || index < 0 || index >= state.options.length) return false;
  const poem = getPoems(state.category).find(p => p.id === state.current);
  const correct = state.options[index] === poem.theme;
  state.selected = index;
  state.total++;
  if (!state.seen.includes(poem.id)) state.seen.push(poem.id);
  if (correct) {
    state.correct++; state.streak++;
    state.wrong = state.wrong.filter(id => id !== poem.id);
    delete state.wrongAnswers[poem.id];
  } else {
    state.streak = 0;
    if (!state.wrong.includes(poem.id)) state.wrong.push(poem.id);
    state.wrongAnswers[poem.id] = state.options[index];
  }
  state.best = Math.max(state.best, state.streak);
  syncHistory(state);
  return true;
}
export function changeMode(state, mode) {
  if (!['all','wrong'].includes(mode)) return;
  state.mode = mode; state.queue = []; state.round = 0; state.seen = [];
  state.current = null; state.options = []; state.selected = null;
  state.history = []; state.cursor = -1;
  nextQuestion(state);
}
export function restoreState(raw, category = 'modern') {
  const fallback = () => initialState(category);
  try {
    const s = JSON.parse(raw);
    const poems = getPoems(category);
    const ids = new Set(poems.map(p => p.id));
    const themes = new Set(poems.map(p => p.theme));
    const validIds = a => Array.isArray(a) && a.every(id => ids.has(id)) && new Set(a).size === a.length;
    if (!s || ![1,2].includes(s.version) || ![3,5].includes(s.count) || !['all', 'wrong'].includes(s.mode)) return fallback();
    if (s.category === undefined && category === 'modern') s.category = 'modern';
    if (!categories.includes(s.category) || s.category !== category) return fallback();
    if (![s.total, s.correct, s.streak, s.best, s.round].every(n => Number.isSafeInteger(n) && n >= 0) || s.correct > s.total || !validIds(s.wrong)) return fallback();
    const validQuestion = q => {
      if (!q || !Number.isSafeInteger(q.round) || q.round < 0 || !validIds(q.queue) || !validIds(q.seen)) return false;
      if (q.current === null) return Array.isArray(q.options) && q.options.length === 0 && q.selected === null;
      const poem = poems.find(p => p.id === q.current);
      return !!poem && Array.isArray(q.options) && [3,5].includes(q.options.length) && new Set(q.options).size === q.options.length && q.options.includes(poem.theme) && q.options.every(t=>themes.has(t)) &&
        (q.selected === null || (Number.isInteger(q.selected) && q.selected >= 0 && q.selected < q.options.length));
    };
    if (!validQuestion(s)) return fallback();
    if (s.version === 1) {
      // Switch existing random sessions to question 1, retaining cumulative records.
      const migrated = initialState(category);
      for (const key of ['count','total','correct','streak','best','wrong']) migrated[key] = s[key];
      if (s.current && s.selected !== null && s.wrong.includes(s.current) && s.options[s.selected] !== poems.find(p=>p.id===s.current).theme) migrated.wrongAnswers[s.current] = s.options[s.selected];
      nextQuestion(migrated);
      return migrated;
    }
    if (!Array.isArray(s.history) || s.history.length > HISTORY_LIMIT || !s.history.every(validQuestion) || !Number.isInteger(s.cursor) || s.cursor < -1 || s.cursor >= s.history.length) return fallback();
    if (s.history.length && (s.cursor < 0 || JSON.stringify(s.history[s.cursor]) !== JSON.stringify(snapshot(s)))) return fallback();
    if (!s.history.length && (s.cursor !== -1 || s.current !== null)) return fallback();
    // Only the newest question can still be unanswered.
    if (s.history.slice(0,-1).some(q=>q.current !== null && q.selected === null)) return fallback();
    if (!s.wrongAnswers || typeof s.wrongAnswers !== 'object' || Array.isArray(s.wrongAnswers)) return fallback();
    if (!Object.entries(s.wrongAnswers).every(([id,theme])=>s.wrong.includes(Number(id)) && themes.has(theme) && theme!==poems.find(p=>p.id===Number(id))?.theme)) return fallback();
    return s;
  } catch {return fallback();}
}
