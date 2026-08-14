// OM PRO API — V16.5 loader
(function(){
  function load(src){
    return new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src+'?v=16.5.1';
      s.onload=resolve;
      s.onerror=()=>reject(new Error('Impossible de charger '+src));
      document.head.appendChild(s);
    });
  }
  load('planning-v165-core.js')
    .then(()=>load('hr-v165-fix.js'))
    .catch(e=>{console.error('V16.5 loader',e); if(typeof toast==='function') toast('Erreur chargement mise à jour V16.5','err');});
})();
