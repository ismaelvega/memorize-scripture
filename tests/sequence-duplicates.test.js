/**
 * Test para validar el manejo de fragmentos duplicados en Sequence Mode
 * Caso específico: Eclesiastés 3:2-8 tiene "y tiempo de" repetido 14 veces
 */

// Función de normalización (copiada de sequence-mode-card.tsx)
function normalizeChunkText(text) {
  return text.toLowerCase().trim().replace(/[,;.]/g, '');
}

// Casos de prueba
const testCases = [
  {
    description: 'Fragmentos idénticos con diferente puntuación',
    chunk1: 'y tiempo de',
    chunk2: 'y tiempo de',
    shouldMatch: true,
  },
  {
    description: 'Fragmentos con puntuación diferente al final',
    chunk1: 'tiempo de guardar,',
    chunk2: 'tiempo de guardar;',
    shouldMatch: true,
  },
  {
    description: 'Fragmentos similares pero diferente contenido',
    chunk1: 'tiempo de bailar',
    chunk2: 'tiempo de llorar',
    shouldMatch: false,
  },
  {
    description: 'Fragmentos con espacios extra',
    chunk1: '  y tiempo de  ',
    chunk2: 'y tiempo de',
    shouldMatch: true,
  },
  {
    description: 'Mayúsculas vs minúsculas',
    chunk1: 'Tiempo de nacer',
    chunk2: 'tiempo de nacer',
    shouldMatch: true,
  },
  {
    description: 'Fragmentos completamente diferentes',
    chunk1: 'tiempo de plantar',
    chunk2: 'arrancar lo plantado',
    shouldMatch: false,
  },
  {
    description: 'Caso real de Eclesiastés 3',
    chunk1: 'y tiempo de',
    chunk2: 'y tiempo de',
    shouldMatch: true,
  },
];

console.log('🧪 Probando normalización de fragmentos duplicados...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const normalized1 = normalizeChunkText(testCase.chunk1);
  const normalized2 = normalizeChunkText(testCase.chunk2);
  const matches = normalized1 === normalized2;
  const success = matches === testCase.shouldMatch;

  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
    console.log(`   "${testCase.chunk1}" vs "${testCase.chunk2}"`);
    console.log(`   → "${normalized1}" === "${normalized2}" = ${matches}\n`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   "${testCase.chunk1}" vs "${testCase.chunk2}"`);
    console.log(`   → "${normalized1}" === "${normalized2}" = ${matches}`);
    console.log(`   Expected: ${testCase.shouldMatch}\n`);
  }
});

console.log('─'.repeat(50));
console.log(`Resultados: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ Todos los tests pasaron!');
  process.exit(0);
} else {
  console.log('❌ Algunos tests fallaron');
  process.exit(1);
}
