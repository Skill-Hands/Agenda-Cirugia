(function(root,factory){const model=factory();if(typeof module==='object'&&module.exports)module.exports=model;else root.AgendaModel=model;})(typeof window==='object'?window:globalThis,()=>{
 const escapeText=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function parsePayload(text){
  if(typeof text!=='string'||text.length>2000000)throw new Error('Agenda inválida');
  const trimmed=text.trim(),match=trimmed.match(/^(?:window\.)?agendaQxData\s*\(([\s\S]*)\)\s*;?$/);
  return JSON.parse(match?match[1]:trimmed);
 }
 function interval(activity){
  const m=String(activity).match(/(\d{1,2})(?:[.:](\d{1,2}))?\s*[-–]\s*(\d{1,2})(?:[.:](\d{1,2}))?/);
  if(!m)return null;
  const h1=+m[1],m1=+(m[2]||0),h2=+m[3],m2=+(m[4]||0);
  if(h1>23||h2>24||m1>59||m2>59||(h2===24&&m2))return null;
  const start=h1*60+m1,end=h2*60+m2;return end>start?{start,end}:null;
 }
 function findConflicts(records){
  const groups=new Map(),conflicts=[];
  for(const record of records){
   const time=interval(record.activity);if(!time)continue;
   const key=record.date+'|'+record.surgeon;
   const group=groups.get(key)||[];
   if(!group.some(x=>x.record.category===record.category&&x.record.activity===record.activity))group.push({record,time});
   groups.set(key,group);
  }
  for(const group of groups.values()){
   group.sort((a,b)=>a.time.start-b.time.start);
   for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length&&group[j].time.start<group[i].time.end;j++){
    conflicts.push({date:group[i].record.date,surgeon:group[i].record.surgeon,first:group[i].record.activity,second:group[j].record.activity});
   }
  }
  return conflicts;
 }
 return {escapeText,parsePayload,interval,findConflicts};
});
