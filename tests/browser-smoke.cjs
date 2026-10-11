const {chromium,webkit}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const fixturePage=(surgeon,manifest='qx.webmanifest')=>`<!doctype html><html lang="es" data-surgeon="${surgeon}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="manifest" href="./${manifest}">
<link rel="stylesheet" href="./qx.css?v=5"></head><body>
<div id="offline-status" hidden></div><span id="offline-ready"></span><button id="refresh-agenda">Actualizar</button><span id="load-status"></span>
<section id="principal"><header class="hero"><h1></h1><div class="meta"><span class="pill"></span></div></header><div class="card"><div class="days"></div></div><div class="card"></div></section>
<section id="servicio"></section><script src="./qx-model.js?v=5"></script><script src="./qx-app.js?v=5"></script><script src="./qx-offline.js?v=5"></script></body></html>`;
const row=(surgeon,date='2026-10-12',week=42)=>({week,date,day:'Lunes',surgeon,category:'Sala',activity:'08:00-10:00'});
(async()=>{
 const root=process.cwd(),types={'.js':'application/javascript','.css':'text/css','.png':'image/png'};
 let payload={ok:true,records:[]};
 const server=http.createServer(async(req,res)=>{
  try{
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(pathname==='/synthetic-agenda'){res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(payload));}
   if(pathname.endsWith('.html')){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixturePage(pathname==='/qx.html'?'SINTETICO_A':'SINTETICO_B',pathname.slice(1).replace('.html','.webmanifest')));}
   if(pathname.endsWith('.webmanifest')){res.setHeader('Content-Type','application/manifest+json; charset=utf-8');return res.end(JSON.stringify({id:pathname,start_url:pathname.replace('.webmanifest','.html'),scope:'./',name:'Agenda sintética',display:'standalone'}));}
   const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error('path');
   res.setHeader('Content-Type',(types[path.extname(file)]||'application/octet-stream')+(path.extname(file)==='.png'?'':'; charset=utf-8'));let content=await fs.readFile(file);
   if(pathname==='/qx-offline.js'){
    const original=content.toString('utf8');
    const offline=original.replace(/const endpoint = '[^']+';/, "const endpoint = '/synthetic-agenda';");
    if(offline===original)throw Error('Synthetic endpoint substitution failed');
    content=offline;
   }
   res.end(content);
  }catch{res.statusCode=404;res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  for(const engine of [chromium,webkit]){
   const browser=await engine.launch({headless:true});
   try{
    const context=await browser.newContext(),page=await context.newPage(),errors=[];
    payload={ok:true,records:[row('SINTETICO_A'),row('SINTETICO_B')]};
    // The served reader uses a local fixture endpoint; service workers cannot bypass that boundary.
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>console.log(engine.name()+': '+message.type()+': '+message.text()));
    const stage=async(label,operation)=>{try{await operation();console.log(engine.name()+': '+label+' passed');}catch(error){console.log(await page.evaluate(async()=>({title:document.querySelector('#principal .hero h1')?.textContent,ready:document.getElementById('offline-ready')?.textContent,status:document.getElementById('offline-status')?.textContent,online:navigator.onLine,recordCount:JSON.parse(localStorage.getItem('agenda-qx-records-v1')||'null')?.payload?.records?.length,controlled:!!navigator.serviceWorker.controller,keys:await caches.keys()})));throw new Error(label+': '+error.message+'; page errors: '+errors.join('; '));}};
    await page.goto(origin+'/qx.html?s=SINTETICO_B');
    await stage('professional identity',()=>page.waitForFunction(()=>document.querySelector('#principal .hero h1')?.textContent.includes('Sintetico_a')));
    await stage('offline readiness',()=>page.waitForFunction(()=>document.getElementById('offline-ready')?.textContent.includes('Disponible sin conexión')));
    await stage('service worker control',()=>page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller)));
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
    await context.setOffline(false);
    payload={ok:true,records:[row('SINTETICO_A','2027-01-08',1),row('SINTETICO_B','2027-01-08',1)]};
    const colleague=await context.newPage();colleague.on('pageerror',e=>errors.push(e.message));
    await colleague.goto(origin+'/astudillo.html?s=SINTETICO_A');
    await colleague.waitForFunction(()=>document.querySelector('#principal .hero h1')?.textContent.includes('Sintetico_b'));
    await colleague.waitForFunction(()=>document.getElementById('offline-ready')?.textContent.includes('Disponible sin conexión'));
    await context.setOffline(true);await colleague.reload();
    await colleague.waitForFunction(()=>document.querySelector('#principal .hero h1')?.textContent.includes('Sintetico_b'));
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(engine.name()+': fixtures, professional identity, empty agenda, replaced week and offline passed.');
   }finally{await browser.close();}
  }
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
