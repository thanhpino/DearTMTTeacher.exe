/* Web Audio API synthesizer: tiếng mưa, gió trầm, chuông gió ngũ cung (không dùng file mp3).
 * Mặc định tắt để tôn trọng autoplay policy; bật/tắt bằng nút 🔊.
 */
(function (G) {
  'use strict';

  // Thang ngũ cung ấm áp (Hz): C5, D5, E5, G5, A5, C6, D6, E6
  var PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];

  function SoundEngine(world) {
    this.world = world;
    this.ctx = null;
    this.masterGain = null;
    this.rainGain = null;
    this.windGain = null;
    this.nextChimeAt = 0;
  }

  SoundEngine.prototype._init = function () {
    if (this.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    var ctx = new AC();
    this.ctx = ctx;

    var master = ctx.createGain();
    master.gain.value = this.world.audio.enabled ? this.world.audio.master : 0;
    master.connect(ctx.destination);
    this.masterGain = master;

    // Tạo buffer white noise 2 giây dùng chung cho tiếng mưa & gió
    var bufLen = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    // Nhánh 1: Tiếng mưa (bandpass 1100Hz)
    var rainSrc = ctx.createBufferSource();
    rainSrc.buffer = buf;
    rainSrc.loop = true;
    var rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1100;
    rainFilter.Q.value = 0.7;
    var rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSrc.start(0);
    this.rainGain = rainGain;

    // Nhánh 2: Tiếng gió bão trầm (lowpass 220Hz)
    var windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    var windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 220;
    var windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start(0);
    this.windGain = windGain;
  };

  SoundEngine.prototype.toggle = function (forceState) {
    var next = (typeof forceState === 'boolean') ? forceState : !this.world.audio.enabled;
    this.world.audio.enabled = next;
    if (next) {
      this._init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        next ? this.world.audio.master : 0,
        this.ctx.currentTime,
        0.08
      );
    }
    return next;
  };

  // Gõ 1 tiếng chuông gió ngũ cung (dùng ở cảnh Deploy và khi mở lời chúc đom đóm)
  SoundEngine.prototype.playChime = function (noteIdx, vol) {
    if (!this.world.audio.enabled) return;
    this._init();
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    var now = this.ctx.currentTime;
    var idx = (typeof noteIdx === 'number')
      ? (noteIdx % PENTATONIC.length)
      : Math.floor(Math.random() * PENTATONIC.length);
    var freq = PENTATONIC[idx];

    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    var peak = (vol || 0.14);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.65);
  };

  SoundEngine.prototype.update = function () {
    if (!this.world.audio.enabled || !this.ctx) return;
    var w = this.world;
    var now = this.ctx.currentTime;

    // Điều chỉnh âm lượng mưa và gió theo World state
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(w.weather.rain * 0.22, now, 0.1);
    }
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime((w.weather.wind * 0.15 + w.weather.storm * 0.35), now, 0.1);
    }

    // Tự động điểm chuông gió dịu dàng ở cảnh Deploy (26..38s) và Push (46s+)
    if (w.bloom > 0.35 && w.weather.storm < 0.1 && now >= this.nextChimeAt) {
      var interval = (w.t >= 26 && w.t < 38) ? (0.7 + Math.random() * 0.9) : (2.2 + Math.random() * 2.5);
      this.nextChimeAt = now + interval;
      this.playChime(undefined, 0.09);
    }
  };

  G.SoundEngine = SoundEngine;
})(window.GP = window.GP || {});

