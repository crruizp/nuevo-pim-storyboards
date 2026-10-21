(() => {
  // Modal de ejemplos API correlacionados. Se activa SOLO en /etapas/ y
  // trabaja ENCIMA de los botones controlados por React en vez de
  // reemplazarlos (la versión anterior clonaba cada botón a un <div>, lo
  // que rompía el VDOM y disparaba "Application error" al navegar SPA).
  //
  // Patrón: event listener en fase de captura sobre document → cuando el
  // click cae dentro de un <button aria-expanded> de /etapas/, abrimos el
  // modal y cancelamos la propagación para que React no corra su
  // expand/collapse nativo. Los botones siguen siendo React, el modal
  // queda como única acción visible.

  const basePath = '/nuevo-pim-storyboards';
  const etapasPath = `${basePath}/etapas/`;
  const collectionUrl = `${basePath}/assets/postman/nuevo-pim-partner-api.postman_collection.json`;
  const HINT_ATTR = 'data-api-modal-hint';
  const BUTTON_MARK_ATTR = 'data-api-modal-ready';

  const correlationTypes = [
    { id:'access', label:'access_token', aliases:['access_token','accessToken','Authorization'] },
    { id:'partner', label:'partnerId', aliases:['partnerId'] },
    { id:'category', label:'categoryId', aliases:['categoryId'] },
    { id:'template', label:'templateId / version', aliases:['templateId','templateVersion','version'] },
    { id:'external', label:'externalRef', aliases:['externalRef'] },
    { id:'proposal', label:'proposalId', aliases:['proposalId'] },
    { id:'batch', label:'batchId', aliases:['batchId'] },
    { id:'product', label:'productId', aliases:['productId','catalogProductId'] },
    { id:'sku', label:'SKU / EAN', aliases:['sku','ean'] },
    { id:'modification', label:'modificationId', aliases:['modificationId'] },
    { id:'webhook', label:'webhookId', aliases:['webhookId'] },
    { id:'request', label:'requestId', aliases:['requestId','idempotencyKey','nextCursor'] },
  ];

  let endpointMapPromise;
  let lastTrigger;
  let hintObserver;

  const isOnEtapas = () => window.location.pathname === etapasPath || window.location.pathname.startsWith(etapasPath);

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
  const canonicalPath = value => String(value || '')
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\{\{(?:baseUrl|idpUrl)\}\}/, '')
    .split('?')[0]
    .replace(/\{\{[^}]+\}\}/g, '{}')
    .replace(/\{[^}]+\}/g, '{}')
    .replace(/\/$/, '');

  function walkItems(items, output = []) {
    for (const item of items || []) {
      if (item.request) output.push(item);
      if (item.item) walkItems(item.item, output);
    }
    return output;
  }

  function requestBody(request) {
    const body = request?.body;
    if (!body) return '';
    if (body.mode === 'raw') return body.raw || '';
    const entries = body[body.mode] || [];
    if (Array.isArray(entries)) {
      const object = {};
      entries.forEach(entry => { if (!entry.disabled) object[entry.key] = entry.value ?? ''; });
      return JSON.stringify(object, null, 2);
    }
    return '';
  }

  function requestText(item, method, path) {
    const headers = {};
    (item?.request?.header || []).forEach(h => { if (!h.disabled) headers[h.key] = h.value; });
    const rawUrl = item?.request?.url?.raw || path;
    const query = {};
    (item?.request?.url?.query || []).forEach(p => { if (!p.disabled) query[p.key] = p.value; });
    const body = requestBody(item?.request);
    const sections = [`${method} ${rawUrl}`];
    if (Object.keys(headers).length) sections.push(`HEADERS\n${JSON.stringify(headers, null, 2)}`);
    if (Object.keys(query).length) sections.push(`QUERY\n${JSON.stringify(query, null, 2)}`);
    if (body) sections.push(`BODY\n${body}`);
    if (sections.length === 1) sections.push('Sin body · parámetros en la ruta');
    return sections.join('\n\n');
  }

  async function endpointMap() {
    if (!endpointMapPromise) {
      endpointMapPromise = fetch(collectionUrl).then(r => {
        if (!r.ok) throw new Error('No se pudo cargar la colección');
        return r.json();
      }).then(collection => {
        const map = new Map();
        walkItems(collection.item).forEach(item => {
          const method = item.request.method;
          const path = canonicalPath(item.request.url?.raw);
          const key = `${method} ${path}`;
          if (!map.has(key)) map.set(key, item);
        });
        return map;
      }).catch(() => new Map());
    }
    return endpointMapPromise;
  }

  function endpointFromButton(button) {
    const pieces = Array.from(button.querySelectorAll('*')).map(n => n.textContent?.trim()).filter(Boolean);
    const methodPiece = pieces.find(v => /^(GET|POST|PUT|PATCH|DELETE)$/i.test(v));
    const pathPiece = pieces.find(v => /^\/[A-Za-z0-9_{}./?=&:-]+$/.test(v));
    if (methodPiece && pathPiece) return { method: methodPiece.toUpperCase(), path: pathPiece };
    const aria = button.getAttribute('aria-label') || '';
    const text = `${aria} ${button.textContent || ''}`.replace(/\s+/g, ' ');
    const match = text.match(/(?:Método\s+)?(GET|POST|PUT|PATCH|DELETE)\s*(\/[^\s]+)/i);
    return match ? { method: match[1].toUpperCase(), path: match[2].replace(/[.,;]$/, '') } : null;
  }

  function correlationsIn(request, response) {
    return correlationTypes.filter(t => t.aliases.some(a => request.includes(a) || response.includes(a)));
  }

  function correlationForLine(line) {
    return correlationTypes.find(t => t.aliases.some(a => line.toLowerCase().includes(a.toLowerCase())));
  }

  function highlighted(text) {
    return String(text || 'Ejemplo aún no disponible').split('\n').map(line => {
      const type = correlationForLine(line);
      const safe = escapeHtml(line) || ' ';
      return type ? `<span class="corr-line corr-${type.id}">${safe}</span>` : safe;
    }).join('\n');
  }

  function ensureDialog() {
    let dialog = document.querySelector('#apiExampleDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'apiExampleDialog';
    dialog.className = 'api-example-dialog';
    dialog.setAttribute('aria-labelledby', 'apiModalPath');
    dialog.innerHTML = `<div class="api-modal-shell"><header class="api-modal-head"><div class="api-modal-identity"><span class="api-modal-method" id="apiModalMethod"></span><code class="api-modal-path" id="apiModalPath"></code></div><button class="api-modal-close" type="button" aria-label="Cerrar">×</button></header><section class="api-modal-context"><p class="api-modal-purpose" id="apiModalPurpose"></p><div class="correlation-legend" id="apiCorrelationLegend"></div></section><div class="api-panels"><section class="api-panel request"><header class="api-panel-head"><span class="api-panel-title">● Request</span><span class="api-panel-status">ejemplo</span></header><pre class="api-code" id="apiRequestExample"></pre></section><section class="api-panel response"><header class="api-panel-head"><span class="api-panel-title">● Response</span><span class="api-panel-status" id="apiResponseStatus">HTTP —</span></header><pre class="api-code" id="apiResponseExample"></pre></section></div><footer class="api-modal-note"><strong>Correlación:</strong> el mismo color identifica valores que se generan y después se reutilizan en otras llamadas. Ejemplos del mock; contrato sujeto a confirmación.</footer></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.api-modal-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => lastTrigger?.focus());
    return dialog;
  }

  async function openExample(button, endpoint) {
    lastTrigger = button;
    const dialog = ensureDialog();
    const map = await endpointMap();
    const item = map.get(`${endpoint.method} ${canonicalPath(endpoint.path)}`);
    const response = item?.response?.[0];
    const request = requestText(item, endpoint.method, endpoint.path);
    const responseBody = response?.body || JSON.stringify({ status: 'example_pending', message: 'Respuesta ilustrativa por completar' }, null, 2);
    const types = correlationsIn(request, responseBody);
    const purpose = button.querySelector('p')?.textContent?.trim() || item?.name || 'Ejemplo funcional del endpoint seleccionado.';
    dialog.querySelector('#apiModalMethod').textContent = endpoint.method;
    dialog.querySelector('#apiModalMethod').dataset.method = endpoint.method;
    dialog.querySelector('#apiModalPath').textContent = endpoint.path;
    dialog.querySelector('#apiModalPurpose').textContent = purpose;
    dialog.querySelector('#apiRequestExample').innerHTML = highlighted(request);
    dialog.querySelector('#apiResponseExample').innerHTML = highlighted(responseBody);
    dialog.querySelector('#apiResponseStatus').textContent = `HTTP ${response?.code ?? '—'}`;
    dialog.querySelector('#apiCorrelationLegend').innerHTML = types.length ? types.map(t => {
      const inReq = t.aliases.some(a => request.toLowerCase().includes(a.toLowerCase()));
      const inRes = t.aliases.some(a => responseBody.toLowerCase().includes(a.toLowerCase()));
      const state = inReq && inRes ? 'entra y sale' : inRes ? 'se genera' : 'se reutiliza';
      return `<span class="corr-chip corr-${t.id}">${escapeHtml(t.label)} <small>${state}</small></span>`;
    }).join('') : '<span class="correlation-empty">Sin identificadores correlacionados en este ejemplo</span>';
    if (!dialog.open) dialog.showModal();
  }

  // Click en fase de CAPTURA → interceptamos antes de que React corra su
  // handler y abrimos modal. Solo actuamos si estamos en /etapas/ y el
  // click cae dentro de un botón de endpoint.
  document.addEventListener('click', event => {
    if (!isOnEtapas()) return;
    const button = event.target.closest('button[aria-expanded]');
    if (!button) return;
    const endpoint = endpointFromButton(button);
    if (!endpoint) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openExample(button, endpoint);
  }, true);

  // "Teclado" equivalente para accesibilidad.
  document.addEventListener('keydown', event => {
    if (!isOnEtapas()) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const button = event.target.closest('button[aria-expanded]');
    if (!button) return;
    const endpoint = endpointFromButton(button);
    if (!endpoint) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openExample(button, endpoint);
  }, true);

  // Añade un "hint" visual dentro de cada botón de endpoint SIN
  // reemplazarlo. Usamos un span appended; React no toca lo que no tiene
  // en su VDOM (los hijos que agregamos aquí son invisibles para React).
  function addHint(button) {
    if (button.getAttribute(BUTTON_MARK_ATTR) === '1') return;
    button.setAttribute(BUTTON_MARK_ATTR, '1');
    const hint = document.createElement('span');
    hint.className = 'endpoint-hint';
    hint.setAttribute(HINT_ATTR, '1');
    hint.textContent = 'Ver request y response';
    button.appendChild(hint);
  }

  function sweepHints() {
    if (!isOnEtapas()) return;
    document.querySelectorAll('button[aria-expanded]').forEach(addHint);
  }

  // Observador liviano que sólo barre cuando estamos en /etapas/.
  // Se desconecta y reconecta según el pathname para no quemar CPU en
  // otras rutas durante navegación SPA.
  function startObserver() {
    if (hintObserver) return;
    hintObserver = new MutationObserver(() => sweepHints());
    hintObserver.observe(document.body, { childList: true, subtree: true });
  }
  function stopObserver() {
    if (!hintObserver) return;
    hintObserver.disconnect();
    hintObserver = undefined;
  }

  function syncToPathname() {
    if (isOnEtapas()) {
      startObserver();
      sweepHints();
    } else {
      stopObserver();
    }
  }

  // Hook de navegación SPA — Next no dispara 'popstate' en Link clicks,
  // así que parcheamos pushState/replaceState una sola vez.
  if (!window.__apiModalPatched) {
    window.__apiModalPatched = true;
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function (...args) { const r = push.apply(this, args); queueMicrotask(syncToPathname); return r; };
    history.replaceState = function (...args) { const r = replace.apply(this, args); queueMicrotask(syncToPathname); return r; };
    window.addEventListener('popstate', syncToPathname);
  }

  syncToPathname();
})();
