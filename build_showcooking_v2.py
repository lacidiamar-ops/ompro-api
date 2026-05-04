#!/usr/bin/env python3
"""Build OM_Book_ShowCooking_V2.html - futuristic enhanced version"""

with open("OM_Book_ShowCooking.html","r",encoding="utf-8") as f:
    src = f.read()

# ── 1. GSAP ──────────────────────────────────────────────────────────────────
GSAP_TAG = '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12/dist/gsap.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/gsap@3.12/dist/ScrollTrigger.min.js"></script>\n'
src = src.replace("</head>", GSAP_TAG + "</head>", 1)

# ── 2. Enhancement CSS ────────────────────────────────────────────────────────
EXTRA_CSS = """
/* ====== SC V2 FUTURISTIC ENHANCEMENTS ====== */
:root {
  --neon: #00e5ff;
  --gold-glow: rgba(201,166,91,.6);
}

/* Scroll progress */
#sc-progress {
  position:fixed;top:0;left:0;width:0%;height:3px;
  background:linear-gradient(90deg,var(--g),var(--g2),var(--wok),var(--pa));
  z-index:9999;box-shadow:0 0 12px var(--g);
}

/* Cursor glow */
#sc-cursor {
  position:fixed;width:320px;height:320px;
  border-radius:50%;pointer-events:none;z-index:9998;
  transform:translate(-50%,-50%);
}

/* Back to top */
#sc-top {
  position:fixed;bottom:32px;right:32px;
  width:46px;height:46px;border-radius:50%;
  background:linear-gradient(135deg,var(--g),var(--g2));
  color:var(--b);font-size:20px;line-height:46px;text-align:center;
  box-shadow:0 0 20px var(--gold-glow);cursor:pointer;
  opacity:0;transform:translateY(20px);
  transition:all .3s cubic-bezier(.4,0,.2,1);
  z-index:999;font-weight:700;border:none;
}
#sc-top.show{opacity:1;transform:translateY(0)}
#sc-top:hover{transform:translateY(-4px) scale(1.08)}

/* Loader */
#sc-loader {
  position:fixed;inset:0;z-index:10000;
  background:linear-gradient(180deg,#0a1628 0%,#061018 100%);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
  transition:opacity .6s ease,visibility .6s ease;
}
#sc-loader.hidden{opacity:0;visibility:hidden}
.sc-loader-ring {
  width:56px;height:56px;border-radius:50%;
  border:3px solid rgba(201,166,91,.2);border-top-color:var(--g);
  animation:scSpin 1s linear infinite;
}
@keyframes scSpin{to{transform:rotate(360deg)}}
.sc-loader-txt {
  font-family:'Cormorant Garamond',serif;font-size:18px;
  color:var(--g2);letter-spacing:5px;text-transform:uppercase;
}

/* Cover canvas */
#sc-canvas {
  position:absolute;inset:0;pointer-events:none;z-index:0;border-radius:6px 18px 18px 6px;
}

/* Cover book animated corners */
.cover-corner {
  animation:scCornerPulse 2.5s ease-in-out infinite;
}
.cover-corner.tl{animation-delay:0s}
.cover-corner.tr{animation-delay:.6s}
.cover-corner.bl{animation-delay:1.2s}
.cover-corner.br{animation-delay:1.8s}
@keyframes scCornerPulse {
  0%,100%{opacity:.5}
  50%{opacity:1;box-shadow:0 0 15px var(--g)}
}

/* Cover title shimmer */
.cover h1 {
  position:relative;
}
.cover h1 em {
  background:linear-gradient(90deg,var(--g) 0%,var(--g2) 30%,#fff 50%,var(--g2) 70%,var(--g) 100%);
  background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
  animation:scShine 4s linear infinite;
}
@keyframes scShine{to{background-position:200% center}}

/* Blur-in */
.sc-blur-in {
  opacity:0;filter:blur(10px);transform:translateY(24px);
  transition:opacity .7s cubic-bezier(.4,0,.2,1),filter .7s cubic-bezier(.4,0,.2,1),transform .7s cubic-bezier(.4,0,.2,1);
}
.sc-blur-in.visible{opacity:1;filter:blur(0);transform:translateY(0)}

/* Station banner depth */
.station-banner {
  transition:transform .4s cubic-bezier(.4,0,.2,1),box-shadow .4s;
}
.station-banner:hover {
  transform:translateY(-4px);
  box-shadow:0 32px 80px rgba(0,0,0,.4),0 0 60px rgba(201,166,91,.1)!important;
}

/* Station wok glow */
.station-banner.wok {
  box-shadow:0 8px 30px rgba(204,51,0,.3), 0 0 60px rgba(255,107,53,.1);
}
.station-banner.pa {
  box-shadow:0 8px 30px rgba(56,142,60,.3), 0 0 60px rgba(124,179,66,.1);
}

/* Block cards glow on hover */
.bx {
  transition:box-shadow .3s,transform .3s;
}
.bx:hover {
  box-shadow:0 8px 30px rgba(10,37,64,.12),0 0 0 1px rgba(201,166,91,.3);
  transform:translateY(-2px);
}

/* Grain overlay */
body::before {
  content:"";position:fixed;inset:0;pointer-events:none;z-index:9990;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='.03'/></svg>");
  opacity:.4;
}

/* Topbar scrolled */
.topbar.scrolled {
  border-bottom-color:rgba(201,166,91,.25);
  box-shadow:0 4px 30px rgba(10,37,64,.4),0 0 0 1px rgba(201,166,91,.1);
}

/* Station emoji bounce */
.station-emoji {
  font-size:80px;
  animation:scEmojiBounce 3s ease-in-out infinite;
  display:block;text-align:center;user-select:none;
}
@keyframes scEmojiBounce {
  0%,100%{transform:translateY(0) rotate(-4deg) scale(1)}
  50%{transform:translateY(-14px) rotate(4deg) scale(1.05)}
}

/* Cover book glow line (spine) */
.cover-book::before {
  animation:scSpineAnim 3s ease-in-out infinite;
}
@keyframes scSpineAnim {
  0%,100%{opacity:.3}
  50%{opacity:.8;box-shadow:0 0 12px var(--g)}
}

/* Ticker */
#sc-ticker {
  background:rgba(10,37,64,.96);
  border-top:1px solid rgba(201,166,91,.15);
  border-bottom:1px solid rgba(201,166,91,.15);
  overflow:hidden;height:36px;
}
.sc-ticker-inner {
  display:flex;gap:0;white-space:nowrap;
  animation:scTick 35s linear infinite;
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:10.5px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,.55);height:36px;align-items:center;
}
.sc-ticker-inner span{padding:0 36px}
.sc-ticker-inner b{color:var(--g2)}
@keyframes scTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}

/* Wok/pa neon accent items */
.bx-n.wok { box-shadow:0 0 12px rgba(255,107,53,.4); }
.bx-n.pa  { box-shadow:0 0 12px rgba(124,179,66,.4); }

/* Free notes glow */
.nta:focus {
  outline:none;
  box-shadow:0 0 0 2px rgba(201,166,91,.4),0 4px 16px rgba(201,166,91,.1);
  border-color:var(--g)!important;
}
"""

src = src.replace("</style>", EXTRA_CSS + "\n</style>", 1)

# ── 3. Inject HTML after <body> ───────────────────────────────────────────────
BODY_INJECT = """
<!-- SC V2 Loader -->
<div id="sc-loader">
  <div class="sc-loader-ring"></div>
  <div class="sc-loader-txt">Show-Cooking</div>
</div>

<!-- SC V2 Scroll progress -->
<div id="sc-progress"></div>

<!-- SC V2 Cursor -->
<div id="sc-cursor"></div>

<!-- SC V2 Back to top -->
<button id="sc-top" title="Retour en haut" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>

<!-- SC V2 Ticker -->
<div id="sc-ticker">
  <div class="sc-ticker-inner">
    <span>OM × API Restauration</span><b>•</b>
    <span>Station Wok — Asian Show-Cooking</span><b>•</b>
    <span>Station Pâtes — Italian Show-Cooking</span><b>•</b>
    <span>Saison 2025-2026</span><b>•</b>
    <span>12 kW · 5 Tables · Matériel OM + Hôtel</span><b>•</b>
    <span>Olympique de Marseille</span><b>•</b>
    <span>OM × API Restauration</span><b>•</b>
    <span>Station Wok — Asian Show-Cooking</span><b>•</b>
    <span>Station Pâtes — Italian Show-Cooking</span><b>•</b>
    <span>Saison 2025-2026</span><b>•</b>
    <span>12 kW · 5 Tables · Matériel OM + Hôtel</span><b>•</b>
    <span>Olympique de Marseille</span><b>•</b>
  </div>
</div>
"""
src = src.replace("<body>", "<body>" + BODY_INJECT, 1)

# ── 4. Inject canvas in cover ─────────────────────────────────────────────────
src = src.replace(
    '<div class="cover-book">',
    '<div class="cover-book">\n<canvas id="sc-canvas"></canvas>',
    1
)

# ── 5. Inject V2 JS before </body> ────────────────────────────────────────────
V2_JS = """
<script id="sc-v2-js">
/* OM ShowCooking V2 - Futuristic Enhancements */
(function(){

  /* ── Loader ── */
  window.addEventListener("load", function(){
    setTimeout(function(){
      var loader = document.getElementById("sc-loader");
      if(loader) loader.classList.add("hidden");
    }, 700);
  });

  /* ── Scroll progress + back to top + topbar ── */
  window.addEventListener("scroll", function(){
    var prog = document.getElementById("sc-progress");
    var scrollTop = window.pageYOffset||document.documentElement.scrollTop;
    var docH = document.documentElement.scrollHeight-document.documentElement.clientHeight;
    if(prog) prog.style.width = (scrollTop/docH*100)+"%";

    var btn = document.getElementById("sc-top");
    if(btn){ if(scrollTop>300) btn.classList.add("show"); else btn.classList.remove("show"); }

    var tb = document.querySelector(".topbar");
    if(tb){ if(scrollTop>50) tb.classList.add("scrolled"); else tb.classList.remove("scrolled"); }
  }, {passive:true});

  /* ── Cursor glow ── */
  var cx=window.innerWidth/2, cy=window.innerHeight/2;
  var tx=cx, ty=cy;
  var cursor = document.getElementById("sc-cursor");
  document.addEventListener("mousemove", function(e){ tx=e.clientX; ty=e.clientY; }, {passive:true});
  (function raf(){
    cx += (tx-cx)*.06; cy += (ty-cy)*.06;
    if(cursor){
      cursor.style.left = cx+"px";
      cursor.style.top = cy+"px";
      cursor.style.background = "radial-gradient(circle,rgba(201,166,91,.07) 0,transparent 70%)";
    }
    requestAnimationFrame(raf);
  })();

  /* ── Blur-in observer ── */
  var els = document.querySelectorAll(".station, .station-banner, .bx, .st-hero, .cover");
  els.forEach(function(el){ el.classList.add("sc-blur-in"); });
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add("visible"); obs.unobserve(e.target); }
    });
  }, {threshold:.1, rootMargin:"0px 0px -30px 0px"});
  els.forEach(function(el){ obs.observe(el); });

  /* ── Cover canvas particles ── */
  var canvas = document.getElementById("sc-canvas");
  if(canvas){
    var coverBook = document.querySelector(".cover-book");
    var ctx = canvas.getContext("2d");
    function resize(){
      canvas.width = coverBook.offsetWidth;
      canvas.height = coverBook.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    var particles = [];
    for(var i=0;i<50;i++){
      particles.push({
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        r: Math.random()*1.2+.4,
        vx: (Math.random()-.5)*.35,
        vy: (Math.random()-.5)*.35,
        o: Math.random()*.4+.1,
        c: Math.random()>.5 ? 0 : 1
      });
    }

    function drawGrid(){
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1;
      for(var x=0;x<canvas.width;x+=50){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
      }
      for(var y=0;y<canvas.height;y+=50){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
      }
      ctx.restore();
    }

    function animP(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawGrid();
      particles.forEach(function(p){
        p.x += p.vx; p.y += p.vy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        ctx.beginPath();
        var colors = [
          ["rgba(201,166,91,","rgba(201,166,91,0)"],
          ["rgba(100,200,255,","rgba(100,200,255,0)"]
        ];
        var g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*10);
        g.addColorStop(0, colors[p.c][0]+p.o+")");
        g.addColorStop(1, colors[p.c][1]);
        ctx.fillStyle = g;
        ctx.arc(p.x,p.y,p.r*10,0,Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = p.c===0 ? "rgba(231,201,137,"+(p.o*2)+")" : "rgba(150,220,255,"+(p.o*2)+")";
        ctx.fill();
      });
      requestAnimationFrame(animP);
    }
    animP();
  }

  /* ── GSAP ── */
  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);

    /* Cover entrance */
    gsap.from(".cover-book", {duration:1.4, y:60, opacity:0, ease:"expo.out", delay:.2});
    gsap.from(".cover-corner", {duration:.8, scale:0, opacity:0, stagger:.15, ease:"back.out(2)", delay:.8});
    gsap.from(".cover-logos", {duration:1, y:30, opacity:0, ease:"power3.out", delay:.6});

    /* Station banners */
    gsap.utils.toArray(".station-banner").forEach(function(el,i){
      gsap.from(el, {
        scrollTrigger:{trigger:el, start:"top 85%"},
        duration:1, x: i%2===0 ? -80 : 80, opacity:0, ease:"expo.out"
      });
    });

    /* Block cards stagger */
    gsap.utils.toArray(".bg").forEach(function(grid){
      gsap.from(grid.querySelectorAll(".bx"), {
        scrollTrigger:{trigger:grid, start:"top 85%"},
        duration:.6, y:40, opacity:0, stagger:.06, ease:"power3.out"
      });
    });

    /* Section tags */
    gsap.utils.toArray(".tag").forEach(function(el){
      gsap.from(el, {
        scrollTrigger:{trigger:el, start:"top 88%"},
        duration:.6, x:-20, opacity:0, ease:"power2.out"
      });
    });
  }

})();
</script>
"""

src = src.replace("</body>", V2_JS + "\n</body>", 1)

with open("OM_Book_ShowCooking_V2.html","w",encoding="utf-8") as f:
    f.write(src)

print("Done! OM_Book_ShowCooking_V2.html created:", len(src), "chars")
