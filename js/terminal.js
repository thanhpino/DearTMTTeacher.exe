/* Terminal: nội dung là hàm của t (idempotent) nên Skip/seek luôn đúng. */
(function (G) {
  'use strict';
  var cfg = G.CONFIG;

  function sub(s, world) {
    return s.replace(/\{name\}/g, world.name).replace(/\{title\}/g, cfg.teacher.title);
  }

  // Dòng terminal dùng chung cho boot + log bão
  function Terminal(el, world) {
    this.el = el; this.world = world; this.lastKey = null;
    // tiền xử lý nội dung đã thay {name}/{title}
    this.boot = cfg.boot.map(function (l) {
      var text = sub(l.text, world);
      return { at: l.at, cps: l.cps, cls: l.cls, text: text, end: l.at + text.length / l.cps };
    });
    this.storm = cfg.stormLogs.map(function (l) {
      return { at: l.at, cls: l.cls, text: sub(l.text, world) };
    });
  }

  Terminal.prototype.render = function (t) {
    var el = this.el, parts = [], i, typing = false;

    // Phase 1: boot (gõ chữ theo t)
    for (i = 0; i < this.boot.length; i++) {
      var l = this.boot[i];
      if (t < l.at) break;
      var n = Math.min(l.text.length, Math.floor((t - l.at) * l.cps));
      parts.push({ cls: l.cls, text: l.text.slice(0, n) });
      if (n < l.text.length) { typing = true; break; }
    }

    // Phase 2: log bão (trong cảnh Test), thay thế nội dung boot
    var stormShown = [];
    if (t >= 16) {
      for (i = 0; i < this.storm.length; i++) if (t >= this.storm[i].at) stormShown.push(this.storm[i]);
      parts = [{ cls: 'ok', text: '$ npm test --storm' }].concat(stormShown);
    }

    // Độ mờ: fade ra sau boot, hiện lại cho log bão (khung bên trái, nhỏ hơn ở các bước sau)
    var op;
    if (t < cfg.terminalFadeStart) op = 1;
    else if (t < cfg.terminalFadeEnd) op = 1 - (t - cfg.terminalFadeStart) / (cfg.terminalFadeEnd - cfg.terminalFadeStart);
    else if (t >= 16 && t < 27) op = Math.min(1, (t - 16) / 1) * (t > 26 ? 27 - t : 1);
    else op = 0;

    var key = parts.length + '|' + (parts.length ? parts[parts.length - 1].text : '') + '|' + typing;
    if (key !== this.lastKey) {
      this.lastKey = key;
      el.textContent = '';
      parts.forEach(function (p, idx) {
        var s = document.createElement('div');
        if (p.cls) s.className = p.cls;
        s.textContent = p.text;
        if (typing && idx === parts.length - 1) s.className += ' caret';
        el.appendChild(s);
      });
    }
    el.style.opacity = op;
    el.style.visibility = op <= 0.01 ? 'hidden' : 'visible';
  };

  G.Terminal = Terminal;
})(window.GP = window.GP || {});
