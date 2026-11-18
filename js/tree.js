/* Tree: sinh trước 1 lần bằng PRNG có seed, render theo world = f(t).
 * Gồm:
 * - Bầu trời đêm sâu + Dải Ngân Hà mờ + Trăng lưỡi liềm tỏa sáng + Sao băng
 * - 4 tầng đồi núi trùng điệp có viền sáng ánh trăng (ridge rim-light) + rừng thông xa + mặt hồ thung lũng lấp lánh + sương mờ
 * - Thảm cỏ đung đưa trên mặt đất + hạt giống rơi + hệ rễ neural
 * - Thân/cành gom batch theo depth (có rim-light nổi bật), lá + hoa nở, và khu vườn gieo thêm cây con (P2).
 * Budget: cành <= 2500, lá + hoa <= 800.
 */
(function (G) {
  'use strict';

  var MAX_DEPTH = 9;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function mixRGB(c1, c2, t) {
    t = clamp01(t);
    return [
      (c1[0] + (c2[0] - c1[0]) * t) | 0,
      (c1[1] + (c2[1] - c1[1]) * t) | 0,
      (c1[2] + (c2[2] - c1[2]) * t) | 0
    ];
  }
  function rgbStr(c, a) {
    return a === undefined
      ? 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'
      : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  function Tree(world) {
    this.world = world;
    this.rand = G.World.mulberry32(world.seed ^ 0x9e3779b9);
    this.branches = [];
    this.byDepth = [];
    this.roots = [];
    this.leaves = [];
    this.flowers = [];
    this.stars = [];
    this.pines = [];
    this.grass = [];
    this.sprouts = [];
    this.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    for (var d = 0; d <= MAX_DEPTH; d++) this.byDepth.push([]);

    this._generateBranches();
    this._generateRoots();
    this._generateStars();
    this._generateLandscapeDetails();
  }

  Tree.prototype._generateBranches = function () {
    var rand = this.rand;
    var branches = this.branches;
    var byDepth = this.byDepth;
    var leaves = this.leaves;
    var flowers = this.flowers;

    branches.push({
      parent: -1,
      depth: 0,
      relAngle: (rand() - 0.5) * 0.05,
      lenFrac: 0.185,
      width: 15.5,
      birth: 0.0,
      growDur: 0.14,
      phase: rand() * Math.PI * 2,
      x0: 0, y0: 0, x1: 0, y1: 0, angle: -Math.PI / 2, curScale: 0
    });
    byDepth[0].push(0);

    var queue = [0];
    while (queue.length > 0 && branches.length < 1800) {
      var pIdx = queue.shift();
      var p = branches[pIdx];
      var d = p.depth + 1;
      if (d > MAX_DEPTH) continue;

      var count = (d <= 2 && rand() < 0.38) ? 3 : 2;
      if (d >= 7 && rand() < 0.22) count = 1;

      var spread = 0.42 + d * 0.025;
      for (var k = 0; k < count; k++) {
        var side = count === 1 ? (rand() - 0.5) : (k / (count - 1) - 0.5) * 2;
        var jitter = (rand() - 0.5) * 0.21;
        var relAngle = side * spread + jitter;

        var lenDecay = 0.735 + rand() * 0.105;
        var lenFrac = p.lenFrac * lenDecay;
        var width = Math.max(1.15, p.width * 0.71);

        var baseBirth = (d / (MAX_DEPTH + 1)) * 0.84 + rand() * 0.06;
        var birth = Math.max(p.birth + 0.04, Math.min(0.90, baseBirth));
        var growDur = 0.08 + (1 - d / MAX_DEPTH) * 0.06;

        var idx = branches.length;
        branches.push({
          parent: pIdx,
          depth: d,
          relAngle: relAngle,
          lenFrac: lenFrac,
          width: width,
          birth: birth,
          growDur: growDur,
          phase: rand() * Math.PI * 2,
          x0: 0, y0: 0, x1: 0, y1: 0, angle: 0, curScale: 0
        });
        byDepth[d].push(idx);
        queue.push(idx);

        if (d >= 5 && leaves.length < 520 && rand() < 0.72) {
          leaves.push({
            branch: idx,
            tPos: 0.55 + rand() * 0.45,
            offsetAngle: (rand() - 0.5) * 1.4,
            size: 4.4 + rand() * 4.2,
            birth: Math.min(0.96, birth + growDur * 0.6),
            hueShift: rand(),
            phase: rand() * Math.PI * 2
          });
        }
        if (d >= 6 && flowers.length < 240 && rand() < 0.48) {
          flowers.push({
            branch: idx,
            tPos: 0.7 + rand() * 0.3,
            size: 5.2 + rand() * 4.2,
            birthBloom: rand() * 0.65,
            kind: rand() < 0.35 ? 1 : 0,
            phase: rand() * Math.PI * 2
          });
        }
      }
    }
  };

  Tree.prototype._generateRoots = function () {
    var rand = this.rand;
    var roots = this.roots;
    var MAX_RDEPTH = 5;

    var mainAngles = [Math.PI * 0.25, Math.PI * 0.42, Math.PI * 0.58, Math.PI * 0.75];
    for (var i = 0; i < mainAngles.length; i++) {
      roots.push({
        parent: -1,
        depth: 0,
        angle: mainAngles[i] + (rand() - 0.5) * 0.12,
        lenFrac: 0.06 + rand() * 0.018,
        width: 4.2,
        birth: i * 0.04,
        growDur: 0.22,
        pulsePhase: rand() * Math.PI * 2,
        x0: 0, y0: 0, x1: 0, y1: 0, curScale: 0
      });
    }

    var q = [0, 1, 2, 3];
    while (q.length > 0 && roots.length < 150) {
      var pIdx = q.shift();
      var p = roots[pIdx];
      var d = p.depth + 1;
      if (d > MAX_RDEPTH) continue;
      var cnt = (d <= 2 || rand() < 0.65) ? 2 : 1;
      for (var k = 0; k < cnt; k++) {
        var side = cnt === 1 ? (rand() - 0.5) : (k === 0 ? -1 : 1);
        var ang = p.angle + side * (0.28 + rand() * 0.25);
        ang = Math.max(Math.PI * 0.08, Math.min(Math.PI * 0.92, ang));
        var birth = Math.min(0.82, p.birth + 0.13 + rand() * 0.06);
        var idx = roots.length;
        roots.push({
          parent: pIdx,
          depth: d,
          angle: ang,
          lenFrac: p.lenFrac * (0.76 + rand() * 0.12),
          width: Math.max(0.8, p.width * 0.68),
          birth: birth,
          growDur: 0.18,
          pulsePhase: rand() * Math.PI * 2,
          x0: 0, y0: 0, x1: 0, y1: 0, curScale: 0
        });
        q.push(idx);
      }
    }
  };

  Tree.prototype._generateStars = function () {
    var rand = this.rand;
    for (var i = 0; i < 150; i++) {
      this.stars.push({
        xFrac: rand(),
        yFrac: rand() * 0.72,
        r: 0.55 + rand() * 1.65,
        phase: rand() * Math.PI * 2,
        speed: 0.55 + rand() * 1.15,
        tint: rand() < 0.25 ? 1 : (rand() < 0.5 ? 2 : 0), // 0: trắng ngọc, 1: vàng ấm, 2: xanh lam
        sparkle: i < 16
      });
    }
  };

  // Sinh trước rừng thông xa trên sườn đồi và thảm cỏ tiền cảnh
  Tree.prototype._generateLandscapeDetails = function () {
    var rand = this.rand;
    // Rừng thông xa ở hai bên sườn đồi (tránh vùng trung tâm 0.38..0.62 của cây chính)
    for (var i = 0; i < 46; i++) {
      var u = rand();
      if (u > 0.38 && u < 0.62) {
        u = u < 0.5 ? (u - 0.22) : (u + 0.22);
      }
      this.pines.push({
        u: clamp01(u),
        h: 12 + rand() * 18,
        w: 4.5 + rand() * 5.5
      });
    }

    // 85 ngọn cỏ mềm dọc theo triền đồi tiền cảnh
    for (var j = 0; j < 85; j++) {
      this.grass.push({
        xFrac: rand(),
        h: 7 + rand() * 13,
        lean: (rand() - 0.5) * 0.35,
        phase: rand() * Math.PI * 2,
        hasDew: rand() < 0.22 // giọt sương/hoa cỏ phát sáng nhẹ ở đầu ngọn cỏ
      });
    }
  };

  Tree.prototype.plantSprout = function (x, H) {
    var groundY = Math.floor(H * 0.835);
    if (this.sprouts.length >= 18) this.sprouts.shift();
    var r = this.rand;
    this.sprouts.push({
      x: x,
      y: groundY + 2 + (r() - 0.5) * 8,
      bornAt: this.world.t,
      h: 28 + r() * 26,
      lean: (r() - 0.5) * 0.25,
      kind: r() < 0.45 ? 1 : 0,
      phase: r() * Math.PI * 2
    });
  };

  // Hàm tính độ cao sườn đồi thứ l tại hoành độ tỉ lệ u (0..1)
  Tree.prototype._ridgeY = function (L, u, H, groundY) {
    var baseY = groundY - H * L.yOff;
    var h1 = Math.sin(u * Math.PI * L.freq1 + L.phase) * (H * L.amp1);
    var h2 = Math.cos(u * Math.PI * L.freq2 - L.phase * 0.7) * (H * L.amp2);
    var h3 = Math.sin(u * Math.PI * (L.freq2 * 1.9) + L.phase * 1.3) * (H * L.amp1 * 0.22);
    // Thung lũng võng nhẹ ở trung tâm để tôn cây chính và mở ra mặt hồ
    var centerDip = Math.exp(-Math.pow((u - 0.5) * 3.0, 2)) * (H * 0.042);
    return baseY - h1 - h2 - h3 + centerDip;
  };

  // Vẽ 4 tầng đồi núi + viền sáng ánh trăng + rừng thông xa + mặt hồ thung lũng + sương mờ
  Tree.prototype._renderMountainsAndMist = function (ctx, W, H, groundY, tod, storm) {
    var gAlpha = clamp01(this.world.ground);
    if (gAlpha <= 0.02) return;

    var layers = [
      { yOff: 0.24, amp1: 0.065, amp2: 0.028, freq1: 1.6, freq2: 3.9, phase: 0.3,
        night: [7, 23, 19], day: [30, 82, 60], rim: [95, 190, 155], alpha: 0.68 },
      { yOff: 0.165, amp1: 0.050, amp2: 0.022, freq1: 2.3, freq2: 5.1, phase: 1.5,
        night: [10, 31, 24], day: [25, 70, 51], rim: [110, 210, 168], alpha: 0.80 },
      { yOff: 0.095, amp1: 0.036, amp2: 0.016, freq1: 2.9, freq2: 5.9, phase: 2.7,
        night: [13, 39, 29], day: [20, 58, 42], rim: [123, 224, 178], alpha: 0.90 },
      { yOff: 0.038, amp1: 0.022, amp2: 0.010, freq1: 3.5, freq2: 6.7, phase: 3.9,
        night: [16, 46, 33], day: [16, 48, 35], rim: [88, 196, 142], alpha: 0.96 }
    ];

    var steps = 48;
    for (var l = 0; l < layers.length; l++) {
      var L = layers[l];
      var col = mixRGB(L.night, L.day, tod * (1 - storm * 0.7));
      var baseY = groundY - H * L.yOff;

      ctx.fillStyle = rgbStr(col, (L.alpha * gAlpha).toFixed(3));
      ctx.beginPath();
      ctx.moveTo(0, groundY + 12);
      for (var i = 0; i <= steps; i++) {
        var u = i / steps;
        var py = this._ridgeY(L, u, H, groundY);
        ctx.lineTo(u * W, py);
      }
      ctx.lineTo(W, groundY + 12);
      ctx.closePath();
      ctx.fill();

      // Đường viền sáng ánh trăng / ánh nắng (Ridge Rim-Light) dọc sườn đồi tạo khối sâu
      ctx.strokeStyle = rgbStr(L.rim, ((0.16 - l * 0.025) * gAlpha * (1 - storm * 0.6)).toFixed(3));
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (var r = 0; r <= steps; r++) {
        var ur = r / steps;
        var pyr = this._ridgeY(L, ur, H, groundY);
        if (r === 0) ctx.moveTo(0, pyr);
        else ctx.lineTo(ur * W, pyr);
      }
      ctx.stroke();

      // Trên sườn đồi thứ 3 (l === 2), vẽ hàng cây thông/tùng mờ xa hai bên thung lũng
      if (l === 2) {
        ctx.fillStyle = rgbStr(mixRGB([8, 26, 20], [15, 46, 33], tod), (0.88 * gAlpha).toFixed(3));
        for (var p = 0; p < this.pines.length; p++) {
          var pn = this.pines[p];
          var px = pn.u * W;
          var pyBase = this._ridgeY(L, pn.u, H, groundY) + 3;
          // Vẽ bóng cây thông 2 tầng tán tam giác
          ctx.beginPath();
          ctx.moveTo(px, pyBase - pn.h);
          ctx.lineTo(px - pn.w * 0.75, pyBase - pn.h * 0.35);
          ctx.lineTo(px + pn.w * 0.75, pyBase - pn.h * 0.35);
          ctx.closePath();
          ctx.moveTo(px, pyBase - pn.h * 0.65);
          ctx.lineTo(px - pn.w, pyBase + 2);
          ctx.lineTo(px + pn.w, pyBase + 2);
          ctx.closePath();
          ctx.fill();
        }
      }

      // Lớp sương mù mềm trôi giữa các thung lũng
      var mistShift = this.reducedMotion ? 0 : Math.sin(this.world.t * 0.25 + l) * 18;
      var mistGrad = ctx.createLinearGradient(0, baseY - 26, 0, baseY + 38);
      mistGrad.addColorStop(0, 'rgba(78, 225, 193, 0)');
      mistGrad.addColorStop(0.5, 'rgba(135, 228, 178, ' + ((0.055 + l * 0.01) * gAlpha).toFixed(3) + ')');
      mistGrad.addColorStop(1, 'rgba(11, 31, 23, 0)');
      ctx.fillStyle = mistGrad;
      ctx.fillRect(mistShift - 20, baseY - 26, W + 40, 64);
    }

    // Mặt hồ thung lũng phẳng lặng ở ngay chân đồi trung tâm, phản chiếu ánh trăng & hoa
    var lakeY = groundY - H * 0.022;
    var lakeW = W * 0.44;
    var lakeX = W * 0.5 - lakeW * 0.5;
    var lakeGrad = ctx.createLinearGradient(0, lakeY - 6, 0, groundY + 4);
    lakeGrad.addColorStop(0, 'rgba(28, 86, 68, ' + (0.42 * gAlpha).toFixed(3) + ')');
    lakeGrad.addColorStop(1, 'rgba(10, 32, 24, ' + (0.15 * gAlpha).toFixed(3) + ')');
    ctx.fillStyle = lakeGrad;
    ctx.beginPath();
    ctx.ellipse(W * 0.5, lakeY + 4, lakeW * 0.5, H * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();

    // Những gợn nước lấp lánh ánh vàng/xanh ngọc trên mặt hồ
    var shimmerA = (0.22 + 0.18 * clamp01(this.world.bloom)) * gAlpha;
    ctx.strokeStyle = 'rgba(255, 220, 130, ' + shimmerA.toFixed(3) + ')';
    ctx.lineWidth = 1.0;
    for (var sh = 0; sh < 7; sh++) {
      var sy = lakeY - 1 + sh * 2.2;
      var sw = (26 - sh * 2.5) + Math.sin(this.world.t * 1.8 + sh) * 6;
      var sx = W * 0.5 + Math.cos(this.world.t * 0.9 + sh * 1.7) * (lakeW * 0.18);
      ctx.beginPath();
      ctx.moveTo(sx - sw, sy);
      ctx.lineTo(sx + sw, sy);
      ctx.stroke();
    }
  };

  Tree.prototype._renderEnvironment = function (ctx, W, H, groundY) {
    var w = this.world;
    var tod = clamp01(w.timeOfDay);
    var storm = clamp01(w.weather.storm);

    var nightTop = [2, 8, 7],    nightMid = [6, 20, 16],  nightBot = [15, 44, 33];
    var duskTop  = [7, 22, 17],  duskMid  = [13, 38, 28], duskBot  = [26, 66, 48];
    var dayTop   = [18, 56, 43], dayMid   = [32, 86, 62], dayBot   = [62, 128, 90];
    var stormTop = [6, 12, 15],  stormMid = [12, 22, 25], stormBot = [20, 34, 36];

    var topCol, midCol, botCol;
    if (tod < 0.45) {
      var u = tod / 0.45;
      topCol = mixRGB(nightTop, duskTop, u);
      midCol = mixRGB(nightMid, duskMid, u);
      botCol = mixRGB(nightBot, duskBot, u);
    } else {
      var u2 = (tod - 0.45) / 0.55;
      topCol = mixRGB(duskTop, dayTop, u2);
      midCol = mixRGB(duskMid, dayMid, u2);
      botCol = mixRGB(duskBot, dayBot, u2);
    }
    if (storm > 0.01) {
      topCol = mixRGB(topCol, stormTop, storm * 0.85);
      midCol = mixRGB(midCol, stormMid, storm * 0.85);
      botCol = mixRGB(botCol, stormBot, storm * 0.85);
    }

    var skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, rgbStr(topCol));
    skyGrad.addColorStop(0.52, rgbStr(midCol));
    skyGrad.addColorStop(1, rgbStr(botCol));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    if (w.weather.lightning > 0.01) {
      ctx.fillStyle = 'rgba(210, 245, 235, ' + (w.weather.lightning * 0.20).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // Bầu trời đêm: Dải Ngân Hà mờ + Trăng lưỡi liềm + Sao nhấp nháy + Sao băng
    var starAlpha = clamp01((0.46 - tod) / 0.36) * (1 - storm * 0.9);
    if (starAlpha > 0.02) {
      // 1. Dải Ngân Hà mờ (Milky Way nebula) vắt nhẹ qua bầu trời
      ctx.save();
      var nebGrad = ctx.createRadialGradient(W * 0.62, groundY * 0.26, 20, W * 0.55, groundY * 0.32, Math.max(W, H) * 0.55);
      nebGrad.addColorStop(0, 'rgba(78, 225, 193, ' + (starAlpha * 0.075).toFixed(3) + ')');
      nebGrad.addColorStop(0.45, 'rgba(54, 130, 145, ' + (starAlpha * 0.045).toFixed(3) + ')');
      nebGrad.addColorStop(1, 'rgba(5, 15, 12, 0)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(0, 0, W, groundY);
      ctx.restore();

      // 2. Trăng lưỡi liềm (Crescent Moon) + quầng trăng bạc ở góc trên trái-giữa
      var moonX = W * 0.22, moonY = groundY * 0.17, moonR = Math.max(18, Math.min(W, H) * 0.032);
      var moonGlow = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 4.5);
      moonGlow.addColorStop(0, 'rgba(255, 248, 215, ' + (starAlpha * 0.26).toFixed(3) + ')');
      moonGlow.addColorStop(0.4, 'rgba(180, 240, 220, ' + (starAlpha * 0.09).toFixed(3) + ')');
      moonGlow.addColorStop(1, 'rgba(11, 31, 23, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR * 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Vẽ hình trăng lưỡi liềm bằng 2 cung tròn lệch tâm trên offscreen path
      ctx.save();
      ctx.fillStyle = 'rgba(255, 250, 225, ' + (starAlpha * 0.92).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR, 0.35 * Math.PI, 1.45 * Math.PI, false);
      ctx.arc(moonX + moonR * 0.44, moonY - moonR * 0.18, moonR * 0.88, 1.38 * Math.PI, 0.42 * Math.PI, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 3. 150 ngôi sao đa sắc độ nhấp nháy chậm
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        var tw = this.reducedMotion ? 0.8 : (0.38 + 0.62 * Math.sin(w.t * s.speed + s.phase));
        var a = starAlpha * tw * 0.92;
        var sx = s.xFrac * W, sy = s.yFrac * (groundY * 0.86);

        if (s.tint === 1) ctx.fillStyle = 'rgba(255, 238, 185, ' + a.toFixed(3) + ')';
        else if (s.tint === 2) ctx.fillStyle = 'rgba(185, 242, 255, ' + a.toFixed(3) + ')';
        else ctx.fillStyle = 'rgba(235, 252, 242, ' + a.toFixed(3) + ')';

        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();

        if (s.sparkle && tw > 0.70) {
          ctx.strokeStyle = 'rgba(255, 245, 200, ' + (a * 0.48).toFixed(3) + ')';
          ctx.lineWidth = 0.85;
          ctx.beginPath();
          ctx.moveTo(sx - s.r * 3.0, sy); ctx.lineTo(sx + s.r * 3.0, sy);
          ctx.moveTo(sx, sy - s.r * 3.0); ctx.lineTo(sx, sy + s.r * 3.0);
          ctx.stroke();
        }
      }

      // 4. Sao băng (Shooting Star) xuất hiện nhẹ nhàng mỗi chu kỳ 7 giây
      if (!this.reducedMotion) {
        var cycle = w.t % 7.0;
        if (cycle > 1.2 && cycle < 2.1) {
          var sp = (cycle - 1.2) / 0.9;
          var kIdx = Math.floor(w.t / 7.0);
          var startX = (0.58 + (kIdx % 3) * 0.11) * W;
          var startY = (0.10 + (kIdx % 2) * 0.08) * groundY;
          var curX = startX - sp * W * 0.22;
          var curY = startY + sp * groundY * 0.16;
          var tailX = curX + 48 * (1 - sp * 0.4);
          var tailY = curY - 32 * (1 - sp * 0.4);

          var stGrad = ctx.createLinearGradient(curX, curY, tailX, tailY);
          stGrad.addColorStop(0, 'rgba(255, 250, 220, ' + (starAlpha * (1 - sp) * 0.95).toFixed(3) + ')');
          stGrad.addColorStop(1, 'rgba(78, 225, 193, 0)');
          ctx.strokeStyle = stGrad;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
        }
      }
    }

    // 4 lớp đồi núi + rừng thông xa + mặt hồ thung lũng + sương mờ
    this._renderMountainsAndMist(ctx, W, H, groundY, tod, storm);

    // Quầng sáng hào quang phía sau tán cây chính
    var haloStrength = clamp01(w.tree.growth - 0.25) * (0.48 + 0.52 * clamp01(w.bloom)) * (1 - storm * 0.8);
    if (haloStrength > 0.02) {
      var hx = W * 0.5, hy = groundY - Math.min(W, H) * 0.34;
      var hr = Math.min(W, H) * 0.48;
      var haloGrad = ctx.createRadialGradient(hx, hy, 12, hx, hy, hr);
      if (tod > 0.5) {
        haloGrad.addColorStop(0, 'rgba(255, 209, 102, ' + (haloStrength * 0.25).toFixed(3) + ')');
        haloGrad.addColorStop(0.5, 'rgba(123, 216, 143, ' + (haloStrength * 0.12).toFixed(3) + ')');
      } else {
        haloGrad.addColorStop(0, 'rgba(78, 225, 193, ' + (haloStrength * 0.16).toFixed(3) + ')');
        haloGrad.addColorStop(0.55, 'rgba(46, 125, 79, ' + (haloStrength * 0.09).toFixed(3) + ')');
      }
      haloGrad.addColorStop(1, 'rgba(11, 31, 23, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, W, groundY);
    }

    // Mặt đất tiền cảnh + sương mỏng + thảm cỏ đung đưa
    var gAlpha = clamp01(w.ground);
    if (gAlpha > 0.01) {
      var groundMist = ctx.createLinearGradient(0, groundY - 28, 0, groundY + 12);
      groundMist.addColorStop(0, 'rgba(78, 225, 193, 0)');
      groundMist.addColorStop(0.7, 'rgba(123, 216, 143, ' + (0.09 * gAlpha).toFixed(3) + ')');
      groundMist.addColorStop(1, 'rgba(11, 31, 23, 0)');
      ctx.fillStyle = groundMist;
      ctx.fillRect(0, groundY - 28, W, 40);

      var soilGrad = ctx.createLinearGradient(0, groundY - 8, 0, H);
      soilGrad.addColorStop(0, 'rgba(24, 64, 44, ' + gAlpha + ')');
      soilGrad.addColorStop(0.18, 'rgba(11, 30, 21, ' + gAlpha + ')');
      soilGrad.addColorStop(1, 'rgba(5, 14, 10, ' + gAlpha + ')');

      ctx.fillStyle = soilGrad;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 6);
      ctx.quadraticCurveTo(W * 0.5, groundY - 10, W, groundY + 6);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(78, 225, 193, ' + (0.36 * gAlpha).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 6);
      ctx.quadraticCurveTo(W * 0.5, groundY - 10, W, groundY + 6);
      ctx.stroke();

      // Thảm cỏ mềm và giọt sương phát sáng dọc theo triền đồi
      var wind = w.weather.wind + w.weather.storm * 0.7;
      ctx.strokeStyle = 'rgba(88, 196, 132, ' + (0.52 * gAlpha).toFixed(3) + ')';
      ctx.lineWidth = 1.15;
      ctx.beginPath();
      for (var gIdx = 0; gIdx < this.grass.length; gIdx++) {
        var gr = this.grass[gIdx];
        var gx = gr.xFrac * W;
        // Độ cao mặt đồi parabol tại gx
        var uG = gr.xFrac;
        var gy = groundY + 6 - 16 * (4 * uG * (1 - uG));
        var sway = this.reducedMotion ? 0 : Math.sin(w.t * 2.1 + gr.phase) * (2.5 + wind * 5);
        var tipX = gx + gr.lean * 10 + sway;
        var tipY = gy - gr.h;
        ctx.moveTo(gx, gy);
        ctx.quadraticCurveTo(gx, gy - gr.h * 0.5, tipX, tipY);
      }
      ctx.stroke();
    }
  };

  Tree.prototype._renderSeed = function (ctx, cx, groundY) {
    var w = this.world;
    var s = clamp01(w.seedDrop);
    if (s <= 0.001 || w.tree.growth > 0.12) return;

    var startY = groundY * 0.28;
    var dropT = clamp01(s / 0.82);
    var eased = dropT * dropT;
    var y = lerp(startY, groundY - 2, eased);

    var glowR = 16 + 6 * Math.sin(w.t * 6);
    var g = ctx.createRadialGradient(cx, y, 1, cx, y, glowR);
    g.addColorStop(0, 'rgba(255, 235, 160, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 209, 102, 0.45)');
    g.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, y, glowR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx, y, 4.2, 0, Math.PI * 2);
    ctx.fill();

    if (s > 0.82) {
      var rip = (s - 0.82) / 0.18;
      ctx.strokeStyle = 'rgba(255, 209, 102, ' + ((1 - rip) * 0.75).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, groundY - 1, 6 + rip * 46, 2 + rip * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  Tree.prototype._renderRoots = function (ctx, cx, groundY, scaleUnit) {
    var w = this.world;
    var rProg = clamp01(w.tree.roots);
    if (rProg <= 0.001) return;

    var roots = this.roots;
    ctx.lineCap = 'round';

    for (var i = 0; i < roots.length; i++) {
      var r = roots[i];
      if (r.parent === -1) {
        r.x0 = cx;
        r.y0 = groundY - 1;
      } else {
        var p = roots[r.parent];
        if (p.curScale <= 0) { r.curScale = 0; continue; }
        r.x0 = p.x1;
        r.y0 = p.y1;
      }
      var local = clamp01((rProg - r.birth) / r.growDur);
      r.curScale = local;
      if (local <= 0) continue;

      var len = r.lenFrac * scaleUnit * local;
      r.x1 = r.x0 + Math.cos(r.angle) * len;
      r.y1 = r.y0 + Math.sin(r.angle) * len;
    }

    ctx.strokeStyle = 'rgba(58, 148, 94, 0.78)';
    for (var j = 0; j < roots.length; j++) {
      var rj = roots[j];
      if (rj.curScale <= 0) continue;
      ctx.lineWidth = rj.width * rj.curScale;
      ctx.beginPath();
      ctx.moveTo(rj.x0, rj.y0);
      ctx.lineTo(rj.x1, rj.y1);
      ctx.stroke();
    }

    var pulseAlpha = clamp01(1.2 - w.tree.growth * 0.55);
    if (pulseAlpha > 0.05) {
      ctx.fillStyle = 'rgba(78, 225, 193, ' + (0.78 * pulseAlpha).toFixed(3) + ')';
      for (var k = 0; k < roots.length; k += 2) {
        var rk = roots[k];
        if (rk.curScale < 0.4) continue;
        var u = (w.t * 0.9 + rk.pulsePhase) % 1;
        var px = lerp(rk.x0, rk.x1, u);
        var py = lerp(rk.y0, rk.y1, u);
        ctx.beginPath();
        ctx.arc(px, py, 1.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  Tree.prototype._renderBranches = function (ctx, cx, groundY, scaleUnit) {
    var w = this.world;
    var g = clamp01(w.tree.growth);
    if (g <= 0.001) return;

    var branches = this.branches;
    var byDepth = this.byDepth;
    var storm = w.weather.storm;
    var wind = w.weather.wind + storm * 0.85;
    var t = w.t;
    var ptr = w.pointer;
    var swayFactor = this.reducedMotion ? 0.25 : 1.0;

    for (var i = 0; i < branches.length; i++) {
      var b = branches[i];
      var local = clamp01((g - b.birth) / b.growDur);
      if (local <= 0) { b.curScale = 0; continue; }

      if (b.parent === -1) {
        b.x0 = cx;
        b.y0 = groundY;
        b.curScale = local;
      } else {
        var p = branches[b.parent];
        if (p.curScale <= 0.05) { b.curScale = 0; continue; }
        b.x0 = p.x1;
        b.y0 = p.y1;
        b.curScale = local * Math.min(1, p.curScale * 1.25);
      }

      var depthFactor = (b.depth + 0.4) / MAX_DEPTH;
      var sway = Math.sin(t * (1.6 + storm * 2.2) + b.phase) * (0.032 + wind * 0.10) * depthFactor * swayFactor;
      var stormLean = storm * 0.22 * Math.pow(depthFactor, 0.85);

      var baseAngle = (b.parent === -1) ? (-Math.PI / 2) : branches[b.parent].angle;
      var ang = baseAngle + b.relAngle + sway + stormLean;

      if (ptr && ptr.active && b.depth >= 3) {
        var dx = b.x0 - ptr.x, dy = b.y0 - ptr.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 14400) {
          var push = (1 - d2 / 14400) * 0.18;
          ang += (dx >= 0 ? push : -push);
        }
      }

      b.angle = ang;
      var len = b.lenFrac * scaleUnit * b.curScale;
      b.x1 = b.x0 + Math.cos(ang) * len;
      b.y1 = b.y0 + Math.sin(ang) * len;
    }

    ctx.lineCap = 'round';
    var trunkCol = [54, 128, 84];
    var twigCol  = [88, 188, 124];

    for (var d = 0; d <= MAX_DEPTH; d++) {
      var list = byDepth[d];
      var col = mixRGB(trunkCol, twigCol, d / MAX_DEPTH);
      var refW = branches[list[0]] ? branches[list[0]].width : 2;
      var lw = Math.max(1, refW * Math.min(1, g * 1.3));

      if (d <= 3) {
        ctx.strokeStyle = 'rgba(123, 228, 172, 0.28)';
        ctx.lineWidth = lw + 2.2;
        ctx.beginPath();
        for (var rIdx = 0; rIdx < list.length; rIdx++) {
          var brR = branches[list[rIdx]];
          if (brR.curScale <= 0) continue;
          ctx.moveTo(brR.x0, brR.y0);
          ctx.lineTo(brR.x1, brR.y1);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = rgbStr(col);
      ctx.lineWidth = lw;
      ctx.beginPath();
      for (var k = 0; k < list.length; k++) {
        var br = branches[list[k]];
        if (br.curScale <= 0) continue;
        ctx.moveTo(br.x0, br.y0);
        ctx.lineTo(br.x1, br.y1);
      }
      ctx.stroke();
    }
  };

  Tree.prototype._renderFoliage = function (ctx) {
    var w = this.world;
    var g = clamp01(w.tree.growth);
    if (g < 0.22) return;

    var branches = this.branches;
    var leaves = this.leaves;
    var flowers = this.flowers;
    var q = clamp01(w.quality);
    var leafStep = q < 0.65 ? 2 : 1;

    for (var i = 0; i < leaves.length; i += leafStep) {
      var lf = leaves[i];
      var b = branches[lf.branch];
      if (!b || b.curScale < 0.35) continue;
      var lScale = clamp01((g - lf.birth) / 0.14) * b.curScale;
      if (lScale <= 0) continue;

      var lx = lerp(b.x0, b.x1, lf.tPos);
      var ly = lerp(b.y0, b.y1, lf.tPos);
      var r = lf.size * lScale;

      ctx.fillStyle = lf.hueShift > 0.5 ? 'rgba(123, 216, 143, 0.84)' : 'rgba(92, 200, 130, 0.80)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, r, r * 0.58, b.angle + lf.offsetAngle, 0, Math.PI * 2);
      ctx.fill();
    }

    var bloom = clamp01(w.bloom);
    if (bloom <= 0.005) return;

    for (var j = 0; j < flowers.length; j += leafStep) {
      var fl = flowers[j];
      var bf = branches[fl.branch];
      if (!bf || bf.curScale < 0.5) continue;

      var fScale = clamp01((bloom - fl.birthBloom) / 0.35);
      if (fScale <= 0) continue;
      var pop = this.reducedMotion
        ? fScale
        : (fScale < 0.8 ? (fScale / 0.8) * 1.12 : 1.12 - ((fScale - 0.8) / 0.2) * 0.12);

      var fx = lerp(bf.x0, bf.x1, fl.tPos);
      var fy = lerp(bf.y0, bf.y1, fl.tPos);
      var rad = fl.size * pop;

      ctx.fillStyle = fl.kind === 0
        ? 'rgba(255, 209, 102, 0.22)'
        : 'rgba(255, 158, 172, 0.22)';
      ctx.beginPath();
      ctx.arc(fx, fy, rad * 1.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = fl.kind === 0 ? '#ffd166' : '#ff9ebb';
      var baseRot = fl.phase + (this.reducedMotion ? 0 : w.t * 0.22);
      for (var p = 0; p < 5; p++) {
        var a = baseRot + (p * Math.PI * 2) / 5;
        var px = fx + Math.cos(a) * rad * 0.55;
        var py = fy + Math.sin(a) * rad * 0.55;
        ctx.beginPath();
        ctx.arc(px, py, rad * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#fff6d6';
      ctx.beginPath();
      ctx.arc(fx, fy, rad * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  Tree.prototype._renderSprouts = function (ctx) {
    if (!this.sprouts.length) return;
    var t = this.world.t;
    ctx.lineCap = 'round';

    for (var i = 0; i < this.sprouts.length; i++) {
      var sp = this.sprouts[i];
      var age = Math.max(0, t - sp.bornAt);
      var g = clamp01(age / 1.2);
      if (g <= 0) continue;

      var sway = this.reducedMotion ? 0 : Math.sin(t * 2.2 + sp.phase) * 0.06;
      var ang = -Math.PI / 2 + sp.lean + sway;
      var h = sp.h * g;
      var x1 = sp.x + Math.cos(ang) * h;
      var y1 = sp.y + Math.sin(ang) * h;

      if (age < 0.7) {
        var rip = age / 0.7;
        ctx.strokeStyle = 'rgba(255, 209, 102, ' + ((1 - rip) * 0.7).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, 4 + rip * 22, 1.5 + rip * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.strokeStyle = '#58bc7c';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      if (g > 0.35) {
        var lg = clamp01((g - 0.35) / 0.45);
        var mx = lerp(sp.x, x1, 0.55), my = lerp(sp.y, y1, 0.55);
        ctx.fillStyle = '#7bd88f';
        ctx.beginPath();
        ctx.ellipse(mx - 6 * lg, my - 2 * lg, 5.5 * lg, 2.8 * lg, -0.5, 0, Math.PI * 2);
        ctx.ellipse(mx + 6 * lg, my - 2 * lg, 5.5 * lg, 2.8 * lg, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (g > 0.65) {
        var fg = clamp01((g - 0.65) / 0.35);
        var rad = 4.8 * fg;
        ctx.fillStyle = sp.kind === 0 ? '#ffd166' : '#ff9ebb';
        for (var p = 0; p < 5; p++) {
          var a = sp.phase + (p * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(x1 + Math.cos(a) * rad * 0.55, y1 + Math.sin(a) * rad * 0.55, rad * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#fff6d6';
        ctx.beginPath();
        ctx.arc(x1, y1, rad * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  Tree.prototype.render = function (ctx, W, H) {
    var w = this.world;
    var shake = 0;
    if (!this.reducedMotion && w.seedDrop > 0.80 && w.seedDrop < 0.99 && w.tree.growth < 0.05) {
      shake = Math.sin(w.t * 48) * 2.2 * (1 - (w.seedDrop - 0.80) / 0.20);
    }

    var groundY = Math.floor(H * 0.835 + shake);
    var cx = Math.floor(W * 0.5);
    var scaleUnit = Math.min(W, H) * 0.76;

    this._renderEnvironment(ctx, W, H, groundY);
    this._renderRoots(ctx, cx, groundY, scaleUnit);
    this._renderSeed(ctx, cx, groundY);
    this._renderBranches(ctx, cx, groundY, scaleUnit);
    this._renderFoliage(ctx);
    this._renderSprouts(ctx);
  };

  G.Tree = Tree;
})(window.GP = window.GP || {});
