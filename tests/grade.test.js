import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './helpers/load-ts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { gradeAttempt } = loadTsModule(path.resolve(__dirname, '../lib/grade.ts'));

describe('gradeAttempt', () => {
  test('returns 100 accuracy for perfect match', () => {
    const result = gradeAttempt(
      'En el principio creó Dios los cielos y la tierra.',
      'En el principio creó Dios los cielos y la tierra.'
    );
    assert.equal(result.accuracy, 100);
    assert.deepStrictEqual(result.missedWords, []);
    assert.deepStrictEqual(result.extraWords, []);
    assert.equal(result.feedback, '¡Perfecto! Sigue reforzándolo.');
  });

  test('identifies missing words ignoring punctuation', () => {
    const result = gradeAttempt(
      'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito;',
      'Porque de tal manera amó Dios al mundo'
    );
    assert.ok(result.accuracy < 100);
    assert.deepStrictEqual(result.extraWords, []);
    assert.ok(result.missedWords.includes('que'));
    assert.ok(result.missedWords.includes('Hijo'));
    assert.equal(result.paraphraseOk, false);
  });

  test('flags extra words from attempt', () => {
    const result = gradeAttempt(
      'El Señor es mi pastor; nada me faltará.',
      'El Señor es mi pastor fiel; nada me faltará siempre.'
    );
    assert.ok(result.extraWords.includes('fiel'));
    assert.ok(result.extraWords.includes('siempre'));
    assert.ok(result.missedWords.length === 0);
  });

  test('trims and handles whitespace-only attempts', () => {
    assert.throws(() => gradeAttempt('Texto', '   '), /calificar/);
  });

  test('handles target without alphabetic tokens', () => {
    const result = gradeAttempt('¡Amén!', 'Amén');
    assert.equal(result.accuracy, 100);
    assert.deepStrictEqual(result.missedWords, []);
  });
});
