import {categories} from './catalog.js?v=suwan-1';
import {initialState, nextQuestion, restoreState} from './engine.js?v=suwan-1';

export const storageKeys = {
  // Preserve the original storage key so existing modern-poetry records remain available.
  modern: 'sutek-poem-loop-v1',
  classical: 'sutek-poem-loop-classical-v1',
  'suwan-modern': 'suwan-poem-loop-modern-v1',
  'suwan-classical': 'suwan-poem-loop-classical-v1',
};
const activeKey = 'sutek-poem-loop-section';
export function loadProgress(storage) {
  const states = {};
  for (const category of categories) {
    try {states[category] = restoreState(storage.getItem(storageKeys[category]), category);}
    catch {states[category] = initialState(category);}
  }
  let active = 'modern';
  try {const saved = storage.getItem(activeKey); if (categories.includes(saved)) active = saved;} catch {}
  return {states, active};
}
export function activateSection(progress, category) {
  if (!categories.includes(category)) return;
  progress.active = category;
  const state = progress.states[category];
  if (state.current === null) nextQuestion(state);
}
export function saveProgress(storage, progress) {
  const category = progress.active;
  storage.setItem(storageKeys[category], JSON.stringify(progress.states[category]));
  storage.setItem(activeKey, category);
}
