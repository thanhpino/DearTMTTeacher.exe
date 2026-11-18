/* Dashboard & UI Controller:
 * - Thanh tiến trình Pipeline 6 chặng click được + nút Skip
 * - Nút Âm thanh (🔊) + nút Staging/Production (Ngày/Đêm)
 * - Cảnh 5 (Monitor 38..46s): Grafana metrics count-up, sparkline canvas, git blame
 * - Cảnh 6 (Push 46s+): Gợi ý đom đóm, Popup đọc lời chúc commit, Lời kết + git push,
 *   và Terminal tương tác (git log, sudo thank-you, help, 404 Easter egg).
 */
(function (G) {
  'use strict';

  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function sub(s, world, cfg) {
    return String(s)
      .replace(/\{name\}/g, world.name)
      .replace(/\{title\}/g, cfg.teacher.title);
  }

  function Dashboard(world, timeline, particles, sound, cfg) {
    this.world = world;
    this.timeline = timeline;
    this.particles = particles;
    this.sound = sound;
    this.cfg = cfg;

    this.activeCommit = -1;
    this.readCount = 0;
    this.envOverride = null; // null = theo timeline, 'staging' = ngày, 'prod' = đêm
    this.lastStageId = '';
    this.finaleCollapsed = false;

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
    this.hintEl     = document.getElementById('firefly-hint');
    this.modalEl    = document.getElementById('commit-modal');
    this.btnAudio   = document.getElementById('btn-audio');
    this.btnEnv     = document.getElementById('btn-env');
    this.btnSkip    = document.getElementById('btn-skip');
    this.cmdOut     = document.getElementById('cmd-output');
    this.cmdInput   = document.getElementById('cmd-input');
    this.cmdForm    = document.getElementById('cmd-form');
  };

  // Xây thanh tiến trình 6 chặng: [✓] Plant -> [▶] Build -> ...
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

  // Xây khung Grafana Dashboard cho cảnh 5 (Monitor)
  Dashboard.prototype._buildMonitorCard = function () {
    var el = this.monitorEl;
    el.textContent = '';

    var header = document.createElement('div');
    header.className = 'mon-header';
    header.textContent = '● GRAFANA // GRATITUDE OBSERVABILITY';
    el.appendChild(header);

    var grid = document.createElement('div');
    grid.className = 'mon-grid';

    // Metric 1: Uptime count-up
    var m1 = document.createElement('div');
    m1.className = 'mon-metric';
    var m1Lbl = document.createElement('div');
    m1Lbl.className = 'mon-label';
    m1Lbl.textContent = 'Gratitude uptime';
    var m1Val = document.createElement('div');
    m1Val.className = 'mon-value ok';
    m1Val.textContent = '100%';
    this.uptimeValEl = m1Val;
    m1.appendChild(m1Lbl);
    m1.appendChild(m1Val);

    // Metric 2: Số bug đời Thầy fix giùm
    var m2 = document.createElement('div');
    m2.className = 'mon-metric';
    var m2Lbl = document.createElement('div');
    m2Lbl.className = 'mon-label';
    m2Lbl.textContent = sub('Bug đời em đã được {title} fix giùm', this.world, this.cfg);
    var m2Val = document.createElement('div');
    m2Val.className = 'mon-value fly';
    m2Val.textContent = '∞';
    m2.appendChild(m2Lbl);
    m2.appendChild(m2Val);

    // Metric 3: Incidents
    var m3 = document.createElement('div');
    m3.className = 'mon-metric';
    var m3Lbl = document.createElement('div');
    m3Lbl.className = 'mon-label';
    m3Lbl.textContent = 'Incidents';
    var m3Val = document.createElement('div');
    m3Val.className = 'mon-value ok';
    m3Val.textContent = '0';
    m3.appendChild(m3Lbl);
    m3.appendChild(m3Val);

    grid.appendChild(m1);
    grid.appendChild(m2);
    grid.appendChild(m3);
    el.appendChild(grid);

    // Sparkline canvas
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

    // Khung git blame
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

  // Xây khung Lời chúc cuối & git push ở cảnh 6
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
      this.cfg.hint + ' (' + this.readCount + '/' + total + ' commits) — hoặc bấm vào đây để mở';
  };

  Dashboard.prototype._bindEvents = function () {
    var self = this;

    // Nút bật/tắt âm thanh
    if (this.btnAudio) {
      this.btnAudio.addEventListener('click', function () {
        var on = self.sound.toggle();
        self.btnAudio.textContent = on ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        self.btnAudio.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) self.sound.playChime(2, 0.14);
      });
    }

    // Nút chuyển chế độ Staging (Ban ngày) / Production (Ban đêm)
    if (this.btnEnv) {
      this.btnEnv.addEventListener('click', function () {
        if (self.envOverride === 'staging') {
          self.envOverride = 'prod';
          self.btnEnv.textContent = '🌙 Env: Production';
        } else {
          self.envOverride = 'staging';
          self.btnEnv.textContent = '☀️ Env: Staging';
        }
      });
    }

    // Nút Skip sang chặng kế tiếp
    if (this.btnSkip) {
      this.btnSkip.addEventListener('click', function () {
        self.skipToNextStage();
      });
    }

    // Click lên gợi ý đom đóm -> mở commit tiếp theo chưa đọc
    if (this.hintEl) {
      this.hintEl.addEventListener('click', function () {
        var nextIdx = (self.activeCommit + 1) % self.cfg.commits.length;
        self.openCommitModal(nextIdx);
      });
    }

    // Thu gọn / mở rộng thẻ lời kết để ngắm cây
    var btnToggleFinale = document.getElementById('btn-toggle-finale');
    if (btnToggleFinale) {
      btnToggleFinale.addEventListener('click', function () {
        self.finaleCollapsed = !self.finaleCollapsed;
        self.pushEl.classList.toggle('collapsed', self.finaleCollapsed);
        btnToggleFinale.textContent = self.finaleCollapsed ? '▲ Mở lời chúc' : '▼ Thu gọn';
      });
    }

    // Click trên canvas để bắt đom đóm commit
    var canvas = document.getElementById('stage');
    if (canvas) {
      canvas.addEventListener('click', function (e) {
        var idx = self.particles.hitTestCommit(e.clientX, e.clientY);
        if (idx >= 0) {
          self.openCommitModal(idx);
        }
      });

      canvas.addEventListener('mousemove', function (e) {
        var idx = self.particles.hitTestCommit(e.clientX, e.clientY);
        canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
      });
    }

    // Điều khiển nút trong Modal commit
    var btnClose = document.getElementById('modal-close');
    var btnPrev  = document.getElementById('modal-prev');
    var btnNext  = document.getElementById('modal-next');
    if (btnClose) btnClose.addEventListener('click', function () { self.closeCommitModal(); });
    if (btnPrev)  btnPrev.addEventListener('click', function () {
      var n = self.cfg.commits.length;
      self.openCommitModal((self.activeCommit - 1 + n) % n);
    });
    if (btnNext)  btnNext.addEventListener('click', function () {
      var n = self.cfg.commits.length;
      self.openCommitModal((self.activeCommit + 1) % n);
    });

    // Chip gợi ý lệnh terminal (git log, sudo thank-you, help)
    var chips = document.querySelectorAll('.cmd-chip');
    for (var i = 0; i < chips.length; i++) {
      (function (chip) {
        chip.addEventListener('click', function () {
          var cmd = chip.getAttribute('data-cmd');
          self.runCommand(cmd);
        });
      })(chips[i]);
    }

    // Form nhập lệnh trực tiếp
    if (this.cmdForm) {
      this.cmdForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var raw = self.cmdInput ? self.cmdInput.value : '';
        if (self.cmdInput) self.cmdInput.value = '';
        self.runCommand(raw);
      });
    }
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

  // Mở popup hiển thị nội dung commit thứ idx
  Dashboard.prototype.openCommitModal = function (idx) {
    var commits = this.cfg.commits;
    if (idx < 0 || idx >= commits.length) return;
    this.activeCommit = idx;

    var wasRead = this.particles.fireflies[idx] && this.particles.fireflies[idx].read;
    this.particles.markCommitRead(idx);
    if (!wasRead) {
      this.readCount++;
      this._updateHintText();
    }

    this.sound.playChime(idx, 0.16);

    var item = commits[idx];
    var hash = ((this.world.seed ^ ((idx + 1) * 0x45d9f3b)) >>> 0).toString(16).slice(0, 7);

    document.getElementById('modal-hash').textContent =
      'commit #' + hash + ' (' + (idx + 1) + '/' + commits.length + ')';
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
      addLine('Các lệnh hỗ trợ:', 'ok');
      addLine('  • git log         — Xem lịch sử 11 commit tri ân');
      addLine('  • sudo thank-you  — Mở khoá 4 lời nhắn ẩn gửi ' + this.cfg.teacher.title);
      addLine('  • git blame       — Ai đứng sau sự trưởng thành của chúng em?');
    } else if (lower === 'git log' || lower === 'git log --oneline') {
      this.cfg.commits.forEach(function (c, i) {
        var h = ((self.world.seed ^ ((i + 1) * 0x45d9f3b)) >>> 0).toString(16).slice(0, 7);
        addLine(h + ' ' + sub(c.msg, self.world, self.cfg), 'fly');
      });
      addLine('→ Chạm vào đom đóm trên cây để đọc chi tiết từng commit.', 'ok');
    } else if (lower === 'sudo thank-you' || lower === 'sudo thankyou') {
      addLine('[sudo] password for student: ******** → Access granted ✓', 'ok');
      this.cfg.hidden.forEach(function (h) {
        addLine('♥ ' + sub(h, self.world, self.cfg), 'fly');
      });
    } else if (lower.indexOf('git blame') === 0) {
      addLine(sub(this.cfg.blame.text, this.world, this.cfg), 'ok');
    } else {
      // Lệnh sai bất kỳ -> Easter egg 404 Redirecting...
      addLine(this.cfg.notFound, 'warn');
      var pick = this.cfg.commits[Math.floor(Math.random() * this.cfg.commits.length)];
      addLine('↳ ' + sub(pick.text, this.world, this.cfg), 'ok');
    }

    this.sound.playChime(4, 0.11);
  };

  // Vẽ đường sparkline trên Grafana Dashboard
  Dashboard.prototype._drawSparkline = function (t) {
    var ctx = this.sparkCtx;
    if (!ctx) return;
    var W = this.sparkCanvas.width, H = this.sparkCanvas.height;
    ctx.clearRect(0, 0, W, H);

    // Lưới ngang mảnh
    ctx.strokeStyle = 'rgba(46, 125, 79, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.5);
    ctx.lineTo(W, H * 0.5);
    ctx.stroke();

    // Đường nhịp tim /パルス EduPulse & Gratitude
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

    // Nếu người dùng bấm nút Staging/Production thì giữ ánh sáng theo lựa chọn
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
    if (this.hintEl) {
      this.hintEl.hidden = (t < 44);
    }
  };

  G.Dashboard = Dashboard;
})(window.GP = window.GP || {});
