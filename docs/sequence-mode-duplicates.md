# Manejo de Fragmentos Duplicados en Sequence Mode

## Problema Original

En pasajes con texto repetitivo (como Eclesiastés 3:2-8), el chunking genera fragmentos idénticos:

```
Eclesiastés 3:2-8 (fragmentado en chunks de 3 palabras):

1. "Tiempo de nacer"
2. "y tiempo de"       ← duplicado
3. "morir; tiempo de"
4. "plantar, y tiempo"
5. "de arrancar lo"    
6. "plantado; tiempo de"
7. "matar, y tiempo"
8. "de curar; tiempo"  ← duplicado "de"
... (14 veces "y tiempo de")
```

### Por qué era un problema

La implementación original validaba por **ID/índice**:

```typescript
if (chunk.id === expectedChunk.id) { // ❌ Solo compara índice
  // correcto
} else {
  // error (aunque el texto sea idéntico!)
}
```

**Resultado:** El usuario veía múltiples botones con "y tiempo de" pero solo uno era "correcto" por índice arbitrario. Los demás marcaban error aunque el texto fuera idéntico.

---

## Solución Implementada: Match Semántico

La nueva lógica valida por **contenido normalizado**:

```typescript
const normalizeChunkText = (text: string) =>
  text.toLowerCase().trim().replace(/[,;.]/g, '');

const isCorrectByContent =
  normalizeChunkText(chunk.text) === normalizeChunkText(expectedChunk.text);

if (isCorrectByContent) {
  // ✅ Aceptar cualquier chunk con texto equivalente
  const nextTrail = [...selectionTrail, expectedChunk]; // mantener orden
  // ... remover del disponible, continuar
}
```

### Normalización Aplicada

1. **Lowercase**: `"Tiempo"` → `"tiempo"`
2. **Trim espacios**: `"  y tiempo  "` → `"y tiempo"`
3. **Remover puntuación**: `"guardar,"` → `"guardar"`, `"guardar;"` → `"guardar"`

Esto permite:
- Ignorar diferencias de mayúsculas/minúsculas
- Ignorar puntuación al final del chunk
- Ignorar espacios extra

---

## Casos Edge Cubiertos

### ✅ Caso 1: Fragmentos idénticos repetidos
```
Entrada: "y tiempo de" (aparece 14 veces)
Comportamiento: Cualquiera de los 14 botones "y tiempo de" es válido
```

### ✅ Caso 2: Fragmentos con puntuación diferente
```
Chunk esperado: "tiempo de guardar,"
Chunk seleccionado: "tiempo de guardar;"
Resultado: ✅ Correcto (ignora puntuación)
```

### ✅ Caso 3: Mayúsculas/minúsculas
```
Chunk esperado: "Tiempo de nacer"
Chunk seleccionado: "tiempo de nacer"
Resultado: ✅ Correcto (normaliza case)
```

### ❌ Caso 4: Contenido diferente (no debe matchear)
```
Chunk esperado: "tiempo de bailar"
Chunk seleccionado: "tiempo de llorar"
Resultado: ❌ Error (contenido diferente)
```

---

## Trade-offs de la Solución

### Pros ✅
- **Intuitivo**: El usuario ordena por significado, no por índice arbitrario
- **Sin cambios visuales**: No necesita números ni contexto extra en la UI
- **Funciona con cualquier pasaje**: No requiere chunking especial
- **Mejor UX**: Elimina frustración en pasajes repetitivos

### Contras ⚠️
- **Posible desorden oculto**: En pasajes MUY repetitivos, el usuario podría tocar chunks fuera de orden sin darse cuenta (pero el orden final en `selectionTrail` siempre es el esperado)
- **Dependencia de normalización**: La función `normalizeChunkText` debe ser consistente con el tokenizer

---

## Tests

El test `tests/sequence-duplicates.test.js` valida 7 casos:

```bash
node tests/sequence-duplicates.test.js
```

Casos probados:
1. Fragmentos idénticos sin puntuación
2. Fragmentos con puntuación diferente
3. Fragmentos con contenido diferente (no debe matchear)
4. Fragmentos con espacios extra
5. Mayúsculas vs minúsculas
6. Fragmentos completamente diferentes
7. Caso real de Eclesiastés 3

---

## Pasajes de Prueba Recomendados

Para validar manualmente el comportamiento:

### Alta repetición (ideal para testing):
- **Eclesiastés 3:1-8**: "y tiempo de" aparece 14 veces
- **Salmo 136**: "Porque para siempre es su misericordia" (refrain cada versículo)
- **Génesis 1**: "Y vio Dios que era bueno" repetido múltiples veces

### Repetición moderada:
- **Mateo 5:3-12** (Bienaventuranzas): "Bienaventurados los..." se repite
- **1 Corintios 13:4-8**: "El amor es..." se repite

### Sin repetición (control):
- **Juan 3:16**: texto único, sin fragmentos duplicados
- **Romanos 8:28**: sin repeticiones

---

## Futuras Mejoras Opcionales

Si se detecta que la solución actual causa confusión:

### Opción A: Indicador visual de duplicados
Mostrar badge con número de ocurrencia en duplicados:
```
[y tiempo de ①] [y tiempo de ②] [y tiempo de ③]
```

### Opción B: Context preview
Mostrar las palabras siguientes en hover/long-press:
```
y tiempo de → "...morir; tiempo..."
y tiempo de → "...plantar, y tiempo..."
```

### Opción C: Smart chunking
Modificar `chunkVerseForSequenceMode` para fusionar duplicados:
```
"y tiempo de morir" (4 palabras)
"y tiempo de plantar" (4 palabras)
```

Por ahora, la **Solución actual (match semántico)** es suficiente y elegante.

---

## Implementación Técnica

### Archivos modificados:
- `components/sequence-mode-card.tsx`: lógica de `handleChunkClick`
- `tests/sequence-duplicates.test.js`: test unitario de normalización

### Función clave:
```typescript
const normalizeChunkText = (text: string) =>
  text.toLowerCase().trim().replace(/[,;.]/g, '');
```

### Comportamiento:
1. Usuario toca un chunk
2. Se normaliza el texto del chunk tocado y del esperado
3. Si coinciden → se acepta (se usa `expectedChunk` para mantener el orden)
4. Si no coinciden → se marca error y se suma a `mistakesByChunk`

---

## Conclusión

Esta solución resuelve el problema de fragmentos duplicados de manera elegante, sin cambios en la UI ni en el chunking. Los tests pasan y la experiencia del usuario mejora significativamente en pasajes repetitivos como Eclesiastés 3.

**Status:** ✅ Implementado y probado (Oct 22, 2025)
