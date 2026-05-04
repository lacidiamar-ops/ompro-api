#!/usr/bin/env python3
"""Build OM_Portail2.html - futuristic enhanced version of OM_Portail1.html"""
import re

with open("OM_Portail1.html","r",encoding="utf-8") as f:
    src = f.read()

# ── 1. Inject Google Fonts in <head> ─────────────────────────────────────────
FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&display=swap" rel="stylesheet">\n'
src = src.replace("<meta charset=\"UTF-8\">", "<meta charset=\"UTF-8\">\n" + FONTS, 1)

# ── 2. Inject GSAP ───────────────────────────────────────────────────────────
GSAP_TAG = '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12/dist/gsap.min.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/gsap@3.12/dist/ScrollTrigger.min.js"></script>\n'
src = src.replace("</head>", GSAP_TAG + "</head>", 1)

# ── 3. Enhancement CSS ────────────────────────────────────────────────────────
EXTRA_CSS = """
/* ====== V2 FUTURISTIC ENHANCEMENTS ====== */
:root {
  --neon: #00e5ff;
  --neon2: #7c3aed;
  --gold-glow: rgba(201,166,91,.6);
  --sky-glow: rgba(41,151,232,.4);
}

/* Scroll progress */
#v2-progress {
  position:fixed;top:0;left:0;width:0%;height:3px;
  background:linear-gradient(90deg,var(--g),var(--g2),var(--sky));
  z-index:9999;box-shadow:0 0 12px var(--g);
  transition:width .1s linear;
}

/* Cursor glow */
#v2-cursor {
  position:fixed;width:360px;height:360px;
  border-radius:50%;pointer-events:none;z-index:9998;
  background:radial-gradient(circle,rgba(201,166,91,.07) 0,transparent 70%);
  transform:translate(-50%,-50%);
  transition:opacity .3s;
}

/* Back to top */
#v2-top {
  position:fixed;bottom:32px;right:32px;
  width:46px;height:46px;border-radius:50%;
  background:linear-gradient(135deg,var(--g),var(--g2));
  color:var(--b);font-size:20px;line-height:46px;text-align:center;
  box-shadow:0 0 20px var(--gold-glow);cursor:pointer;
  opacity:0;transform:translateY(20px);
  transition:all .3s cubic-bezier(.4,0,.2,1);
  z-index:999;font-weight:700;
}
#v2-top.show{opacity:1;transform:translateY(0)}
#v2-top:hover{transform:translateY(-4px) scale(1.08);box-shadow:0 0 30px var(--gold-glow)}

/* Loading screen */
#v2-loader {
  position:fixed;inset:0;z-index:10000;
  background:var(--b);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;
  transition:opacity .6s ease, visibility .6s ease;
}
#v2-loader.hidden{opacity:0;visibility:hidden}
.v2-loader-ring {
  width:60px;height:60px;border-radius:50%;
  border:3px solid rgba(201,166,91,.2);
  border-top-color:var(--g);
  animation:v2spin 1s linear infinite;
}
@keyframes v2spin{to{transform:rotate(360deg)}}
.v2-loader-txt {
  font-family:'Cormorant Garamond',serif;font-size:20px;
  color:var(--g2);letter-spacing:4px;text-transform:uppercase;
}

/* Hero canvas */
#v2-canvas {
  position:absolute;inset:0;pointer-events:none;z-index:0;
}

/* Animated title gradient */
.hero h1 em {
  background:linear-gradient(90deg,var(--g) 0%,var(--g2) 30%,#fff 50%,var(--g2) 70%,var(--g) 100%);
  background-size:200% auto;
  -webkit-background-clip:text;background-clip:text;
  -webkit-text-fill-color:transparent;
  animation:v2textShine 4s linear infinite;
}
@keyframes v2textShine{to{background-position:200% center}}

/* Stats counter animation */
.hst b {
  font-variant-numeric:tabular-nums;
}

/* Blur-in scroll animation */
.v2-blur-in {
  opacity:0;
  filter:blur(10px);
  transform:translateY(28px);
  transition:opacity .7s cubic-bezier(.4,0,.2,1),
             filter .7s cubic-bezier(.4,0,.2,1),
             transform .7s cubic-bezier(.4,0,.2,1);
}
.v2-blur-in.visible {
  opacity:1;filter:blur(0);transform:translateY(0);
}

/* Quick-access card glow */
.qc {
  position:relative;
  --mx:50%;--my:50%;
  overflow:hidden;
}
.qc::after {
  content:"";position:absolute;inset:0;
  background:radial-gradient(circle at var(--mx) var(--my), rgba(201,166,91,.18) 0, transparent 60%);
  opacity:0;transition:opacity .3s;pointer-events:none;
  border-radius:inherit;
}
.qc:hover::after{opacity:1}

/* Section headings neon accent */
.sh h2 {
  position:relative;
  display:inline-block;
}
.sh h2::after {
  content:"";position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);
  width:0;height:2px;
  background:linear-gradient(90deg,transparent,var(--g),var(--sky),var(--g),transparent);
  transition:width .8s cubic-bezier(.4,0,.2,1);
  box-shadow:0 0 8px var(--g);
}
.sh h2.line-visible::after{width:80%}

/* Glowing topbar on scroll */
.topbar.scrolled {
  border-bottom-color:rgba(201,166,91,.25);
  box-shadow:0 4px 30px rgba(10,37,64,.4),0 0 0 1px rgba(201,166,91,.1);
}

/* Tab neon indicator */
.tabs .tab.on {
  position:relative;
}
.tabs .tab.on::after {
  content:"";position:absolute;bottom:0;left:8px;right:8px;height:2px;
  background:linear-gradient(90deg,var(--g),var(--sky));
  box-shadow:0 0 8px var(--g);border-radius:2px;
}

/* Book promo 3D hover */
.bpb {
  transition:transform .4s cubic-bezier(.4,0,.2,1),box-shadow .4s;
}
.bpb:hover {
  transform:perspective(800px) rotateY(-8deg) rotateX(3deg) translateY(-6px);
  box-shadow:-40px 40px 80px rgba(10,37,64,.4),0 0 40px rgba(201,166,91,.2);
}

/* Station emoji bounce */
.station-emoji {
  font-size:80px;
  animation:v2emojiBounce 3s ease-in-out infinite;
  display:block;text-align:center;
}
@keyframes v2emojiBounce {
  0%,100%{transform:translateY(0) rotate(-3deg)}
  50%{transform:translateY(-12px) rotate(3deg)}
}

/* Animated marquee ticker */
#v2-ticker {
  background:rgba(10,37,64,.95);
  border-top:1px solid rgba(201,166,91,.2);
  border-bottom:1px solid rgba(201,166,91,.2);
  overflow:hidden;height:38px;
  position:relative;
}
.v2-ticker-inner {
  display:flex;gap:0;white-space:nowrap;
  animation:v2tick 40s linear infinite;
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;
  font-size:11px;letter-spacing:2px;text-transform:uppercase;
  color:rgba(255,255,255,.6);height:38px;align-items:center;
}
.v2-ticker-inner span { padding:0 40px; }
.v2-ticker-inner b { color:var(--g2); }
@keyframes v2tick {
  from{transform:translateX(0)}
  to{transform:translateX(-50%)}
}

/* Intro card glow border animation */
.ic {
  position:relative;
}
.ic::after {
  content:"";position:absolute;inset:-1px;border-radius:19px;
  background:linear-gradient(135deg,var(--g),var(--sky),var(--g2),var(--b2));
  background-size:300% 300%;
  animation:v2borderAnim 6s ease infinite;
  z-index:-1;opacity:.5;
}
@keyframes v2borderAnim {
  0%{background-position:0% 50%}
  50%{background-position:100% 50%}
  100%{background-position:0% 50%}
}

/* Hero stats floating */
.hstats { position:relative;z-index:2; }
.hst {
  position:relative;cursor:default;
}
.hst::before {
  content:"";position:absolute;inset:-12px -20px;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);
  border-radius:12px;opacity:0;transition:opacity .3s;
}
.hst:hover::before{opacity:1}
.hst:hover b { text-shadow:0 0 20px var(--g2),0 0 40px rgba(231,201,137,.5); }

/* Floating particles hero */
.v2-particle {
  position:absolute;border-radius:50%;pointer-events:none;
  animation:v2particleFloat linear infinite;
  background:radial-gradient(circle,rgba(201,166,91,.4) 0,transparent 70%);
}
@keyframes v2particleFloat {
  0%{transform:translateY(0) translateX(0) scale(1);opacity:.6}
  33%{transform:translateY(-40px) translateX(20px) scale(1.1);opacity:.8}
  66%{transform:translateY(-80px) translateX(-15px) scale(.9);opacity:.5}
  100%{transform:translateY(-140px) translateX(10px) scale(1);opacity:0}
}

/* Mobile nav overlay */
#v2-mobnav {
  position:fixed;inset:0;z-index:400;
  background:rgba(6,26,48,.97);
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;
  transform:translateX(100%);transition:transform .35s cubic-bezier(.4,0,.2,1);
}
#v2-mobnav.open{transform:translateX(0)}
#v2-mobnav a {
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:22px;
  letter-spacing:2px;text-transform:uppercase;color:#fff;font-weight:500;
  padding:16px 32px;border-radius:10px;width:260px;text-align:center;
  border:1px solid rgba(255,255,255,.08);
  transition:all .2s;
}
#v2-mobnav a:hover{background:rgba(201,166,91,.12);border-color:var(--g);color:var(--g2)}
#v2-mobnav .close-btn {
  position:absolute;top:24px;right:24px;font-size:28px;color:rgba(255,255,255,.6);
  cursor:pointer;
}
.v2-hamburger {
  display:none;flex-direction:column;gap:5px;cursor:pointer;padding:8px;
}
.v2-hamburger span {
  display:block;width:24px;height:2px;background:#fff;border-radius:2px;
  transition:all .3s;
}

/* Grain overlay */
body::before {
  content:"";position:fixed;inset:0;pointer-events:none;z-index:9990;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='.03'/></svg>");
  opacity:.4;
}

/* Responsive */
@media(max-width:960px){
  .v2-hamburger{display:flex}
  .nav,.lp{display:none!important}
}
@media(max-width:600px){
  .qg{grid-template-columns:repeat(2,1fr)!important}
  .ig{grid-template-columns:1fr!important}
}
"""

src = src.replace("</style>", EXTRA_CSS + "\n</style>", 1)

# ── 4. Inject HTML elements after <body> ─────────────────────────────────────
BODY_INJECT = """
<!-- V2 Loader -->
<div id="v2-loader">
  <div class="v2-loader-ring"></div>
  <div class="v2-loader-txt">OM × API</div>
</div>

<!-- V2 Scroll progress -->
<div id="v2-progress"></div>

<!-- V2 Cursor glow -->
<div id="v2-cursor"></div>

<!-- V2 Back to top -->
<div id="v2-top" title="Retour en haut" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</div>

<!-- V2 Mobile nav -->
<div id="v2-mobnav">
  <span class="close-btn" onclick="toggleMobNav()">✕</span>
  <a href="#top" onclick="toggleMobNav()">Accueil</a>
  <a href="#projet" onclick="toggleMobNav()">Projet</a>
  <a href="#cdc" onclick="toggleMobNav()">Cahier des Charges</a>
  <a href="#book" onclick="toggleMobNav()">Book</a>
  <a href="#stations" onclick="toggleMobNav()">Stations</a>
</div>

<!-- V2 Ticker -->
<div id="v2-ticker">
  <div class="v2-ticker-inner">
    <span>OM × API Restauration</span>
    <b>•</b>
    <span>Cahier des Charges 2025-2026</span>
    <b>•</b>
    <span>Excellence Culinaire</span>
    <b>•</b>
    <span>Show-Cooking Wok & Pâtes</span>
    <b>•</b>
    <span>Olympique de Marseille</span>
    <b>•</b>
    <span>Saison 2025-2026</span>
    <b>•</b>
    <span>OM × API Restauration</span>
    <b>•</b>
    <span>Cahier des Charges 2025-2026</span>
    <b>•</b>
    <span>Excellence Culinaire</span>
    <b>•</b>
    <span>Show-Cooking Wok & Pâtes</span>
    <b>•</b>
    <span>Olympique de Marseille</span>
    <b>•</b>
    <span>Saison 2025-2026</span>
    <b>•</b>
  </div>
</div>
"""
src = src.replace("<body>", "<body>" + BODY_INJECT, 1)

# ── 5. Add hamburger button in topbar ────────────────────────────────────────
src = src.replace(
    '<button class="mb"',
    '<div class="v2-hamburger" onclick="toggleMobNav()"><span></span><span></span><span></span></div>\n  <button class="mb"',
    1
)

# ── 6. Inject canvas in hero ─────────────────────────────────────────────────
src = src.replace(
    '<section class="hero" id="top">',
    '<section class="hero" id="top">\n<canvas id="v2-canvas"></canvas>',
    1
)

# ── 7. Inject V2 JS before </body> ───────────────────────────────────────────
V2_JS = """
<script id="v2-js">
/* OM Portail V2 - Futuristic Enhancements */
(function(){

  /* ── Loader ── */
  window.addEventListener("load", function(){
    setTimeout(function(){
      var loader = document.getElementById("v2-loader");
      if(loader) loader.classList.add("hidden");
    }, 800);
  });

  /* ── Scroll progress ── */
  window.addEventListener("scroll", function(){
    var prog = document.getElementById("v2-progress");
    if(!prog) return;
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var docH = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    prog.style.width = (scrollTop / docH * 100) + "%";

    /* Back to top */
    var btn = document.getElementById("v2-top");
    if(btn){ if(scrollTop > 400) btn.classList.add("show"); else btn.classList.remove("show"); }

    /* Topbar scrolled */
    var tb = document.querySelector(".topbar");
    if(tb){ if(scrollTop > 60) tb.classList.add("scrolled"); else tb.classList.remove("scrolled"); }

    /* Nav scrollspy */
    var sections = ["top","projet","cdc","book","stations"];
    var navLinks = document.querySelectorAll(".nav a");
    var current = "";
    for(var i=0;i<sections.length;i++){
      var el = document.getElementById(sections[i]);
      if(el && el.getBoundingClientRect().top < 120) current = sections[i];
    }
    navLinks.forEach(function(a){
      var href = a.getAttribute("href");
      if(href && href.slice(1) === current) a.classList.add("on");
      else a.classList.remove("on");
    });
  }, {passive:true});

  /* ── Cursor glow ── */
  var cx=window.innerWidth/2, cy=window.innerHeight/2;
  var tx=cx, ty=cy;
  var cursor = document.getElementById("v2-cursor");
  document.addEventListener("mousemove", function(e){ tx=e.clientX; ty=e.clientY; }, {passive:true});
  (function raf(){
    cx += (tx-cx)*.06; cy += (ty-cy)*.06;
    if(cursor) cursor.style.cssText = "left:"+cx+"px;top:"+cy+"px;position:fixed;width:360px;height:360px;border-radius:50%;pointer-events:none;z-index:9998;background:radial-gradient(circle,rgba(201,166,91,.07) 0,transparent 70%);transform:translate(-50%,-50%);";
    requestAnimationFrame(raf);
  })();

  /* ── Card mouse glow ── */
  document.addEventListener("mousemove", function(e){
    var cards = document.querySelectorAll(".qc");
    cards.forEach(function(c){
      var r = c.getBoundingClientRect();
      c.style.setProperty("--mx", (e.clientX - r.left) + "px");
      c.style.setProperty("--my", (e.clientY - r.top) + "px");
    });
  }, {passive:true});

  /* ── Blur-in observer ── */
  var items = document.querySelectorAll(".sec, .bp, .sts, .sh, .qc, .ic");
  items.forEach(function(el){ el.classList.add("v2-blur-in"); });
  var obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add("visible"); obs.unobserve(e.target); }
    });
  }, {threshold:.12, rootMargin:"0px 0px -40px 0px"});
  items.forEach(function(el){ obs.observe(el); });

  /* ── Section h2 underline ── */
  var h2s = document.querySelectorAll(".sh h2");
  var h2obs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add("line-visible"); }
    });
  }, {threshold:.5});
  h2s.forEach(function(h){ h2obs.observe(h); });

  /* ── Hero canvas particles ── */
  var canvas = document.getElementById("v2-canvas");
  if(canvas){
    var hero = document.querySelector(".hero");
    var ctx = canvas.getContext("2d");
    function resizeCanvas(){
      canvas.width = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    var particles = [];
    for(var i=0;i<60;i++){
      particles.push({
        x: Math.random()*canvas.width,
        y: Math.random()*canvas.height,
        r: Math.random()*1.5+0.5,
        vx: (Math.random()-.5)*.4,
        vy: (Math.random()-.5)*.4,
        o: Math.random()*.5+.1,
        g: Math.random() > .7
      });
    }

    /* Grid lines */
    function drawGrid(){
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      var step = 60;
      for(var x=0;x<canvas.width;x+=step){
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
      }
      for(var y=0;y<canvas.height;y+=step){
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
      }
      ctx.restore();
    }

    function animParticles(){
      ctx.clearRect(0,0,canvas.width,canvas.height);
      drawGrid();
      particles.forEach(function(p){
        p.x += p.vx; p.y += p.vy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        ctx.beginPath();
        var g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*8);
        if(p.g){
          g.addColorStop(0,"rgba(201,166,91,"+p.o+")");
          g.addColorStop(1,"rgba(201,166,91,0)");
        } else {
          g.addColorStop(0,"rgba(41,151,232,"+p.o+")");
          g.addColorStop(1,"rgba(41,151,232,0)");
        }
        ctx.fillStyle = g;
        ctx.arc(p.x,p.y,p.r*8,0,Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle = p.g ? "rgba(231,201,137,"+p.o*2+")" : "rgba(100,190,255,"+p.o*2+")";
        ctx.fill();
      });
      requestAnimationFrame(animParticles);
    }
    animParticles();
  }

  /* ── Animated counters ── */
  function animateCounter(el, target, suffix){
    var start = 0;
    var duration = 1800;
    var startTime = null;
    function step(ts){
      if(!startTime) startTime = ts;
      var progress = Math.min((ts - startTime)/duration, 1);
      var ease = 1 - Math.pow(1-progress, 3);
      var val = Math.round(start + (target - start) * ease);
      el.textContent = val + suffix;
      if(progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var statsObs = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        statsObs.unobserve(e.target);
        var b = e.target.querySelector("b");
        if(!b) return;
        var txt = b.textContent.trim();
        var num = parseFloat(txt.replace(/[^\d.]/g,""));
        var suffix = txt.replace(/[\d.]/g,"");
        if(!isNaN(num)) animateCounter(b, num, suffix);
      }
    });
  }, {threshold:.5});
  document.querySelectorAll(".hst").forEach(function(s){ statsObs.observe(s); });

  /* ── GSAP ── */
  if(window.gsap && window.ScrollTrigger){
    gsap.registerPlugin(ScrollTrigger);

    /* Hero title */
    gsap.from(".hero h1", {duration:1.2, y:60, opacity:0, ease:"expo.out", delay:.3});
    gsap.from(".hero .lead", {duration:1, y:40, opacity:0, ease:"power3.out", delay:.6});
    gsap.from(".htag", {duration:.8, scale:.8, opacity:0, ease:"back.out(1.7)", delay:.15});

    /* Quick access stagger */
    gsap.from(".qc", {
      scrollTrigger:{trigger:".qa",start:"top 85%"},
      duration:.7, y:50, opacity:0, stagger:.08, ease:"power3.out"
    });

    /* Section headings */
    gsap.utils.toArray(".stag").forEach(function(el){
      gsap.from(el, {
        scrollTrigger:{trigger:el,start:"top 88%"},
        duration:.7, x:-30, opacity:0, ease:"power2.out"
      });
    });

    /* Book 3D entrance */
    gsap.from(".bpb", {
      scrollTrigger:{trigger:".bp",start:"top 80%"},
      duration:1.2, rotateY:25, opacity:0, ease:"expo.out"
    });

    /* Station banners */
    gsap.utils.toArray(".station-banner").forEach(function(el,i){
      gsap.from(el, {
        scrollTrigger:{trigger:el,start:"top 85%"},
        duration:.9, x: i%2===0 ? -60 : 60, opacity:0, ease:"power3.out"
      });
    });
  }

  /* ── Mobile nav ── */
  window.toggleMobNav = function(){
    var nav = document.getElementById("v2-mobnav");
    if(nav) nav.classList.toggle("open");
  };

})();
</script>
"""

src = src.replace("</body>", V2_JS + "\n</body>", 1)

with open("OM_Portail2.html","w",encoding="utf-8") as f:
    f.write(src)

print("Done! OM_Portail2.html created:", len(src), "chars")
