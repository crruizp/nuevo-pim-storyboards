(() => {
  const etapasPath = '/nuevo-pim-storyboards/etapas/';
  const simuladorPath = '/nuevo-pim-storyboards/simulador/';

  const labelSimulatorNavigation = () => document.querySelectorAll('nav a[href="/nuevo-pim-storyboards/playground/"],nav a[href="/nuevo-pim-storyboards/simulador/"]').forEach(link => {
    link.setAttribute('href',simuladorPath);
    const walker = document.createTreeWalker(link,NodeFilter.SHOW_TEXT);
    let node;
    while((node = walker.nextNode())){
      if(node.nodeValue.includes('Playground')) node.nodeValue = node.nodeValue.replace('Playground','Simulador API');
    }
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('nav a[href^="/nuevo-pim-storyboards/"]');
    if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const pathname = new URL(link.href,window.location.href).pathname;
    const destination = pathname === etapasPath
      ? `${etapasPath}?view=correlated-api`
      : pathname === simuladorPath
        ? `${simuladorPath}?v=simulador-api-20261020`
        : pathname;
    window.location.assign(destination);
  }, true);

  labelSimulatorNavigation();
  new MutationObserver(labelSimulatorNavigation).observe(document.body,{childList:true,subtree:true});
})();
