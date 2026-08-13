// OM PRO API — V16.2 planning fix
(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const hh=v=>{const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?m[1].padStart(2,'0')+':'+m[2]:''};
  const esc=v=>String(v??'').replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  const addDays=(d,n)=>{const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};
  const monday=()=>{const x=new Date();const k=x.getDay()||7;x.setDate(x.getDate()-k+1);x.setHours(12,0,0,0);return x.toISOString().slice(0,10)};
  const isWork=s=>['planned','work','travail','nettoyage'].includes(String(s||'').toLowerCase());

  function collect(){
    const cells=[...document.querySelectorAll('#plan-grid-container .plan-cell[data-emp][data-date]')];
    if(!cells.length) throw new Error('Aucune cellule de planning visible');
    const rows=cells.map(c=>{
      let status=c.querySelector('.pstatus')?.value||c.querySelector('.pst')?.value||'';
      if(!status) status=(c.querySelector('.ps')?.value&&c.querySelector('.pe')?.value)?'planned':'rest';
      if(isWork(status)) status='planned';
      const work=status==='planned';
      const date=c.dataset.date;
      return {
        employee_id:c.dataset.emp,
        work_date:date,
        mission_order:Number(c.dataset.missionOrder||c.dataset.mission||1)||1,
        start_time:work?(hh(c.querySelector('.ps')?.value)||null):null,
        end_time:work?(hh(c.querySelector('.pe')?.value)||null):null,
        break_minutes:work?(Number(c.querySelector('.pb')?.value)||0):0,
        status,
        organization_type:document.querySelector(`#plan-org-grid select[data-date="${date}"]`)?.value||state.planOrg?.[date]||null,
        location_type:c.querySelector('.ploc')?.value||'batiment_pro',
        location_label:c.querySelector('.pnote')?.value||null,
        note:c.querySelector('.pnote')?.value||null,
        function_type:c.querySelector('.pjob')?.value||[...c.classList].find(x=>x.startsWith('job-'))?.slice(4)||'polyvalent',
        template_key:c.querySelector('.tpl-select')?.value||'custom'
      };
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
      setTimeout(()=>loadPlanningWeek?.(),250);
    }catch(e){ console.error('V16.2 planning',e); toast('Erreur planning : '+(e.message||e),'err'); }
  }

  async function loadEmployeeHome(){
    if(!state.current?.id) return;
    const host=$('emp-punch'); if(!host) return;
    let card=$('emp-home-plan-v162');
    if(!card){card=document.createElement('div');card.id='emp-home-plan-v162';card.className='card';card.innerHTML='<div class="section-t" style="margin-top:0">📅 Mon planning</div><div id="emp-home-plan-v162-body">Chargement...</div>';host.prepend(card)}
    const body=$('emp-home-plan-v162-body');
    const start=monday(),end=addDays(start,6);
    const q=await sb.from('employee_planning').select('*').eq('employee_id',state.current.id).gte('work_date',start).lte('work_date',end).order('work_date').order('mission_order');
    if(q.error){body.textContent='Planning indisponible';return}
    const rows=q.data||[];
    body.innerHTML=rows.length?rows.map(r=>`<div style="padding:5px 0"><b>${esc(r.work_date)}</b> · ${isWork(r.status)?`${hh(r.start_time)}–${hh(r.end_time)}`:esc(r.status||'Repos')}</div>`).join(''):'Aucun planning enregistré cette semaine.';
  }

  async function loadTeam(){
    if(!state.current) return;
    const list=$('emp-plan-list'); if(!list) return;
    let card=$('emp-team-plan-v162');
    if(!card){card=document.createElement('div');card.id='emp-team-plan-v162';card.className='card';card.innerHTML='<div class="section-t" style="margin-top:0">👥 Planning équipe</div><div id="emp-team-plan-v162-body">Chargement...</div>';list.parentNode.appendChild(card)}
    const body=$('emp-team-plan-v162-body'),start=monday(),end=addDays(start,6);
    const [p,e]=await Promise.all([sb.from('employee_planning').select('*').gte('work_date',start).lte('work_date',end).order('work_date').order('start_time'),sb.from('employees').select('id,full_name').eq('active',true)]);
    if(p.error){body.textContent='Planning équipe indisponible';return}
    const names={};(e.data||[]).forEach(x=>names[x.id]=x.full_name);
    body.innerHTML=(p.data||[]).filter(r=>isWork(r.status)).map(r=>`<div style="padding:4px 0"><b>${esc(r.work_date)}</b> · ${esc(names[r.employee_id]||'Salarié')} · ${hh(r.start_time)}–${hh(r.end_time)}</div>`).join('')||'Aucune présence enregistrée cette semaine.';
  }

  window.savePlanningWeek=save;
  const oldEmpTab=window.empTab;
  window.empTab=function(name,btn){const r=oldEmpTab?oldEmpTab.apply(this,arguments):undefined;if(name==='punch')setTimeout(loadEmployeeHome,150);if(name==='planning')setTimeout(loadTeam,200);return r};
  const oldEnter=window.enterEmp;
  window.enterEmp=async function(){const r=oldEnter?await oldEnter.apply(this,arguments):undefined;setTimeout(()=>{loadEmployeeHome();loadTeam()},400);return r};
  window.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(state.current){loadEmployeeHome();loadTeam()}},800));
  console.log('V16.2 planning fix loaded');
})();
