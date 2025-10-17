import { fileURLToPath } from 'node:url';
import path from 'path';
import { loadTsModule } from './helpers/load-ts.js';

const grade = loadTsModule(path.resolve('./lib/grade.ts'));
const utils = loadTsModule(path.resolve('./lib/utils.ts'));

const target = 'En el principio creó Dios los cielos y la tierra.';
const attempts = [
  'En el princ',
  'En el princ ipio',
  'En el princ1ipio creó',
  'En el principe creó',
  'En el principio creó Dios los cielos y la tierra.'
];

for (const a of attempts) {
  console.log('---- ATTEMPT ----');
  console.log(a);
  const res = grade.gradeAttempt(target, a);
  console.log('accuracy', res.accuracy);
  console.log('missedWords', res.missedWords);
  console.log('extraWords', res.extraWords);
  console.log('diff', res.diff);
}
