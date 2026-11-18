global.window = global;
global.location = { search: '?to=' + encodeURIComponent('<b>x</b>'.repeat(30)) };
require('../config/gratitude.config.js');
require('../js/world.js');
require('../js/timeline.js');
require('../js/terminal.js');
var G = window.GP;
function mk() { return { children: [], style: {}, set textContent(v) { this.children = []; this._t = v; }, get textContent() { return this._t; },
  appendChild(c) { this.children.push(c); } }; }
global.document = { createElement: mk };
var w = G.World.create(G.CONFIG);
console.log('name len', w.name.length, 'hash', w.buildHash);
var el = mk(), term = new G.Terminal(el, w);
[0, 1, 4, 6.5, 8, 12, 18, 25, 27].forEach(function (t) {
  term.render(t);
  console.log(t, 'op=' + el.style.opacity, el.style.visibility, el.children.map(function (c) { return c._t; }).join(' | ').slice(0, 90));
});
var w2 = G.World.create(G.CONFIG);
console.log('seeds differ across opens:', w.seed !== w2.seed || 'maybe same ms');

