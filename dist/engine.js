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
export function initialState(category = 'modern') {
  return {version: 1, category, count: 3, mode: 'all', queue: [], current: null, options: [], selected: null,
    total: 0, correct: 0, streak: 0, best: 0, wrong: [], round: 0, seen: []};
}
export function nextQuestion(state) {
  const poems = getPoems(state.category);
  const pool = state.mode === 'wrong' ? poems.filter(p => state.wrong.includes(p.id)) : poems;
  if (!pool.length) {state.current = null; state.options = []; state.selected = null; return;}
  state.queue = state.queue.filter(id => pool.some(p => p.id === id));
  if (!state.queue.length) {
    state.queue = shuffle(pool.map(p => p.id));
    // Avoid repeating the last poem at a round boundary when other poems exist.
    if (state.queue.length > 1 && state.queue[0] === state.current) {
      [state.queue[0], state.queue[1]] = [state.queue[1], state.queue[0]];
    }
    state.round++;
    state.seen = [];
  }
  state.current = state.queue.shift();
  state.options = makeOptions(poems.find(p => p.id === state.current), state.count);
  state.selected = null;
}
export function answer(state, index) {
  if (state.selected !== null || !state.current || !Number.isInteger(index) || index < 0 || index >= state.options.length) return false;
  const poem = getPoems(state.category).find(p => p.id === state.current);
  const correct = state.options[index] === poem.theme;
  state.selected = index;
  state.total++;
  state.seen.push(poem.id);
  if (correct) {state.correct++; state.streak++; state.wrong = state.wrong.filter(id => id !== poem.id);}
  else {state.streak = 0; if (!state.wrong.includes(poem.id)) state.wrong.push(poem.id);}
  state.best = Math.max(state.best, state.streak);
  return true;
}
export function changeMode(state, mode) {
  state.mode = mode; state.queue = []; state.round = 0; state.seen = [];
  nextQuestion(state);
}
export function restoreState(raw, category = 'modern') {
  const fallback = () => initialState(category);
  try {
    const s = JSON.parse(raw);
    const poems = getPoems(category);
    const ids = new Set(poems.map(p => p.id));
    const validIds = a => Array.isArray(a) && a.every(id => ids.has(id)) && new Set(a).size === a.length;
    if (!s || s.version !== 1 || ![3, 5].includes(s.count) || !['all', 'wrong'].includes(s.mode)) return fallback();
    // Pre-section records belong to modern poetry only. Keep their full progress.
    if (s.category === undefined && category === 'modern') s.category = 'modern';
    if (!categories.includes(s.category) || s.category !== category) return fallback();
    if (![s.total, s.correct, s.streak, s.best, s.round].every(n => Number.isSafeInteger(n) && n >= 0) || s.correct > s.total) return fallback();
    if (![s.queue, s.seen, s.wrong].every(validIds)) return fallback();
    if (s.current !== null) {
      const poem = poems.find(p => p.id === s.current);
      if (!poem || !Array.isArray(s.options) || s.options.length !== s.count || new Set(s.options).size !== s.count || !s.options.includes(poem.theme) || !s.options.every(t => poems.some(p => p.theme === t))) return fallback();
      if (s.selected !== null && (!Number.isInteger(s.selected) || s.selected < 0 || s.selected >= s.count)) return fallback();
    }
    return s;
  } catch {return fallback();}
}
