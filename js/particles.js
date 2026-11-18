/* Particles: Mưa bão (<=160), Cánh hoa bay (<=65), Đom đóm + Commit nodes (<=55).
 * Tổng số hạt <= 280 (nằm trong budget <= 300), dùng object pool cố định không cấp phát rác.
 */
(function (G) {
  'use strict';

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function Particles(world, tree, cfg) {
    this.world = world;
    this.tree = tree;
    this.cfg = cfg;
    this.rand = G.World.mulberry32(world.seed ^ 0x517cc1b7);

    this.rain = [];
    this.petals = [];
    this.fireflies = [];
    this.commitCount = (cfg.commits && cfg.commits.length) ? cfg.commits.length : 10;

    this._initPools();
  }

  Particles.prototype._initPools = function () {
    var rand = this.rand;
    var i;

    // 1. Pool mưa (160 hạt)
    for (i = 0; i < 160; i++) {
      this.rain.push({
        xFrac: rand(),
        yFrac: rand(),
        speed: 0.85 + rand() * 0.55,
        len: 14 + rand() * 12
      });
    }

    // 2. Pool cánh hoa (65 hạt)
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

    // 3. Pool đom đóm (55 hạt: commitCount hạt đầu là commit đom đóm có thể click)
    for (i = 0; i < 55; i++) {
      var isCommit = i < this.commitCount;
      // Phân bố đều các commit đom đóm quanh vòm tán cây để không chồng lên nhau
      var angle = isCommit
        ? (Math.PI * 1.12) + (i / Math.max(1, this.commitCount - 1)) * (Math.PI * 0.76)
        : rand() * Math.PI * 2;
      var radX = isCommit ? (0.14 + (i % 3) * 0.075) : (0.08 + rand() * 0.34);
      var radY = isCommit ? (0.13 + ((i + 1) % 3) * 0.065) : (0.08 + rand() * 0.28);

      this.fireflies.push({
        isCommit: isCommit,
        commitIndex: isCommit ? i : -1,
        baseXFrac: 0.5 + Math.cos(angle) * radX,
        baseYFrac: 0.46 + Math.sin(angle) * radY,
        x: 0,
        y: 0,
        r: isCommit ? 5.2 : (2.0 + rand() * 1.8),
        phase: rand() * Math.PI * 2,
        freq: 0.45 + rand() * 0.55,
        read: false
      });
    }
  };

  // Vẽ mưa và tia nước bắn trên mặt đất
  Particles.prototype._renderRain = function (ctx, W, H, groundY) {
    var w = this.world;
    var rainAmt = clamp01(w.weather.rain);
    if (rainAmt <= 0.01) return;

    var count = Math.floor(this.rain.length * rainAmt * clamp01(w.quality));
    var t = w.t;
    var slant = 0.22 + w.weather.storm * 0.28; // độ xiên theo gió bão

    ctx.strokeStyle = 'rgba(170, 225, 220, ' + (0.28 + rainAmt * 0.26).toFixed(3) + ')';
    ctx.lineWidth = 1.15;
    ctx.beginPath();

    for (var i = 0; i < count; i++) {
      var r = this.rain[i];
      // Vị trí tính thuần theo t để tua/pause vẫn mượt
      var prog = (r.yFrac + t * r.speed * 1.45) % 1;
      var y = prog * groundY;
      var x = ((r.xFrac + prog * slant + t * 0.12) % 1) * W;

      ctx.moveTo(x, y);
      ctx.lineTo(x + r.len * slant, y + r.len);
    }
    ctx.stroke();
  };

  // Vẽ cánh hoa bay trong gió từ cảnh Deploy
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

  // Vẽ đom đóm (hiện từ cảnh Deploy, sáng rực ở Monitor & Push)
  Particles.prototype._renderFireflies = function (ctx, W, H, groundY) {
    var w = this.world;
    var bloom = clamp01(w.bloom);
    if (bloom <= 0.15) return;

    // Đom đóm càng nổi bật khi trời chuyển tối ở cảnh Monitor / Push
    var nightBoost = 0.55 + 0.45 * (1 - clamp01(w.timeOfDay));
    var baseAlpha = clamp01((bloom - 0.15) / 0.55) * nightBoost;
    if (baseAlpha <= 0.02) return;

    var t = w.t;
    var ptr = w.pointer;
    var isPushStage = t >= 44; // Ở cảnh Push, các commit đom đóm hiện vòng sáng mời gọi click
    var maxCount = Math.max(this.commitCount, Math.floor(this.fireflies.length * clamp01(w.quality)));

    for (var i = 0; i < maxCount; i++) {
      var f = this.fireflies[i];
      var driftX = Math.sin(t * f.freq + f.phase) * (f.isCommit ? 12 : 24);
      var driftY = Math.cos(t * (f.freq * 0.85) + f.phase) * (f.isCommit ? 9 : 18);

      var fx = f.baseXFrac * W + driftX;
      var fy = f.baseYFrac * groundY + driftY;

      // Đom đóm thường bay lại gần con trỏ chuột/ngón tay
      if (!f.isCommit && ptr && ptr.active) {
        var dx = ptr.x - fx, dy = ptr.y - fy;
        var dist2 = dx * dx + dy * dy;
        if (dist2 < 48000) {
          var pull = (1 - dist2 / 48000) * 0.35;
          fx += dx * pull;
          fy += dy * pull;
        }
      }

      f.x = fx;
      f.y = fy;

      var pulse = 0.62 + 0.38 * Math.sin(t * 3.2 + f.phase);
      var a = clamp01(baseAlpha * pulse);

      // Hào quang đom đóm
      var glowR = f.isCommit ? (isPushStage ? 20 : 14) : 8;
      var g = ctx.createRadialGradient(fx, fy, 0.5, fx, fy, glowR);
      if (f.isCommit && f.read) {
        // Đom đóm đã đọc chuyển ánh xanh ngọc dịu (#4ee1c1)
        g.addColorStop(0, 'rgba(210, 255, 242, ' + a.toFixed(3) + ')');
        g.addColorStop(0.45, 'rgba(78, 225, 193, ' + (a * 0.45).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(78, 225, 193, 0)');
      } else {
        g.addColorStop(0, 'rgba(255, 248, 200, ' + a.toFixed(3) + ')');
        g.addColorStop(0.45, 'rgba(255, 209, 102, ' + (a * 0.48).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(255, 209, 102, 0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, glowR, 0, Math.PI * 2);
      ctx.fill();

      // Nhân sáng
      ctx.fillStyle = (f.isCommit && f.read) ? '#4ee1c1' : '#ffd166';
      ctx.beginPath();
      ctx.arc(fx, fy, f.r * (0.85 + 0.2 * pulse), 0, Math.PI * 2);
      ctx.fill();

      // Vòng nhẫn gợi ý chạm ở cảnh Push cho các đom đóm chứa commit
      if (f.isCommit && isPushStage) {
        ctx.strokeStyle = f.read
          ? 'rgba(78, 225, 193, ' + (a * 0.45).toFixed(3) + ')'
          : 'rgba(255, 209, 102, ' + (a * 0.55).toFixed(3) + ')';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(fx, fy, f.r + 4.5 + pulse * 2.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  };

  // Kiểm tra click/chạm vào đom đóm commit (bán kính chạm hào phóng 26px cho cả mobile)
  Particles.prototype.hitTestCommit = function (x, y) {
    if (this.world.bloom < 0.3) return -1;
    var bestIdx = -1;
    var bestD2 = 26 * 26;
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
    var groundY = Math.floor(H * 0.80);
    this._renderRain(ctx, W, H, groundY);
    this._renderPetals(ctx, W, H, groundY);
    this._renderFireflies(ctx, W, H, groundY);
  };

  G.Particles = Particles;
})(window.GP = window.GP || {});

