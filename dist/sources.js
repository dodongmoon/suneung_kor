import {pageImages} from './page-images.js?v=suwan-1';
// Each file contains only this work, including its continuation and notes pages.
const pageCounts = {
  "modern": [
    1,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    1,
    1,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ],
  "classical": [
    1,
    1,
    3,
    7,
    2,
    4,
    6,
    3,
    5,
    4,
    3,
    2,
    2,
    2,
    6,
    2,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ],
  "suwan-modern": [
    1,
    1,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ],
  "suwan-classical": [
    5,
    2,
    8,
    2,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ]
};

export function sourcePageCount(poem) {
  const count = Number.isInteger(poem.id) && pageCounts[poem.category]?.[poem.id - 1];
  if (!count) throw new Error('작품의 PDF 출처를 확인해 주세요.');
  return count;
}

export function sourceDocument(poem) {
  sourcePageCount(poem);
  return `./pdfs/works/${poem.category}-${String(poem.id).padStart(2, '0')}.pdf#page=1&view=FitH`;
}

export function sourceImages(poem) {
  sourcePageCount(poem);
  const key = `${poem.category}-${String(poem.id).padStart(2, '0')}`;
  return pageImages[key].map((size, index) => ({
    ...size, src: `./pages/${key}-${index + 1}.webp`,
  }));
}
