// OM PRO API — V16.3 planning persistence + 3-week manager visibility
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const hh=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:''};
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[s]));
  const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  const monday=()=>{const x=new Date();const k=x.getDay()||7;x.setDate(x.getDate()-k+1);x.setHours(12,0,0,0);return x.toISOString().slice(0,10)};
  const isWork=s=>['planned','work','travail','nettoyage'].includes(String(s||'').toLowerCase());
  const dayLabel=d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'2-digit'});
  const shortDate=d=>new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
  const statusLabel=s=>({rest:'Repos',conge_paye:'Congé payé',absence:'Absence',absence_injustifiee:'Absence',recovery:'Récupération',unpaid:'Sans solde',ferme:'Fermé'}[String(s||'').toLowerCase()]||String(s||'Repos'));

  function collect(){
    const cells=[...document.querySelectorAll('#plan-grid-container .plan-cell[data-emp][data-date]')];
    if(!cells.length) throw new Error('Aucune cellule de planning visible');
    const rows=cells.map(c=>{
      let status=c.querySelector('.pstatus')?.value||c.querySelector('.pst')?.value||'';
      if(!status) status=(c.querySelector('.ps')?.value&&c.querySelector('.pe')?.value)?'planned':'rest';
      if(isWork(status)) status='planned';
      const work=status==='planned', date=c.dataset.date;
      return {employee_id:c.dataset.emp,work_date:date,mission_order:Number(c.dataset.missionOrder||c.dataset.mission||1)||1,start_time:work?(hh(c.querySelector('.ps')?.value)||null):null,end_time:work?(hh(c.querySelector('.pe')?.value)||null):null,break_minutes:work?(Number(c.querySelector('.pb')?.value)||0):0,status,organization_type:document.querySelector(`#plan-org-grid select[data-date="${date}"]`)?.value||state.planOrg?.[date]||null,location_type:c.querySelector('.ploc')?.value||'batiment_pro',location_label:c.querySelector('.pnote')?.value||null,note:c.querySelector('.pnote')?.value||null,function_type:c.querySelector('.pjob')?.value||[...c.classList].find(x=>x.startsWith('job-'))?.slice(4)||'polyvalent',template_key:c.querySelector('.tpl-select')?.value||'custom'};
    });
    const dates=[...new Set(rows.map(r=>r.work_date))].sort();
    if(dates.length!==7) throw new Error('La grille visible ne contient pas 7 jours');
    return {rows,start:dates[0],end:dates[6]};
  }

  async function save(){
    try{
      const {rows,start,end}=collect();
      const q=await sb.from('employee_planning').upsert(rows,{onConflict:'employee_id,work_date,mission_order'}).select('employee_id,work_date,mission_order');
      if(q.error) throw q.error;
      const ids=[...new Set(rows.map(r=>r.employee_id))];
      const chk=await sb.from('employee_planning').select('employee_id,work_date,mission_order').gte('work_date',start).lte('work_date',end).in('employee_id',ids);
      if(chk.error) throw chk.error;
      if((chk.data||[]).length<rows.length) throw new Error(`Contrôle incomplet : ${(chk.data||[]).length}/${rows.length} lignes`);
      state.planningRows=rows;
      const inp=$('plan-week-start'); if(inp) inp.value=start;
      localStorage.setItem('ompro_manager_planning_week_start',start);
      toast(`✓ Planning enregistré : ${rows.length} lignes du ${start} au ${end}`,'suc');
      setTimeout(()=>{loadPlanningWeek?.();loadManager3Weeks();},250);
    }catch(e){console.error('V16.3 planning',e);toast('Erreur planning : '+(e.message||e),'err')}
  }

  async function loadEmployeeHome(){
    if(!state.current?.id)return;
    const host=$('emp-punch');if(!host)return;
    let card=$('emp-home-plan-v163');
    if(!card){card=document.createElement('div');card.id='emp-home-plan-v163';card.className='card';card.innerHTML='<div class="section-t" style="margin-top:0">📅 Mon planning</div><div id="emp-home-plan-v163-body">Chargement...</div>';host.prepend(card)}
    const body=$('emp-home-plan-v163-body'),start=monday(),end=addDays(start,20);
    const q=await sb.from('employee_planning').select('*').eq('employee_id',state.current.id).gte('work_date',start).lte('work_date',end).order('work_date').order('mission_order');
    if(q.error){body.textContent='Planning indisponible';return}
    body.innerHTML=renderPersonalWeeks(q.data||[],start);
  }

  async function loadTeam(){
    if(!state.current)return;
    const list=$('emp-plan-list');if(!list)return;
    let card=$('emp-team-plan-v163');
    if(!card){card=document.createElement('div');card.id='emp-team-plan-v163';card.className='card';card.innerHTML='<div class="section-t" style="margin-top:0">👥 Planning équipe — 3 semaines</div><div id="emp-team-plan-v163-body">Chargement...</div>';list.parentNode.appendChild(card)}
    const body=$('emp-team-plan-v163-body'),start=monday(),end=addDays(start,20);
    const [p,e]=await Promise.all([sb.from('employee_planning').select('*').gte('work_date',start).lte('work_date',end).order('work_date').order('start_time'),sb.from('employees').select('id,full_name').eq('active',true)]);
    if(p.error){body.textContent='Planning équipe indisponible';return}
    const names={};(e.data||[]).forEach(x=>names[x.id]=x.full_name);
    body.innerHTML=renderTeamWeeks(p.data||[],names,start);
  }

  function renderPersonalWeeks(rows,start){
    let html='';
    for(let w=0;w<3;w++){
      const ws=addDays(start,w*7),we=addDays(ws,6),wr=rows.filter(r=>r.work_date>=ws&&r.work_date<=we);
      html+=`<div style="margin:10px 0 14px;border:1px solid var(--border);border-radius:12px;overflow:hidden"><div style="background:#0B376D;color:#fff;padding:8px 10px;font-weight:900">${w===0?'Semaine en cours':`Semaine +${w}`} · ${shortDate(ws)} → ${shortDate(we)}</div>`;
      if(!wr.length) html+='<div style="padding:10px;color:var(--text-l)">Aucun planning enregistré.</div>';
      else for(let i=0;i<7;i++){const d=addDays(ws,i),dr=wr.filter(r=>r.work_date===d);html+=`<div style="padding:7px 10px;border-top:1px solid var(--border)"><b>${esc(dayLabel(d))}</b> · ${dr.length?dr.map(r=>isWork(r.status)?`<b>${hh(r.start_time)}–${hh(r.end_time)}</b>${r.break_minutes?` · pause ${r.break_minutes} min`:''}`:esc(statusLabel(r.status))).join(' / '):'—'}</div>`}
      html+='</div>';
    }
    return html;
  }

  function renderTeamWeeks(rows,names,start){
    let html='';
    for(let w=0;w<3;w++){
      const ws=addDays(start,w*7),we=addDays(ws,6),wr=rows.filter(r=>r.work_date>=ws&&r.work_date<=we);
      html+=`<div class="team-plan-week"><div class="team-plan-week-title">${w===0?'Semaine en cours':`Semaine +${w}`} <span>${shortDate(ws)} → ${shortDate(we)}</span></div><div class="team-plan-days">`;
      for(let i=0;i<7;i++){const d=addDays(ws,i),dr=wr.filter(r=>r.work_date===d&&isWork(r.status));html+=`<div class="team-plan-day"><div class="team-plan-day-top"><div class="team-plan-day-name">${esc(dayLabel(d))}</div><div class="team-plan-count">${dr.length}</div></div>${dr.length?`<div class="team-plan-present">${dr.map(r=>`<div class="team-plan-person"><div><div class="team-plan-person-name">${esc(names[r.employee_id]||'Salarié')}</div><div class="team-plan-person-meta">${esc(r.function_type||'')}</div></div><div class="team-plan-person-time">${hh(r.start_time)}–${hh(r.end_time)}</div></div>`).join('')}</div>`:'<div class="team-plan-empty-day">Aucune présence prévue</div>'}</div>`}
      html+='</div></div>';
    }
    return html;
  }

  async function loadManager3Weeks(){
    if(!state.current || state.current.role!=='manager')return;
    const dash=$('mgr-dash');if(!dash)return;
    const myHost=$('mgr-my-week');
    let teamCard=$('mgr-team-3weeks-v163');
    if(!teamCard){teamCard=document.createElement('div');teamCard.id='mgr-team-3weeks-v163';teamCard.className='card team-plan-card';teamCard.innerHTML='<div class="section-t" style="margin-top:0">👥 Planning collectif — 3 semaines</div><div id="mgr-team-3weeks-body-v163">Chargement...</div>';const myCard=myHost?.closest('.card');if(myCard?.parentNode)myCard.parentNode.insertBefore(teamCard,myCard.nextSibling);else dash.prepend(teamCard)}
    const teamBody=$('mgr-team-3weeks-body-v163'),start=monday(),end=addDays(start,20);
    const [p,e]=await Promise.all([sb.from('employee_planning').select('*').gte('work_date',start).lte('work_date',end).order('work_date').order('start_time'),sb.from('employees').select('id,full_name,role').eq('active',true)]);
    if(p.error){if(myHost)myHost.textContent='Planning indisponible';if(teamBody)teamBody.textContent='Planning collectif indisponible';return}
    const names={};(e.data||[]).forEach(x=>names[x.id]=x.full_name);
    const amar=(e.data||[]).find(x=>String(x.full_name||'').toLowerCase().includes('amar lacidi'))||state.current;
    const all=p.data||[],mine=all.filter(r=>String(r.employee_id)===String(amar?.id||state.current.id));
    if(myHost)myHost.innerHTML=renderPersonalWeeks(mine,start);
    if(teamBody)teamBody.innerHTML=renderTeamWeeks(all,names,start);
  }

  window.savePlanningWeek=save;
  window.loadManager3Weeks=loadManager3Weeks;
  window.renderMyWeekForManager=loadManager3Weeks;
  const oldEmpTab=window.empTab;
  window.empTab=function(name,btn){const r=oldEmpTab?oldEmpTab.apply(this,arguments):undefined;if(name==='punch')setTimeout(loadEmployeeHome,150);if(name==='planning')setTimeout(loadTeam,200);return r};
  const oldEnter=window.enterEmp;
  window.enterEmp=async function(){const r=oldEnter?await oldEnter.apply(this,arguments):undefined;setTimeout(()=>{loadEmployeeHome();loadTeam()},400);return r};
  const oldMgrTab=window.mgrTab;
  window.mgrTab=function(name,btn){const r=oldMgrTab?oldMgrTab.apply(this,arguments):undefined;if(name==='dash')setTimeout(loadManager3Weeks,200);return r};
  const oldEnterMgr=window.enterMgr;
  window.enterMgr=async function(){const r=oldEnterMgr?await oldEnterMgr.apply(this,arguments):undefined;setTimeout(loadManager3Weeks,450);return r};
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(state.current?.role==='manager')loadManager3Weeks();else if(state.current){loadEmployeeHome();loadTeam()}},800));
  console.log('V16.3 planning fix loaded');
})();

// V16.4 — congés manager : corrige l'ambiguïté des 2 FK vers employees
(function(){
  'use strict';
  const safe=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const kindLabel=k=>({cp:'Congé payé',recovery:'Récupération',rest:'Repos demandé',absence:'Absence autorisée'}[k]||k||'Congé');
  const statusLabel2=s=>({pending:'En attente',approved:'Validée',rejected:'Refusée'}[s]||s||'En attente');
  const fmt=d=>{try{return new Date(String(d).slice(0,10)+'T12:00:00').toLocaleDateString('fr-FR')}catch(e){return d||''}};
  async function loadLeaveRequestsV164(){
    const box=document.getElementById('mgr-leave-requests'); if(!box) return;
    box.innerHTML='<div class="empty"><div class="ico">⏳</div><p>Chargement...</p></div>';
    try{
      const {data,error}=await sb.from('employee_leave_requests')
        .select('*, employee:employees!employee_leave_requests_employee_id_fkey(full_name,role,contrat)')
        .order('created_at',{ascending:false}).limit(100);
      if(error) throw error;
      const rows=(data||[]).filter(r=>{
        const txt=String((r.employee?.role||'')+' '+(r.employee?.contrat||'')+' '+(r.employee?.full_name||'')).toLowerCase();
        return !txt.includes('interim') && !txt.includes('intérim');
      });
      if(!rows.length){box.innerHTML='<div class="empty"><div class="ico">📭</div><p>Aucune demande</p></div>';return;}
      box.innerHTML=rows.map(r=>`<div class="leave-card ${safe(r.status)}"><div class="leave-title">${safe(r.employee?.full_name||'Salarié')} · ${safe(kindLabel(r.kind))} · ${safe(statusLabel2(r.status))}</div><div class="leave-meta">Du ${fmt(r.start_date)} au ${fmt(r.end_date)}${r.note?' · '+safe(r.note):''}${r.signed_at?'<br>✍️ Demande signée':''}</div>${r.signature_data_url?`<img class="signature-preview" src="${r.signature_data_url}" alt="Signature congé">`:''}<button class="btn btn-sec btn-blk" style="margin-top:8px" onclick="printLeaveRequest('${r.id}')">🖨️ Imprimer la demande signée</button>${r.status==='pending'?`<div class="fg" style="margin-top:8px"><input id="lr-note-${r.id}" placeholder="Note manager optionnelle"></div><div class="leave-actions"><button class="btn btn-dan" onclick="reviewLeaveRequest('${r.id}','rejected')">Refuser</button><button class="btn btn-suc" onclick="reviewLeaveRequest('${r.id}','approved')">Valider</button></div>`:''}</div>`).join('');
    }catch(e){console.error('V16.4 leave',e);box.innerHTML='<div class="empty"><div class="ico">⚠️</div><p>Erreur chargement demandes congés : '+safe(e.message||e)+'</p></div>';}
  }
  window.loadLeaveRequests=loadLeaveRequestsV164;
  const prevMgrTabLeave=window.mgrTab;
  window.mgrTab=function(name,btn){const r=prevMgrTabLeave?prevMgrTabLeave.apply(this,arguments):undefined;if(name==='leave')setTimeout(loadLeaveRequestsV164,120);return r};
  console.log('V16.4 leave requests fix loaded');
})();
