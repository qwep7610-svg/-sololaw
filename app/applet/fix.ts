import * as fs from 'fs';

const lines = fs.readFileSync('src/services/gemini.ts', 'utf8').split('\n');
const newLines = [
  ...lines.slice(0, 424),
  '- 보유 증거: ${data.evidence}',
  '- 정신과 치료 기록: ${data.medicalRecord}',
  '- 추가 맥락: ${data.customContext}',
  '',
  '[Task Instructions]',
  '1. 상대방의 부정행위가 혼인 파탄의 주된 원인임을 명확히 하십시오.',
  '2. 부정행위의 기간, 정도, 발각 후의 태도 등을 구체적으로 서술하여 악의성을 강조하십시오.',
  '3. 원고가 겪은 극심한 정신적 고통과 가정 파탄으로 인한 피해를 호소력 있게 작성하십시오.',
  '4. 관련 판례를 인용하여 청구하는 위자료 금액의 정당성을 뒷받침하십시오.',
  ...lines.slice(454)
];

fs.writeFileSync('src/services/gemini.ts', newLines.join('\n'));
