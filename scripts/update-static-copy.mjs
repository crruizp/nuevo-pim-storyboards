import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const files = ['simulador/index.html', 'simulador/index.txt'];
const replacements = [
  ['Seis recorridos cubren alta, producto existente, corrección, lote, modificación y recuperación.', 'Dieciocho recorridos cubren altas, excepciones, errores, operación y reglas de negocio.'],
  ['37 requests + 37 ejemplos', '37 requests + 63 ejemplos'],
  ['Ejecuta seis recorridos del ciclo de vida', 'Ejecuta 18 recorridos del ciclo de vida'],
];

for (const relativePath of files) {
  const filePath = path.join(root, relativePath);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [before, after] of replacements) content = content.split(before).join(after);
  fs.writeFileSync(filePath, content);
  console.log(`Actualizado: ${relativePath}`);
}
