/* ==========================================================================
   Escena WebGL "Isla flotante" — three.js (vendorizado en local).
   SOLO decoración: lee el DOM que rellena script.js, nunca lo modifica.
   Si WebGL falla, se desactiva sola y queda el fondo CSS de reserva.
   ========================================================================== */
(function () {
  "use strict";

  var canvas = document.getElementById("scene-canvas");
  if (!canvas || typeof THREE === "undefined") {
    if (canvas) canvas.classList.add("no-webgl");
    return;
  }

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  } catch (e) {
    canvas.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x2a2f63, 0.03);

  // ---- cielo (textura de degradado en canvas) ----------------------------
  var skyCanvas = document.createElement("canvas");
  skyCanvas.width = 16; skyCanvas.height = 256;
  var sg = skyCanvas.getContext("2d");
  function paintSky(top, mid, bot) {
    var grad = sg.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, top);
    grad.addColorStop(0.5, mid);
    grad.addColorStop(1, bot);
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 16, 256);
    skyTex.needsUpdate = true;
  }
  var skyTex = new THREE.CanvasTexture(skyCanvas);
  scene.background = skyTex;

  var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 3.2, 12);
  camera.lookAt(0, 1.2, 0);

  // ---- luces ------------------------------------------------------------
  var hemi = new THREE.HemisphereLight(0xffffff, 0x2a2440, 0.9);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffd9a8, 1.1);
  sun.position.set(6, 10, 6);
  scene.add(sun);

  // ---- isla flotante voxel -------------------------------------------
  var island = new THREE.Group();
  scene.add(island);

  var CUBE = new THREE.BoxGeometry(1, 1, 1);
  var matGrass = new THREE.MeshLambertMaterial({ color: 0x6ab04c });
  var matDirt  = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  var matStone = new THREE.MeshLambertMaterial({ color: 0x8a8f98 });
  var matTrunk = new THREE.MeshLambertMaterial({ color: 0x5a3d24 });
  var matLeaf  = new THREE.MeshLambertMaterial({ color: 0x4e9d3f });

  function addCube(mat, x, y, z) {
    var m = new THREE.Mesh(CUBE, mat);
    m.position.set(x, y, z);
    island.add(m);
  }

  var R = 5;
  for (var x = -R; x <= R; x++) {
    for (var z = -R; z <= R; z++) {
      var d = Math.sqrt(x * x + z * z);
      if (d > R - 0.2) continue;
      addCube(matGrass, x, 0, z);                 // capa de hierba
      var depth = Math.max(1, Math.round(3 - d * 0.45)); // punta hacia abajo
      for (var k = 1; k <= depth; k++) {
        addCube(k >= depth ? matStone : matDirt, x, -k, z);
      }
    }
  }

  function addTree(x, z) {
    addCube(matTrunk, x, 1, z);
    addCube(matTrunk, x, 2, z);
    for (var lx = -1; lx <= 1; lx++)
      for (var lz = -1; lz <= 1; lz++) {
        addCube(matLeaf, x + lx, 3, z + lz);
        if (lx === 0 || lz === 0) addCube(matLeaf, x + lx, 4, z + lz);
      }
  }
  addTree(-2, -1);
  addTree(2, 2);
  addTree(0, -3);

  // agua alrededor
  var water = new THREE.Mesh(
    new THREE.CircleGeometry(9, 40),
    new THREE.MeshLambertMaterial({ color: 0x2f6f8f, transparent: true, opacity: 0.5 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.6;
  island.add(water);

  // ---- cabezas de jugadores (voxel, sin nube) -----------------------
  function makeFaceTexture() {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var g = c.getContext("2d");
    g.fillStyle = "#c99e77"; g.fillRect(0, 0, 64, 64);           // piel
    g.fillStyle = "#5a3b28"; g.fillRect(0, 0, 64, 16);           // pelo
    g.fillStyle = "#ffffff"; g.fillRect(14, 28, 12, 10); g.fillRect(38, 28, 12, 10);
    g.fillStyle = "#3b6ea5"; g.fillRect(18, 30, 6, 6);  g.fillRect(42, 30, 6, 6);
    g.fillStyle = "#7a4a34"; g.fillRect(24, 46, 16, 5);          // boca
    return new THREE.CanvasTexture(c);
  }
  var faceTex = makeFaceTexture();
  var headGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  var headMats = [
    new THREE.MeshLambertMaterial({ color: 0xc99e77 }),
    new THREE.MeshLambertMaterial({ color: 0xc99e77 }),
    new THREE.MeshLambertMaterial({ color: 0x5a3b28 }),
    new THREE.MeshLambertMaterial({ color: 0xc99e77 }),
    new THREE.MeshLambertMaterial({ map: faceTex }),
    new THREE.MeshLambertMaterial({ color: 0xc99e77 })
  ];
  var headsGroup = new THREE.Group();
  scene.add(headsGroup);
  var currentHeads = -1;

  function setHeads(n) {
    if (n === currentHeads) return;
    currentHeads = n;
    while (headsGroup.children.length) headsGroup.remove(headsGroup.children[0]);
    for (var i = 0; i < n; i++) {
      var h = new THREE.Mesh(headGeo, headMats);
      var a = (i / Math.max(n, 1)) * Math.PI * 2;
      h.position.set(Math.cos(a) * 3.4, 3.2, Math.sin(a) * 3.4);
      h.userData.a = a;
      headsGroup.add(h);
    }
  }

  // ---- anillo-gauge de ping (3D, anclado a la cámara) --------------
  var pingRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.06, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0x34f07a })
  );
  pingRing.position.set(3.2, -1.9, -6);
  camera.add(pingRing);
  scene.add(camera);

  // ---- estado (día / tormenta) según #status ----------------------
  var isOnline = null;
  function applyMood(online) {
    if (online === isOnline) return;
    isOnline = online;
    if (online) {
      paintSky("#ffce9e", "#ff9a76", "#3a3f74");
      sun.color.set(0xffd9a8); sun.intensity = 1.1;
      hemi.intensity = 0.9;
      scene.fog.color.set(0x2a2f63); scene.fog.density = 0.03;
    } else {
      paintSky("#3a4a63", "#28304a", "#0d1020");
      sun.color.set(0x8fa6c8); sun.intensity = 0.35;
      hemi.intensity = 0.4;
      scene.fog.color.set(0x0d1020); scene.fog.density = 0.06;
    }
  }
  applyMood(false);

  function readStatus() {
    var s = document.getElementById("status");
    applyMood(!!s && /online/i.test(s.textContent));
  }
  function readPlayers() {
    var p = document.getElementById("players-count");
    if (!p) return;
    var m = p.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    setHeads(m ? Math.min(parseInt(m[1], 10), 24) : 0);
  }
  function readPing() {
    var el = document.getElementById("ping-value");
    if (!el) return;
    var v = parseFloat(el.textContent);
    if (isNaN(v)) { pingRing.material.color.set(0x7fd0ff); pingRing.scale.setScalar(1); return; }
    var t = Math.max(0, Math.min(1, v / 250));
    var col = new THREE.Color().setHSL((1 - t) * 0.33, 0.85, 0.55);
    pingRing.material.color.copy(col);
    pingRing.scale.setScalar(0.7 + t * 0.9);
  }

  var mo = new MutationObserver(function () { readStatus(); readPlayers(); readPing(); });
  ["status", "players-count", "ping-value"].forEach(function (id) {
    var n = document.getElementById(id);
    if (n) mo.observe(n, { childList: true, characterData: true, subtree: true });
  });
  readStatus(); readPlayers(); readPing();

  // ---- parallax de ratón ----------------------------------------
  var tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener("mousemove", function (e) {
    tx = (e.clientX / window.innerWidth - 0.5);
    ty = (e.clientY / window.innerHeight - 0.5);
  });

  // ---- resize --------------------------------------------------
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  // ---- bucle de animación ------------------------------------
  var t0 = performance.now();
  function frame(now) {
    var t = (now - t0) / 1000;
    island.rotation.y = t * 0.12;
    island.position.y = Math.sin(t * 0.8) * 0.25;

    headsGroup.rotation.y = -t * 0.25;
    for (var i = 0; i < headsGroup.children.length; i++) {
      var h = headsGroup.children[i];
      h.position.y = 3.2 + Math.sin(t * 2 + h.userData.a * 3) * 0.18;
      h.rotation.y = t * 0.6;
    }

    pingRing.rotation.z = t * 0.9;

    cx += (tx - cx) * 0.04;
    cy += (ty - cy) * 0.04;
    camera.position.x = cx * 4;
    camera.position.y = 3.2 - cy * 2;
    camera.lookAt(0, 1.1, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
