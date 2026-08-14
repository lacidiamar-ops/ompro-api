// OM PRO API — V16.6 Export paie hebdomadaire lundi -> dimanche
(function(){
  'use strict';
  const TAG='V16.6-PAYROLL-EXPORT';
  const $=id=>document.getElementById(id);
  const safe=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const pad=n=>String(n).padStart(2,'0');
  const parseISO=v=>new Date(String(v).slice(0,10)+'T12:00:00');
  const iso=d=>{const x=new Date(d);x.setHours(12,0,0,0);return x.toISOString().slice(0,10)};
  const addDays=(d,n)=>{const x=parseISO(d);x.setDate(x.getDate()+n);return iso(x)};
  const mondayOf=d=>{const x=parseISO(d);const k=x.getDay()||7;x.setDate(x.getDate()-k+1);return iso(x)};
  const ddmm=d=>{const x=parseISO(d);return pad(x.getDate())+'/'+pad(x.getMonth()+1)};
  const dayShort=d=>['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][parseISO(d).getDay()];
  const dayLong=d=>['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][parseISO(d).getDay()];
  const fmtMin=m=>{m=Math.max(0,Math.round(Number(m)||0));return Math.floor(m/60)+'h'+pad(m%60)};
  const decHours=m=>Math.round((Number(m||0)/60)*100)/100;
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const kindLabel=k=>({cp:'CP',conge_paye:'CP',recovery:'RÉCUP',rest:'REPOS',sick:'MALADIE',absence:'ABSENCE',unpaid:'SANS SOLDE'}[String(k||'').toLowerCase()]||String(k||'').toUpperCase());
  const movementGroup=k=>{const x=String(k||'').toLowerCase();if(['cp','conge_paye'].includes(x))return'cp';if(x==='recovery')return'recovery';if(['absence','sick','unpaid'].includes(x))return'absence';return'other'};
  const timeFR=v=>{if(!v)return'';try{return new Date(v).toLocaleTimeString('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit'})}catch(_e){return''}};

  function exportIds(){
    const mgr=state?.current?.role==='manager';
    return {s:mgr?'exp-s':'eexp-s',e:mgr?'exp-e':'eexp-e',cb:mgr?'exp-emp-cb':'eexp-emp-cb',prev:mgr?'exp-prev':'eexp-prev',prevc:mgr?'exp-prev-c':'eexp-prev-c'};
  }
  function selectedIds(cls){return [...document.querySelectorAll('.'+cls+':checked')].map(x=>x.value).filter(Boolean)}
  function fallbackWorkMinutes(ps){
    const arr=[...(ps||[])].sort((a,b)=>new Date(a.punched_at)-new Date(b.punched_at));
    let active=null,total=0;
    for(const p of arr){
      const t=new Date(p.punched_at).getTime();
      const type=String(p.punch_type||'').toLowerCase();
      if(type==='start'||type==='resume'){if(active==null)active=t}
      else if(type==='break'||type==='end'){if(active!=null&&t>active){total+=t-active;active=null}}
    }
    return Math.max(0,Math.round(total/60000));
  }
  function workMinutes(ps){
    try{if(typeof computeWork==='function')return Math.max(0,Math.round(computeWork(ps||[])/60000))}catch(_e){}
    return fallbackWorkMinutes(ps);
  }
  function plannedMinutes(r){
    if(!r||!['planned','work','travail','nettoyage'].includes(String(r.status||'').toLowerCase())||!r.start_time||!r.end_time)return 0;
    const toMin=t=>{const m=String(t).match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0};
    let a=toMin(r.start_time),b=toMin(r.end_time);if(b<a)b+=1440;return Math.max(0,b-a-(Number(r.break_minutes)||0));
  }
  function dayCell(mins,movement){
    const mv=movement?.kind?kindLabel(movement.kind):'';
    if(mins>0&&mv)return fmtMin(mins)+' + '+mv;
    if(mins>0)return fmtMin(mins);
    return mv||'—';
  }

  async function fetchPayrollData(){
    const ids=exportIds(),start=$(ids.s)?.value,end=$(ids.e)?.value;
    if(!start||!end)throw new Error('Sélectionne une date de début et de fin');
    if(end<start)throw new Error('La date de fin doit être après la date de début');
    const empIds=selectedIds(ids.cb);
    if(!empIds.length)throw new Error('Sélectionne au moins un salarié');
    const alignedStart=mondayOf(start),alignedEnd=addDays(mondayOf(end),6);
    const [er,pr,tr,plr]=await Promise.all([
      sb.from('employees').select('id,full_name,contrat,role_title,poste,hourly_rate,weekly_base_hours,active,is_active').in('id',empIds).order('full_name'),
      sb.from('punches').select('employee_id,punch_type,punched_at,service_date').in('employee_id',empIds).gte('service_date',alignedStart).lte('service_date',alignedEnd).order('punched_at'),
      sb.from('time_off').select('employee_id,start_date,end_date,kind,status,note').in('employee_id',empIds).lte('start_date',alignedEnd).gte('end_date',alignedStart),
      sb.from('employee_planning').select('employee_id,work_date,start_time,end_time,break_minutes,status').in('employee_id',empIds).gte('work_date',alignedStart).lte('work_date',alignedEnd)
    ]);
    if(er.error)throw er.error;if(pr.error)throw pr.error;if(tr.error)throw tr.error;if(plr.error)throw plr.error;
    let validations=[];
    try{const vr=await sb.from('employee_week_validations').select('employee_id,week_start,overtime_minutes,overtime_reviewed,overtime_manager_note,status').in('employee_id',empIds).gte('week_start',alignedStart).lte('week_start',alignedEnd);if(!vr.error)validations=vr.data||[]}catch(_e){}
    const employees=er.data||[],punches=pr.data||[],timeOff=(tr.data||[]).filter(x=>String(x.status||'approved').toLowerCase()!=='cancelled'),planning=plr.data||[];
    const punchBy={};punches.forEach(p=>{const d=p.service_date||iso(new Date(p.punched_at));const k=p.employee_id+'_'+d;(punchBy[k]||=[]).push(p)});
    const planBy={};planning.forEach(r=>{const k=r.employee_id+'_'+r.work_date;(planBy[k]||=[]).push(r)});
    const leaveBy={};
    timeOff.forEach(t=>{let d=t.start_date;while(d<=t.end_date){if(d>=alignedStart&&d<=alignedEnd){const k=t.employee_id+'_'+d;if(!leaveBy[k])leaveBy[k]=t}d=addDays(d,1)}});
    const validationBy={};validations.forEach(v=>validationBy[v.employee_id+'_'+v.week_start]=v);
    const weeks=[];for(let ws=alignedStart;ws<=alignedEnd;ws=addDays(ws,7))weeks.push(ws);
    return {requestedStart:start,requestedEnd:end,alignedStart,alignedEnd,employees,punchBy,planBy,leaveBy,validationBy,weeks};
  }

  function weeklyRows(data,ws){
    const days=Array.from({length:7},(_,i)=>addDays(ws,i));
    return data.employees.map(e=>{
      const dmins=days.map(d=>workMinutes(data.punchBy[e.id+'_'+d]||[]));
      const total=dmins.reduce((a,b)=>a+b,0),normal=Math.min(total,35*60),hs1=Math.min(Math.max(total-35*60,0),8*60),hs2=Math.max(total-43*60,0);
      const worked=dmins.filter(x=>x>0).length;
      const movements=days.map(d=>data.leaveBy[e.id+'_'+d]).filter(Boolean);
      const count=g=>movements.filter(m=>movementGroup(m.kind)===g).length;
      const val=data.validationBy[e.id+'_'+ws];
      return {employee:e,days,dmins,total,normal,hs1,hs2,worked,cp:count('cp'),rec:count('recovery'),abs:count('absence'),validation:val};
    });
  }

  function weeklySheetAOA(data,ws){
    const days=Array.from({length:7},(_,i)=>addDays(ws,i));
    const headers=['Salarié','Contrat','Qualification',...days.map(d=>dayShort(d)+' '+ddmm(d)),'Total semaine','Heures normales ≤35h','HS 35→43h','HS >43h','HS total','Jours travaillés','CP','Récup','Abs./Maladie','Validation HS','Note manager'];
    const rows=weeklyRows(data,ws).map(r=>{
      const e=r.employee;
      const cells=r.days.map((d,i)=>dayCell(r.dmins[i],data.leaveBy[e.id+'_'+d]));
      const val=r.validation;
      const validTxt=val?(val.overtime_reviewed?'Revue manager':'À revoir'):(r.hs1+r.hs2>0?'À traiter':'—');
      return [e.full_name||'',e.contrat||'',e.role_title||e.poste||'',...cells,fmtMin(r.total),fmtMin(r.normal),fmtMin(r.hs1),fmtMin(r.hs2),fmtMin(r.hs1+r.hs2),r.worked,r.cp,r.rec,r.abs,validTxt,val?.overtime_manager_note||''];
    });
    return [headers,...rows];
  }

  function movementRows(data){
    const out=[];
    for(const e of data.employees){
      for(let d=data.alignedStart;d<=data.alignedEnd;d=addDays(d,1)){
        const ps=data.punchBy[e.id+'_'+d]||[],mins=workMinutes(ps),mv=data.leaveBy[e.id+'_'+d],plans=data.planBy[e.id+'_'+d]||[],pmin=plans.reduce((s,r)=>s+plannedMinutes(r),0);
        if(!mins&&!mv)continue;
        const sorted=[...ps].sort((a,b)=>new Date(a.punched_at)-new Date(b.punched_at));
        const first=sorted.find(p=>String(p.punch_type).toLowerCase()==='start');
        const last=[...sorted].reverse().find(p=>String(p.punch_type).toLowerCase()==='end');
        out.push([e.full_name||'',e.contrat||'',e.role_title||e.poste||'',d,dayLong(d),mv?kindLabel(mv.kind):'TRAVAIL',first?timeFR(first.punched_at):'',last?timeFR(last.punched_at):'',decHours(mins),decHours(pmin),mv?.note||'']);
      }
    }
    return out;
  }

  function summaryRows(data){
    return data.employees.map(e=>{
      let total=0,hs1=0,hs2=0,worked=0,cp=0,rec=0,abs=0;
      for(const ws of data.weeks){const r=weeklyRows(data,ws).find(x=>x.employee.id===e.id);if(!r)continue;total+=r.total;hs1+=r.hs1;hs2+=r.hs2;worked+=r.worked;cp+=r.cp;rec+=r.rec;abs+=r.abs}
      const rate=Number(e.hourly_rate)||0,isInterim=norm(e.contrat).includes('interim');
      return [e.full_name||'',e.contrat||'',e.role_title||e.poste||'',fmtMin(total),fmtMin(hs1),fmtMin(hs2),fmtMin(hs1+hs2),worked,cp,rec,abs,rate||'',isInterim&&rate?Math.round((total/60*rate)*100)/100:''];
    });
  }

  function makeWorkbook(data){
    if(typeof XLSX==='undefined')throw new Error('Module Excel non chargé');
    const wb=XLSX.utils.book_new();
    for(const ws of data.weeks){
      const we=addDays(ws,6),aoa=weeklySheetAOA(data,ws),wsx=XLSX.utils.aoa_to_sheet(aoa);
      wsx['!cols']=[{wch:28},{wch:14},{wch:24},...Array(7).fill({wch:16}),{wch:15},{wch:19},{wch:14},{wch:12},{wch:12},{wch:14},{wch:7},{wch:8},{wch:13},{wch:15},{wch:30}];
      wsx['!autofilter']={ref:'A1:'+XLSX.utils.encode_col(aoa[0].length-1)+(aoa.length)};
      XLSX.utils.book_append_sheet(wb,wsx,'S_'+ddmm(ws).replace('/','-')+'_'+ddmm(we).replace('/','-'));
    }
    const sum=[['Salarié','Contrat','Qualification','Heures pointées','HS 35→43h','HS >43h','HS total','Jours travaillés','CP','Récup','Abs./Maladie','Taux HT/h','Coût intérim indicatif €'],...summaryRows(data)];
    const sws=XLSX.utils.aoa_to_sheet(sum);sws['!cols']=[{wch:28},{wch:14},{wch:24},{wch:16},{wch:14},{wch:12},{wch:12},{wch:14},{wch:8},{wch:8},{wch:13},{wch:12},{wch:22}];XLSX.utils.book_append_sheet(wb,sws,'Synthèse période');
    const mov=[['Salarié','Contrat','Qualification','Date','Jour','Mouvement','Début réel','Fin réelle','Heures pointées déc.','Heures prévues déc.','Commentaire'],...movementRows(data)];
    const mws=XLSX.utils.aoa_to_sheet(mov);mws['!cols']=[{wch:28},{wch:14},{wch:24},{wch:12},{wch:12},{wch:16},{wch:12},{wch:12},{wch:20},{wch:20},{wch:40}];mws['!autofilter']={ref:'A1:K'+mov.length};XLSX.utils.book_append_sheet(wb,mws,'Mouvements');
    const params=[['EXPORT PAIE OM PRO'],['Période demandée',data.requestedStart+' → '+data.requestedEnd],['Calcul hebdomadaire',data.alignedStart+' → '+data.alignedEnd+' (semaines complètes lundi → dimanche)'],['Règle HS','Heures pointées > 35h : HS ; 35h→43h = tranche 1 ; au-delà de 43h = tranche 2'],['Lecture jours','Lun/Mar/Mer/Jeu/Ven/Sam/Dim + date jj/mm'],['Important','Les HS sont calculées sur les heures réellement pointées/régularisées dans l’application. Les mouvements CP/Récup/Absence sont listés séparément.']];
    const pws=XLSX.utils.aoa_to_sheet(params);pws['!cols']=[{wch:24},{wch:90}];XLSX.utils.book_append_sheet(wb,pws,'Paramètres');
    return wb;
  }

  async function exportPayrollXLSX(){
    try{toast('Préparation export paie…','');const data=await fetchPayrollData();const wb=makeWorkbook(data);XLSX.writeFile(wb,'Paie_OM_PRO_'+data.requestedStart+'_'+data.requestedEnd+'.xlsx');toast('✓ Export paie créé — lundi à dimanche','suc')}catch(e){console.error(TAG,e);toast('Export paie : '+(e.message||e),'err')}
  }

  async function previewPayroll(){
    const ids=exportIds(),box=$(ids.prevc),host=$(ids.prev);if(!box||!host)return;
    try{
      box.innerHTML='<div class="empty"><div class="ico">⏳</div><p>Calcul paie...</p></div>';host.style.display='block';
      const data=await fetchPayrollData();let html=`<div style="font-size:12px;color:var(--text-l);margin-bottom:10px">Semaines complètes : <b>${safe(data.alignedStart)}</b> → <b>${safe(data.alignedEnd)}</b> · règle HS : au-delà de 35h</div>`;
      for(const ws of data.weeks){const we=addDays(ws,6);html+=`<div style="overflow:auto;margin-bottom:14px"><div style="font-weight:900;margin:6px 0">Semaine du ${ddmm(ws)} au ${ddmm(we)}</div><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th style="text-align:left">Salarié</th>${Array.from({length:7},(_,i)=>{const d=addDays(ws,i);return`<th>${dayShort(d)} ${ddmm(d)}</th>`}).join('')}<th>Total</th><th>HS</th></tr></thead><tbody>${weeklyRows(data,ws).map(r=>`<tr><td style="font-weight:800">${safe(r.employee.full_name)}</td>${r.days.map((d,i)=>`<td style="padding:5px;border-top:1px solid #eee">${safe(dayCell(r.dmins[i],data.leaveBy[r.employee.id+'_'+d]))}</td>`).join('')}<td><b>${fmtMin(r.total)}</b></td><td><b>${fmtMin(r.hs1+r.hs2)}</b></td></tr>`).join('')}</tbody></table></div>`}
      box.innerHTML=html;
    }catch(e){console.error(TAG,e);box.innerHTML='<div class="empty"><div class="ico">⚠️</div><p>'+safe(e.message||e)+'</p></div>'}
  }

  function installUI(){
    const tab=$('mgr-exp');if(!tab)return;
    const excel=[...tab.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('exportXLSX'));
    if(excel){excel.textContent='💶 Excel Paie';excel.title='Export paie par semaine du lundi au dimanche';}
    const prev=[...tab.querySelectorAll('button')].find(b=>(b.getAttribute('onclick')||'').includes('previewExport'));
    if(prev)prev.textContent='👁 Aperçu paie';
    const card=excel?.closest('.card');
    if(card&&!$('payroll-info-v166')){const info=document.createElement('div');info.id='payroll-info-v166';info.style.cssText='margin-top:10px;padding:10px;border-radius:10px;background:#EFF6FF;border:1px solid #BFDBFE;font-size:11px;line-height:1.45;color:#1E3A8A';info.innerHTML='<b>Format paie :</b> 1 onglet par semaine, du lundi au dimanche, colonnes Lun jj/mm → Dim jj/mm, total semaine, heures normales, HS 35→43h, HS >43h, CP, récupérations et absences + feuille Mouvements.';card.appendChild(info)}
  }

  window.exportPayrollXLSX=exportPayrollXLSX;
  window.exportXLSX=exportPayrollXLSX;
  window.previewExport=previewPayroll;
  window.addEventListener('DOMContentLoaded',()=>setTimeout(installUI,400));
  setTimeout(installUI,800);
  console.log(TAG,'actif');
})();
