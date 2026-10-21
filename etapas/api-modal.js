(() => {
  const collectionUrl = '../assets/postman/nuevo-pim-partner-api.postman_collection.json';
  const correlationTypes = [
    {id:'access', label:'access_token', aliases:['access_token','accessToken','Authorization']},
    {id:'partner', label:'partnerId', aliases:['partnerId']},
    {id:'category', label:'categoryId', aliases:['categoryId']},
    {id:'template', label:'templateId / version', aliases:['templateId','templateVersion','version']},
    {id:'external', label:'externalRef', aliases:['externalRef']},
    {id:'proposal', label:'proposalId', aliases:['proposalId']},
    {id:'batch', label:'batchId', aliases:['batchId']},
    {id:'product', label:'productId', aliases:['productId','catalogProductId']},
    {id:'sku', label:'SKU / EAN', aliases:['sku','ean']},
    {id:'modification', label:'modificationId', aliases:['modificationId']},
    {id:'webhook', label:'webhookId', aliases:['webhookId']},
    {id:'request', label:'requestId', aliases:['requestId','idempotencyKey','nextCursor']}
  ];
  let endpointMapPromise;
  let lastTrigger;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const canonicalPath = value => String(value || '')
    .replace(/^https?:\/\/[^/]+/,'')
    .replace(/^\{\{(?:baseUrl|idpUrl)\}\}/,'')
    .split('?')[0]
    .replace(/\{\{[^}]+\}\}/g,'{}')
    .replace(/\{[^}]+\}/g,'{}')
    .replace(/\/$/,'');

  function walkItems(items, output=[]){
    for(const item of items || []){
      if(item.request) output.push(item);
      if(item.item) walkItems(item.item, output);
    }
    return output;
  }

  function requestBody(request){
    const body = request?.body;
    if(!body) return '';
    if(body.mode === 'raw') return body.raw || '';
    const entries = body[body.mode] || [];
    if(Array.isArray(entries)){
      const object = {};
      entries.forEach(entry => { if(!entry.disabled) object[entry.key] = entry.value ?? ''; });
      return JSON.stringify(object,null,2);
    }
    return '';
  }

  function requestText(item, method, path){
    const headers = {};
    (item?.request?.header || []).forEach(header => { if(!header.disabled) headers[header.key] = header.value; });
    const rawUrl = item?.request?.url?.raw || path;
    const query = {};
    (item?.request?.url?.query || []).forEach(param => { if(!param.disabled) query[param.key] = param.value; });
    const body = requestBody(item?.request);
    const sections = [`${method} ${rawUrl}`];
    if(Object.keys(headers).length) sections.push(`HEADERS\n${JSON.stringify(headers,null,2)}`);
    if(Object.keys(query).length) sections.push(`QUERY\n${JSON.stringify(query,null,2)}`);
    if(body) sections.push(`BODY\n${body}`);
    if(sections.length === 1) sections.push('Sin body · parámetros en la ruta');
    return sections.join('\n\n');
  }

  async function endpointMap(){
    if(!endpointMapPromise){
      endpointMapPromise = fetch(collectionUrl).then(response => {
        if(!response.ok) throw new Error('No se pudo cargar la colección');
        return response.json();
      }).then(collection => {
        const map = new Map();
        walkItems(collection.item).forEach(item => {
          const method = item.request.method;
          const path = canonicalPath(item.request.url?.raw);
          const key = `${method} ${path}`;
          if(!map.has(key)) map.set(key,item);
        });
        return map;
      }).catch(() => new Map());
    }
    return endpointMapPromise;
  }

  function endpointFromButton(button){
    const pieces = Array.from(button.querySelectorAll('*')).map(node => node.textContent?.trim()).filter(Boolean);
    const methodPiece = pieces.find(value => /^(GET|POST|PUT|PATCH|DELETE)$/i.test(value));
    const pathPiece = pieces.find(value => /^\/[A-Za-z0-9_{}./?=&:-]+$/.test(value));
    if(methodPiece && pathPiece) return {method:methodPiece.toUpperCase(),path:pathPiece};
    const aria = button.getAttribute('aria-label') || '';
    const text = `${aria} ${button.textContent || ''}`.replace(/\s+/g,' ');
    const match = text.match(/(?:Método\s+)?(GET|POST|PUT|PATCH|DELETE)\s*(\/[^\s]+)/i);
    return match ? {method:match[1].toUpperCase(), path:match[2].replace(/[.,;]$/,'')} : null;
  }

  function correlationsIn(request, response){
    return correlationTypes.filter(type => type.aliases.some(alias => request.includes(alias) || response.includes(alias)));
  }

  function correlationForLine(line){
    return correlationTypes.find(type => type.aliases.some(alias => line.toLowerCase().includes(alias.toLowerCase())));
  }

  function highlighted(text){
    return String(text || 'Ejemplo aún no disponible').split('\n').map(line => {
      const type = correlationForLine(line);
      const safe = escapeHtml(line) || ' ';
      return type ? `<span class="corr-line corr-${type.id}">${safe}</span>` : safe;
    }).join('\n');
  }

  function ensureDialog(){
    let dialog = document.querySelector('#apiExampleDialog');
    if(dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'apiExampleDialog';
    dialog.className = 'api-example-dialog';
    dialog.setAttribute('aria-labelledby','apiModalPath');
    dialog.innerHTML = `<div class="api-modal-shell"><header class="api-modal-head"><div class="api-modal-identity"><span class="api-modal-method" id="apiModalMethod"></span><code class="api-modal-path" id="apiModalPath"></code></div><button class="api-modal-close" type="button" aria-label="Cerrar">×</button></header><section class="api-modal-context"><p class="api-modal-purpose" id="apiModalPurpose"></p><div class="correlation-legend" id="apiCorrelationLegend"></div></section><div class="api-panels"><section class="api-panel request"><header class="api-panel-head"><span class="api-panel-title">● Request</span><span class="api-panel-status">ejemplo</span></header><pre class="api-code" id="apiRequestExample"></pre></section><section class="api-panel response"><header class="api-panel-head"><span class="api-panel-title">● Response</span><span class="api-panel-status" id="apiResponseStatus">HTTP —</span></header><pre class="api-code" id="apiResponseExample"></pre></section></div><footer class="api-modal-note"><strong>Correlación:</strong> el mismo color identifica valores que se generan y después se reutilizan en otras llamadas. Ejemplos del mock; contrato sujeto a confirmación.</footer></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.api-modal-close').addEventListener('click',() => dialog.close());
    dialog.addEventListener('click',event => { if(event.target === dialog) dialog.close(); });
    dialog.addEventListener('close',() => lastTrigger?.focus());
    return dialog;
  }

  async function openExample(button, endpoint){
    lastTrigger = button;
    const dialog = ensureDialog();
    const map = await endpointMap();
    const item = map.get(`${endpoint.method} ${canonicalPath(endpoint.path)}`);
    const response = item?.response?.[0];
    const request = requestText(item,endpoint.method,endpoint.path);
    const responseBody = response?.body || JSON.stringify({status:'example_pending',message:'Respuesta ilustrativa por completar'},null,2);
    const types = correlationsIn(request,responseBody);
    const purpose = button.querySelector('p')?.textContent?.trim() || item?.name || 'Ejemplo funcional del endpoint seleccionado.';
    dialog.querySelector('#apiModalMethod').textContent = endpoint.method;
    dialog.querySelector('#apiModalMethod').dataset.method = endpoint.method;
    dialog.querySelector('#apiModalPath').textContent = endpoint.path;
    dialog.querySelector('#apiModalPurpose').textContent = purpose;
    dialog.querySelector('#apiRequestExample').innerHTML = highlighted(request);
    dialog.querySelector('#apiResponseExample').innerHTML = highlighted(responseBody);
    dialog.querySelector('#apiResponseStatus').textContent = `HTTP ${response?.code ?? '—'}`;
    dialog.querySelector('#apiCorrelationLegend').innerHTML = types.length ? types.map(type => {
      const inRequest = type.aliases.some(alias => request.toLowerCase().includes(alias.toLowerCase()));
      const inResponse = type.aliases.some(alias => responseBody.toLowerCase().includes(alias.toLowerCase()));
      const state = inRequest && inResponse ? 'entra y sale' : inResponse ? 'se genera' : 'se reutiliza';
      return `<span class="corr-chip corr-${type.id}">${escapeHtml(type.label)} <small>${state}</small></span>`;
    }).join('') : '<span class="correlation-empty">Sin identificadores correlacionados en este ejemplo</span>';
    if(!dialog.open) dialog.showModal();
  }

  document.addEventListener('click',event => {
    const button = event.target.closest('.api-modal-trigger');
    if(!button) return;
    const endpoint = endpointFromButton(button);
    if(!endpoint) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openExample(button,endpoint);
  },true);

  const simuladorPath = '/nuevo-pim-storyboards/simulador/';
  const labelSimulatorNavigation = () => document.querySelectorAll('a[href="/nuevo-pim-storyboards/playground/"],a[href="/nuevo-pim-storyboards/simulador/"]').forEach(link => {
    link.setAttribute('href',simuladorPath);
    const walker = document.createTreeWalker(link,NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())){
      if(node.nodeValue.includes('Playground')) node.nodeValue = node.nodeValue.replace('Playground','Simulador API');
    }
  });

  document.addEventListener('click',event => {
    const link = event.target.closest(`a[href="${simuladorPath}"]`);
    if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.assign(`${simuladorPath}?v=simulador-api-20261020`);
  },true);

  const labelEndpoints = () => document.querySelectorAll('button[aria-expanded]').forEach(original => {
    if(original.dataset.apiModalBound) return;
    // The exported React page delegates the old inline/cURL interaction from its
    // root. A DOM clone keeps the card design but deliberately drops that
    // delegated component identity, leaving this modal as the only action.
    const button = document.createElement('div');
    button.className = `${original.className} api-modal-trigger`;
    button.innerHTML = original.innerHTML;
    button.setAttribute('role','button');
    button.setAttribute('tabindex','0');
    button.setAttribute('aria-label',original.getAttribute('aria-label') || 'Ver request y response');
    button.dataset.apiModalBound = 'true';
    button.addEventListener('click',event => {
      const endpoint = endpointFromButton(button);
      if(!endpoint) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      openExample(button,endpoint);
    });
    button.addEventListener('keydown',event => {
      if(event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      button.click();
    });
    original.replaceWith(button);
    if(button.querySelector('.endpoint-hint')) return;
    const hint = document.createElement('span');
    hint.className = 'endpoint-hint';
    hint.textContent = 'Ver request y response';
    button.appendChild(hint);
  });
  labelSimulatorNavigation();
  labelEndpoints();
  new MutationObserver(() => {
    labelSimulatorNavigation();
    labelEndpoints();
  }).observe(document.body,{childList:true,subtree:true});
})();
