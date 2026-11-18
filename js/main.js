/* Entry: canvas DPR, vòng lặp rAF, tabs ẩn, panel quan sát (D). */
(function (G) {
  'use strict';
  var cfg = G.CONFIG, tween = G.tween;
  var world = G.World.create(cfg);

  // Tracks mẫu (sẽ mở rộng ở các bước sau)
  var tracks = [
    tween('tree.growth', 0, 0.35, 10, 16, 'out'),
    tween('tree.growth', 0.35, 1, 26, 34, 'out'),
    tween('weather.rain', 0, 1, 16, 19), tween('weather.rain', 1, 0, 24, 26),
    tween('weather.storm', 0, 1, 16, 19), tween('weather.storm', 1, 0, 24, 26),
    tween('bloom', 0, 1, 26, 30, 'out'),
    tween('timeOfDay', 0.5, 0.15, 16, 19), tween('timeOfDay', 0.15, 1, 26, 30)
  ];
  var timeline = new G.Timeline(world, tracks);

  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1, resizeTimer;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  }
  resize();
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120);
  });

  function currentStage(t) {
    for (var i = cfg.stages.length - 1; i >= 0; i--) if (t >= cfg.stages[i].start) return cfg.stages[i];
    return cfg.stages[0];
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = cfg.colors.bg;
    ctx.fillRect(0, 0, W, H);
    // Placeholder: sẽ thay bằng tree.js / particles.js
    ctx.fillStyle = cfg.colors.leaf;
    ctx.fillRect(W / 2 - 2, H - 60 - 200 * world.tree.growth, 4, 200 * world.tree.growth);
  }

  // Panel quan sát
  var debugEl = document.getElementById('debug'), fps = 60, debugOn = false;
  window.addEventListener('keydown', function (e) {
    if (e.key === 'd' || e.key === 'D') { debugOn = !debugOn; debugEl.hidden = !debugOn; }
    if (e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      var i = cfg.stages.indexOf(currentStage(world.t));
      var next = cfg.stages[Math.min(i + 1, cfg.stages.length - 1)];
      timeline.seek(next.start);
    }
  });

  var last = performance.now(), running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden; last = performance.now();
  });

  function frame(now) {
    requestAnimationFrame(frame);
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    fps += (1 / Math.max(dt, 0.001) - fps) * 0.1;
    timeline.update(dt);
    render();
    if (debugOn) {
      debugEl.textContent = 'scene: ' + currentStage(world.t).id + '\nt: ' + world.t.toFixed(1) +
        's\nfps: ' + fps.toFixed(0) + '\nquality: ' + world.quality.toFixed(2);
    }
  }
  requestAnimationFrame(frame);

  document.getElementById('build-hash').textContent = 'build #' + world.buildHash;
  G.world = world; G.timeline = timeline; // tiện debug trong console
})(window.GP = window.GP || {});
