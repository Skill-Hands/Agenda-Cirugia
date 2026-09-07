(() => {
  const KEY = 'agenda-qx-records-v1';
  const endpoint = 'https://script.google.com/macros/s/AKfycbz1qnnUdtRzDPOz1N68aWwEu6uc7U9pyQ3erM0u1MiHj4PCga6ZCtwwh8tNRnv7Pl48xQ/exec';
  const banner = document.getElementById('offline-status');
  let saved = null, script = null, timer = null, busy = false, lastAttempt = 0;
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
      render(saved.payload);
      show(storedMessage(navigator.onLine ? 'Copia guardada · Buscando actualización' : 'Sin conexión'));
    }
  } catch {}
  function cleanup() { clearTimeout(timer); script?.remove(); script = null; busy = false; }
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
      show('');
    } catch {
      show('Agenda actualizada · No se pudo guardar en este dispositivo.');
    }
  };
  function refresh() {
    if (busy) return;
    if (!navigator.onLine) { if (!saved) failed(); show(storedMessage('Sin conexión')); return; }
    busy = true; lastAttempt = Date.now();
    script = document.createElement('script');
    script.src = endpoint + '?format=qxdata&t=' + lastAttempt;
    script.onerror = failed;
    timer = setTimeout(failed, 20000);
    document.head.appendChild(script);
  }
  window.addEventListener('online', refresh);
  window.addEventListener('offline', () => { cleanup(); show(storedMessage('Sin conexión')); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - lastAttempt > 60000) refresh();
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./qx-sw.js').catch(() => {
      show('La agenda funciona, pero no se pudo preparar la apertura sin internet.');
    });
  } else {
    show('Este navegador no permite preparar la apertura sin internet.');
  }
  refresh();
})();
