// Solara Cay — HUD: DOM panels, mission tracker, dispatch panel, round minimap.
// The HUD is plain DOM over the WebGL canvas; the minimap is a 2D canvas redrawn each frame.

import { DISTRICTS, POLICE_UNITS, rankFor } from './data.js';

export function createHud(root) {
  root.innerHTML = `
  <div id="hud" class="hidden">
    <div id="topbar">
      <div id="cashBox">$<span id="cash">0</span></div>
      <div id="stars" aria-label="Wanted level"></div>
      <div id="districtBox"><div id="districtName">Old Town Solara</div><div id="districtRep">Standing 0</div></div>
    </div>
    <div id="rankBox"><div id="rankTitle">Beach Runner</div><div id="rpBar"><div id="rpFill"></div></div><div id="rpText">RP 0</div></div>
    <div id="missionBox">
      <div id="missionTitle">Free Roam</div>
      <div id="missionGiver"></div>
      <ol id="missionStages"></ol>
      <div id="missionHint">Walk to a gold marker and press M to start a mission.</div>
    </div>
    <div id="dispatchBox">
      <div class="dispatchHead">SCPD DISPATCH</div>
      <div id="dispatchList"><div class="unit dim">No active units</div></div>
    </div>
    <div id="crewBox"></div>
    <div id="weaponBox"><div id="weaponName">Fists</div><div id="weaponSlots"></div></div>
    <div id="radioBox">Radio: Off — press R</div>
    <div id="activityBox"></div>
    <canvas id="minimap" width="190" height="190"></canvas>
    <div id="speedBox"></div>
    <div id="toast"></div>
    <div id="centerMsg"></div>
    <div id="healthBar"><div id="healthFill"></div></div>
  </div>
  <div id="menu">
    <h1>SOLARA CAY</h1>
    <p class="tag">One island. Nine districts. Every debt comes due at sunrise.</p>
    <p class="story">You are <b>Nico Ferran</b>, a wheelman back on Solara Cay after six years away.
    Your old crew — Marisol, Dex and Pip — still runs the island's quiet jobs. The Solara Cay Police
    Department keeps the loud ones. Work the six-job story, lift cars for the Port Brisa chop-shop,
    win the Neon Strip street race, and find the twelve brass conches hidden around the cay.</p>
    <div class="controls">
      <span><b>WASD</b> move / drive</span><span><b>Mouse drag</b> camera</span><span><b>E</b> enter / exit car</span>
      <span><b>Click / F</b> use weapon</span><span><b>1–5</b> weapons</span><span><b>Z X C</b> crew abilities</span>
      <span><b>M</b> start mission at marker</span><span><b>R</b> radio</span><span><b>T</b> street race</span>
      <span><b>G</b> chop-shop job</span><span><b>Shift</b> sprint / boost</span><span><b>P</b> pause</span><span><b>V</b> save</span>
    </div>
    <button id="startBtn">Start — New Game</button>
    <button id="continueBtn">Continue — Load Save</button>
    <p class="fine">Progress saves to this browser (localStorage). Press V in game to save at any time.</p>
  </div>
  <div id="pauseMenu" class="hidden">
    <h2>Paused</h2>
    <button id="resumeBtn">Resume</button>
    <button id="saveBtn">Save Game</button>
    <button id="quitBtn">Back to Title</button>
  </div>
  <div id="gradeFx"></div>`;

  const el = (id) => root.querySelector('#' + id);
  const minimap = el('minimap');
  const mm = minimap.getContext('2d');
  let toastTimer = 0;

  function toast(text, ms = 3200) {
    const t = el('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  function center(text, ms = 2600) {
    const c = el('centerMsg');
    c.textContent = text;
    c.classList.add('show');
    setTimeout(() => c.classList.remove('show'), ms);
  }

  function update(state) {
    el('cash').textContent = String(state.cash);
    el('stars').textContent = state.wanted > 0 ? '★'.repeat(state.wanted) + '☆'.repeat(5 - state.wanted) : '';
    el('districtName').textContent = state.district.name;
    el('districtRep').textContent = 'Standing ' + (state.rep[state.district.id] || 0);
    const { current, next } = rankFor(state.rp);
    el('rankTitle').textContent = current.title;
    el('rpText').textContent = 'RP ' + state.rp + (next ? ' / ' + next.rp : ' MAX');
    const span = next ? next.rp - current.rp : 1;
    const done = next ? state.rp - current.rp : 1;
    el('rpFill').style.width = Math.min(100, Math.max(0, (done / span) * 100)) + '%';
    el('healthFill').style.width = Math.max(0, state.health) + '%';

    // Mission tracker with staged checklist.
    if (state.mission) {
      const m = state.mission.def;
      el('missionTitle').textContent = m.title;
      el('missionGiver').textContent = 'For ' + m.giver;
      el('missionStages').innerHTML = m.stages.map((s, i) => {
        const cls = i < state.mission.stage ? 'done' : i === state.mission.stage ? 'active' : 'todo';
        const mark = i < state.mission.stage ? '✓ ' : i === state.mission.stage ? '▸ ' : '· ';
        return `<li class="${cls}">${mark}${s.text}</li>`;
      }).join('');
      el('missionHint').textContent = state.mission.stage < m.stages.length
        ? 'Objective distance: ' + Math.round(state.objectiveDistance) + ' m'
        : 'Wrapping up…';
    } else {
      el('missionTitle').textContent = 'Free Roam — Story ' + state.missionsDone + ' / 6';
      el('missionGiver').textContent = state.missionsDone >= 6 ? 'Story complete. The cay is yours.' : 'Next job waits at a gold marker.';
      el('missionStages').innerHTML = '';
      el('missionHint').textContent = 'Press M at a gold marker · T race · G chop-shop · find 12 conches (' + state.packages + '/12)';
    }

    // Dispatch panel: named units, role and live distance.
    const list = el('dispatchList');
    if (state.wanted <= 0) {
      list.innerHTML = '<div class="unit dim">No active units — all quiet</div>';
    } else {
      list.innerHTML = POLICE_UNITS.filter((u) => u.minStars <= state.wanted).map((u) => {
        const d = state.unitDistances[u.id];
        const dist = d === undefined ? 'en route' : Math.round(d) + ' m';
        return `<div class="unit"><b>${u.name}</b><span>${u.role}</span><em>${dist}</em></div>`;
      }).join('') + (state.wanted >= 4 ? '<div class="unit warn">ROADBLOCKS ACTIVE</div>' : '');
    }

    // Crew ability chips with cooldown sweep.
    el('crewBox').innerHTML = state.crew.map((c) => {
      const left = Math.max(0, c.readyAt - state.time);
      const label = left > 0 ? Math.ceil(left) + 's' : c.def.key + ' READY';
      return `<div class="crew ${left > 0 ? 'cooling' : 'ready'}"><b>${c.def.name}</b><span>${c.def.ability}</span><em>${label}</em></div>`;
    }).join('');

    el('weaponName').textContent = state.weapons[state.weaponIndex].name;
    el('weaponSlots').innerHTML = state.weapons.map((w, i) =>
      `<span class="slot ${i === state.weaponIndex ? 'sel' : ''}">${i + 1} ${w.name}</span>`).join('');
    el('radioBox').textContent = state.radioIndex < 0 ? 'Radio: Off — press R' :
      '♪ ' + state.radio.name + ' — ' + state.radio.style;
    el('speedBox').textContent = state.driving ? Math.round(Math.abs(state.carSpeed) * 3.6) + ' km/h' : '';

    const act = [];
    if (state.race.active) act.push('RACE: checkpoint ' + (state.race.next + 1) + '/' + state.race.total + ' · ' + state.race.time.toFixed(1) + 's');
    if (state.chop.active) act.push(state.chop.phase === 'steal' ? 'CHOP-SHOP: steal the marked ' + state.chop.carName : 'CHOP-SHOP: deliver it to Port Brisa');
    if (state.turbo > 0) act.push('TURBO SURGE ' + state.turbo.toFixed(0) + 's');
    if (state.ghost > 0) act.push('GHOST STEP ' + state.ghost.toFixed(0) + 's');
    if (state.jam > 0) act.push('SIGNAL JAM ' + state.jam.toFixed(0) + 's');
    el('activityBox').innerHTML = act.join('<br>');
  }

  function drawMinimap(state) {
    const S = 190; const half = S / 2; const scale = S / 560;
    mm.clearRect(0, 0, S, S);
    mm.save();
    mm.beginPath(); mm.arc(half, half, half - 2, 0, Math.PI * 2); mm.clip();
    mm.fillStyle = '#1b7f9e'; mm.fillRect(0, 0, S, S);
    mm.fillStyle = '#69a85f'; mm.fillRect(half - 270 * scale, half - 270 * scale, 540 * scale, 540 * scale);
    mm.strokeStyle = '#3c4148'; mm.lineWidth = 5;
    for (const v of [-180, -90, 0, 90, 180]) {
      mm.beginPath(); mm.moveTo(half + v * scale, 0); mm.lineTo(half + v * scale, S); mm.stroke();
      mm.beginPath(); mm.moveTo(0, half + v * scale); mm.lineTo(S, half + v * scale); mm.stroke();
    }
    for (const d of DISTRICTS) {
      mm.fillStyle = '#' + d.color.toString(16).padStart(6, '0');
      mm.beginPath(); mm.arc(half + d.cx * scale, half + d.cz * scale, 4, 0, Math.PI * 2); mm.fill();
    }
    mm.fillStyle = '#ffc93c';
    for (const p of state.packageDots) {
      mm.beginPath(); mm.arc(half + p[0] * scale, half + p[1] * scale, 2.4, 0, Math.PI * 2); mm.fill();
    }
    if (state.objective) {
      mm.fillStyle = '#ffd166';
      mm.beginPath(); mm.arc(half + state.objective[0] * scale, half + state.objective[1] * scale, 5, 0, Math.PI * 2); mm.fill();
    }
    mm.fillStyle = '#2b6cb0';
    for (const c of state.copDots) {
      mm.fillRect(half + c[0] * scale - 2, half + c[1] * scale - 2, 4, 4);
    }
    // Player arrow at centre-ish (world-anchored, player position plotted).
    const px = half + state.playerPos.x * scale;
    const pz = half + state.playerPos.z * scale;
    mm.fillStyle = '#ffffff';
    mm.save();
    mm.translate(px, pz);
    mm.rotate(-state.playerAngle);
    mm.beginPath(); mm.moveTo(0, -7); mm.lineTo(5, 6); mm.lineTo(-5, 6); mm.closePath(); mm.fill();
    mm.restore();
    mm.restore();
    mm.strokeStyle = 'rgba(255,255,255,.75)'; mm.lineWidth = 3;
    mm.beginPath(); mm.arc(half, half, half - 2, 0, Math.PI * 2); mm.stroke();
  }

  return {
    update, drawMinimap, toast, center,
    showHud(v) { el('hud').classList.toggle('hidden', !v); },
    showMenu(v) { el('menu').classList.toggle('hidden', !v); },
    showPause(v) { el('pauseMenu').classList.toggle('hidden', !v); },
    on(id, fn) { el(id).addEventListener('click', fn); },
  };
}
