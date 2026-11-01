// Revisa que public/sw.js esté al día (si falla: node scripts/lista-sw.mjs)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generar } from '../scripts/lista-sw.mjs';

test('sw.js tiene la lista de archivos actual', () => {
  const actual = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
  assert.equal(actual, generar(), 'Corre: node scripts/lista-sw.mjs');
});
