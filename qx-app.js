
(function(){
  try{
    const parts = new Intl.DateTimeFormat('en-CA',{
      timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date());
    const obj={}; parts.forEach(p=>obj[p.type]=p.value);
    const today=`${obj.year}-${obj.month}-${obj.day}`;
    document.querySelectorAll('.day[data-date]').forEach(el=>{
      if(el.dataset.date===today) el.classList.add('hoy');
    });
    const todayIndex=[...document.querySelectorAll('#principal .day[data-date]')]
      .findIndex(el=>el.dataset.date===today);
    if(todayIndex>=0){
      const radio=document.getElementById(`day-${todayIndex}`);
      if(radio) radio.checked=true;
    }
  }catch(e){}
})();


(function(){

  const esc = window.AgendaModel.escapeText;
  let liveRecords = [];
  let selectedSurgeon = selectedSurgeonFromLocation();
  let selectedWeek = null;
  let surgeonSearch = "";

  function normalizeSurgeonParam(value){
    const raw = String(value || document.documentElement.dataset.surgeon || "CALDERA").trim().toUpperCase();
    if(!raw) return "CALDERA";
    return raw;
  }

  function selectedSurgeonFromLocation(){
    try{
      const params = new URLSearchParams(window.location.search || "");
      return normalizeSurgeonParam(params.get("s"));
    }catch(e){
      return "CALDERA";
    }
  }

  function displaySurgeonName(name){
    if(String(name || "").trim().toUpperCase()==="CALDERA") return "Carlos Caldera";
    return String(name || "CALDERA")
      .split(/\s+/)
      .filter(Boolean)
      .map(part=>part.charAt(0).toUpperCase()+part.slice(1).toLowerCase())
      .join(" ");
  }

  function todayChile(){
    try{
      const p = new Intl.DateTimeFormat("en-CA", {
        timeZone:"America/Santiago", year:"numeric", month:"2-digit", day:"2-digit"
      }).formatToParts(new Date());
      const o={}; p.forEach(x=>o[x.type]=x.value);
      return `${o.year}-${o.month}-${o.day}`;
    }catch(e){
      return new Date().toISOString().slice(0,10);
    }
  }

  function normalizeDate(v){
    const s = String(v ?? "");
    const m = s.match(/^Date\((\d+),(\d+),(\d+)\)$/);
    if(m) return `${m[1]}-${String(+m[2]+1).padStart(2,"0")}-${String(+m[3]).padStart(2,"0")}`;
    return s.slice(0,10);
  }

  function weekInfos(records){
    const m = {};
    records.forEach(r=>{
      const w=+r.week;
      if(!m[w]) m[w]=[];
      m[w].push(r.date);
    });
    return Object.entries(m).map(([week,dates])=>{
      const d=[...new Set(dates)].sort();
      return {week:+week,min:d[0],max:d[d.length-1]};
    }).sort((a,b)=>a.min.localeCompare(b.min));
  }

  function relevantWeeks(records){
    const t=todayChile();
    const info=weekInfos(records);
    let future=info.filter(x=>x.max>=t);
    if(!future.length && info.length) future=[info[info.length-1]];
    return future.slice(0,2);
  }

  function activeWeek(records){
    const info=weekInfos(records);
    if(!info.length) return 36;
    const today=todayChile();
    const current=info.find(x=>x.min<=today && x.max>=today);
    if(current) return current.week;
    const next=info.find(x=>x.min>today);
    return (next || info[info.length-1]).week;
  }

  function visibleWeeks(records){
    const info=weekInfos(records);
    if(!info.length) return [];
    const today=todayChile();
    const current=info.find(x=>x.min<=today && x.max>=today);
    if(current){
      const next=info.find(x=>x.min>current.max);
      return [current,next].filter(Boolean);
    }
    const next=info.find(x=>x.min>today);
    return [next || info[info.length-1]].filter(Boolean);
  }

  function weekTabLabel(item){
    const today=todayChile();
    if(item.min<=today && item.max>=today) return "Semana actual";
    if(item.min>today) return "Semana siguiente";
    return `Semana ${item.week}`;
  }

  function renderWeekTabs(records, active){
    const weeks=visibleWeeks(records);
    document.querySelectorAll(".week-tabs,.svc-week-tabs").forEach(x=>x.remove());
    if(weeks.length<2) return;
    const html=weeks.map(w=>`<button type="button" class="week-tab ${+w.week===+active?"active":""}" data-week="${w.week}">${weekTabLabel(w)} · Semana ${w.week}</button>`).join("");
    const personalMeta=document.querySelector("#principal .hero .meta");
    if(personalMeta){
      const tabs=document.createElement("div");
      tabs.className="week-tabs";
      tabs.innerHTML=html;
      personalMeta.insertAdjacentElement("afterend",tabs);
    }
    const serviceHero=document.querySelector("#servicio .svc-hero");
    if(serviceHero){
      const tabs=document.createElement("div");
      tabs.className="svc-week-tabs";
      tabs.innerHTML=html;
      serviceHero.appendChild(tabs);
    }
    document.querySelectorAll(".week-tab").forEach(btn=>{
      btn.onclick=()=>{
        selectedWeek=Number(btn.dataset.week);
        renderAgenda(records,selectedWeek);
      };
    });
  }

  function dateRangeLabel(records, week){
    const d=[...new Set(records.filter(r=>+r.week===+week).map(r=>r.date))].sort();
    if(!d.length) return `Semana ${week}`;
    const fmt=x=>new Intl.DateTimeFormat("es-CL",{day:"numeric",month:"long",timeZone:"UTC"}).format(new Date(x+"T12:00:00Z"));
    return `Semana ${week} · ${fmt(d[0])} al ${fmt(d[d.length-1])}`;
  }

  function badgeClass(cat){
    if(cat==="Pabellón") return "pabellon";
    if(cat==="Sala") return "sala";
    if(cat==="Policlínico") return "policlinico";
    if(cat==="Urgencia") return "urgencia";
    if(cat==="Entrega de turno") return "entrega";
    return "entrega";
  }

  function extractTime(raw){
    const m=String(raw).match(/(\d{1,2}(?:[.:]\d{1,2})?)\s*-\s*(\d{1,2}(?:[.:]\d{1,2})?)/);
    if(m){
      const s=m[1].replace(".",":");
      const e=m[2].replace(".",":");
      const start=parseFloat(s.replace(":","."));
      return {text:`${esc(s)}–${e}`,start};
    }
    if(/URGENCIA/i.test(raw)) return {text:"24 horas",start:0};
    return {text:"",start:0};
  }

  function activityDisplay(r){
    if(r.category==="Policlínico"){
      let detail=r.activity.replace(/POLI\s*/i,"")
        .replace(/\d{1,2}(?:[.:]\d{1,2})?\s*-\s*\d{1,2}(?:[.:]\d{1,2})?/g,"")
        .trim();
      if(/^QX\s+GRAL$/i.test(detail)) detail="Cirugía General";
      return {label:"Policlínico",detail};
    }
    if(r.category==="Pabellón"){
      return {label:"Pabellón",detail:r.activity.replace(/PAB\s*/i,"").trim()};
    }
    if(r.category==="Entrega de turno") return {label:"Entrega de turno",detail:""};
    return {label:r.category,detail:(["Sala","Urgencia"].includes(r.category)?"":r.activity)};
  }

  function renderPersonal(records, week){
    const root=document.getElementById("principal");
    if(!root) return;

    const title=root.querySelector(".hero h1");
    if(title) title.textContent=`Dr. ${displaySurgeonName(selectedSurgeon)}`;

    const pill=root.querySelector(".hero .meta .pill");
    if(pill) pill.textContent=dateRangeLabel(records,week);

    const personalRows=records.filter(r=>+r.week===+week && r.surgeon.toUpperCase()===selectedSurgeon);
    const allWeek=records.filter(r=>+r.week===+week);
    const dates=[...new Set(allWeek.map(r=>r.date))].sort();
    const daysRoot=root.querySelector(".days");
    if(daysRoot){
      daysRoot.innerHTML=dates.map((date,i)=>{
        const rows=personalRows.filter(r=>r.date===date);
        const day=allWeek.find(r=>r.date===date)?.day || "";
        const blocks=rows.map(r=>{
          const t=extractTime(r.activity), d=activityDisplay(r);
          return `<div class="block ${t.start>=14?"afternoon-start":""}">
            <div class="time">${esc(t.text)}</div>
            <div><div class="badge ${badgeClass(r.category)}">${esc(d.label)}</div>${d.detail?`<div class="detail">${esc(d.detail)}</div>`:""}</div>
          </div>`;
        }).join("");
        return `<div class="day ${i===dates.length-1?"full":""}" data-date="${esc(date)}">
          <h3>${esc(day)} ${Number(date.slice(-2))}</h3>
          ${blocks || '<div class="detail">Sin actividad consignada</div>'}
        </div>`;
      }).join("");
    }

    const cards=root.querySelectorAll(".card");
    if(cards.length>1){
      const summary=cards[1];
      const cats=["Pabellón","Sala","Policlínico","Urgencia"];
      const colors={"Pabellón":"var(--navy)","Sala":"var(--teal)","Policlínico":"var(--green)","Urgencia":"var(--orange)"};
      const counts={};
      cats.forEach(c=>counts[c]=new Set(personalRows.filter(r=>r.category===c).map(r=>r.date)).size);
      const max=Math.max(1,...Object.values(counts));
      const clinics=Object.create(null);
      personalRows.filter(r=>r.category==="Policlínico").forEach(r=>{
        const k=activityDisplay(r).detail || "Policlínico";
        clinics[k]=(clinics[k]||0)+1;
      });
      summary.innerHTML=`<h2>Resumen visual</h2><p class="sub">Distribución de actividades principales de la semana.</p>
        ${cats.map(c=>`<div class="bar-row"><div>${c}</div><div class="track"><div class="fill" style="width:${counts[c]/max*100}%;background:${colors[c]}"></div></div><div>${counts[c]}</div></div>`).join("")}
        <h2 style="font-size:18px;margin-top:18px;">Desglose de policlínico</h2><p class="sub">Se muestra el tipo exacto consignado.</p>
        ${Object.entries(clinics).map(([k,v])=>`<div class="bar-row"><div>${esc(k)}</div><div class="track"><div class="fill" style="width:100%;background:var(--green)"></div></div><div>${v}</div></div>`).join("") || '<div class="detail">Sin policlínicos consignados.</div>'}`;
    }

    const today=todayChile();
    root.querySelectorAll(".day[data-date]").forEach(el=>{
      el.classList.toggle("hoy",el.dataset.date===today);
    });
  }

  function servicePersonCard(name,rows){
    return `<div class="svc-person"><div class="svc-name">${esc(name)}</div>
      ${rows.map(r=>`<div class="svc-meta"><span class="svc-chip">${esc(r.activity)}</span></div>`).join("")}
    </div>`;
  }

  function renderService(records, week){
    const service=document.getElementById("servicio");
    if(!service) return;
    const weekRows=records.filter(r=>+r.week===+week);
    const dates=[...new Set(weekRows.map(r=>r.date))].sort();
    const surgeons=[...new Set(weekRows.map(r=>r.surgeon))].sort((a,b)=>a.localeCompare(b));
    const today=todayChile();
    let selectedDate=dates.includes(today) ? today : (dates[0] || null);

    service.innerHTML=`<div class="svc-wrap">
      <header class="svc-hero">
        <div class="svc-quicknav">
          <label for="view-main" class="back-main">← Volver a mi semana</label>
          <a class="svc-jump" href="#plan-dia">Planificación del día</a>
          <a class="svc-jump" href="#plan-cirujano">Por cirujano</a>
        </div>
        <h1>Servicio completo</h1>
        <p>Selecciona un día y verás automáticamente quién está en Sala, Pabellón, Policlínico y Urgencia, además de la distribución completa.</p>
        <div class="week-pill">${dateRangeLabel(records,week)} · ${surgeons.length} cirujanos · Sincronizado</div>
      </header>
      <section class="svc-card" id="plan-dia">
        <div class="day-buttons" id="liveDayButtons"></div>
        <div id="liveDayContent"></div>
        <details class="surgeon-picker" id="plan-cirujano">
          <summary>Seleccionar cirujano</summary>
          <div class="surgeon-links" id="liveSurgeonLinks"></div>
        </details>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:18px">
          <h3 class="svc-subtitle" style="margin:0">Agenda por cirujano</h3>
          <a href="#servicio" style="text-decoration:none;font-size:12px;font-weight:900;color:#123a7a">↑ Menú</a>
        </div>
        <label class="qx-search-label" for="surgeon-search">Buscar cirujano</label>
        <input id="surgeon-search" class="qx-search" type="search" placeholder="Apellido o iniciales" autocomplete="off">
        <p id="surgeon-search-empty" hidden>No hay cirujanos que coincidan.</p>
        <div class="surgeon-directory" id="liveSurgeonDirectory"></div>
      </section>
    </div>`;

    const dayButtons=service.querySelector("#liveDayButtons");
    const content=service.querySelector("#liveDayContent");

    function renderDay(){
      const dayRows=weekRows.filter(r=>r.date===selectedDate);
      const dayLabel=dayRows[0]?.day || selectedDate || "";
      const category=(cat)=>{
        const grouped=Object.create(null);
        dayRows.filter(r=>r.category===cat).forEach(r=>(grouped[r.surgeon]??=[]).push(r.activity));
        const names=Object.keys(grouped).sort();
        return `<div class="category-card"><div class="category-title"><span>${cat}</span><b>${names.length}</b></div>
          <div class="category-people">${names.length?names.map(n=>`<div class="cat-person"><strong>${esc(n)}</strong><span>${esc(grouped[n].join(" · "))}</span></div>`).join(""):'<div class="svc-none">Sin asignaciones registradas.</div>'}</div>
        </div>`;
      };
      const grouped=Object.create(null);
      dayRows.forEach(r=>(grouped[r.surgeon]??=[]).push(r));
      content.innerHTML=`<div class="svc-day-title">${esc(dayLabel)} ${Number(selectedDate.slice(-2))}</div>
        <div class="category-grid">${["Sala","Pabellón","Policlínico","Urgencia"].map(category).join("")}</div>
        <h3 class="svc-subtitle">Distribución completa del día</h3>
        <div class="svc-results">${Object.keys(grouped).sort().map(n=>servicePersonCard(n,grouped[n])).join("")}</div>`;
      dayButtons.querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.date===selectedDate));
    }

    dayButtons.innerHTML=dates.map(d=>{
      const label=weekRows.find(r=>r.date===d)?.day || d;
      return `<button type="button" class="day-btn" data-date="${esc(d)}">${esc(label)}</button>`;
    }).join("");
    dayButtons.querySelectorAll("button").forEach(b=>b.onclick=()=>{selectedDate=b.dataset.date;renderDay();});

    const linkRoot=service.querySelector("#liveSurgeonLinks");
    const dirRoot=service.querySelector("#liveSurgeonDirectory");
    linkRoot.innerHTML=surgeons.map((s,i)=>`<a href="#live-surgeon-${i}">${esc(s)}</a>`).join("");
    dirRoot.innerHTML=surgeons.map((s,i)=>{
      const sr=weekRows.filter(r=>r.surgeon===s);
      const byDay=Object.create(null);
      sr.forEach(r=>(byDay[r.day]??=[]).push(r));
      return `<article class="surgeon-card" id="live-surgeon-${i}"><h3>${esc(s)}</h3>
        ${Object.entries(byDay).map(([d,rr])=>`<div class="surgeon-day"><strong>${esc(d)}</strong><div class="svc-meta">${rr.map(x=>`<span class="svc-chip">${esc(x.activity)}</span>`).join("")}</div></div>`).join("")}
      </article>`;
    }).join("");

    const search=service.querySelector('#surgeon-search');
    const normalizeSearch=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[.]/g,'').trim();
    function filterSurgeons(){
      surgeonSearch=search.value;
      const terms=normalizeSearch(surgeonSearch).split(/\s+/).filter(Boolean);
      let count=0;
      dirRoot.querySelectorAll('.surgeon-card').forEach(card=>{
        const name=normalizeSearch(card.querySelector('h3').textContent);
        const matches=terms.every(term=>name.includes(term));
        card.hidden=!matches;
        if(matches) count++;
      });
      service.querySelector('#surgeon-search-empty').hidden=count>0;
    }
    search.value=surgeonSearch;
    search.addEventListener('input',filterSurgeons);
    filterSurgeons();
    renderDay();
  }

  function renderAgenda(records, week){
    const active=Number(week || selectedWeek || activeWeek(records));
    selectedWeek=active;
    renderPersonal(records,active);
    renderService(records,active);
    renderWeekTabs(records,active);
    const conflicts=window.AgendaModel.findConflicts(records.filter(r=>+r.week===active));
    let notice=document.getElementById('agenda-conflicts');
    if(!notice){notice=document.createElement('p');notice.id='agenda-conflicts';notice.setAttribute('role','status');document.getElementById('principal')?.prepend(notice);}
    notice.hidden=!conflicts.length;
    notice.textContent=conflicts.length?'Revisar '+conflicts.length+' posible(s) cruce(s) de horario: '+conflicts.slice(0,5).map(c=>c.surgeon+' · '+c.date).join('; '):'';
  }

  window.agendaLiveCallback=function(resp){
    try{
      if(!resp || resp.status!=="ok" || !resp.table) return;
      const out=[];
      (resp.table.rows||[]).forEach(row=>{
        const c=row.c||[];
        if(c.length<6 || c[0]?.v==null) return;
        out.push({
          week:Number(c[0]?.v||0),
          date:normalizeDate(c[1]?.v),
          day:String(c[2]?.v||""),
          surgeon:String(c[3]?.v||""),
          category:String(c[4]?.v||""),
          activity:String(c[5]?.v||"")
        });
      });
      if(!out.length) return;
      if(out.some(r => !Number.isInteger(r.week) || !/^\d{4}-\d{2}-\d{2}$/.test(r.date))) return;
      liveRecords=out;
      renderAgenda(out,selectedWeek || activeWeek(out));
      const status=document.getElementById("load-status");
      if(status) status.hidden=true;
    }catch(e){
      console.warn("Agenda: se mantiene el respaldo local.",e);
    }
  };

  window.agendaSetSurgeon=function(value){
    const next = normalizeSurgeonParam(value);
    if(next !== selectedSurgeon){
      selectedSurgeon = next;
      if(liveRecords.length){
        renderAgenda(liveRecords, selectedWeek || activeWeek(liveRecords));
      }
    }
  };
})();
