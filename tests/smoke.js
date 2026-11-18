global.window = global;
global.location = { search: '?to=' + encodeURIComponent('<b>x</b>'.repeat(30)) };
require('../config/gratitude.config.js');
require('../js/world.js');
require('../js/timeline.js');
require('../js/tree.js');
require('../js/particles.js');
require('../js/terminal.js');

var G = window.GP;
function mk() {
  return {
    children: [], style: {},
    set textContent(v) { this.children = []; this._t = v; },
    get textContent() { return this._t; },
    appendChild(c) { this.children.push(c); }
  };
}
global.document = { createElement: mk };

var w = G.World.create(G.CONFIG);
console.log('name len:', w.name.length, 'hash:', w.buildHash);

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

// Mock Canvas 2D context để test toàn bộ nhánh vẽ không văng lỗi
var noop = function () {};
var gradMock = { addColorStop: noop };
var mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'round',
  createLinearGradient: function () { return gradMock; },
  createRadialGradient: function () { return gradMock; },
  fillRect: noop, beginPath: noop, moveTo: noop, lineTo: noop,
  quadraticCurveTo: noop, closePath: noop, fill: noop, stroke: noop,
  arc: noop, ellipse: noop
};

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

// Test seek xuôi và ngược
[0, 7.5, 14, 21, 30, 44, 14, 0].forEach(function (t) {
  tl.seek(t);
  tree.render(mockCtx, 1280, 720);
  particles.render(mockCtx, 1280, 720);
  term.render(t);
  console.log(
    't=' + t + 's',
    'growth=' + w.tree.growth.toFixed(2),
    'roots=' + w.tree.roots.toFixed(2),
    'storm=' + w.weather.storm.toFixed(2),
    'bloom=' + w.bloom.toFixed(2),
    'tod=' + w.timeOfDay.toFixed(2)
  );
});

// Sau khi seek ngược về 14s rồi về 0s, growth ở t=0 phải bằng 0
if (w.tree.growth !== 0 || w.bloom !== 0) {
  throw new Error('Timeline seek backward not idempotent!');
}
// Kiểm tra hitTestCommit ở cảnh Push (t=48s)
tl.seek(48);
particles.render(mockCtx, 1280, 720);
var f0 = particles.fireflies[0];
var hit = particles.hitTestCommit(f0.x, f0.y);
if (hit !== 0) throw new Error('Expected hitTestCommit to hit firefly #0, got ' + hit);
particles.markCommitRead(0);
if (!particles.fireflies[0].read) throw new Error('markCommitRead failed');
console.log('ALL SMOKE CHECKS PASSED ✓');
