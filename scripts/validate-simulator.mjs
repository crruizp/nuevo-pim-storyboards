import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const chunkDir = path.join(root, '_next/static/chunks/app/simulador');
const chunkName = fs.readdirSync(chunkDir).find((name) => /^page-.*\.js$/.test(name));
if (!chunkName) throw new Error('No se encontró bundle del simulador');

const bundle = fs.readFileSync(path.join(chunkDir, chunkName), 'utf8');
const collection = JSON.parse(fs.readFileSync(path.join(root, 'assets/postman/nuevo-pim-partner-api.postman_collection.json'), 'utf8'));
const start = bundle.indexOf('let l={happy:') + 6;
const end = bundle.indexOf(';var c=', start);
if (start < 6 || end < 0) throw new Error('No se pudo extraer la definición de escenarios');

const scenarios = Function(`return (${bundle.slice(start, end)})`)();
const requests = [];
function walk(items) {
  for (const item of items ?? []) {
    if (item.request) requests.push(item);
    walk(item.item);
  }
}
walk(collection.item);

function normalize(url) {
  return url
    .replace(/^\{\{(?:baseUrl|idpUrl)\}\}/, '')
    .split('?')[0]
    .replace(/\{\{[^}]+\}\}/g, '{id}')
    .replace(/\/(?:PROP|PRD|MOD|BATCH|REQ|WHK|CAT)-[^/?]+/g, '/{id}');
}

const missingOperations = [];
const missingExamples = [];
for (const scenario of Object.values(scenarios)) {
  for (const step of scenario.pasos) {
    const requestPath = step.mockPath ?? step.path;
    const operation = requests.find((request) => request.request.method === step.method && normalize(request.request.url.raw) === normalize(requestPath));
    if (!operation) missingOperations.push(`${scenario.id} · ${step.method} ${requestPath}`);
    const responseName = step.extraHeaders?.['x-mock-response-name'];
    if (responseName && !requests.some((request) => request.response?.some((response) => response.name === responseName))) {
      missingExamples.push(`${scenario.id} · ${responseName}`);
    }
  }
}

const kinds = Object.values(scenarios).reduce((result, scenario) => {
  result[scenario.kind] = (result[scenario.kind] ?? 0) + 1;
  return result;
}, {});

// La navegación actual agrupa los recorridos de negocio dentro de Principal y
// Operación. Mantener esta distribución alineada con el bundle publicado evita
// que el validador rechace una exportación correcta por una taxonomía anterior.
const expectedKinds = { Principal: 4, 'Excepción': 3, Error: 5, 'Operación': 6 };
if (Object.entries(expectedKinds).some(([kind, count]) => kinds[kind] !== count) || Object.keys(kinds).length !== Object.keys(expectedKinds).length) {
  throw new Error(`Clasificación inesperada: ${JSON.stringify(kinds)}`);
}
if (missingOperations.length) throw new Error(`Operaciones faltantes:\n${missingOperations.join('\n')}`);
if (missingExamples.length) throw new Error(`Ejemplos faltantes:\n${missingExamples.join('\n')}`);

for (const request of requests) {
  const raw = request.request.body?.raw;
  if (raw?.trim().match(/^[\[{]/)) JSON.parse(raw);
  for (const response of request.response ?? []) {
    if (response.body?.trim().match(/^[\[{]/)) JSON.parse(response.body);
  }
}

const protectedPaths = [
  'flujo-guiado/index.html',
  'flujo-guiado/presentacion.js',
  'simulador/presentation-launcher.js',
];
for (const protectedPath of protectedPaths) {
  if (!fs.existsSync(path.join(root, protectedPath))) throw new Error(`Falta archivo protegido: ${protectedPath}`);
}

const exampleCount = requests.reduce((count, request) => count + (request.response?.length ?? 0), 0);
console.log(JSON.stringify({
  scenarios: Object.keys(scenarios).length,
  kinds,
  uiSteps: Object.values(scenarios).reduce((count, scenario) => count + scenario.pasos.length, 0),
  collectionRequests: requests.length,
  savedExamples: exampleCount,
  missingOperations: missingOperations.length,
  missingExamples: missingExamples.length,
}, null, 2));
