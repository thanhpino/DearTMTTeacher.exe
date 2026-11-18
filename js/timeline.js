/* Timeline: world = f(t). Skip/seek chỉ là đặt lại t. */
(function (G) {
  'use strict';

  var ease = {
    linear: function (x) { return x; },
    inOut: function (x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; },
    out: function (x) { return 1 - Math.pow(1 - x, 3); }
  };

  function setPath(obj, path, v) {
    var p = path.split('.'), o = obj;
    for (var i = 0; i < p.length - 1; i++) o = o[p[i]];
    o[p[p.length - 1]] = v;
  }

  // tween(path, from, to, t0, t1, easing)
  function tween(path, from, to, t0, t1, easing) {
    return { path: path, from: from, to: to, t0: t0, t1: t1, ease: ease[easing || 'inOut'] };
  }

  function Timeline(world, tracks) {
    this.world = world;
    this.tracks = tracks;
    this.duration = 46;
    this.playing = true;
  }

  // Áp mọi track theo t (idempotent, không phụ thuộc trạng thái trước)
  Timeline.prototype.apply = function (t) {
    var w = this.world;
    w.t = t;
    for (var i = 0; i < this.tracks.length; i++) {
      var k = this.tracks[i];
      var x = (t - k.t0) / (k.t1 - k.t0);
      x = x < 0 ? 0 : x > 1 ? 1 : x;
      setPath(w, k.path, k.from + (k.to - k.from) * k.ease(x));
    }
  };

  Timeline.prototype.seek = function (t) {
    this.apply(Math.max(0, t));
  };

  Timeline.prototype.update = function (dt) {
    if (this.playing) this.apply(this.world.t + dt);
  };

  G.Timeline = Timeline;
  G.tween = tween;
})(window.GP = window.GP || {});
