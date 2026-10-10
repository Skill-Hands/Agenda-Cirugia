const {chromium,webkit}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const fixturePage=surgeon=>`<!doctype html><html lang="es" data-surgeon="${surgeon}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="manifest" href="./qx.webmanifest">
<link rel="stylesheet" href="./qx.css?v=5"></head><body>
<div id="offline-status" hidden></div><span id="offline-ready"></span><button id="refresh-agenda">Actualizar</button><span id="load-status"></span>
<section id="principal"><header class="hero"><h1></h1><div class="meta"><span class="pill"></span></div></header><div class="card"><div class="days"></div></div><div class="card"></div></section>
<section id="servicio"></section><script src="./qx-model.js?v=5"></script><script src="./qx-app.js?v=5"></script><script src="./qx-offline.js?v=5"></script></body></html>`;
const row=(surgeon,date='2026-10-12',week=42)=>({week,date,day:'Lunes',surgeon,category:'Sala',activity:'08:00-10:00'});
(async()=>{
 const root=process.cwd(),types={'.js':'application/javascript','.css':'text/css','.png':'image/png'};
 const server=http.createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname.endsWith('.html')){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixturePage(pathname==='/qx.html'?'SINTETICO_A':'SINTETICO_B'));}
   if(pathname.endsWith('.webmanifest')){res.setHeader('Content-Type','application/manifest+json; charset=utf-8');return res.end(JSON.stringify({id:pathname,start_url:pathname.replace('.webmanifest','.html'),scope:'./',name:'Agenda sintética',display:'standalone'}));}
   const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
   res.setHeader('Content-Type',(types[path.extname(file)]||'application/octet-stream')+(path.extname(file)==='.png'?'':'; charset=utf-8'));res.end(await fs.readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  for(const engine of [chromium,webkit]){
   const browser=await engine.launch({headless:true});
   try{
    const context=await browser.newContext(),page=await context.newPage(),errors=[];
    let payload={ok:true,records:[row('SINTETICO_A'),row('SINTETICO_B')]};
    await context.route('https://script.google.com/**',route=>route.fulfill({status:200,contentType:'application/json',
     headers:{'access-control-allow-origin':'*'},body:JSON.stringify(payload)}));
    await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin===origin||url.hostname==='script.google.com'?route.fallback():route.abort();});
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>console.log(engine.name()+': '+message.type()+': '+message.text()));
    const stage=async(label,operation)=>{try{await operation();console.log(engine.name()+': '+label+' passed');}catch(error){console.log(await page.evaluate(async()=>({title:document.querySelector('#principal .hero h1')?.textContent,ready:document.getElementById('offline-ready')?.textContent,status:document.getElementById('offline-status')?.textContent,online:navigator.onLine,recordCount:JSON.parse(localStorage.getItem('agenda-qx-records-v1')||'null')?.payload?.records?.length,controlled:!!navigator.serviceWorker.controller,keys:await caches.keys()})));throw new Error(label+': '+error.message+'; page errors: '+errors.join('; '));}};
    await page.goto(origin+'/qx.html?s=SINTETICO_B');
    await stage('professional identity',()=>page.waitForFunction(()=>document.querySelector('#principal .hero h1')?.textContent.includes('Sintetico_a')));
    await stage('offline readiness',()=>page.waitForFunction(()=>document.getElementById('offline-ready')?.textContent.includes('Disponible sin conexión')));
    await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>navigator.serviceWorker.controller?true:new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(true),{once:true}))));
    payload={ok:true,records:[]};
    await page.locator('#refresh-agenda').click();
    await stage('empty agenda',()=>page.waitForFunction(()=>JSON.parse(localStorage.getItem('agenda-qx-records-v1')).payload.records.length===0));
    assert.match(await page.locator('#principal .days').textContent(),/Sin actividades/);
    payload={ok:true,records:[row('SINTETICO_A','2027-01-08',1)]};
    await page.locator('#refresh-agenda').click();
    await stage('replaced week',()=>page.waitForFunction(()=>document.querySelector('#principal .day')?.dataset.date==='2027-01-08'));
    await context.setOffline(true);await page.reload();
    await stage('offline reopen',()=>page.waitForFunction(()=>document.getElementById('offline-status')?.textContent.includes('Sin conexión')));
    assert.equal(await page.locator('#principal .day').getAttribute('data-date'),'2027-01-08');
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(engine.name()+': fixtures, professional identity, empty agenda, replaced week and offline passed.');
   }finally{await browser.close();}
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
