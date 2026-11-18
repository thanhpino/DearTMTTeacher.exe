global.window = global;
global.location = { search: '?to=' + encodeURIComponent('<b>x</b>'.repeat(30)) };
require('../config/gratitude.config.js');
require('../js/world.js');
require('../js/timeline.js');
require('../js/tree.js');
require('../js/particles.js');
require('../js/terminal.js');
require('../js/audio.js');
require('../js/dashboard.js');

var G = window.GP;
var noop = function () {};
var gradMock = { addColorStop: noop };
var mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'round', font: '', textBaseline: 'middle',
  save: noop, restore: noop, translate: noop, rotate: noop, scale: noop,
  createLinearGradient: function () { return gradMock; },
  createRadialGradient: function () { return gradMock; },
  clearRect: noop, fillRect: noop, strokeRect: noop, beginPath: noop, moveTo: noop, lineTo: noop,
  quadraticCurveTo: noop, closePath: noop, fill: noop, stroke: noop,
  arc: noop, ellipse: noop, fillText: noop,
  measureText: function (s) { return { width: String(s).length * 7 }; },
  drawImage: noop
};

function mk(tag) {
  return {
    tagName: (tag || 'div').toUpperCase(),
    children: [], style: {}, hidden: false, className: '', value: '', width: 1280, height: 720,
    classList: { toggle: noop, add: noop, remove: noop },
    setAttribute: noop, getAttribute: function () { return 'git log'; },
    addEventListener: noop,
    getContext: function () { return mockCtx; },
    toDataURL: function () { return 'data:image/png;base64,AA=='; },
    set textContent(v) { this.children = []; this._t = String(v); },
    get textContent() {
      if (this.children.length) {
        return this.children.map(function (c) { return c.textContent; }).join(' ');
      }
      return this._t || '';
    },
    appendChild: function (c) { this.children.push(c); },
    removeChild: noop,
    click: noop
  };
}

var byId = {};
global.document = {
  body: mk('body'),
  createElement: mk,
  getElementById: function (id) {
    if (!byId[id]) byId[id] = mk('div');
    return byId[id];
  },
  querySelectorAll: function () { return [mk('button')]; }
};

var w = G.World.create(G.CONFIG);
console.log('name len:', w.name.length, 'hash:', w.buildHash);

// Kiểm tra 11 lời chúc thuần Việt 100% (không dùng feat:/docs:/chore:)
G.CONFIG.commits.forEach(function (c, idx) {
  if (/^(feat|fix|docs|chore|perf|hotfix|revert|release):/i.test(c.msg)) {
    throw new Error('Commit #' + idx + ' still contains English prefix: ' + c.msg);
  }
});

var tree = new G.Tree(w);
console.log(
  'tree stats -> branches:', tree.branches.length,
  'roots:', tree.roots.length,
  'leaves:', tree.leaves.length,
  'flowers:', tree.flowers.length
);
if (tree.branches.length > 2500) throw new Error('Branch budget exceeded');
if (tree.leaves.length + tree.flowers.length > 800) throw new Error('Foliage budget exceeded');

var particles = new G.Particles(w, tree, G.CONFIG);
var totalParticles = particles.rain.length + particles.petals.length + particles.fireflies.length;
console.log('particles pool -> total:', totalParticles, 'commit fireflies:', particles.commitCount);
if (totalParticles > 300) throw new Error('Particle budget exceeded');

var tween = G.tween;
var tracks = [
  tween('ground', 0, 1, 5.8, 8.0, 'inOut'),
  tween('seedDrop', 0, 1, 6.6, 9.2, 'out'),
  tween('tree.roots', 0, 1, 10.0, 15.6, 'out'),
  tween('tree.growth', 0, 0.38, 10.2, 16.0, 'out'),
  tween('timeOfDay', 0.45, 0.12, 16.0, 18.5, 'inOut'),
  tween('weather.rain', 0, 1, 16.2, 18.5, 'inOut'),
  tween('weather.storm', 0, 1, 16.5, 19.0, 'inOut'),
  tween('tree.growth', 0.38, 0.56, 16.0, 25.0, 'inOut'),
  tween('weather.rain', 1, 0, 24.2, 26.2, 'inOut'),
  tween('weather.storm', 1, 0, 24.2, 26.2, 'inOut'),
  tween('timeOfDay', 0.12, 0.95, 25.8, 29.5, 'out'),
  tween('tree.growth', 0.56, 1.0, 26.0, 32.0, 'out'),
  tween('bloom', 0, 1.0, 26.4, 31.5, 'out'),
  tween('timeOfDay', 0.95, 0.08, 38.0, 46.0, 'inOut')
];
var tl = new G.Timeline(w, tracks);
var el = mk(), term = new G.Terminal(el, w);
var sound = new G.SoundEngine(w);
var dash = new G.Dashboard(w, tl, tree, particles, sound, G.CONFIG);

[0, 7.5, 14, 21, 30, 42, 48, 14, 0].forEach(function (t) {
  tl.seek(t);
  dash.render(t);
  tree.render(mockCtx, 1280, 720);
  particles.render(mockCtx, 1280, 720);
  term.render(t);
});

if (w.tree.growth !== 0 || w.bloom !== 0) {
  throw new Error('Timeline seek backward not idempotent!');
}

// Kiểm tra ở cảnh Push (t=48s): nút Skip đổi thành Replay ↻
tl.seek(48);
dash.render(48);
if (byId['btn-skip'].textContent.indexOf('Replay') === -1) {
  throw new Error('Skip button did not switch to Replay at Push stage');
}

// Kiểm tra hover tooltip & hitTestCommit + mở modal lời chúc -> tự thu gọn Panel Tâm thư
particles.hoveredCommit = 0;
particles.render(mockCtx, 1280, 720);
var f0 = particles.fireflies[0];
var hit = particles.hitTestCommit(f0.x, f0.y);
if (hit !== 0) throw new Error('Expected hitTestCommit to hit firefly #0, got ' + hit);

dash.openCommitModal(8);
console.log('modal header:', byId['modal-hash'].textContent);
console.log('modal msg:', byId['modal-msg'].textContent);
if (!dash.finaleCollapsed) {
  throw new Error('Expected push-panel to auto-collapse when commit modal opens');
}

// Kiểm tra P2: Gieo thêm cây con + Bắn pháo hoa Hoa Sen / Hoa Phượng + Lưu ảnh PNG
tree.plantSprout(360, 720);
dash.runCommand('pháo hoa');
if (particles.fireworks.length === 0) throw new Error('Fireworks did not launch');
tl.seek(49.2);
tree.render(mockCtx, 1280, 720);
particles.render(mockCtx, 1280, 720);
dash.exportCardPNG();

dash.runCommand('sudo thank-you');
if (byId['cmd-output'].children.length < 5) throw new Error('sudo thank-you failed');

dash.runCommand('unknown-cmd');
if (byId['cmd-output'].textContent.indexOf('404:') === -1) {
  throw new Error('404 Easter egg not triggered');
}

console.log('ALL P0 + P1 + P2 SMOKE CHECKS PASSED ✓');
