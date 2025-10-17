import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTsModule } from './helpers/load-ts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const utils = loadTsModule(path.resolve(__dirname, '../lib/utils.ts'));

const genesisPath = path.resolve(__dirname, '../public/bible_data/genesis.json');
const genesis = JSON.parse(fs.readFileSync(genesisPath, 'utf8'));

const verse = genesis[0][0];
const textWithNumbers = `<sup>1</sup>&nbsp;${verse}`;

console.log('--- RAW VERSE ---');
console.log(verse);
console.log('--- TEXT WITH NUMBERS ---');
console.log(textWithNumbers);

const tokens = utils.tokenize(textWithNumbers);
console.log('--- TOKENS ---');
console.log(tokens.map(t => ({text: t.text, verse: t.verse})).slice(0,40));

// Example attempt to produce diff
const attempt = 'En el principio creó Dios los cielos y la tierra.';
const attemptTokens = utils.tokenize(attempt);
const diff = utils.diffTokens(tokens, attemptTokens, { normalize: utils.normalizeForCompare });
console.log('--- DIFF ---');
console.log(diff.slice(0,60));

process.exit(0);
