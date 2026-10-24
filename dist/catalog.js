import {poems} from './poems.js';
import {classicalPoems} from './classical-poems.js';
import {suwanModern, suwanClassical} from './suwan-poems.js';

export const genres = ['modern', 'classical'];
export const books = {sutek: {label: '수능특강'}, suwan: {label: '수능완성'}};
export const categories = ['modern', 'classical', 'suwan-modern', 'suwan-classical'];
export const sections = {
  modern: {book: 'sutek', genre: 'modern', label: '현대시', poems},
  classical: {book: 'sutek', genre: 'classical', label: '고전시가', poems: classicalPoems},
  'suwan-modern': {book: 'suwan', genre: 'modern', label: '현대시', poems: suwanModern},
  'suwan-classical': {book: 'suwan', genre: 'classical', label: '고전시가', poems: suwanClassical},
};
export function categoryFor(book, genre) {
  const category = categories.find(c => sections[c].book === book && sections[c].genre === genre);
  if (!category) throw new Error('알 수 없는 교재 또는 갈래입니다.');
  return category;
}
export function sectionTitle(category) {
  const section = sections[category];
  return `${books[section.book].label} ${section.label}`;
}
export function getPoems(category = 'modern') {
  if (!categories.includes(category)) throw new Error('알 수 없는 학습 섹션입니다.');
  return sections[category].poems;
}
export function sourceLabel(poem) {
  return `${sectionTitle(poem.category)} ${poem.sourceRange} 손필기 · PDF ${poem.sourcePages || poem.sourcePage}쪽${poem.themeOrigin === 'summary' ? ' · 필기 요약' : ''}`;
}
