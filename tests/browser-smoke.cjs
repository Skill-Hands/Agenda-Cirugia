const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=process.cwd();
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.webmanifest':'application/manifest+json','.png':'image/png'};
 const server=http.createServer(async(req,res)=>{
  try{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
   if(!file.startsWith(root+path.sep))throw Error('path');
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 try{
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/qx.html');
  await page.waitForFunction(()=>{try{return JSON.parse(localStorage.getItem('agenda-qx-records-v1')||'null')?.payload?.records?.length>0;}catch{return false;}},{timeout:45000});
  await page.waitForFunction(()=>document.getElementById('offline-ready')?.textContent.includes('Disponible sin conexión'),{timeout:30000});
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>navigator.serviceWorker.controller?true:new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(true),{once:true}))));
  assert.deepEqual(errors,[]);
  const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('agenda-qx-records-v1')).payload.records.length);
  console.log('Live agenda downloaded; record count:',count);
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(()=>document.getElementById('offline-status')?.textContent.includes('Sin conexión'));
  assert.equal(await page.locator('script[src*="qx-model"]').count(),1);
  console.log('Installed shell and saved agenda reopen offline.');
  await context.close();
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
