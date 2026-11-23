// Solara Cay — procedural audio: three radio stations synthesized with WebAudio,
// plus simple sound effects. No audio files, everything is generated live.

export function createAudio() {
  let ctx = null;
  let master = null;
  let radioTimer = null;
  let currentStation = -1;
  let noteIndex = 0;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type = 'sine', vol = 0.5, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * 0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  const SCALES = [0, 2, 4, 7, 9, 12, 14, 16];

  function playRadioStep(station) {
    if (!ctx || currentStation < 0) return;
    const base = station.base;
    const step = SCALES[noteIndex % SCALES.length];
    const melody = base * Math.pow(2, step / 12);
    tone(melody, 0.32, currentStation === 2 ? 'triangle' : 'sawtooth', 0.24);
    if (noteIndex % 2 === 0) tone(base / 2, 0.4, 'square', 0.16);
    if (currentStation === 1 && noteIndex % 4 === 0) tone(90, 0.12, 'square', 0.4);
    noteIndex += 1;
  }

  function setStation(index, stations) {
    currentStation = index;
    if (radioTimer) { clearInterval(radioTimer); radioTimer = null; }
    if (index < 0) return;
    if (!ensure()) return;
    const station = stations[index];
    const intervalMs = Math.round(60000 / station.bpm / 2);
    noteIndex = 0;
    radioTimer = setInterval(() => playRadioStep(station), intervalMs);
    playRadioStep(station);
  }

  function beep(kind) {
    if (!ensure()) return;
    if (kind === 'pickup') { tone(880, 0.12, 'sine', 0.5); tone(1320, 0.18, 'sine', 0.5, 0.09); }
    else if (kind === 'cash') { tone(1046, 0.1, 'square', 0.3); tone(1568, 0.16, 'square', 0.3, 0.08); }
    else if (kind === 'siren') { tone(660, 0.16, 'square', 0.22); tone(880, 0.16, 'square', 0.22, 0.16); }
    else if (kind === 'shot') { tone(140, 0.09, 'sawtooth', 0.55); tone(70, 0.12, 'square', 0.4, 0.02); }
    else if (kind === 'hit') { tone(110, 0.2, 'sawtooth', 0.5); }
    else if (kind === 'level') { tone(523, 0.14, 'triangle', 0.5); tone(659, 0.14, 'triangle', 0.5, 0.12); tone(784, 0.22, 'triangle', 0.5, 0.24); }
    else { tone(440, 0.1, 'sine', 0.3); }
  }

  return { ensure, setStation, beep, get station() { return currentStation; } };
}
