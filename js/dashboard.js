/* Dashboard & UI Controller (P0 + P1 + P2):
 * - Thanh tiến trình Pipeline 6 chặng click được + nút Skip ⏭ (tự đổi thành Replay ↻ ở cảnh cuối)
 * - Nút Âm thanh nổi bật có pulse "🔊 Bật tiếng" + nút Ngày/Đêm + nút 📸 Lưu ảnh PNG (toBlob)
 * - Cảnh 5 (Monitor 38..46s): Grafana metrics count-up, sparkline canvas, git blame
 * - Cảnh 6 (Push 46s+):
 *   + Banner gợi ý đom đóm ở đáy giữa (mờ nhẹ sau lần click đầu, không đè đỉnh cây)
 *   + Tự động thu gọn Panel Lời kết khi mở Card Lời chúc đom đóm (và ngược lại) để 2 panel không cạnh tranh
 *   + Tách riêng thanh Terminal CLI + Chip gợi ý
 *   + P2: Konami Code (↑↑↓↓←→←→BA) bắn pháo hoa Hoa Sen / Hoa Phượng, click mặt đất gieo thêm cây con
 */
(function (G) {
  'use strict';

  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function sub(s, world, cfg) {
    return String(s)
      .replace(/\{name\}/g, world.name)
      .replace(/\{title\}/g, cfg.teacher.title);
  }

  function Dashboard(world, timeline, tree, particles, sound, cfg) {
    this.world = world;
    this.timeline = timeline;
    this.tree = tree;
    this.particles = particles;
    this.sound = sound;
    this.cfg = cfg;

    this.activeCommit = -1;
    this.readCount = 0;
    this.envOverride = null;
    this.finaleCollapsed = false;
    this.hasInteractedFirefly = false;
    this.konamiIdx = 0;

    this._cacheEls();
    this._buildPipelineBar();
    this._buildMonitorCard();
    this._buildFinaleCard();
    this._bindEvents();
  }

  Dashboard.prototype._cacheEls = function () {
    this.pipelineEl = document.getElementById('pipeline-bar');
    this.monitorEl  = document.getElementById('monitor-panel');
    this.pushEl     = document.getElementById('push-panel');
    this.cliDockEl  = document.getElementById('cli-dock');
    this.hintEl     = document.getElementById('firefly-hint');
    this.modalEl    = document.getElementById('commit-modal');
    this.btnAudio   = document.getElementById('btn-audio');
    this.btnEnv     = document.getElementById('btn-env');
    this.btnSnap    = document.getElementById('btn-snap');
    this.btnSkip    = document.getElementById('btn-skip');
    this.btnToggleFinale = document.getElementById('btn-toggle-finale');
    this.cmdOut     = document.getElementById('cmd-output');
    this.cmdInput   = document.getElementById('cmd-input');
    this.cmdForm    = document.getElementById('cmd-form');
    this.authorEl   = document.getElementById('author-mark');
    if (this.authorEl && this.cfg.author) {
      this.authorEl.textContent = this.cfg.author;
    }
  };

  Dashboard.prototype._buildPipelineBar = function () {
    var self = this;
    var wrap = this.pipelineEl;
    wrap.textContent = '';
    this.stageBtns = [];

    this.cfg.stages.forEach(function (st, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'stage-step';
      btn.setAttribute('data-stage', st.id);

      var icon = document.createElement('span');
      icon.className = 'stage-icon';
      icon.textContent = '[ ]';

      var lbl = document.createElement('span');
      lbl.className = 'stage-label';
      lbl.textContent = ' ' + st.label;

      btn.appendChild(icon);
      btn.appendChild(lbl);

      btn.addEventListener('click', function () {
        self.envOverride = null;
        self.timeline.seek(st.start + 0.05);
      });

      wrap.appendChild(btn);
      self.stageBtns.push({ st: st, btn: btn, icon: icon });

      if (idx < self.cfg.stages.length - 1) {
        var arr = document.createElement('span');
        arr.className = 'stage-arrow';
        arr.textContent = '→';
        wrap.appendChild(arr);
      }
    });
  };

  Dashboard.prototype._buildMonitorCard = function () {
    var el = this.monitorEl;
    el.textContent = '';

    var header = document.createElement('div');
    header.className = 'mon-header';
    header.textContent = '● BẢNG QUAN SÁT // HÀNH TRÌNH TRI ÂN';
    el.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'mon-grid';

    var m1 = document.createElement('div');
    m1.className = 'mon-metric';
    var m1Lbl = document.createElement('div');
    m1Lbl.className = 'mon-label';
    m1Lbl.textContent = 'Độ bền bỉ lòng biết ơn';
    var m1Val = document.createElement('div');
    m1Val.className = 'mon-value ok';
    m1Val.textContent = '100%';
    this.uptimeValEl = m1Val;
    m1.appendChild(m1Lbl);
    m1.appendChild(m1Val);

    var m2 = document.createElement('div');
    m2.className = 'mon-metric';
    var m2Lbl = document.createElement('div');
    m2Lbl.className = 'mon-label';
    m2Lbl.textContent = sub('Lỗi đời em được {title} gỡ giúp', this.world, this.cfg);
    var m2Val = document.createElement('div');
    m2Val.className = 'mon-value fly';
    m2Val.textContent = '∞';
    m2.appendChild(m2Lbl);
    m2.appendChild(m2Val);

    var m3 = document.createElement('div');
    m3.className = 'mon-metric';
    var m3Lbl = document.createElement('div');
    m3Lbl.className = 'mon-label';
    m3Lbl.textContent = sub('Lần {title} bỏ cuộc với học trò', this.world, this.cfg);
    var m3Val = document.createElement('div');
    m3Val.className = 'mon-value ok';
    m3Val.textContent = '0';
    m3.appendChild(m3Lbl);
    m3.appendChild(m3Val);

    grid.appendChild(m1);
    grid.appendChild(m2);
    grid.appendChild(m3);
    el.appendChild(grid);

    var sparkWrap = document.createElement('div');
    sparkWrap.className = 'mon-spark-wrap';
    var sparkCanvas = document.createElement('canvas');
    sparkCanvas.width = 440;
    sparkCanvas.height = 46;
    sparkCanvas.className = 'mon-spark';
    this.sparkCanvas = sparkCanvas;
    this.sparkCtx = sparkCanvas.getContext('2d');
    sparkWrap.appendChild(sparkCanvas);
    el.appendChild(sparkWrap);

    var blameBox = document.createElement('div');
    blameBox.className = 'mon-blame';
    var blameCmd = document.createElement('div');
    blameCmd.className = 'blame-cmd';
    blameCmd.textContent = this.cfg.blame.cmd;
    var blameTxt = document.createElement('div');
    blameTxt.className = 'blame-txt';
    blameTxt.textContent = sub(this.cfg.blame.text, this.world, this.cfg);
    blameBox.appendChild(blameCmd);
    blameBox.appendChild(blameTxt);
    this.blameBox = blameBox;
    el.appendChild(blameBox);
  };

  Dashboard.prototype._buildFinaleCard = function () {
    var self = this;
    var box = document.getElementById('finale-body');
    if (!box) return;
    box.textContent = '';

    this.cfg.finale.forEach(function (line) {
      var p = document.createElement('p');
      p.className = 'finale-line';
      p.textContent = sub(line, self.world, self.cfg);
      box.appendChild(p);
    });

    if (this.cfg.push && this.cfg.push[0]) {
      var pushBox = document.createElement('div');
      pushBox.className = 'push-status';
      var c1 = document.createElement('div');
      c1.className = 'push-cmd';
      c1.textContent = this.cfg.push[0].cmd;
      var c2 = document.createElement('div');
      c2.className = 'push-res';
      c2.textContent = sub(this.cfg.push[0].result, this.world, this.cfg);
      pushBox.appendChild(c1);
      pushBox.appendChild(c2);
      box.appendChild(pushBox);
    }

    this._updateHintText();
  };

  Dashboard.prototype._updateHintText = function () {
    if (!this.hintEl) return;
    var total = this.cfg.commits.length;
    this.hintEl.textContent =
      this.cfg.hint + ' (Đã mở ' + this.readCount + '/' + total + ')';
  };

  // Đồng bộ đóng/mở giữa Panel Lời kết và Card Lời chúc đom đóm để 2 panel không cạnh tranh
  Dashboard.prototype.setFinaleCollapsed = function (collapsed) {
    this.finaleCollapsed = !!collapsed;
    if (this.pushEl) {
      this.pushEl.classList.toggle('collapsed', this.finaleCollapsed);
    }
    if (this.btnToggleFinale) {
      this.btnToggleFinale.textContent = this.finaleCollapsed ? '▲ Mở tâm thư' : '▼ Thu gọn';
    }
  };

  Dashboard.prototype._bindEvents = function () {
    var self = this;

    // Nút bật/tắt âm thanh (xoá pulse CTA sau lần bấm đầu tiên)
    if (this.btnAudio) {
      this.btnAudio.addEventListener('click', function () {
        var on = self.sound.toggle();
        self.btnAudio.classList.remove('pulse-cta');
        self.btnAudio.textContent = on ? '🔊 Tiếng: BẬT' : '🔇 Tiếng: TẮT';
        self.btnAudio.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) self.sound.playChime(2, 0.14);
      });
    }

    // Nút chuyển chế độ Ngày / Đêm
    if (this.btnEnv) {
      this.btnEnv.addEventListener('click', function () {
        if (self.envOverride === 'staging') {
          self.envOverride = 'prod';
          self.btnEnv.textContent = '🌙 Cảnh: Đêm sao';
        } else {
          self.envOverride = 'staging';
          self.btnEnv.textContent = '☀️ Cảnh: Nắng ấm';
        }
      });
    }

    // P2: Nút chụp lưu ảnh thiệp PNG (canvas.toBlob)
    if (this.btnSnap) {
      this.btnSnap.addEventListener('click', function () {
        self.exportCardPNG();
      });
    }

    // Nút Skip ⏭ (hoặc Replay ↻ khi đã ở chặng cuối)
    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', function () {
        if (self.world.t >= 46) {
          self.envOverride = null;
          self.closeCommitModal();
          self.setFinaleCollapsed(false);
          self.timeline.seek(0);
        } else {
          self.skipToNextStage();
        }
      });
    }

    // Click lên gợi ý đom đóm -> mở lời chúc tiếp theo chưa đọc
    if (this.hintEl) {
      this.hintEl.addEventListener('click', function () {
        var nextIdx = (self.activeCommit + 1) % self.cfg.commits.length;
        for (var i = 0; i < self.cfg.commits.length; i++) {
          var cand = (self.activeCommit + 1 + i) % self.cfg.commits.length;
          if (!self.particles.fireflies[cand] || !self.particles.fireflies[cand].read) {
            nextIdx = cand;
            break;
          }
        }
        self.openCommitModal(nextIdx);
      });
    }

    // Thu gọn / mở rộng thẻ tâm thư (nếu mở tâm thư thì đóng card commit bên phải)
    if (this.btnToggleFinale) {
      this.btnToggleFinale.addEventListener('click', function () {
        var nextCollapsed = !self.finaleCollapsed;
        self.setFinaleCollapsed(nextCollapsed);
        if (!nextCollapsed) {
          self.closeCommitModal();
        }
      });
    }

    // Click & Hover trên canvas: bắt đom đóm lời chúc hoặc gieo thêm cây con trên mặt đất (P2)
    var canvas = document.getElementById('stage');
    if (canvas) {
      canvas.addEventListener('click', function (e) {
        var idx = self.particles.hitTestCommit(e.clientX, e.clientY);
        if (idx >= 0) {
          self.openCommitModal(idx);
          return;
        }
        // P2: Click vào mặt đất (y >= 80% chiều cao) khi mặt đất đã hiện -> gieo thêm cây con nở hoa
        var H = window.innerHeight || 720;
        if (self.world.ground > 0.8 && e.clientY >= H * 0.80) {
          self.tree.plantSprout(e.clientX, H);
          self.sound.playChime(5, 0.11);
        }
      });

      canvas.addEventListener('mousemove', function (e) {
        var idx = self.particles.hitTestCommit(e.clientX, e.clientY);
        self.particles.hoveredCommit = idx;
        var H = window.innerHeight || 720;
        var onGround = (self.world.ground > 0.8 && e.clientY >= H * 0.81);
        canvas.style.cursor = (idx >= 0 || onGround) ? 'pointer' : 'default';
      });
    }

    // Điều khiển nút trong Modal lời chúc
    var btnClose = document.getElementById('modal-close');
    var btnPrev  = document.getElementById('modal-prev');
    var btnNext  = document.getElementById('modal-next');
    if (btnClose) btnClose.addEventListener('click', function () {
      self.closeCommitModal();
    });
    if (btnPrev)  btnPrev.addEventListener('click', function () {
      var n = self.cfg.commits.length;
      self.openCommitModal((self.activeCommit - 1 + n) % n);
    });
    if (btnNext)  btnNext.addEventListener('click', function () {
      var n = self.cfg.commits.length;
      self.openCommitModal((self.activeCommit + 1) % n);
    });

    // Chip gợi ý lệnh terminal
    var chips = document.querySelectorAll('.cmd-chip');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          var cmd = chip.getAttribute('data-cmd');
          self.runCommand(cmd);
        });
      })(chips[i]);
    }

    if (this.cmdForm) {
      this.cmdForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var raw = self.cmdInput ? self.cmdInput.value : '';
        if (self.cmdInput) self.cmdInput.value = '';
        self.runCommand(raw);
      });
    }

    // P2: Bắt tổ hợp phím Konami Code (↑↑↓↓←→←→BA) để bắn pháo hoa Hoa Sen & Hoa Phượng
    if (window.addEventListener) {
      window.addEventListener('keydown', function (e) {
        var key = e.key;
        var expected = KONAMI[self.konamiIdx];
        if (key === expected || (key && key.toLowerCase() === expected)) {
          self.konamiIdx++;
          if (self.konamiIdx === KONAMI.length) {
            self.konamiIdx = 0;
            self.triggerFireworksShow();
          }
        } else {
          self.konamiIdx = (key === KONAMI[0]) ? 1 : 0;
        }
      });
    }
  };

  Dashboard.prototype.triggerFireworksShow = function () {
    this.particles.launchFireworks();
    this.sound.playChime(0, 0.16);
    this.sound.playChime(4, 0.15);
  };

  Dashboard.prototype.skipToNextStage = function () {
    var t = this.world.t;
    var stages = this.cfg.stages;
    var curIdx = 0;
    for (var i = stages.length - 1; i >= 0; i--) {
      if (t >= stages[i].start) { curIdx = i; break; }
    }
    var nextIdx = Math.min(curIdx + 1, stages.length - 1);
    this.envOverride = null;
    this.timeline.seek(stages[nextIdx].start + 0.05);
  };

  // Mở Card lời chúc đom đóm -> tự động thu gọn Panel Tâm thư bên trái để không cạnh tranh
  Dashboard.prototype.openCommitModal = function (idx) {
    var commits = this.cfg.commits;
    if (idx < 0 || idx >= commits.length) return;
    this.activeCommit = idx;

    var wasRead = this.particles.fireflies[idx] && this.particles.fireflies[idx].read;
    this.particles.markCommitRead(idx);
    if (!wasRead) {
      this.readCount++;
    }
    this.hasInteractedFirefly = true;
    if (this.hintEl) this.hintEl.classList.add('dimmed');
    this._updateHintText();

    // Tự động thu gọn Panel Tâm thư bên trái khi đang mở Card Lời chúc bên phải
    this.setFinaleCollapsed(true);

    this.sound.playChime(idx, 0.16);

    var item = commits[idx];
    var hash = ((this.world.seed ^ ((idx + 1) * 0x45d9f3b)) >>> 0).toString(16).slice(0, 7);

    document.getElementById('modal-hash').textContent =
      'Lời chúc #' + (idx + 1) + '/' + commits.length +
      ' • mã #' + hash +
      ' (Đã mở ' + this.readCount + '/' + commits.length + ')';
    document.getElementById('modal-msg').textContent = sub(item.msg, this.world, this.cfg);
    document.getElementById('modal-text').textContent = sub(item.text, this.world, this.cfg);

    this.modalEl.hidden = false;
  };

  Dashboard.prototype.closeCommitModal = function () {
    if (this.modalEl) this.modalEl.hidden = true;
  };

  // Xử lý lệnh Easter Egg trong terminal ở cảnh Push
  Dashboard.prototype.runCommand = function (rawCmd) {
    if (!this.cmdOut) return;
    var cmd = String(rawCmd || '').trim();
    var lower = cmd.toLowerCase();
    this.cmdOut.textContent = '';
    this.cmdOut.hidden = false;

    var self = this;
    function addLine(txt, cls) {
      var d = document.createElement('div');
      if (cls) d.className = cls;
      d.textContent = txt;
      self.cmdOut.appendChild(d);
    }

    addLine('$ ' + (cmd || 'help'), 'cmd-echo');

    if (!cmd || lower === 'help') {
      addLine('Các lệnh khám phá:', 'ok');
      addLine('  • git log         — Xem danh sách 11 lời chúc tri ân');
      addLine('  • sudo thank-you  — Mở khoá 4 lời nhắn ẩn gửi ' + this.cfg.teacher.title);
      addLine('  • pháo hoa        — Bắn pháo hoa Hoa Sen & Hoa Phượng (hoặc bấm Konami ↑↑↓↓←→←→BA)');
      addLine('  • git blame       — Người đứng sau sự trưởng thành của chúng em');
    } else if (lower === 'git log' || lower === 'git log --oneline') {
      this.cfg.commits.forEach(function (c, i) {
        var h = ((self.world.seed ^ ((i + 1) * 0x45d9f3b)) >>> 0).toString(16).slice(0, 7);
        addLine('#' + (i + 1) + ' [' + h + '] ' + sub(c.msg, self.world, self.cfg), 'fly');
      });
      addLine('→ Chạm vào đom đóm trên cây để đọc trọn vẹn từng lời chúc.', 'ok');
    } else if (lower === 'sudo thank-you' || lower === 'sudo thankyou') {
      addLine('[sudo] Xác thực lòng biết ơn: ******** → Đã mở khoá ✓', 'ok');
      this.cfg.hidden.forEach(function (h) {
        addLine('♥ ' + sub(h, self.world, self.cfg), 'fly');
      });
    } else if (lower === 'fireworks' || lower === 'phao hoa' || lower === 'pháo hoa' || lower === 'konami') {
      this.triggerFireworksShow();
      addLine('✦ Đang bắn pháo hoa Hoa Sen & Hoa Phượng chúc mừng ' + this.cfg.teacher.title + '!', 'fly');
    } else if (lower.indexOf('git blame') === 0) {
      addLine(sub(this.cfg.blame.text, this.world, this.cfg), 'ok');
    } else {
      addLine(sub(this.cfg.notFound, this.world, this.cfg), 'warn');
      var pick = this.cfg.commits[Math.floor(Math.random() * this.cfg.commits.length)];
      addLine('↳ ' + sub(pick.text, this.world, this.cfg), 'ok');
    }

    this.sound.playChime(4, 0.11);
  };

  // P2: Xuất ảnh thiệp PNG chất lượng cao bằng canvas.toBlob
  Dashboard.prototype.exportCardPNG = function () {
    var srcCanvas = document.getElementById('stage');
    if (!srcCanvas) return;

    var out = document.createElement('canvas');
    out.width = srcCanvas.width;
    out.height = srcCanvas.height;
    var octx = out.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Copy toàn bộ cảnh cây, đồi núi, sao, đom đóm
    octx.drawImage(srcCanvas, 0, 0);
    octx.save();
    octx.scale(dpr, dpr);

    var W = out.width / dpr;
    var H = out.height / dpr;

    // Vẽ khung đề tặng trang trọng ở góc trên bên trái của ảnh xuất
    octx.fillStyle = 'rgba(5, 16, 12, 0.82)';
    octx.strokeStyle = '#ffd166';
    octx.lineWidth = 1.5;
    var boxW = Math.min(W - 32, 460), boxH = 104;
    octx.fillRect(20, 20, boxW, boxH);
    octx.strokeRect(20, 20, boxW, boxH);

    octx.fillStyle = '#ffd166';
    octx.font = '700 17px "Be Vietnam Pro", sans-serif';
    octx.fillText('Kính tặng ' + this.cfg.teacher.title + ' ' + this.world.name, 34, 48);

    octx.fillStyle = '#e2faea';
    octx.font = '400 13px "Be Vietnam Pro", sans-serif';
    octx.fillText('“Các bạn cứ cố gắng thôi, có gì thầy sẽ hỗ trợ hết mình nhé!”', 34, 74);

    octx.fillStyle = '#4ee1c1';
    octx.font = '400 12px "JetBrains Mono", monospace';
    octx.fillText(this.cfg.author + ' • build #' + this.world.buildHash, 34, 100);
    octx.restore();

    function triggerDownload(url) {
      var a = document.createElement('a');
      a.href = url;
      a.download = 'Dear-Teacher-' + this.world.buildHash + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    var self = this;
    if (out.toBlob) {
      out.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        triggerDownload.call(self, url);
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      }, 'image/png');
    } else {
      triggerDownload.call(this, out.toDataURL('image/png'));
    }
  };

  Dashboard.prototype._drawSparkline = function (t) {
    var ctx = this.sparkCtx;
    if (!ctx) return;
    var W = this.sparkCanvas.width, H = this.sparkCanvas.height;
    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(46, 125, 79, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W, H * 0.5);
    ctx.stroke();

    ctx.strokeStyle = '#4ee1c1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    var steps = 48;
    for (var i = 0; i <= steps; i++) {
      var u = i / steps;
      var x = u * W;
      var wave = Math.sin(u * 10 - t * 3.2) * 0.22 + Math.cos(u * 23 - t * 5.0) * 0.12;
      var y = H * (0.42 + wave);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  Dashboard.prototype.render = function (t) {
    var w = this.world;

    if (this.envOverride === 'staging') w.timeOfDay = 0.92;
    else if (this.envOverride === 'prod') w.timeOfDay = 0.08;

    // 1. Cập nhật thanh tiến trình 6 chặng
    var stages = this.cfg.stages;
    var curIdx = 0;
    for (var i = stages.length - 1; i >= 0; i--) {
      if (t >= stages[i].start) { curIdx = i; break; }
    }
    for (var j = 0; j < this.stageBtns.length; j++) {
      var item = this.stageBtns[j];
      var state = j < curIdx ? 'done' : (j === curIdx ? 'active' : 'pending');
      item.btn.className = 'stage-step ' + state;
      item.icon.textContent = j < curIdx ? '[✓]' : (j === curIdx ? '[▶]' : '[ ]');
    }

    // Nút Skip tự động đổi thành Replay ↻ khi đã tới chặng cuối (t >= 46s)
    if (this.btnSkip) {
      var isEnd = (t >= 46);
      var wantText = isEnd ? 'Replay ↻' : 'Skip ⏭';
      if (this.btnSkip.textContent !== wantText) {
        this.btnSkip.textContent = wantText;
      }
    }

    // 2. Cảnh 5: Monitor Dashboard (38s .. 46s)
    var showMonitor = (t >= 38 && t < 46);
    if (this.monitorEl) {
      this.monitorEl.hidden = !showMonitor;
      if (showMonitor) {
        var fade = clamp01((t - 38) / 0.8) * (t > 45 ? clamp01(46 - t) : 1);
        this.monitorEl.style.opacity = fade.toFixed(3);
        var upProg = clamp01((t - 38.2) / 2.4);
        this.uptimeValEl.textContent = (upProg * 100).toFixed(upProg < 1 ? 1 : 0) + '%';
        this._drawSparkline(t);

        if (this.blameBox) {
          var blameAlpha = clamp01((t - 41.0) / 0.9);
          this.blameBox.style.opacity = blameAlpha.toFixed(3);
        }
      }
    }

    // 3. Cảnh 6: Push & Khám phá tự do (t >= 46s)
    var showPush = (t >= 46);
    if (this.pushEl) {
      this.pushEl.hidden = !showPush;
      if (showPush) {
        var pFade = clamp01((t - 46) / 1.0);
        this.pushEl.style.opacity = pFade.toFixed(3);
      }
    }
    if (this.cliDockEl) {
      this.cliDockEl.hidden = !showPush;
    }
    if (this.hintEl) {
      this.hintEl.hidden = (t < 44);
    }
  };

  G.Dashboard = Dashboard;
})(window.GP = window.GP || {});
