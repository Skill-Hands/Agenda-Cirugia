const test=require('node:test'),assert=require('node:assert/strict');
const {escapeText,parsePayload,findConflicts,interval}=require('../qx-model.js');
test('HTML received as data is escaped',()=>{
 assert.equal(escapeText('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});
test('legacy envelopes are parsed without executing trailing code',()=>{
 const data={ok:true,records:[]};
 assert.deepEqual(parsePayload('agendaQxData('+JSON.stringify(data)+');'),data);
 assert.throws(()=>parsePayload('agendaQxData({});globalThis.pwned=true;'));
 assert.deepEqual(parsePayload(JSON.stringify(data)),data);
});
test('only overlapping explicit time ranges produce conflicts',()=>{
 const record=(activity,surgeon='A',date='2026-10-01')=>({activity,surgeon,date,category:'Pabellón'});
 assert.equal(findConflicts([record('8:30-10:15'),record('10:00-11:00')]).length,1);
 assert.equal(findConflicts([record('8:30-10:00'),record('10:00-11:00')]).length,0);
 assert.equal(findConflicts([record('8-10'),record('8-10','B')]).length,0);
 assert.equal(findConflicts([record('8-10'),record('8-10')]).length,0);
 assert.equal(interval('25-26'),null);
 assert.deepEqual(interval('8.30-10.15'),{start:510,end:615});
});

test('empty agenda is valid, invalid dates and weeks are rejected',()=>{
 const {validPayload,validDate}=require('../qx-model.js');
 const row={week:1,date:'2026-01-02',day:'Viernes',surgeon:'A',category:'Sala',activity:'8-10'};
 assert.equal(validPayload({ok:true,records:[]}),true);
 assert.equal(validDate('2026-02-30'),false);
 assert.equal(validPayload({ok:true,records:[{...row,week:0}]}),false);
 assert.equal(validPayload({ok:true,records:[{...row,date:'2026-02-30'}]}),false);
 assert.equal(validPayload({ok:true,records:[row]}),true);
});
test('week identity separates years and preserves a week spanning New Year',()=>{
 const {weekKey}=require('../qx-model.js');
 assert.notEqual(weekKey({date:'2026-01-02'}),weekKey({date:'2027-01-08'}));
 assert.equal(weekKey({date:'2026-12-31'}),weekKey({date:'2027-01-01'}));
});
test('dedicated professional identity overrides external selection',()=>{
 const {fixedSurgeon}=require('../qx-model.js');
 assert.equal(fixedSurgeon('SINTETICO_A','SINTETICO_B'),'SINTETICO_A');
 assert.equal(fixedSurgeon(null,'SINTETICO_B'),'SINTETICO_B');
});
