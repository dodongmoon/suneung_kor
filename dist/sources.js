// Original grouped PDFs stay separate and are only requested when opened.
const files = {
  modern: {
    '1,2': 'modern-1-2', '3,4': 'modern-3-4', '5,6': 'modern-5-6',
    '7-10': 'modern-7-10', '11-16': 'modern-11-16', '17-21': 'modern-17-21',
    '22-27': 'modern-22-27', '28-31': 'modern-28-31', '32-36': 'modern-32-36',
  },
  classical: {
    '1주차': 'classical-1', '2주차': 'classical-2', '3주차': 'classical-3',
    '3주차-2': 'classical-3-2', '4주차': 'classical-4',
    '5주차': 'classical-5', '5주차-1': 'classical-5-1',
  },
};

export function sourceDocument(poem) {
  const filename = files[poem.category]?.[poem.sourceRange];
  if (!filename || !Number.isInteger(poem.sourcePage) || poem.sourcePage < 1) {
    throw new Error('작품의 PDF 출처를 확인해 주세요.');
  }
  return `./pdfs/${filename}.pdf#page=${poem.sourcePage}&view=FitH`;
}
