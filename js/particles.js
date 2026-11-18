/* Particles:
 * - Mưa bão (<=160), Cánh hoa bay (<=65)
 * - Đom đóm bên ngoài bay vòng vòng quanh cây theo quỹ đạo 3D Lissajous ngẫu nhiên (xoay đầu theo hướng bay + vệt sáng đuôi)
 * - 11 Đom đóm Lời chúc nổi bật có cánh vỗ, đèn bụng sáng và Tooltip khi hover
 * - P2: Pháo hoa Hoa Sen & Hoa Phượng (kích hoạt bằng Konami code hoặc lệnh pháo hoa)
 */
(function (G) {
  'use strict';

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function Particles(world, tree, cfg) {
    this.world = world;
    this.tree = tree;
    this.cfg = cfg;
    this.rand = G.World.mulberry32(world.seed ^ 0x517cc1b7);
    this.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    this.rain = [];
    this.petals = [];
    this.fireflies = [];
    this.fireworks = [];
    this.hoveredCommit = -1;
    this.commitCount = (cfg.commits && cfg.commits.length) ? cfg.commits.length : 11;

    this._initPools();
  }

  Particles.prototype._initPools = function () {
    var rand = this.rand;
    var i;

    for (i = 0; i < 160; i++) {
      this.rain.push({
        xFrac: rand(),
        yFrac: rand(),
        speed: 0.85 + rand() * 0.55,
        len: 14 + rand() * 12
      });
    }

    for (i = 0; i < 65; i++) {
      this.petals.push({
        xFrac: 0.22 + rand() * 0.56,
        yFrac: 0.18 + rand() * 0.62,
        vx: 0.02 + rand() * 0.05,
        vy: 0.03 + rand() * 0.05,
        size: 3.2 + rand() * 2.8,
        phase: rand() * Math.PI * 2,
        kind: rand() < 0.4 ? 1 : 0
      });
    }

    // 11 vị trí neo đẹp quanh vòm tán cây cho 11 đom đóm lời chúc
    var anchors = [
      [0.32, 0.48], [0.36, 0.35], [0.41, 0.26], [0.47, 0.38],
      [0.50, 0.23], [0.54, 0.34], [0.59, 0.26], [0.64, 0.36],
      [0.68, 0.48], [0.43, 0.50], [0.57, 0.50]
    ];

    for (i = 0; i < 55; i++) {
      var isCommit = i < this.commitCount;
      var bx, by;
      if (isCommit && anchors[i]) {
        bx = anchors[i][0];
        by = anchors[i][1];
      } else {
        // Tâm quỹ đạo của các đom đóm bay vòng quanh cây (tập trung quanh thân & vòm tán)
        bx = 0.44 + (rand() - 0.5) * 0.18;
        by = 0.48 + (rand() - 0.5) * 0.34;
      }

      var dir = rand() < 0.5 ? 1 : -1;
      this.fireflies.push({
        isCommit: isCommit,
        commitIndex: isCommit ? i : -1,
        baseXFrac: bx,
        baseYFrac: by,
        // Tham số quỹ đạo bay vòng quanh cây ngẫu nhiên cho từng con
        orbitRxFrac: isCommit ? (0.012 + rand() * 0.008) : (0.10 + rand() * 0.28),
        orbitRyFrac: isCommit ? (0.010 + rand() * 0.007) : (0.06 + rand() * 0.20),
        orbitSpeed:  dir * (isCommit ? (0.45 + rand() * 0.25) : (0.28 + rand() * 0.48)),
        waveFreq:    0.7 + rand() * 1.4,
        waveAmpFrac: isCommit ? 0.004 : (0.025 + rand() * 0.055),
        planeTilt:   (rand() - 0.5) * 0.65,
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        heading: 0,
        depthZ: 0, // -1 (phía xa sau cây) .. +1 (phía gần trước cây) để tạo cảm giác bay vòng 3D
        r: isCommit ? 6.2 : (2.2 + rand() * 1.2),
        phase: rand() * Math.PI * 2,
        phase2: rand() * Math.PI * 2,
        freq: isCommit ? (0.42 + rand() * 0.25) : (0.55 + rand() * 0.65),
        tilt: (rand() - 0.5) * 0.5,
        read: false
      });
    }
  };

  Particles.prototype._renderRain = function (ctx, W, H, groundY) {
    var w = this.world;
    var rainAmt = clamp01(w.weather.rain);
    if (rainAmt <= 0.01) return;

    var count = Math.floor(this.rain.length * rainAmt * clamp01(w.quality));
    var t = w.t;
    var slant = 0.22 + w.weather.storm * 0.28;

    ctx.strokeStyle = 'rgba(170, 225, 220, ' + (0.28 + rainAmt * 0.26).toFixed(3) + ')';
    ctx.lineWidth = 1.15;
    ctx.beginPath();

    for (var i = 0; i < count; i++) {
      var r = this.rain[i];
      var prog = (r.yFrac + t * r.speed * 1.45) % 1;
      var y = prog * groundY;
      var x = ((r.xFrac + prog * slant + t * 0.12) % 1) * W;

      ctx.moveTo(x, y);
      ctx.lineTo(x + r.len * slant, y + r.len);
    }
    ctx.stroke();
  };

  Particles.prototype._renderPetals = function (ctx, W, H, groundY) {
    var w = this.world;
    var bloom = clamp01(w.bloom);
    if (bloom <= 0.25) return;

    var alpha = clamp01((bloom - 0.25) / 0.5) * (1 - clamp01(w.weather.storm));
    if (alpha <= 0.01) return;

    var count = Math.floor(this.petals.length * clamp01(w.quality));
    var t = w.t;

    for (var i = 0; i < count; i++) {
      var p = this.petals[i];
      var cycle = (p.yFrac + t * p.vy) % 1;
      var x = ((p.xFrac + t * p.vx + Math.sin(t * 1.4 + p.phase) * 0.03) % 1) * W;
      var y = (0.16 + cycle * 0.66) * groundY;
      var rot = t * 1.8 + p.phase;

      ctx.fillStyle = p.kind === 0
        ? 'rgba(255, 209, 102, ' + (alpha * 0.78).toFixed(3) + ')'
        : 'rgba(255, 158, 187, ' + (alpha * 0.78).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(x, y, p.size, p.size * 0.52, rot, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Tính vị trí trên quỹ đạo bay vòng quanh cây tại thời điểm tau
  Particles.prototype._evalOrbitPos = function (f, tau, W, groundY) {
    var theta = tau * f.orbitSpeed + f.phase;
    var rx = f.orbitRxFrac * W;
    var ry = f.orbitRyFrac * groundY;

    // Chuyển động elip nghiêng + sóng bậc 2 và bậc 3 (quỹ đạo Lissajous tự nhiên quanh tán cây)
    var ox = Math.cos(theta) * rx + Math.sin(tau * f.waveFreq + f.phase2) * (f.waveAmpFrac * W);
    var oy = Math.sin(theta) * ry + Math.cos(tau * (f.waveFreq * 1.3) + f.phase) * (f.waveAmpFrac * groundY);

    // Xoay nhẹ mặt phẳng quỹ đạo để mỗi con bay theo một vòng nghiêng khác nhau
    var cosT = Math.cos(f.planeTilt), sinT = Math.sin(f.planeTilt);
    var rotX = ox * cosT - oy * sinT;
    var rotY = ox * sinT + oy * cosT;

    return {
      x: f.baseXFrac * W + rotX,
      y: f.baseYFrac * groundY + rotY,
      z: Math.sin(theta) // z in [-1..1] biểu diễn lúc đom đóm bay vòng ra phía trước hay phía sau tán cây
    };
  };

  // Vẽ 1 chú đom đóm có cánh mỏng, thân và bụng phát sáng
  Particles.prototype._drawFireflyBug = function (ctx, f, t, baseAlpha, isPushStage, isHovered) {
    var fx = f.x, fy = f.y;
    var pulseSpeed = f.isCommit ? (f.read ? 2.0 : 3.8) : 2.8;
    var pulse = this.reducedMotion ? 0.85 : (0.52 + 0.48 * Math.sin(t * pulseSpeed + f.phase));

    // 1. Đom đóm bay lượn tự do vòng quanh cây: có vệt sáng đuôi + cánh nhỏ vỗ + bụng đèn
    if (!f.isCommit) {
      // Độ lớn và độ sáng thay đổi theo chiều sâu 3D (depthZ) khi bay vòng trước/sau cây
      var depthScale = 0.72 + 0.36 * ((f.depthZ + 1) * 0.5);
      var decAlpha = clamp01(baseAlpha * (0.45 + 0.35 * ((f.depthZ + 1) * 0.5)) * pulse);

      // Vệt sáng mờ (flight trail) nối từ vị trí trễ phía sau tới vị trí hiện tại
      if (!this.reducedMotion) {
        var trGrad = ctx.createLinearGradient(f.prevX, f.prevY, fx, fy);
        trGrad.addColorStop(0, 'rgba(255, 209, 102, 0)');
        trGrad.addColorStop(1, 'rgba(255, 225, 130, ' + (decAlpha * 0.55).toFixed(3) + ')');
        ctx.strokeStyle = trGrad;
        ctx.lineWidth = 1.6 * depthScale;
        ctx.beginPath();
        ctx.moveTo(f.prevX, f.prevY);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }

      var glowR0 = 8.5 * depthScale;
      var dg = ctx.createRadialGradient(fx, fy, 0.4, fx, fy, glowR0);
      dg.addColorStop(0, 'rgba(255, 248, 200, ' + decAlpha.toFixed(3) + ')');
      dg.addColorStop(0.5, 'rgba(255, 209, 102, ' + (decAlpha * 0.45).toFixed(3) + ')');
      dg.addColorStop(1, 'rgba(255, 209, 102, 0)');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(fx, fy, glowR0, 0, Math.PI * 2);
      ctx.fill();

      // Vẽ thân nhỏ + 2 cánh vỗ theo hướng đang bay (heading)
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(f.heading);
      ctx.scale(depthScale, depthScale);

      var flap0 = this.reducedMotion ? 0.5 : (0.4 + 0.35 * Math.sin(t * 28 + f.phase));
      ctx.fillStyle = 'rgba(255, 248, 220, ' + (decAlpha * 0.52).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(-2.8, -0.5, 2.8, 1.2, -0.35 - flap0 * 0.3, 0, Math.PI * 2);
      ctx.ellipse(2.8, -0.5, 2.8, 1.2, 0.35 + flap0 * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#1b3a2b';
      ctx.beginPath();
      ctx.arc(0, -1.5, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 1.7, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // 2. Đom đóm Lời chúc (Commit Firefly): to rõ, có vòng sóng, cánh vỗ, râu và đèn bụng sáng rực
    var a = clamp01(baseAlpha * (f.read ? 0.75 : (0.78 + 0.22 * pulse)));
    var glowR = isHovered ? 28 : (f.read ? 17 : (19 + pulse * 6));

    var g = ctx.createRadialGradient(fx, fy + 2, 1, fx, fy + 2, glowR);
    if (f.read) {
      g.addColorStop(0, 'rgba(210, 255, 245, ' + a.toFixed(3) + ')');
      g.addColorStop(0.45, 'rgba(78, 225, 193, ' + (a * 0.42).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(78, 225, 193, 0)');
    } else {
      g.addColorStop(0, 'rgba(255, 252, 220, ' + a.toFixed(3) + ')');
      g.addColorStop(0.42, 'rgba(255, 209, 102, ' + (a * 0.58).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255, 209, 102, 0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(fx, fy + 2, glowR, 0, Math.PI * 2);
    ctx.fill();

    if (isPushStage || isHovered) {
      var ringR = isHovered ? 15 : (f.read ? 10.5 : (11 + pulse * 4.5));
      ctx.strokeStyle = f.read
        ? 'rgba(78, 225, 193, ' + (a * 0.5).toFixed(3) + ')'
        : 'rgba(255, 220, 120, ' + (a * 0.85).toFixed(3) + ')';
      ctx.lineWidth = isHovered ? 1.8 : 1.3;
      ctx.beginPath();
      ctx.arc(fx, fy + 1, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(fx, fy);
    var tilt = Math.sin(t * 1.5 + f.phase) * 0.18 + f.tilt * 0.3;
    ctx.rotate(tilt);

    var flap = this.reducedMotion ? 0.55 : (0.45 + 0.35 * Math.sin(t * 24 + f.phase));
    ctx.fillStyle = f.read
      ? 'rgba(180, 250, 235, ' + (a * 0.55).toFixed(3) + ')'
      : 'rgba(255, 248, 220, ' + (a * 0.62).toFixed(3) + ')';

    ctx.beginPath();
    ctx.ellipse(-5.2, -1.2, 5.4, 2.3, -0.35 - flap * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5.2, -1.2, 5.4, 2.3, 0.35 + flap * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1b3a2b';
    ctx.beginPath();
    ctx.ellipse(0, -3.2, 2.4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 235, 180, 0.65)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.moveTo(-1, -5.2); ctx.quadraticCurveTo(-3.2, -8, -4.5, -7.5);
    ctx.moveTo(1, -5.2);  ctx.quadraticCurveTo(3.2, -8, 4.5, -7.5);
    ctx.stroke();

    var abScale = isHovered ? 1.22 : (0.95 + 0.14 * pulse);
    ctx.fillStyle = f.read ? '#4ee1c1' : '#ffd166';
    ctx.beginPath();
    ctx.ellipse(0, 2.4, 3.5 * abScale, 4.6 * abScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 2.6, 1.7 * abScale, 2.3 * abScale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  Particles.prototype._renderCommitTooltip = function (ctx, W) {
    if (this.hoveredCommit < 0 || this.hoveredCommit >= this.commitCount) return;
    var f = this.fireflies[this.hoveredCommit];
    var item = this.cfg.commits[this.hoveredCommit];
    if (!f || !item) return;

    var prefix = f.read ? '✓ ' : '✦ ';
    var label = prefix + 'Lời chúc #' + (this.hoveredCommit + 1) + ': ' + item.msg;
    if (label.length > 48) label = label.slice(0, 46) + '…';

    ctx.save();
    ctx.font = '600 12.5px "Be Vietnam Pro", system-ui, sans-serif';
    var padX = 11, boxH = 28;
    var textW = ctx.measureText(label).width;
    var boxW = textW + padX * 2;

    var bx = Math.max(12, Math.min(W - boxW - 12, f.x - boxW * 0.5));
    var by = Math.max(14, f.y - 38);

    ctx.fillStyle = 'rgba(5, 16, 12, 0.94)';
    ctx.strokeStyle = f.read ? '#4ee1c1' : '#ffd166';
    ctx.lineWidth = 1.2;

    var r = 7;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + boxW - r, by);
    ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
    ctx.lineTo(bx + boxW, by + boxH - r);
    ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
    ctx.lineTo(bx + r, by + boxH);
    ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = f.read ? '#4ee1c1' : '#ffd166';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + padX, by + boxH * 0.5 + 0.5);
    ctx.restore();
  };

  Particles.prototype._renderFireflies = function (ctx, W, H, groundY) {
    var w = this.world;
    var bloom = clamp01(w.bloom);
    if (bloom <= 0.15) return;

    var nightBoost = 0.62 + 0.38 * (1 - clamp01(w.timeOfDay));
    var baseAlpha = clamp01((bloom - 0.15) / 0.55) * nightBoost;
    if (baseAlpha <= 0.02) return;

    var t = w.t;
    var ptr = w.pointer;
    var isPushStage = t >= 44;
    var maxCount = Math.max(this.commitCount, Math.floor(this.fireflies.length * clamp01(w.quality)));

    for (var pass = 0; pass < 2; pass++) {
      for (var i = 0; i < maxCount; i++) {
        var f = this.fireflies[i];
        if ((pass === 0 && f.isCommit) || (pass === 1 && !f.isCommit)) continue;

        var posNow = this._evalOrbitPos(f, t, W, groundY);
        var posPrev = this._evalOrbitPos(f, t - 0.16, W, groundY);

        var fx = posNow.x;
        var fy = posNow.y;
        var px = posPrev.x;
        var py = posPrev.y;

        // Đom đóm bên ngoài bị thu hút nhẹ khi con trỏ lướt gần
        if (!f.isCommit && ptr && ptr.active) {
          var dx = ptr.x - fx, dy = ptr.y - fy;
          var dist2 = dx * dx + dy * dy;
          if (dist2 < 52000) {
            var pull = (1 - dist2 / 52000) * 0.32;
            fx += dx * pull;
            fy += dy * pull;
          }
        }

        // Giữ đom đóm luôn bay trên mặt đất và trong khung hình đẹp
        fy = Math.max(24, Math.min(groundY - 12, fy));
        py = Math.max(24, Math.min(groundY - 12, py));

        f.x = fx;
        f.y = fy;
        f.prevX = px;
        f.prevY = py;
        f.depthZ = posNow.z;

        var vx = fx - px, vy = fy - py;
        if (vx * vx + vy * vy > 0.01) {
          f.heading = Math.atan2(vy, vx) + Math.PI * 0.5;
        }

        var isHovered = f.isCommit && (f.commitIndex === this.hoveredCommit);
        this._drawFireflyBug(ctx, f, t, baseAlpha, isPushStage, isHovered);
      }
    }

    this._renderCommitTooltip(ctx, W);
  };

  Particles.prototype.launchFireworks = function () {
    var now = this.world.t;
    var spots = [0.22, 0.78, 0.35, 0.65, 0.50, 0.28, 0.72];
    for (var i = 0; i < spots.length; i++) {
      this.fireworks.push({
        xFrac: spots[i],
        yFrac: 0.16 + (i % 3) * 0.07,
        startAt: now + i * 0.42,
        dur: 2.6,
        kind: i % 2 === 0 ? 'lotus' : 'phoenix'
      });
    }
  };

  Particles.prototype._renderFireworks = function (ctx, W, H, groundY) {
    if (!this.fireworks.length) return;
    var t = this.world.t;

    for (var i = this.fireworks.length - 1; i >= 0; i--) {
      var fw = this.fireworks[i];
      var age = t - fw.startAt;
      if (age < 0) continue;
      if (age > fw.dur) {
        this.fireworks.splice(i, 1);
        continue;
      }

      var prog = age / fw.dur;
      var cx = fw.xFrac * W;
      var cy = fw.yFrac * groundY;

      if (prog < 0.18) {
        var u = prog / 0.18;
        var ry = groundY - (groundY - cy) * (1 - Math.pow(1 - u, 2));
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx, ry, 3, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      var bProg = (prog - 0.18) / 0.82;
      var radius = (36 + bProg * 68);
      var alpha = clamp01(1 - Math.pow(bProg, 1.6));

      ctx.save();
      ctx.translate(cx, cy + bProg * bProg * 28);

      if (fw.kind === 'lotus') {
        for (var p = 0; p < 12; p++) {
          var ang = (p * Math.PI * 2) / 12 + bProg * 0.2;
          var px = Math.cos(ang) * radius * 0.65;
          var py = Math.sin(ang) * radius * 0.65;
          ctx.fillStyle = 'rgba(255, 158, 195, ' + (alpha * 0.85).toFixed(3) + ')';
          ctx.beginPath();
          ctx.ellipse(px, py, radius * 0.28, radius * 0.13, ang, 0, Math.PI * 2);
          ctx.fill();
        }
        for (var q = 0; q < 8; q++) {
          var ang2 = (q * Math.PI * 2) / 8 - bProg * 0.15;
          var qx = Math.cos(ang2) * radius * 0.36;
          var qy = Math.sin(ang2) * radius * 0.36;
          ctx.fillStyle = 'rgba(255, 215, 110, ' + (alpha * 0.92).toFixed(3) + ')';
          ctx.beginPath();
          ctx.ellipse(qx, qy, radius * 0.18, radius * 0.09, ang2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        for (var k = 0; k < 5; k++) {
          var aP = (k * Math.PI * 2) / 5 - Math.PI / 2;
          var kx = Math.cos(aP) * radius * 0.58;
          var ky = Math.sin(aP) * radius * 0.58;
          ctx.fillStyle = (k === 0)
            ? 'rgba(255, 230, 180, ' + (alpha * 0.92).toFixed(3) + ')'
            : 'rgba(255, 98, 82, ' + (alpha * 0.88).toFixed(3) + ')';
          ctx.beginPath();
          ctx.ellipse(kx, ky, radius * 0.30, radius * 0.17, aP, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255, 209, 102, ' + (alpha * 0.85).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        for (var s = 0; s < 10; s++) {
          var aS = (s * Math.PI * 2) / 10 + 0.15;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(aS) * radius * 0.92, Math.sin(aS) * radius * 0.92);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  };

  Particles.prototype.hitTestCommit = function (x, y) {
    if (this.world.bloom < 0.3) return -1;
    var bestIdx = -1;
    var bestD2 = 30 * 30;
    for (var i = 0; i < this.commitCount; i++) {
      var f = this.fireflies[i];
      var dx = x - f.x, dy = y - f.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        bestIdx = f.commitIndex;
      }
    }
    return bestIdx;
  };

  Particles.prototype.markCommitRead = function (idx) {
    if (idx >= 0 && idx < this.commitCount) {
      this.fireflies[idx].read = true;
    }
  };

  Particles.prototype.render = function (ctx, W, H) {
    var groundY = Math.floor(H * 0.835);
    this._renderRain(ctx, W, H, groundY);
    this._renderPetals(ctx, W, H, groundY);
    this._renderFireworks(ctx, W, H, groundY);
    this._renderFireflies(ctx, W, H, groundY);
  };

  G.Particles = Particles;
})(window.GP = window.GP || {});
