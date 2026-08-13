// OM PRO API — V16.1 planning persistence/display hotfix
// Scope: planning save/read/home/team only. Does not touch PIN/auth/punch logic.
(function(){
  'use strict';
  const TAG='V16.1-PLANNING-FIX';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const hh=v=>{ const m=String(v||'').match(/^(\d{1,2}):(\d{2})/); return m?m[1].padStart(2,'0')+':'+m[2]:''; };
  const parseISO=iso=>new Date(String(iso).slice(0,10)+'T12:00:00');
  const iso=d=>{ const x=new Date(d); x.setHours(12,0,0,0); return x.toISOString().slice(0,10); };
  const addDays=(d,n)=>{ const x=parseISO(d); x.setDate(x.getDate()+n); return iso(x); };
  const mondayOf=(d=new Date())=>{ const x=new Date(d); const wd=x.getDay()||7; x.setDate(x.getDate()-wd+1); x.setHours(12,0,0,0); return iso(x); };
  const frDay=d=>parseISO(d).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'2-digit'});
  const workStatus=s=>['planned','work','travail','nettoyage'].includes(String(s||'').toLowerCase());
  const statusLabel=s=>({planned:'Travail',work:'Travail',travail:'Travail',nettoyage:'Nettoyage',rest:'Repos',conge_paye:'Congé payé',absence:'Absence',absence_injustifiee:'Absence',recovery:'Récupération',unpaid:'Sans solde',ferme:'Fermé'}[String(s||'').toLowerCase()]||String(s||'Repos'));

  function employeeMap(){
    const out={};
    [...(window.state?.allEmps||[]),...(window.state?.employees||[])].forEach(e=>{ if(e?.id) out[String(e.id)]=e; });
    return out;
  }
  function cellFunction(cell,emp){
    const direct=cell.querySelector('.pjob')?.value;
    if(direct) return direct;
    const cls=[...(cell.classList||[])].find(c=>c.startsWith('job-'));
    return cls?cls.slice(4):(emp?.default_function||'polyvalent');
  }
  function collectVisibleRowsStrict(){
    const cells=[...document.querySelectorAll('#plan-grid-container .plan-cell[data-emp][data-date]')];
    if(!cells.length) throw new Error('Grille planning non affichée : recharge la semaine avant d\'enregistrer.');
    const emps=employeeMap();
    const rows=cells.map(cell=>{
      const employee_id=cell.dataset.emp;
      const work_date=cell.dataset.date;
      const emp=emps[String(employee_id)]||{};
      let status=cell.querySelector('.pstatus')?.value || cell.querySelector('.pst')?.value || cell.dataset.status || '';
      if(!status) status=(cell.querySelector('.ps')?.value&&cell.querySelector('.pe')?.value)?'planned':'rest';
      if(workStatus(status)) status='planned';
      const isWork=status==='planned';
      const orgSel=document.querySelector(`#plan-org-grid select[data-date="${CSS.escape(work_date)}"]`);
      const mission_order=Number(cell.dataset.missionOrder||cell.dataset.mission||1)||1;
      return {
        employee_id,
        work_date,
        mission_order,
        start_time:isWork?(hh(cell.querySelector('.ps')?.value)||null):null,
        end_time:isWork?(hh(cell.querySelector('.pe')?.value)||null):null,
        break_minutes:isWork?(Number(cell.querySelector('.pb')?.value)||0):0,
        status,
        organization_type:orgSel?.value || window.state?.planOrg?.[work_date] || cell.dataset.org || null,
        location_type:cell.querySelector('.ploc')?.value || 'batiment_pro',
        location_label:cell.querySelector('.pnote')?.value || null,
        note:cell.querySelector('.pnote')?.value || null,
        function_type:cellFunction(cell,emp),
        template_key:cell.querySelector('.tpl-select')?.value || 'custom'
      };
    });
    const dates=[...new Set(rows.map(r=>r.work_date))].sort();
    if(dates.length!==7) throw new Error(`La grille doit contenir exactement 7 jours visibles (actuellement ${dates.length}).`);
    for(let i=1;i<dates.length;i++) if(dates[i]!==addDays(dates[0],i)) throw new Error('Les 7 jours visibles ne sont pas consécutifs.');
    if(parseISO(dates[0]).getDay()!==1) throw new Error('La semaine visible doit commencer un lundi.');
    return {rows,start:dates[0],end:dates[6]};
  }

  async function savePlanningV161(){
    if(typeof window.isAmarPlanningManager==='function' && !window.isAmarPlanningManager()){
      window.toast?.('Enregistrement réservé au manager','err'); return;
    }
    try{
      const {rows,start,end}=collectVisibleRowsStrict();
      const empIds=[...new Set(rows.map(r=>r.employee_id))];
      if(!empIds.length) throw new Error('Aucun salarié dans la grille.');
      const del=await window.sb.from('employee_planning').delete().gte('work_date',start).lte('work_date',end).in('employee_id',empIds);
      if(del.error) throw del.error;
      const ins=await window.sb.from('employee_planning').insert(rows);
      if(ins.error) throw ins.error;
      const chk=await window.sb.from('employee_planning').select('employee_id,work_date,mission_order,status,start_time,end_time,break_minutes').gte('work_date',start).lte('work_date',end).in('employee_id',empIds);
      if(chk.error) throw chk.error;
      const expected=rows.length, actual=(chk.data||[]).length;
      if(actual!==expected) throw new Error(`Contrôle Supabase incomplet : ${actual}/${expected} lignes relues.`);
      const weekInput=$('plan-week-start'); if(weekInput) weekInput.value=start;
      try{ localStorage.setItem('ompro_manager_planning_week_start',start); }catch(e){}
      if(window.state) window.state.planningRows=rows.map(r=>({...r}));
      window.toast?.(`✓ Planning ${frDay(start)} → ${frDay(end)} enregistré : ${actual} lignes`,'suc');
      setTimeout(()=>{ try{ window.loadPlanningWeek?.(); }catch(e){} },250);
      console.log(TAG,'save verified',start,end,actual);
    }catch(e){
      console.error(TAG,e);
      window.toast?.('Erreur planning : '+(e.message||e),'err');
    }
  }

  function ensureHomeCard(){
    const punch=$('emp-punch'); if(!punch || $('emp-home-planning-v161')) return;
    const card=document.createElement('div');
    card.id='emp-home-planning-v161'; card.className='card';
    card.style.borderLeft='5px solid var(--om)';
    card.innerHTML='<div class="section-t" style="margin-top:0">📅 Mon planning</div><div id="emp-home-planning-body-v161"><div class="empty"><p>Chargement...</p></div></div>';
    const status=$('emp-status');
    if(status?.parentNode) status.parentNode.insertBefore(card,status.nextSibling); else punch.prepend(card);
  }
  async function loadHomePlanningV161(){
    if(!window.state?.current?.id || !window.sb) return;
    ensureHomeCard(); const box=$('emp-home-planning-body-v161'); if(!box) return;
    const today=(()=>{ try{return new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(e){return new Date().toISOString().slice(0,10);} })();
    const end=addDays(today,7);
    try{
      const {data,error}=await window.sb.from('employee_planning').select('*').eq('employee_id',window.state.current.id).gte('work_date',today).lte('work_date',end).order('work_date').order('mission_order');
      if(error) throw error;
      const rows=data||[]; const todayRows=rows.filter(r=>r.work_date===today); const next=rows.find(r=>r.work_date>today && workStatus(r.status));
      let html='';
      if(todayRows.length){
        html += todayRows.map(r=>workStatus(r.status)
          ? `<div style="font-weight:900;font-size:16px">Aujourd’hui · ${hh(r.start_time)} → ${hh(r.end_time)}</div><div style="font-size:12px;color:var(--text-l);margin-top:3px">Pause prévue : ${Number(r.break_minutes)||0} min · ${esc(r.location_label||r.note||'')}</div>`
          : `<div style="font-weight:900;font-size:16px">Aujourd’hui · ${esc(statusLabel(r.status))}</div>`).join('');
      }else html='<div style="font-weight:800">Aucun planning enregistré pour aujourd’hui.</div>';
      if(next) html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:12px"><b>Prochain service :</b> ${esc(frDay(next.work_date))} · ${hh(next.start_time)} → ${hh(next.end_time)}</div>`;
      box.innerHTML=html;
    }catch(e){ box.innerHTML='<div style="color:var(--red);font-size:12px">Planning indisponible : '+esc(e.message||e)+'</div>'; }
  }

  function ensureTeamCard(){
    const list=$('emp-plan-list'); if(!list || $('emp-team-plan-v161')) return;
    const card=document.createElement('div'); card.id='emp-team-plan-v161'; card.className='card'; card.style.marginTop='10px';
    card.innerHTML='<div class="section-t" style="margin-top:0">👥 Planning équipe</div><div id="emp-team-plan-body-v161"><div class="empty"><p>Chargement...</p></div></div>';
    list.parentNode?.appendChild(card);
  }
  async function loadTeamPlanningV161(){
    if(!window.state?.current || !window.sb) return;
    ensureTeamCard(); const box=$('emp-team-plan-body-v161'); if(!box) return;
    const start=mondayOf(new Date()), end=addDays(start,20);
    try{
      const [p,e]=await Promise.all([
        window.sb.from('employee_planning').select('*').gte('work_date',start).lte('work_date',end).order('work_date').order('start_time'),
        window.sb.from('employees').select('id,full_name,active').eq('active',true)
      ]);
      if(p.error) throw p.error;
      const names={}; (e.data||[]).forEach(x=>names[String(x.id)]=x.full_name);
      const rows=p.data||[]; const days=Array.from({length:21},(_,i)=>addDays(start,i));
      box.innerHTML=days.map(d=>{
        const work=rows.filter(r=>r.work_date===d && workStatus(r.status));
        if(!work.length) return `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><b>${esc(frDay(d))}</b><div style="font-size:11px;color:var(--text-l)">Aucune présence prévue</div></div>`;
        return `<div style="padding:8px 0;border-bottom:1px solid var(--border)"><b>${esc(frDay(d))}</b>${work.map(r=>`<div style="font-size:12px;margin-top:4px">${esc(names[String(r.employee_id)]||'Salarié')} · <b>${hh(r.start_time)}–${hh(r.end_time)}</b> · ${esc(r.function_type||'')}</div>`).join('')}</div>`;
      }).join('');
    }catch(e){ box.innerHTML='<div style="color:var(--red);font-size:12px">Planning équipe indisponible : '+esc(e.message||e)+'</div>'; }
  }

  // Late binding: this file is loaded after the main app and becomes the final planning save override.
  window.savePlanningWeek=savePlanningV161;
  window.savePlanningWeekV161=savePlanningV161;
  window.loadHomePlanningV161=loadHomePlanningV161;
  window.loadTeamPlanningV161=loadTeamPlanningV161;

  const prevEnterEmp=window.enterEmp;
  window.enterEmp=async function(){ const r=prevEnterEmp?await prevEnterEmp.apply(this,arguments):undefined; setTimeout(()=>{loadHomePlanningV161(); loadTeamPlanningV161();},500); return r; };
  const prevEmpTab=window.empTab;
  window.empTab=function(name,btn){ const r=prevEmpTab?prevEmpTab.apply(this,arguments):undefined; if(name==='punch') setTimeout(loadHomePlanningV161,150); if(name==='planning') setTimeout(loadTeamPlanningV161,250); return r; };
  window.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ensureHomeCard(); ensureTeamCard(); if(window.state?.current){loadHomePlanningV161();loadTeamPlanningV161();}},1000); });
  console.log(TAG,'loaded');
})();
