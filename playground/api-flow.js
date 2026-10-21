const stages = [
  {title:'Contexto y autenticación',method:'POST',endpoint:'/oauth/token',purpose:'Iniciar la interacción y devolver el contexto mínimo que permite continuar sin asumir todavía una creación.',input:'Credenciales y contexto del canal',output:'Sesión o contexto autorizado',request:[['credential','••••••••','Acreditar al consumidor'],['channel','marketplace','Identificar el origen'],['correlationRef','FLOW-EXAMPLE','Dar trazabilidad']],question:'Mecanismo de autenticación, vigencia, scopes, ruta, método y códigos.',response:{status:'context_ready',authorized:true,next:'resolve_partner'}},
  {title:'Identificación del partner',method:'GET',endpoint:'/partner/v1/me',purpose:'Obtener o confirmar el partnerId que relaciona la operación con el seller o socio correcto.',input:'Contexto autorizado',output:'partnerId utilizable en el flujo',request:[['contextRef','CONTEXT-EXAMPLE','Reutilizar el contexto'],['partnerHint','SELLER-EXAMPLE','Acotar la búsqueda']],question:'Fuente de verdad, formato del identificador y qué ocurre si existe más de un partner.',response:{partnerId:'PARTNER_EXAMPLE',status:'identified',next:'register_notifications'}},
  {title:'Registro de notificaciones',method:'POST',endpoint:'/partner/v1/webhooks',purpose:'Registrar un canal para recibir cambios de estado y avisos del proceso asíncrono.',input:'partnerId + destino de notificaciones',output:'Suscripción de webhook pendiente o activa',request:[['partnerId','PARTNER-EXAMPLE','Vincular la suscripción'],['callbackUrl','https://…/notifications','Recibir avisos'],['events','proposal, product','Elegir cambios relevantes']],question:'Eventos, firma, expiración, reintentos, orden, duplicados y estados del webhook.',response:{subscriptionId:'SUBSCRIPTION_EXAMPLE',status:'pending_verification',events:['proposal.changed','product.changed']}},
  {title:'Identificación de categoría',method:'GET',endpoint:'/partner/v1/categories/discovery',purpose:'Determinar la categoría de Marketplace que define los atributos y reglas de la ficha; por ejemplo, batería portátil.',input:'Descripción, referencias o categoría candidata',output:'Categoría seleccionada o alternativas',request:[['description','Batería portátil','Describir el producto'],['reference','PB-20K-EXAMPLE','Agregar una pista opcional'],['locale','es-MX','Aplicar contexto comercial']],question:'Reglas de selección, nivel de confianza y resolución cuando existen varias categorías.',response:{example:'Batería portátil',categoryId:'CATEGORY_EXAMPLE',confidence:'illustrative',alternatives:2}},
  {title:'Búsqueda de coincidencias',method:'GET',endpoint:'/partner/v1/products/search',purpose:'Buscar si el producto ya existe o si hay una referencia compatible antes de iniciar una creación.',input:'Datos conocidos + categoría',output:'Coincidencias y señal de decisión',request:[['categoryId','CATEGORY-EXAMPLE','Limitar el universo'],['identifiers','GTIN / modelo','Buscar identificadores fuertes'],['attributes','marca, capacidad…','Comparar atributos clave']],question:'Umbral de coincidencia alta, atributos decisivos y tratamiento de falsos positivos.',response:{matches:[{reference:'PRODUCT_REFERENCE',level:'high'}],recommendedAction:'review_reference'}},
  {title:'Construcción de ficha',method:'GET',endpoint:'/partner/v1/categories/{id}',purpose:'Completar una propuesta de ficha usando la información recibida, la categoría y, cuando aplique, una referencia compatible.',input:'Atributos + plantilla + referencia opcional',output:'Borrador de ficha trazable',request:[['categoryId','CATEGORY-EXAMPLE','Aplicar la plantilla'],['referenceId','PRODUCT-REFERENCE','Reutilizar una base opcional'],['attributes','campos capturados','Construir la ficha']],question:'Campos obligatorios, procedencia de cada atributo y qué puede sugerir IA frente a lo que exige validación humana.',response:{draftId:'DRAFT_EXAMPLE',completeness:'illustrative',sourceTraceability:true,status:'draft'}},
  {title:'Validación sin crear',method:'POST',endpoint:'/partner/v1/validations',purpose:'Validar estructura, contenido y reglas de negocio sin crear todavía el producto.',input:'Borrador de ficha',output:'Resultado válido o lista de correcciones',request:[['draftId','DRAFT-EXAMPLE','Identificar el borrador'],['mode','validate_only','Evitar una creación'],['ruleset','CATEGORY-CURRENT','Aplicar reglas vigentes']],question:'Formato de errores, severidades, validaciones síncronas/asíncronas y posibilidad de revalidar parcialmente.',response:{valid:false,errors:[{field:'attribute_example',message:'Regla por definir'}],canCorrect:true}},
  {title:'Decisión y ejecución',method:'POST',endpoint:'/partner/v1/proposals',purpose:'Tomar una decisión explícita: proponer sobre una referencia, crear un producto nuevo o actualizar uno existente.',input:'Ficha validada + coincidencias + versión vigente',output:'Propuesta o ejecución con seguimiento',request:[['draftId','DRAFT-EXAMPLE','Usar la ficha validada'],['action','propose | create | update','Expresar la intención'],['expectedVersion','VERSION-EXAMPLE','Prevenir sobrescritura']],question:'Reglas exactas de decisión, idempotencia, concurrencia, estados y notificaciones posteriores.',response:{decision:'proposal | create | update',status:'pending_definition',trackingId:'TRACKING_EXAMPLE'}}
];

const scenarios = [
  {id:'happy',label:'Alta sin coincidencia',badge:'Happy path',description:'No existe una coincidencia alta. La ficha se completa, se valida y solamente entonces se habilita la creación.',states:['done','done','done','done','done','done','done','decision'],labels:['Contexto','Partner','Webhook','Categoría','Sin match','Ficha','Válida','Crear'],outcome:'Creación controlada',risk:'Evitar que “crear” sea la primera operación'},
  {id:'match',label:'Coincidencia alta',badge:'Evita duplicado',description:'La búsqueda encuentra una referencia compatible. El flujo la utiliza como base y genera una propuesta; no crea automáticamente un producto nuevo.',states:['done','done','done','done','decision','done','done','decision'],labels:['Contexto','Partner','Webhook','Categoría','Match alto','Usar base','Validar','Proponer'],outcome:'Propuesta sobre referencia',risk:'Definir umbral y revisión humana'},
  {id:'existing',label:'Producto existente',badge:'Modificación',description:'El producto ya existe. Se recupera su versión vigente, se construye el cambio, se valida el delta y se actualiza únicamente si no existe conflicto.',states:['done','done','done','done','decision','done','done','decision'],labels:['Contexto','Partner','Webhook','Categoría','Localizar','Cambio','Validar','Actualizar'],outcome:'Actualización trazable',risk:'Definir versión, permisos y campos modificables'},
  {id:'invalid',label:'Ficha con errores',badge:'Corrección',description:'La validación encuentra faltantes o reglas incumplidas. Devuelve correcciones accionables, conserva el borrador y permite revalidar sin comenzar de cero.',states:['done','done','done','done','done','done','blocked',''],labels:['Contexto','Partner','Webhook','Categoría','Match','Ficha','Corregir','En espera'],outcome:'No se crea ni actualiza',risk:'Estandarizar errores, severidad y reintento'},
  {id:'concurrency',label:'Cambio simultáneo',badge:'Concurrencia',description:'Otra persona modifica el mismo producto. La operación debe detectar una versión distinta, detener la escritura y conducir a conciliación o reintento seguro.',states:['done','done','done','done','done','done','done','blocked'],labels:['Contexto','Partner','Webhook','Categoría','Existente','Cambio','Validar','Conflicto'],outcome:'Bloqueo seguro + conciliación',risk:'Elegir estrategia de locking o versión optimista'}
];

let selectedStage = 0;
let selectedScenario = 'happy';
const stageGrid = document.querySelector('#stageGrid');
const summary = document.querySelector('#flowSummary');
const progress = document.querySelector('#progressLine');
const dialog = document.querySelector('#stageDialog');
const formatJson = value => JSON.stringify(value,null,2);

function renderStages(){
  stageGrid.innerHTML = stages.map((stage,index)=>`<li><button class="stage-card${index===selectedStage?' selected':''}" type="button" data-stage="${index}" aria-label="Etapa ${index+1}: ${stage.title}"><span class="stage-number">${String(index+1).padStart(2,'0')}</span><strong>${stage.title}</strong><span class="endpoint-line"><b class="method method-${stage.method.toLowerCase()}">${stage.method}</b><code title="${stage.endpoint}">${stage.endpoint}</code></span></button></li>`).join('');
  const stage=stages[selectedStage];
  summary.querySelector('.summary-number').textContent=String(selectedStage+1).padStart(2,'0');
  summary.querySelector('strong').textContent=stage.title;
  progress.style.width=`${selectedStage/7*100}%`;
  stageGrid.querySelectorAll('.stage-card').forEach(button=>button.addEventListener('click',()=>{selectedStage=Number(button.dataset.stage);renderStages();openStage(selectedStage);}));
}

function openStage(index){
  selectedStage=index;
  const stage=stages[index];
  document.querySelector('#dialogStep').textContent=`ETAPA ${String(index+1).padStart(2,'0')} / 08`;
  document.querySelector('#dialogTitle').textContent=stage.title;
  document.querySelector('#dialogPurpose').textContent=stage.purpose;
  document.querySelector('#dialogInput').textContent=stage.input;
  document.querySelector('#dialogOutput').textContent=stage.output;
  document.querySelector('#dialogRequest').innerHTML=stage.request.map(row=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`).join('');
  document.querySelector('#dialogQuestion').textContent=stage.question;
  document.querySelector('#dialogResponse').textContent=formatJson(stage.response);
  document.querySelector('#dialogCounter').textContent=`${index+1} de 8`;
  document.querySelector('#previousStage').disabled=index===0;
  document.querySelector('#nextStage').textContent=index===7?'Cerrar':'Siguiente →';
  renderStages();
  if(!dialog.open)dialog.showModal();
}

document.querySelector('#openSelected').addEventListener('click',()=>openStage(selectedStage));
document.querySelector('#closeDialog').addEventListener('click',()=>dialog.close());
document.querySelector('#previousStage').addEventListener('click',()=>{if(selectedStage>0)openStage(selectedStage-1)});
document.querySelector('#nextStage').addEventListener('click',()=>selectedStage===7?dialog.close():openStage(selectedStage+1));
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});

function renderScenarios(){
  const tabs=document.querySelector('#scenarioTabs');
  tabs.innerHTML=scenarios.map((scenario,index)=>`<button type="button" class="scenario-tab${scenario.id===selectedScenario?' active':''}" role="tab" aria-selected="${scenario.id===selectedScenario}" data-scenario="${scenario.id}"><span>${String(index+1).padStart(2,'0')}</span>${scenario.label}</button>`).join('');
  const scenario=scenarios.find(item=>item.id===selectedScenario);
  document.querySelector('#scenarioDetail').innerHTML=`<div class="scenario-top"><div><span class="kicker">Escenario funcional</span><h3>${scenario.label}</h3><p>${scenario.description}</p></div><span class="scenario-badge">${scenario.badge}</span></div><div class="mini-flow">${scenario.labels.map((label,index)=>`<div class="mini-step ${scenario.states[index]||''}"><b>${String(index+1).padStart(2,'0')}</b><span>${label}</span></div>`).join('')}</div><div class="scenario-outcome"><div><small>Resultado esperado</small><strong>${scenario.outcome}</strong></div><div><small>Decisión que debe cerrarse</small><strong>${scenario.risk}</strong></div></div>`;
  tabs.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{selectedScenario=button.dataset.scenario;renderScenarios()}));
}

renderStages();
renderScenarios();
