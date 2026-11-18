/* Entry: canvas DPR, vòng lặp rAF, tabs ẩn, panel quan sát (D), tương tác con trỏ, audio & dashboard. */
(function (G) {
  'use strict';
  var cfg = G.CONFIG, tween = G.tween;
  var world = G.World.create(cfg);

  // Kịch bản 46s: mọi trạng thái của World đều là hàm của t
  var tracks = [
    // Cảnh 1: Boot + Commit (0..10s) - mặt đất hiện lên, hạt giống rơi xuống
    tween('ground',       0,    1,    5.8,  8.0,  'inOut'),
    tween('seedDrop',     0,    1,    6.6,  9.2,  'out'),

    // Cảnh 2: Build (10..16s) - rễ neural lan xuống đất, mầm và thân cây vươn lên
    tween('tree.roots',   0,    1,    10.0, 15.6, 'out'),
    tween('tree.growth',  0,    0.38, 10.2, 16.0, 'out'),

    // Cảnh 3: Test / Bão (16..26s) - trời tối, mưa bão, cây vẫn kiên cường lớn thêm
    tween('timeOfDay',    0.45, 0.12, 16.0, 18.5, 'inOut'),
    tween('weather.rain', 0,    1,    16.2, 18.5, 'inOut'),
    tween('weather.storm',0,    1,    16.5, 19.0, 'inOut'),
    tween('tree.growth',  0.38, 0.56, 16.0, 25.0, 'inOut'),
    tween('weather.rain', 1,    0,    24.2, 26.2, 'inOut'),
    tween('weather.storm',1,    0,    24.2, 26.2, 'inOut'),

    // Cảnh 4: Deploy / WOW (26..38s) - nắng ấm, tán cây bung hết cỡ và nở hoa
    tween('timeOfDay',    0.12, 0.95, 25.8, 29.5, 'out'),
    tween('tree.growth',  0.56, 1.0,  26.0, 32.0, 'out'),
    tween('bloom',        0,    1.0,  26.4, 31.5, 'out'),

    // Cảnh 5 & 6: Monitor (38..46s) -> Push (46s+) - chuyển dần sang đêm đầy sao
    tween('timeOfDay',    0.95, 0.08, 38.0, 46.0, 'inOut')
  ];

  var timeline = new G.Timeline(world, tracks);
  timeline.apply(0);

  var tree = new G.Tree(world);
  var particles = new G.Particles(world, tree, cfg);
  var terminal = new G.Terminal(document.getElementById('terminal'), world);
  var sound = new G.SoundEngine(world);
  var dashboard = new G.Dashboard(world, timeline, particles, sound, cfg);

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

  // Tương tác chuột / cảm ứng để lay lá & đom đóm
  function onPointerMove(x, y) {
    var p = world.pointer;
    p.vx = x - p.x; p.vy = y - p.y;
    p.x = x; p.y = y; p.active = true;
  }
  window.addEventListener('mousemove', function (e) { onPointerMove(e.clientX, e.clientY); });
  window.addEventListener('touchmove', function (e) {
    if (e.touches && e.touches[0]) onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  window.addEventListener('mouseleave', function () { world.pointer.active = false; });

  // Sấm chớp an toàn (<= 2 flash/giây trong bão, tắt hẳn nếu prefers-reduced-motion)
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function updateLightning(t) {
    if (reducedMotion || world.weather.storm < 0.4) {
      world.weather.lightning = 0;
      return;
    }
    var d1 = Math.abs(t - 19.2), d2 = Math.abs(t - 22.4);
    var f1 = d1 < 0.25 ? (1 - d1 / 0.25) : 0;
    var f2 = d2 < 0.28 ? (1 - d2 / 0.28) : 0;
    world.weather.lightning = Math.max(f1, f2);
  }

  function currentStage(t) {
    for (var i = cfg.stages.length - 1; i >= 0; i--) if (t >= cfg.stages[i].start) return cfg.stages[i];
    return cfg.stages[0];
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tree.render(ctx, W, H);
    particles.render(ctx, W, H);
  }

  // Panel quan sát (phím D) & Skip (Space / ArrowRight khi không gõ trong ô input)
  var debugEl = document.getElementById('debug'), fps = 60, debugOn = false;
  window.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;

    if (e.key === 'd' || e.key === 'D') {
      debugOn = !debugOn;
      debugEl.hidden = !debugOn;
    } else if (e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      dashboard.skipToNextStage();
    } else if (e.key === 'Escape') {
      dashboard.closeCommitModal();
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
    fps += (1 / Math.max(dt, 0.001) - fps) * 0.08;

    // Adaptive quality: nếu FPS trung bình < 38 thì hạ nhẹ mật độ lá/hạt
    if (fps < 38 && world.quality > 0.55) world.quality = Math.max(0.5, world.quality - 0.01);
    else if (fps > 52 && world.quality < 1) world.quality = Math.min(1, world.quality + 0.005);

    timeline.update(dt);
    updateLightning(world.t);
    dashboard.render(world.t);
    render();
    terminal.render(world.t);
    sound.update();

    if (debugOn) {
      debugEl.textContent =
        'scene: ' + currentStage(world.t).id +
        '\nt: ' + world.t.toFixed(1) + 's' +
        '\nfps: ' + fps.toFixed(0) +
        '\nbranches: ' + tree.branches.length +
        '\nfoliage: ' + (tree.leaves.length + tree.flowers.length) +
        '\nparticles: ' + (particles.rain.length + particles.petals.length + particles.fireflies.length) +
        '\ngrowth: ' + world.tree.growth.toFixed(2) + ' | bloom: ' + world.bloom.toFixed(2) +
        '\nquality: ' + world.quality.toFixed(2);
    }
  }
  requestAnimationFrame(frame);

  document.getElementById('build-hash').textContent = 'build #' + world.buildHash;
  G.world = world; G.timeline = timeline; G.tree = tree; G.particles = particles;
  G.dashboard = dashboard; G.sound = sound;
})(window.GP = window.GP || {});
