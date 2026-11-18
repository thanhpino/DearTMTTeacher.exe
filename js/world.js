/* World state: nguồn sự thật duy nhất. Scene chỉ tween các tham số này. */
(function (G) {
  'use strict';

  // mulberry32: PRNG có seed
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Tên từ ?to= : textContent only, giới hạn độ dài, try/catch
  function readName(cfg) {
    var name = cfg.teacher.defaultName;
    try {
      var raw = new URLSearchParams(location.search).get('to');
      if (raw && raw.trim()) name = raw.trim().slice(0, cfg.teacher.maxNameLength);
    } catch (e) { /* giữ mặc định */ }
    return name;
  }

  function createWorld(cfg) {
    var name = readName(cfg);
    var seed = hashString(name + Date.now());
    return {
      name: name,
      seed: seed,
      buildHash: seed.toString(16).slice(0, 6).padStart(6, '0'),
      rand: mulberry32(seed),
      t: 0,
      tree: { growth: 0 },
      weather: { rain: 0, storm: 0, wind: 0.2, lightning: 0 },
      timeOfDay: 0.5,
      bloom: 0,
      ground: 0,
      audio: { enabled: false, master: 0.6 },
      quality: 1
    };
  }

  G.World = { create: createWorld, mulberry32: mulberry32, hashString: hashString };
})(window.GP = window.GP || {});

