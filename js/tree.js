/* Tree: sinh trước 1 lần bằng PRNG có seed, render theo world = f(t).
 * Gồm: bầu trời + nắng xuyên tán, hạt giống rơi, hệ rễ neural, thân/cành gom batch theo depth, lá + hoa nở.
 * Budget: cành <= 2500, lá + hoa <= 800.
 */
(function (G) {
  'use strict';

  var MAX_DEPTH = 9;

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  // Nội suy màu RGB dạng [r,g,b]
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
    // Dùng PRNG riêng khởi tạo từ world.seed để hình dáng cây cố định theo buildHash
    this.rand = G.World.mulberry32(world.seed ^ 0x9e3779b9);
    this.branches = [];
    this.byDepth = [];
    this.roots = [];
    this.leaves = [];
    this.flowers = [];
    this.stars = [];
    for (var d = 0; d <= MAX_DEPTH; d++) this.byDepth.push([]);

    this._generateBranches();
    this._generateRoots();
    this._generateStars();
  }

  // Sinh trước cấu trúc cành (mảng phẳng, parent index luôn < child index)
  Tree.prototype._generateBranches = function () {
    var rand = this.rand;
    var branches = this.branches;
    var byDepth = this.byDepth;
    var leaves = this.leaves;
    var flowers = this.flowers;

    // Thân chính (depth 0)
    branches.push({
      parent: -1,
      depth: 0,
      relAngle: (rand() - 0.5) * 0.06,
      lenFrac: 0.21,          // tỉ lệ theo min(W,H)
      width: 15,
      birth: 0.0,
      growDur: 0.14,
      phase: rand() * Math.PI * 2,
      // toạ độ tính mỗi frame:
      x0: 0, y0: 0, x1: 0, y1: 0, angle: -Math.PI / 2, curScale: 0
    });
    byDepth[0].push(0);

    // Hàng đợi duyệt theo tầng để đảm bảo thứ tự mảng và kiểm soát tổng số cành
    var queue = [0];
    while (queue.length > 0 && branches.length < 1800) {
      var pIdx = queue.shift();
      var p = branches[pIdx];
      var d = p.depth + 1;
      if (d > MAX_DEPTH) continue;

      // Số nhánh con: thân & cành chính tách 2-3, cành cao tách 2
      var count = (d <= 2 && rand() < 0.38) ? 3 : 2;
      // Xác suất tỉa bớt ở tầng cao để tán tự nhiên và nhẹ
      if (d >= 7 && rand() < 0.22) count = 1;

      var spread = 0.42 + d * 0.025;
      for (var k = 0; k < count; k++) {
        var side = count === 1 ? (rand() - 0.5) : (k / (count - 1) - 0.5) * 2;
        var jitter = (rand() - 0.5) * 0.22;
        var relAngle = side * spread + jitter;

        var lenDecay = 0.74 + rand() * 0.11;
        var lenFrac = p.lenFrac * lenDecay;
        var width = Math.max(1.1, p.width * 0.71);

        // Thời điểm mọc: depth 0..3 mọc trong Build (0..0.38), depth 4..6 trong Test (0.38..0.58), depth 7..9 trong Deploy (0.58..0.92)
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

        // Gắn lá & hoa ở các cành tầng cao (giữ tổng lá + hoa <= 780)
        if (d >= 5 && leaves.length < 520 && rand() < 0.72) {
          leaves.push({
            branch: idx,
            tPos: 0.55 + rand() * 0.45,
            offsetAngle: (rand() - 0.5) * 1.4,
            size: 4.5 + rand() * 4.5,
            birth: Math.min(0.96, birth + growDur * 0.6),
            hueShift: rand(),
            phase: rand() * Math.PI * 2
          });
        }
        if (d >= 6 && flowers.length < 240 && rand() < 0.48) {
          flowers.push({
            branch: idx,
            tPos: 0.7 + rand() * 0.3,
            size: 5.5 + rand() * 4.5,
            birthBloom: rand() * 0.65,   // ngưỡng bloom (0..1) bắt đầu nở
            kind: rand() < 0.35 ? 1 : 0, // 0: hoa vàng ấm, 1: hoa hồng phấn/cam đào
            phase: rand() * Math.PI * 2
          });
        }
      }
    }
  };

  // Sinh trước hệ rễ dưới mặt đất (mạng neural)
  Tree.prototype._generateRoots = function () {
    var rand = this.rand;
    var roots = this.roots;
    var MAX_RDEPTH = 5;

    // 4 rễ cái toả xuống dưới
    var mainAngles = [Math.PI * 0.25, Math.PI * 0.42, Math.PI * 0.58, Math.PI * 0.75];
    for (var i = 0; i < mainAngles.length; i++) {
      roots.push({
        parent: -1,
        depth: 0,
        angle: mainAngles[i] + (rand() - 0.5) * 0.12,
        lenFrac: 0.065 + rand() * 0.02,
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
        // Giữ rễ luôn hướng xuống dưới mặt đất (0.08*PI .. 0.92*PI)
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

  // Sinh trước bầu trời sao cho ban đêm (cảnh Push / Monitor)
  Tree.prototype._generateStars = function () {
    var rand = this.rand;
    for (var i = 0; i < 95; i++) {
      this.stars.push({
        xFrac: rand(),
        yFrac: rand() * 0.72,
        r: 0.7 + rand() * 1.4,
        phase: rand() * Math.PI * 2
      });
    }
  };

  // Vẽ bầu trời, sao, nắng xuyên tán và mặt đất
  Tree.prototype._renderEnvironment = function (ctx, W, H, groundY) {
    var w = this.world;
    var tod = clamp01(w.timeOfDay);
    var storm = clamp01(w.weather.storm);

    // Bảng màu bầu trời theo timeOfDay:
    // đêm (0) -> chạng vạng (0.45) -> nắng ấm (1.0), trộn thêm xám bão khi storm > 0
    var nightTop = [6, 16, 14], nightBot = [11, 31, 23];
    var duskTop  = [11, 31, 23], duskBot  = [22, 54, 39];
    var dayTop   = [24, 68, 52], dayBot   = [54, 118, 82];
    var stormTop = [8, 15, 18],  stormBot = [18, 30, 32];

    var topCol, botCol;
    if (tod < 0.45) {
      var u = tod / 0.45;
      topCol = mixRGB(nightTop, duskTop, u);
      botCol = mixRGB(nightBot, duskBot, u);
    } else {
      var u2 = (tod - 0.45) / 0.55;
      topCol = mixRGB(duskTop, dayTop, u2);
      botCol = mixRGB(duskBot, dayBot, u2);
    }
    if (storm > 0.01) {
      topCol = mixRGB(topCol, stormTop, storm * 0.85);
      botCol = mixRGB(botCol, stormBot, storm * 0.85);
    }

    var skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
    skyGrad.addColorStop(0, rgbStr(topCol));
    skyGrad.addColorStop(1, rgbStr(botCol));
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Chớp sáng dịu trong bão (<= 2 flash/s, tôn trọng prefers-reduced-motion)
    if (w.weather.lightning > 0.01) {
      ctx.fillStyle = 'rgba(210, 245, 235, ' + (w.weather.lightning * 0.22).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    }

    // Sao trời đêm (hiện rõ khi timeOfDay < 0.4 và không bão)
    var starAlpha = clamp01((0.42 - tod) / 0.35) * (1 - storm * 0.9);
    if (starAlpha > 0.02) {
      for (var i = 0; i < this.stars.length; i++) {
        var s = this.stars[i];
        var tw = 0.45 + 0.55 * Math.sin(w.t * 1.8 + s.phase);
        ctx.fillStyle = 'rgba(235, 250, 240, ' + (starAlpha * tw * 0.85).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(s.xFrac * W, s.yFrac * groundY, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Nắng ấm xuyên qua tán cây ở cảnh Deploy (khi timeOfDay > 0.55 và bloom > 0)
    var sunAmt = clamp01((tod - 0.5) / 0.5) * clamp01(w.bloom) * (1 - storm);
    if (sunAmt > 0.02) {
      var sunX = W * 0.5, sunY = groundY * 0.42;
      var radGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, Math.min(W, H) * 0.58);
      radGrad.addColorStop(0, 'rgba(255, 209, 102, ' + (sunAmt * 0.24).toFixed(3) + ')');
      radGrad.addColorStop(0.5, 'rgba(123, 216, 143, ' + (sunAmt * 0.10).toFixed(3) + ')');
      radGrad.addColorStop(1, 'rgba(11, 31, 23, 0)');
      ctx.fillStyle = radGrad;
      ctx.fillRect(0, 0, W, groundY);
    }

    // Mặt đất (đồi thoải nhẹ + lát cắt đất cho hệ rễ)
    var gAlpha = clamp01(w.ground);
    if (gAlpha > 0.01) {
      var soilGrad = ctx.createLinearGradient(0, groundY - 8, 0, H);
      soilGrad.addColorStop(0, 'rgba(22, 58, 40, ' + gAlpha + ')');
      soilGrad.addColorStop(0.15, 'rgba(10, 28, 20, ' + gAlpha + ')');
      soilGrad.addColorStop(1, 'rgba(5, 14, 10, ' + gAlpha + ')');

      ctx.fillStyle = soilGrad;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 6);
      ctx.quadraticCurveTo(W * 0.5, groundY - 10, W, groundY + 6);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();

      // Đường viền cỏ phát sáng dịu
      ctx.strokeStyle = 'rgba(78, 225, 193, ' + (0.28 * gAlpha).toFixed(3) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY + 6);
      ctx.quadraticCurveTo(W * 0.5, groundY - 10, W, groundY + 6);
      ctx.stroke();
    }
  };

  // Vẽ hạt giống rơi ở cảnh Commit (seedDrop: 0 -> 1)
  Tree.prototype._renderSeed = function (ctx, cx, groundY) {
    var w = this.world;
    var s = clamp01(w.seedDrop);
    if (s <= 0.001 || w.tree.growth > 0.12) return;

    var startY = groundY * 0.28;
    // Rơi theo đường cong parabol nhẹ
    var dropT = clamp01(s / 0.82);
    var eased = dropT * dropT;
    var y = lerp(startY, groundY - 2, eased);

    // Hào quang quanh hạt giống
    var glowR = 16 + 6 * Math.sin(w.t * 6);
    var g = ctx.createRadialGradient(cx, y, 1, cx, y, glowR);
    g.addColorStop(0, 'rgba(255, 235, 160, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 209, 102, 0.45)');
    g.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, y, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Hạt sáng
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(cx, y, 4.2, 0, Math.PI * 2);
    ctx.fill();

    // Vòng sóng lan trên mặt đất khi hạt chạm đất (s > 0.82)
    if (s > 0.82) {
      var rip = (s - 0.82) / 0.18;
      ctx.strokeStyle = 'rgba(255, 209, 102, ' + ((1 - rip) * 0.75).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, groundY - 1, 6 + rip * 46, 2 + rip * 10, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // Vẽ hệ rễ neural dưới mặt đất
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

    // Vẽ đường rễ
    ctx.strokeStyle = 'rgba(46, 125, 79, 0.72)';
    for (var j = 0; j < roots.length; j++) {
      var rj = roots[j];
      if (rj.curScale <= 0) continue;
      ctx.lineWidth = rj.width * rj.curScale;
      ctx.beginPath();
      ctx.moveTo(rj.x0, rj.y0);
      ctx.lineTo(rj.x1, rj.y1);
      ctx.stroke();
    }

    // Xung ánh sáng neural chạy dọc rễ (ẩn dụ dữ liệu/kiến thức truyền lên cây)
    var pulseAlpha = clamp01(1.2 - w.tree.growth * 0.7);
    if (pulseAlpha > 0.05) {
      ctx.fillStyle = 'rgba(78, 225, 193, ' + (0.75 * pulseAlpha).toFixed(3) + ')';
      for (var k = 0; k < roots.length; k += 2) {
        var rk = roots[k];
        if (rk.curScale < 0.4) continue;
        var u = (w.t * 0.9 + rk.pulsePhase) % 1;
        var px = lerp(rk.x0, rk.x1, u);
        var py = lerp(rk.y0, rk.y1, u);
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // Tính toạ độ và vẽ toàn bộ cành (gom batch theo depth)
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

    // Bước 1: cập nhật hình học phẳng (parent luôn < child)
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

      // Dao động gió + nghiêng trong bão (cành càng cao lay càng rõ nhưng không bao giờ gãy)
      var depthFactor = (b.depth + 0.4) / MAX_DEPTH;
      var sway = Math.sin(t * (1.6 + storm * 2.2) + b.phase) * (0.035 + wind * 0.11) * depthFactor;
      var stormLean = storm * 0.22 * Math.pow(depthFactor, 0.85);

      var baseAngle = (b.parent === -1) ? (-Math.PI / 2) : branches[b.parent].angle;
      var ang = baseAngle + b.relAngle + sway + stormLean;

      // Tương tác chuột/chạm: cành gần con trỏ khẽ nghiêng tránh/lay nhẹ
      if (ptr && ptr.active && b.depth >= 3) {
        var dx = b.x0 - ptr.x, dy = b.y0 - ptr.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 14400) { // bán kính 120px
          var push = (1 - d2 / 14400) * 0.18;
          ang += (dx >= 0 ? push : -push);
        }
      }

      b.angle = ang;
      var len = b.lenFrac * scaleUnit * b.curScale;
      b.x1 = b.x0 + Math.cos(ang) * len;
      b.y1 = b.y0 + Math.sin(ang) * len;
    }

    // Bước 2: vẽ gom batch theo từng tầng depth (chỉ MAX_DEPTH+1 lần stroke)
    ctx.lineCap = 'round';
    var trunkCol = [34, 88, 58];
    var twigCol  = [56, 152, 96];

    for (var d = 0; d <= MAX_DEPTH; d++) {
      var list = byDepth[d];
      var col = mixRGB(trunkCol, twigCol, d / MAX_DEPTH);
      ctx.strokeStyle = rgbStr(col);
      // Độ dày trung bình của tầng d
      var refW = branches[list[0]] ? branches[list[0]].width : 2;
      ctx.lineWidth = Math.max(1, refW * Math.min(1, g * 1.3));
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

  // Vẽ lá và hoa bung nở theo thời gian thực
  Tree.prototype._renderFoliage = function (ctx) {
    var w = this.world;
    var g = clamp01(w.tree.growth);
    if (g < 0.22) return;

    var branches = this.branches;
    var leaves = this.leaves;
    var flowers = this.flowers;
    var q = clamp01(w.quality);
    var leafStep = q < 0.65 ? 2 : 1; // adaptive quality khi máy yếu

    // Vẽ lá non (#7bd88f và sắc xanh tươi)
    for (var i = 0; i < leaves.length; i += leafStep) {
      var lf = leaves[i];
      var b = branches[lf.branch];
      if (!b || b.curScale < 0.35) continue;
      var lScale = clamp01((g - lf.birth) / 0.14) * b.curScale;
      if (lScale <= 0) continue;

      var lx = lerp(b.x0, b.x1, lf.tPos);
      var ly = lerp(b.y0, b.y1, lf.tPos);
      var r = lf.size * lScale;

      ctx.fillStyle = lf.hueShift > 0.5 ? 'rgba(123, 216, 143, 0.82)' : 'rgba(88, 196, 126, 0.78)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, r, r * 0.58, b.angle + lf.offsetAngle, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vẽ hoa bung nở ở cảnh Deploy (bloom: 0 -> 1)
    var bloom = clamp01(w.bloom);
    if (bloom <= 0.005) return;

    for (var j = 0; j < flowers.length; j += leafStep) {
      var fl = flowers[j];
      var bf = branches[fl.branch];
      if (!bf || bf.curScale < 0.5) continue;

      var fScale = clamp01((bloom - fl.birthBloom) / 0.35);
      if (fScale <= 0) continue;
      // Hiệu ứng bung nhẹ (overshoot dịu)
      var pop = fScale < 0.8 ? (fScale / 0.8) * 1.12 : 1.12 - ((fScale - 0.8) / 0.2) * 0.12;

      var fx = lerp(bf.x0, bf.x1, fl.tPos);
      var fy = lerp(bf.y0, bf.y1, fl.tPos);
      var rad = fl.size * pop;

      // Hào quang nhẹ quanh bông hoa
      ctx.fillStyle = fl.kind === 0
        ? 'rgba(255, 209, 102, 0.24)'
        : 'rgba(255, 158, 172, 0.24)';
      ctx.beginPath();
      ctx.arc(fx, fy, rad * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // 5 cánh hoa
      ctx.fillStyle = fl.kind === 0 ? '#ffd166' : '#ff9ebb';
      var baseRot = fl.phase + w.t * 0.25;
      for (var p = 0; p < 5; p++) {
        var a = baseRot + (p * Math.PI * 2) / 5;
        var px = fx + Math.cos(a) * rad * 0.55;
        var py = fy + Math.sin(a) * rad * 0.55;
        ctx.beginPath();
        ctx.arc(px, py, rad * 0.44, 0, Math.PI * 2);
        ctx.fill();
      }

      // Nhụy hoa sáng
      ctx.fillStyle = '#fff6d6';
      ctx.beginPath();
      ctx.arc(fx, fy, rad * 0.26, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Lấy danh sách toạ độ các đầu cành/hoa để đom đóm hoặc cánh hoa neo vào
  Tree.prototype.getCanopyPoints = function (maxCount) {
    var out = [];
    var flowers = this.flowers;
    var branches = this.branches;
    var step = Math.max(1, Math.floor(flowers.length / (maxCount || 16)));
    for (var i = 0; i < flowers.length && out.length < (maxCount || 16); i += step) {
      var b = branches[flowers[i].branch];
      if (b && b.curScale > 0.5) {
        out.push({ x: b.x1, y: b.y1 });
      }
    }
    return out;
  };

  Tree.prototype.render = function (ctx, W, H) {
    var w = this.world;
    // Rung mặt đất rất nhẹ khi hạt giống vừa chạm đất (t ~ 8.6..9.3s)
    var shake = 0;
    if (w.seedDrop > 0.80 && w.seedDrop < 0.99 && w.tree.growth < 0.05) {
      shake = Math.sin(w.t * 48) * 2.2 * (1 - (w.seedDrop - 0.80) / 0.20);
    }

    var groundY = Math.floor(H * 0.80 + shake);
    var cx = Math.floor(W * 0.5);
    var scaleUnit = Math.min(W, H) * 0.88;

    this._renderEnvironment(ctx, W, H, groundY);
    this._renderRoots(ctx, cx, groundY, scaleUnit);
    this._renderSeed(ctx, cx, groundY);
    this._renderBranches(ctx, cx, groundY, scaleUnit);
    this._renderFoliage(ctx);
  };

  G.Tree = Tree;
})(window.GP = window.GP || {});

