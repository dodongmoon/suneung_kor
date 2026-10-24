import {poems} from './poems.js';
import {classicalPoems} from './classical-poems.js';

export const categories = ['modern', 'classical'];
export const sections = {
  modern: {label: '현대시', poems},
  classical: {label: '고전시가', poems: classicalPoems},
};
export function getPoems(category = 'modern') {
  if (!categories.includes(category)) throw new Error('알 수 없는 학습 섹션입니다.');
  return sections[category].poems;
}
export function sourceLabel(poem) {
  return `${sections[poem.category].label} ${poem.sourceRange} 손필기 · PDF ${poem.sourcePages || poem.sourcePage}쪽${poem.themeOrigin === 'summary' ? ' · 필기 요약' : ''}`;
}
