(() => {
  const etapasPath = '/nuevo-pim-storyboards/etapas/';

  document.addEventListener('click', event => {
    const link = event.target.closest(`a[href="${etapasPath}"]`);
    if(!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.assign(`${etapasPath}?view=correlated-api`);
  }, true);
})();
