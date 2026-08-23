// OM PRO API — V16.7 overnight shift hotfix
// Fixe les services qui commencent un jour et se terminent après minuit.
(function(){
  'use strict';

  const MAX_OPEN_SHIFT_HOURS = 18;

  function parisDateISO(date){
    const d = date || new Date();
    const parts = new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(d);
    const get = type => parts.find(p => p.type === type)?.value;
    return `${get('year')}-${get('month')}-${get('day')}`;
  }

  function addDays(iso, amount){
    const [y,m,d] = String(iso).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + amount, 12, 0, 0));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
  }

  function isMissionActive(punches){
    const starts = punches.filter(p => p.punch_type === 'start').length;
    const ends = punches.filter(p => p.punch_type === 'end').length;
    return starts > ends;
  }

  function lastUnmatchedStart(punches){
    let open = null;
    for(const p of [...punches].sort((a,b)=>new Date(a.punched_at)-new Date(b.punched_at))){
      if(p.punch_type === 'start') open = p;
      else if(p.punch_type === 'end' && open) open = null;
    }
    return open;
  }

  function isRecentOpenShift(punches){
    const start = lastUnmatchedStart(punches);
    if(!start) return false;
    const ageHours = (Date.now() - new Date(start.punched_at).getTime()) / 3600000;
    return ageHours >= 0 && ageHours <= MAX_OPEN_SHIFT_HOURS;
  }

  function buildDayState(serviceDay, punches){
    const ps = [...punches].sort((a,b)=>new Date(a.punched_at)-new Date(b.punched_at));
    const startCount = ps.filter(p => p.punch_type === 'start').length;
    const endCount = ps.filter(p => p.punch_type === 'end').length;
    const missionActive = startCount > endCount;
    const has = type => ps.some(p => p.punch_type === type);
    const breakCount = ps.filter(p => ['break_morning','break_lunch','break_afternoon','pause'].includes(p.punch_type)).length;
    const resumeCount = ps.filter(p => p.punch_type === 'resume').length;

    return {
      day: serviceDay,
      punches: ps,
      has_start: missionActive,
      has_end: false,
      missions_completed: endCount,
      mission_active: missionActive,
      has_break_morning: has('break_morning'),
      has_break_lunch: has('break_lunch'),
      has_break_afternoon: has('break_afternoon'),
      is_on_break: missionActive && breakCount > resumeCount
    };
  }

  function renderPunchState(){
    if(typeof updateLocationPill === 'function') updateLocationPill();
    if(typeof renderStatus === 'function') renderStatus();
    if(typeof renderPunchBtns === 'function') renderPunchBtns();
    if(typeof renderHistory === 'function') renderHistory();
  }

  // Corrige la fonction globale dupliquée plus bas dans index.html qui utilisait UTC.
  window.todayISO = parisDateISO;

  window.loadDayState = async function(){
    if(typeof state === 'undefined' || !state.current) return;

    const today = parisDateISO();
    const yesterday = addDays(today, -1);

    state.dayState = buildDayState(today, []);
    renderPunchState();

    try {
      const result = await sb.from('punches')
        .select('id, punch_type, punched_at, service_date, location_type, location_other, is_regularized, regularization_reason')
        .eq('employee_id', state.current.id)
        .in('service_date', [yesterday, today])
        .order('punched_at');

      if(result.error){
        console.error('SUPABASE OVERNIGHT LOAD ERROR:', result.error);
        toast('SQL: ' + (result.error.message || JSON.stringify(result.error)).slice(0, 120), 'err');
        return;
      }

      const all = result.data || [];
      const todayPunches = all.filter(p => p.service_date === today);
      const yesterdayPunches = all.filter(p => p.service_date === yesterday);

      const yesterdayOpen = isMissionActive(yesterdayPunches) && isRecentOpenShift(yesterdayPunches);
      const todayOpen = isMissionActive(todayPunches);

      // Après un pointage de fin nocturne, on garde brièvement le service de la veille affiché
      // jusqu'au prochain début de service du nouveau jour.
      const previousEndedAfterMidnight = !todayPunches.length && yesterdayPunches.some(p =>
        p.punch_type === 'end' && parisDateISO(new Date(p.punched_at)) === today
      );

      let serviceDay = today;
      let punches = todayPunches;

      if(!todayOpen && (yesterdayOpen || previousEndedAfterMidnight)){
        serviceDay = yesterday;
        punches = yesterdayPunches;
      }

      state.dayState = buildDayState(serviceDay, punches);
      state.dayState.is_overnight = serviceDay !== today;
      state.dayState.calendar_day = today;

      renderPunchState();
    } catch(err){
      console.error('OVERNIGHT LOAD EXCEPTION:', err);
      toast('JS: ' + (err.message || String(err)).slice(0, 120), 'err');
    }
  };

  window.executeConfirmedPunch = async function(){
    const pinEl = document.getElementById('conf-pin-input');
    const pin = pinEl ? pinEl.value : '';
    if(!pin || pin.length !== 4){
      toast('PIN à 4 chiffres', 'err');
      return;
    }

    const type = state.pendingPunch;
    if(!type) return;
    closeModal('mod-confirm-pin');

    try {
      const {data: loginData, error: loginErr} = await sb.rpc('employee_login', {
        p_employee_id: state.current.id,
        p_pin: pin
      });

      if(loginErr || !loginData || !loginData.ok){
        toast('PIN incorrect', 'err');
        return;
      }

      const currentCalendarDay = parisDateISO();
      const activeServiceDay = state.dayState && state.dayState.has_start
        ? state.dayState.day
        : currentCalendarDay;

      // Un nouveau début appartient toujours au nouveau jour.
      // Tous les autres pointages restent rattachés au service déjà ouvert, même après minuit.
      const serviceDate = type === 'start' ? currentCalendarDay : activeServiceDay;

      const insertData = {
        employee_id: state.current.id,
        punch_type: type,
        punched_at: new Date().toISOString(),
        service_date: serviceDate
      };

      if(type === 'start' && state.currentLocation){
        insertData.location_type = state.currentLocation.type;
        if(state.currentLocation.other) insertData.location_other = state.currentLocation.other;
      }

      const {error} = await sb.from('punches').insert(insertData).select();
      if(error){
        console.error('INSERT PUNCH ERROR:', error);
        toast('SQL INSERT: ' + (error.message || JSON.stringify(error)).slice(0, 150), 'err');
        return;
      }

      toast('✓ ' + (PLBL[type] || 'Pointage') + ' enregistré', 'suc');
      state.pendingPunch = null;

      if(type === 'end'){
        state.currentLocation = null;
        if(state.current && typeof isInterimName === 'function' && !isInterimName(state.current.full_name, state.current.contrat)){
          setTimeout(()=>toast('🧳 Tu changes de lieu ? Pense à pointer ton trajet dans l\'onglet "Trajet"', 'suc'), 900);
        }
      }

      await window.loadDayState();
    } catch(err){
      console.error('OVERNIGHT PUNCH EXCEPTION:', err);
      toast('Erreur pointage : ' + (err.message || String(err)).slice(0, 120), 'err');
    }
  };

  console.log('V16.7 overnight shift hotfix loaded');
})();
