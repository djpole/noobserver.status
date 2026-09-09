/* Noobserver Status — escena "Dentro del servidor".
   Foto del portal a pantalla completa con mouse-look 2.5D y tarjetas de
   datos flotando. Efectos: estela del ratón, brasas del portal en dos
   planos y onda al hacer clic en el portal. Sin librerías.
   La foto va incrustada en pano/faces.js (window.HERO_IMG). */
(function () {
  "use strict";

  var viewer  = document.getElementById("viewer");
  var hero    = document.getElementById("hero");
  var dust    = document.getElementById("dust");
  var ripples = document.getElementById("ripples");
  var fx      = document.getElementById("fx");
  var scene3d = document.getElementById("scene3d");
  var hint    = document.getElementById("hint");
  var reduce  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  hero.style.backgroundImage = "url('" + (window.HERO_IMG || "pano/hero.jpg") + "')";

  var _q = new URLSearchParams(location.search);
  var PANX = _q.has("pan") ? parseFloat(_q.get("pan")) : 40;
  var PANY = PANX * 0.52;
  var UPFRAC = _q.has("up") ? parseFloat(_q.get("up")) / 100 : 0.20;
  var ZTGT = _q.has("z") ? parseFloat(_q.get("z")) : 1.50;

  var tx = 0, ty = 0, mx = 0, my = 0;
  var zoom = reduce ? ZTGT : ZTGT + 0.1;

  // brasas del portal en dos planos: "lejanas" sobre la boca (se mueven
  // casi como el portal) y "de detrás" sobre el arco (se mueven menos).
  var dustFar = null, dustBehind = null;
  if (dust) {
    dustBehind = document.createElement("div"); dustBehind.className = "dust-layer dust-behind";
    dustFar    = document.createElement("div"); dustFar.className    = "dust-layer dust-far";

    function ember(opts) {
      var m = document.createElement("i");
      m.className = "mote";
      m.style.left = (51 + (Math.random() - 0.5) * opts.spread).toFixed(1) + "%";
      m.style.top  = (opts.top0 + Math.random() * opts.topR).toFixed(1) + "%";
      m.style.animationDuration = (opts.dur0 + Math.random() * opts.durR).toFixed(1) + "s";
      m.style.animationDelay    = (-Math.random() * 14).toFixed(1) + "s";
      var s = (opts.size0 + Math.random() * opts.sizeR).toFixed(1);
      m.style.width = m.style.height = s + "px";
      m.style.opacity = opts.op;
      m.style.setProperty("--sway", ((Math.random() - 0.5) * opts.sway).toFixed(0) + "px");
      m.style.setProperty("--rise", (opts.rise0 - Math.random() * opts.riseR).toFixed(0) + "px");
      return m;
    }

    var fB = document.createDocumentFragment();
    for (var a = 0; a < 16; a++) {
      fB.appendChild(ember({
        spread: 7 + Math.random() * 7, top0: 17, topR: 7,
        size0: 1.0, sizeR: 1.5, op: 0.42, sway: 22,
        rise0: -45, riseR: 70, dur0: 9, durR: 8
      }));
    }
    var fF = document.createDocumentFragment();
    for (var b = 0; b < 22; b++) {
      fF.appendChild(ember({
        spread: 9 + Math.random() * 10, top0: 26, topR: 8,
        size0: 1.4, sizeR: 2.0, op: 0.62, sway: 32,
        rise0: -30, riseR: 70, dur0: 8, durR: 7
      }));
    }
    dustBehind.appendChild(fB);
    dustFar.appendChild(fF);
    dust.appendChild(dustBehind);
    dust.appendChild(dustFar);
  }

  // estela de partículas siguiendo al puntero
  var lastSpark = 0, lastSX = 0, lastSY = 0;
  function spark(x, y) {
    if (!fx) return;
    var now = performance.now();
    if (now - lastSpark < 16) return;
    var dx = x - lastSX, dy = y - lastSY;
    if (dx * dx + dy * dy < 90) return;
    lastSpark = now; lastSX = x; lastSY = y;
    var i = document.createElement("i");
    i.className = "spark";
    var sz = (5 + Math.random() * 7).toFixed(1);
    i.style.width = i.style.height = sz + "px";
    i.style.left = x + "px";
    i.style.top  = y + "px";
    i.style.setProperty("--dx", ((Math.random() - 0.5) * 34).toFixed(0) + "px");
    i.style.setProperty("--dy", (12 + Math.random() * 26).toFixed(0) + "px");
    fx.appendChild(i);
    i.addEventListener("animationend", function () { i.remove(); });
  }

  // clic dentro del cuadrado del portal -> onda desde el centro del portal
  var PORTAL_CX = 0.505;
  var HIT_CY = 0.485, HIT_RX = 0.07, HIT_RY = 0.115;
  var RIPPLE_CY = 0.435;
  function spawnRipple() {
    if (!ripples) return;
    var r = document.createElement("i");
    r.className = "ripple";
    r.style.left = (PORTAL_CX * window.innerWidth + mx * -PANX) + "px";
    r.style.top  = (RIPPLE_CY * window.innerHeight + my * -PANY) + "px";
    ripples.appendChild(r);
    r.addEventListener("animationend", function () { r.remove(); });
  }
  viewer.addEventListener("click", function (e) {
    var rx = Math.abs(e.clientX / window.innerWidth - PORTAL_CX);
    var ry = Math.abs(e.clientY / window.innerHeight - HIT_CY);
    if (rx < HIT_RX && ry < HIT_RY) spawnRipple();
  });

  window.addEventListener("mousemove", function (e) {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
    spark(e.clientX, e.clientY);
    if (hint) hint.classList.add("fade");
  });
  document.addEventListener("mouseleave", function () { tx = 0; ty = 0; });
  window.addEventListener("blur", function () { tx = 0; ty = 0; });
  window.addEventListener("touchmove", function (e) {
    if (!e.touches[0]) return;
    tx = e.touches[0].clientX / window.innerWidth - 0.5;
    ty = e.touches[0].clientY / window.innerHeight - 0.5;
    spark(e.touches[0].clientX, e.touches[0].clientY);
    if (hint) hint.classList.add("fade");
  }, { passive: true });
  viewer.addEventListener("selectstart", function (e) { e.preventDefault(); });
  viewer.addEventListener("dragstart", function (e) { e.preventDefault(); });

  (function loop() {
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    zoom += (ZTGT - zoom) * 0.045;

    var hx = mx * -PANX;
    var hy = my * -PANY + UPFRAC * window.innerHeight;
    hero.style.transform = "translate3d(" + hx.toFixed(1) + "px," + hy.toFixed(1) + "px,0) scale(" + zoom.toFixed(4) + ")";

    if (dustBehind) dustBehind.style.transform =
      "translate3d(" + (mx * -PANX * 0.5).toFixed(1) + "px," + (my * -PANY * 0.5).toFixed(1) + "px,0)";
    if (dustFar) dustFar.style.transform =
      "translate3d(" + (mx * -PANX * 1.15).toFixed(1) + "px," + (my * -PANY * 1.1).toFixed(1) + "px,0)";

    if (scene3d) scene3d.style.transform =
      "rotateX(" + (my * 1.8).toFixed(3) + "deg) rotateY(" + (mx * -2.6).toFixed(3) + "deg)";

    requestAnimationFrame(loop);
  })();
})();
