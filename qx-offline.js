(() => {
  const KEY = 'agenda-qx-records-v1';
  const endpoint = 'https://script.google.com/macros/s/AKfycbz1qnnUdtRzDPOz1N68aWwEu6uc7U9pyQ3erM0u1MiHj4PCga6ZCtwwh8tNRnv7Pl48xQ/exec';
  const banner = document.getElementById('offline-status');
  const readyLabel = document.getElementById('offline-ready');
  const refreshButton = document.getElementById('refresh-agenda');
  let shellReady = false, dataSaved = false, shellFailed = false;
  let saved = null, controller = null, timer = null, busy = false, lastAttempt = 0;
  function updateReady() {
    if (!readyLabel) return;
    readyLabel.textContent = shellReady && dataSaved ? '✓ Disponible sin conexión' :
      shellFailed ? 'Acceso sin conexión no disponible' :
      shellReady ? 'Pendiente de guardar la agenda' : 'Preparando acceso sin conexión…';
    readyLabel.title = saved ? 'Agenda guardada: ' + new Date(saved.savedAt).toLocaleString('es-CL') : '';
  }
  async function checkShell() {
    try {
      const cache = await caches.open('agenda-qx-shell-v6');
      const page = new URL(location.pathname, location.origin).href;
      const assets = [page, new URL('./qx-offline.js?v=5',location.href).href,
        new URL('./qx-icon-180.png',location.href).href,
        document.querySelector('link[rel="manifest"]').href,
        new URL('./qx-model.js?v=5',location.href).href,new URL('./qx-app.js?v=5',location.href).href, new URL('./qx.css?v=5',location.href).href];
      shellReady = (await Promise.all(assets.map(url=>cache.match(url)))).every(Boolean);
      if (shellReady) shellFailed=false;
      updateReady();
    } catch { shellFailed=true; updateReady(); }
  }
  function valid(data) { return window.AgendaModel.validPayload(data); }
  function show(text) { banner.textContent = text; banner.hidden = !text; }
  function storedMessage(prefix) {
    const old = saved && Date.now() - saved.savedAt > 24 * 60 * 60 * 1000;
    return saved ? prefix + (old ? ' · Atención: copia de más de 24 horas' : '') + ' · Guardada ' + new Date(saved.savedAt).toLocaleString('es-CL') :
      'Sin agenda guardada. Conéctate a internet para descargarla por primera vez.';
  }
  function render(data) {
    const rendered=window.agendaLiveCallback({status:'ok',table:{rows:data.records.map(r=>({
      c:[r.week,r.date,r.day,r.surgeon,r.category,r.activity].map(v=>({v}))
    }))}});
    if(rendered!==true)throw new Error('No se pudo mostrar la agenda');
  }
  try {
    const cached = JSON.parse(localStorage.getItem(KEY));
    if (cached && valid(cached.payload) && Number.isFinite(cached.savedAt)) {
      render(cached.payload);
      saved = cached;
      dataSaved = true;
      show(storedMessage(navigator.onLine ? 'Copia guardada · Buscando actualización' : 'Sin conexión'));
    }
  } catch {}
  function cleanup() {
    clearTimeout(timer); controller?.abort(); controller = null; busy = false;
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
    try { render(payload); } catch { failed(); return; }
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
  async function refresh() {
    if (busy) return;
    if (!navigator.onLine) { if (!saved) failed(); show(storedMessage('Sin conexión')); return; }
    busy = true; lastAttempt = Date.now();
    if(refreshButton) { refreshButton.disabled=true; refreshButton.textContent='Actualizando…'; }
    controller = new AbortController();
    const requestController = controller;
    timer = setTimeout(() => requestController.abort(), 20000);
    try {
      const response = await fetch(endpoint + '?format=qxdata&t=' + lastAttempt, {
        cache: 'no-store', credentials: 'omit', signal: requestController.signal
      });
      if (!response.ok) throw new Error('No se pudo descargar la agenda');
      const text = await response.text();
      if (text.length > 2000000) throw new Error('Agenda demasiado grande');
      // Accept JSON or the legacy JSONP envelope strictly as data. Never execute it.
      const payload = window.AgendaModel.parsePayload(text);
      if (controller !== requestController) return;
      window.agendaQxData(payload);
    } catch (_) {
      if (controller === requestController) failed();
    }
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
