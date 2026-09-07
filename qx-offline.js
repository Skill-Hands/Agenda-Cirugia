(() => {
  const KEY = 'agenda-qx-records-v1';
  const endpoint = 'https://script.google.com/macros/s/AKfycbz1qnnUdtRzDPOz1N68aWwEu6uc7U9pyQ3erM0u1MiHj4PCga6ZCtwwh8tNRnv7Pl48xQ/exec';
  const banner = document.getElementById('offline-status');
  const readyLabel = document.getElementById('offline-ready');
  const refreshButton = document.getElementById('refresh-agenda');
  let shellReady = false, dataSaved = false, shellFailed = false;
  let saved = null, script = null, timer = null, busy = false, lastAttempt = 0;
  function updateReady() {
    if (!readyLabel) return;
    readyLabel.textContent = shellReady && dataSaved ? '✓ Disponible sin conexión' :
      shellFailed ? 'Acceso sin conexión no disponible' :
      shellReady ? 'Pendiente de guardar la agenda' : 'Preparando acceso sin conexión…';
    readyLabel.title = saved ? 'Agenda guardada: ' + new Date(saved.savedAt).toLocaleString('es-CL') : '';
  }
  async function checkShell() {
    try {
      const cache = await caches.open('agenda-qx-shell-v4');
      const page = new URL(location.pathname, location.origin).href;
      const assets = [page, new URL('./qx-offline.js?v=4',location.href).href,
        new URL('./qx-icon-180.png',location.href).href,
        document.querySelector('link[rel="manifest"]').href];
      shellReady = (await Promise.all(assets.map(url=>cache.match(url)))).every(Boolean);
      if (shellReady) shellFailed=false;
      updateReady();
    } catch { shellFailed=true; updateReady(); }
  }
  function valid(data) {
    return data && data.ok && Array.isArray(data.records) && data.records.length &&
      data.records.every(r => Number.isFinite(Number(r.week)) && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        ['day','surgeon','category','activity'].every(k => typeof r[k] === 'string'));
  }
  function show(text) { banner.textContent = text; banner.hidden = !text; }
  function storedMessage(prefix) {
    return saved ? prefix + ' · Guardada ' + new Date(saved.savedAt).toLocaleString('es-CL') :
      'Sin agenda guardada. Conéctate a internet para descargarla por primera vez.';
  }
  function render(data) {
    window.agendaLiveCallback({status:'ok',table:{rows:data.records.map(r=>({
      c:[r.week,r.date,r.day,r.surgeon,r.category,r.activity].map(v=>({v}))
    }))}});
  }
  try {
    const cached = JSON.parse(localStorage.getItem(KEY));
    if (cached && valid(cached.payload) && Number.isFinite(cached.savedAt)) {
      saved = cached;
      dataSaved = true;
      render(saved.payload);
      show(storedMessage(navigator.onLine ? 'Copia guardada · Buscando actualización' : 'Sin conexión'));
    }
  } catch {}
  function cleanup() {
    clearTimeout(timer); script?.remove(); script = null; busy = false;
    if(refreshButton) { refreshButton.disabled=false; refreshButton.textContent='Actualizar ahora'; }
  }
  function failed() {
    cleanup();
    show(storedMessage('Sin actualizar'));
    if (!saved) {
      document.querySelector('#principal .days').textContent = 'No se pudo descargar la agenda.';
      const pill=document.querySelector('#principal .hero .meta .pill');
      if(pill) pill.textContent='Pendiente de descargar';
      const loading=document.getElementById('load-status');
      if(loading) loading.hidden=true;
      const service=document.querySelector('#plan-dia .svc-none');
      if(service) service.textContent='Conéctate a internet para descargar la agenda.';
    }
  }
  window.agendaQxData = payload => {
    if (!valid(payload)) { failed(); return; }
    cleanup();
    render(payload);
    saved = {payload, savedAt: Date.now()};
    try {
      localStorage.setItem(KEY, JSON.stringify(saved));
      dataSaved = true;
      show('');
    } catch {
      dataSaved = false;
      show('Agenda actualizada · No se pudo guardar en este dispositivo.');
    }
    updateReady();
  };
  function refresh() {
    if (busy) return;
    if (!navigator.onLine) { if (!saved) failed(); show(storedMessage('Sin conexión')); return; }
    busy = true; lastAttempt = Date.now();
    if(refreshButton) { refreshButton.disabled=true; refreshButton.textContent='Actualizando…'; }
    script = document.createElement('script');
    script.src = endpoint + '?format=qxdata&t=' + lastAttempt;
    script.onerror = failed;
    timer = setTimeout(failed, 20000);
    document.head.appendChild(script);
  }
  window.addEventListener('online', refresh);
  refreshButton?.addEventListener('click', () => { checkShell(); refresh(); });
  window.addEventListener('offline', () => { cleanup(); show(storedMessage('Sin conexión')); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastAttempt > 60000) refresh();
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange',checkShell);
    navigator.serviceWorker.ready.then(checkShell);
    navigator.serviceWorker.register('./qx-sw.js').then(registration => {
      checkShell();
      const watch = () => {
        const worker=registration.installing;
        if(worker) worker.addEventListener('statechange', () => {
          if(worker.state==='activated') checkShell();
          if(worker.state==='redundant') { shellFailed=true; updateReady(); }
        });
      };
      watch();
      registration.addEventListener('updatefound',watch);
    }).catch(() => {
      shellFailed=true; updateReady();
      show('La agenda funciona, pero no se pudo preparar la apertura sin internet.');
    });
  } else {
    shellFailed=true; updateReady();
    show('Este navegador no permite preparar la apertura sin internet.');
  }
  updateReady();
  refresh();
})();
