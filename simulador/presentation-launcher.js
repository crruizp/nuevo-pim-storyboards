(() => {
  if (document.querySelector('#guidedFlowLauncher')) return;
  const link = document.createElement('a');
  link.id = 'guidedFlowLauncher';
  link.href = '/nuevo-pim-storyboards/flujo-guiado/';
  link.innerHTML = '<span>▶</span><strong>Presentar flujo</strong><small>Explicación guiada</small>';
  Object.assign(link.style,{position:'fixed',right:'22px',bottom:'22px',zIndex:'80',display:'grid',gridTemplateColumns:'32px auto',columnGap:'10px',alignItems:'center',padding:'12px 16px',border:'1px solid rgba(255,255,255,.18)',borderRadius:'14px',background:'linear-gradient(135deg,#e10098,#a30073)',color:'#fff',textDecoration:'none',boxShadow:'0 18px 45px rgba(0,0,0,.45)',fontFamily:'Inter,system-ui,sans-serif'});
  link.querySelector('span').style.cssText='grid-row:1/3;display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:rgba(255,255,255,.18);font-size:11px';
  link.querySelector('strong').style.cssText='font-size:13px;line-height:1.1';
  link.querySelector('small').style.cssText='font-size:10px;opacity:.78;margin-top:3px';
  document.body.appendChild(link);
})();
