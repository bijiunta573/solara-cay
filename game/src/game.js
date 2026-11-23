// Solara Cay — game state and simulation: missions, wanted/police, crew, weapons,
// street race, chop-shop deliveries, hidden packages, rank and district standing, save/load.

import {
  CHOP_SHOP, CREW, MISSIONS, PACKAGE_SPOTS, POLICE_UNITS, RADIO, RACE_CHECKPOINTS,
  WEAPONS, districtAt,
} from './data.js';
import {
  createPedestrian, createVehicle, makeHelicopter, makePackageMesh, makePerson,
  makeRoadblock, randomCarColor, syncVehicle,
} from './entities.js';
import { collide, makeMarker, seededRandom } from './world.js';

const SAVE_KEY = 'solara-cay-save-v1';

export function createGame(scene, colliders, audio, hud) {
  const rand = seededRandom(1234);
  const state = {
    time: 0, cash: 250, rp: 0, health: 100,
    wanted: 0, heat: 0, missionsDone: 0,
    mission: null, packages: 0,
    weaponIndex: 0, weapons: WEAPONS,
    radioIndex: -1, radio: null,
    crew: CREW.map((def) => ({ def, readyAt: 0 })),
    rep: {}, district: districtAt(0, 30),
    driving: false, carSpeed: 0, turbo: 0, ghost: 0, jam: 0,
    race: { active: false, next: 0, total: RACE_CHECKPOINTS.length, time: 0 },
    chop: { active: false, phase: 'steal', carName: '', vehicle: null },
    objective: null, objectiveDistance: 0,
    unitDistances: {}, packageDots: [], copDots: [],
    playerPos: { x: 0, z: 30 }, playerAngle: 0,
    started: false, paused: false, over: false,
  };

  // Player character.
  const playerMesh = makePerson(0xef476f, 0x14213d);
  playerMesh.position.set(0, 0, 30);
  scene.add(playerMesh);
  const player = { x: 0, z: 30, angle: 0, speed: 0, mesh: playerMesh, car: null, fireAt: 0 };

  // Parked and traffic vehicles.
  const vehicles = [];
  const carNames = ['Cay Coupe', 'Brisa Hatch', 'Farol Pickup', 'Sol Sedan', 'Marina Roadster'];
  const parkSpots = [[14, -90], [-16, 90], [90, 14], [-90, -14], [30, 180], [-40, -180], [180, -30], [-180, 60], [60, -40], [-120, 120]];
  parkSpots.forEach(([x, z], i) => {
    vehicles.push(createVehicle(scene, x, z, (i % 4) * Math.PI / 2, randomCarColor(rand),
      { parked: true, name: carNames[i % carNames.length] }));
  });
  const traffic = [];
  for (let i = 0; i < 10; i += 1) {
    const laneLine = [-180, -90, 0, 90, 180][i % 5];
    const vertical = i % 2 === 0;
    const v = createVehicle(scene, vertical ? laneLine + 4 : -240 + i * 48, vertical ? -240 + i * 48 : laneLine + 4,
      vertical ? 0 : Math.PI / 2, randomCarColor(rand), { traffic: true, name: carNames[i % carNames.length] });
    v.userDir = 1;
    v.vertical = vertical;
    v.laneLine = laneLine;
    traffic.push(v); vehicles.push(v);
  }

  // Pedestrians.
  const peds = [];
  for (let i = 0; i < 16; i += 1) {
    peds.push(createPedestrian(scene, (rand() - 0.5) * 420, (rand() - 0.5) * 420, rand));
  }

  // Hidden packages.
  const packages = PACKAGE_SPOTS.map(([x, z]) => {
    const mesh = makePackageMesh();
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    return { x, z, mesh, taken: false };
  });

  // Mission marker (gold beam) — sits at the next mission's first stage.
  const marker = makeMarker(0xffd166);
  scene.add(marker);
  const raceMarker = makeMarker(0x06d6a0);
  scene.add(raceMarker);

  // Police fleet, roadblocks, helicopter.
  const cops = POLICE_UNITS.slice(0, 4).map((u, i) => {
    const v = createVehicle(scene, -230 + i * 14, 230, 0, 0xffffff, { police: true, name: u.name });
    v.unit = u;
    v.active = false;
    v.mesh.visible = false;
    return v;
  });
  const roadblocks = [];
  for (let i = 0; i < 3; i += 1) {
    const rb = makeRoadblock();
    rb.visible = false;
    scene.add(rb);
    roadblocks.push(rb);
  }
  const heliMesh = makeHelicopter();
  heliMesh.visible = false;
  scene.add(heliMesh);
  const heli = { mesh: heliMesh, angle: 0 };

  let bustTimer = 0;
  let crimeCooldown = 0;

  function addWanted(stars) {
    if (state.ghost > 0) stars = Math.max(0, stars - 1);
    state.heat += stars * 34;
    const next = Math.min(5, Math.max(state.wanted, Math.floor(state.heat / 34)));
    if (next > state.wanted) {
      state.wanted = next;
      audio.beep('siren');
      hud.toast('Wanted level ' + state.wanted + ' — SCPD responding');
    }
  }

  function addCash(n) { state.cash += n; if (n > 0) audio.beep('cash'); }
  function addRp(n) {
    const before = state.rp;
    state.rp += n;
    const titles = [0, 300, 800, 1500, 2600, 4200];
    if (titles.some((t) => before < t && state.rp >= t)) {
      audio.beep('level');
      hud.center('RANK UP — RP ' + state.rp);
    }
  }
  function addRep(districtId, n) {
    state.rep[districtId] = (state.rep[districtId] || 0) + n;
  }

  function currentStage() {
    if (!state.mission) return null;
    return state.mission.def.stages[state.mission.stage] || null;
  }

  function startMission(index) {
    if (state.mission) { hud.toast('Finish the current job first.'); return; }
    if (index >= MISSIONS.length) { hud.toast('Story complete — free roam, race, or chop-shop.'); return; }
    const def = MISSIONS[index];
    state.mission = { def, stage: 0, index };
    hud.center(def.title + ' — ' + def.giver);
    hud.toast(def.intro, 5200);
  }

  function completeStage() {
    const m = state.mission;
    if (!m) return;
    m.stage += 1;
    audio.beep('pickup');
    if (m.stage >= m.def.stages.length) {
      addCash(m.def.reward.cash);
      addRp(m.def.reward.rp);
      addRep(state.district.id, 15);
      state.missionsDone = Math.max(state.missionsDone, m.index + 1);
      hud.center('JOB DONE — $' + m.def.reward.cash + ' · +' + m.def.reward.rp + ' RP');
      state.mission = null;
      save();
    } else {
      hud.toast('Stage cleared — next: ' + m.def.stages[m.stage].text);
    }
  }

  function startRace() {
    if (state.race.active) return;
    state.race = { active: true, next: 0, total: RACE_CHECKPOINTS.length, time: 0 };
    hud.center('STREET RACE — Neon Strip Circuit');
    hud.toast('Hit every green checkpoint. Best driving wins $1,200.');
  }

  function startChop() {
    if (state.chop.active) return;
    const target = vehicles.find((v) => v.parked && v !== player.car);
    if (!target) { hud.toast('No parked car available for the chop-shop.'); return; }
    state.chop = { active: true, phase: 'steal', carName: target.name, vehicle: target };
    hud.center('CHOP-SHOP JOB');
    hud.toast('Steal the marked ' + target.name + ' and deliver it to ' + CHOP_SHOP.name + '.');
  }

  function useCrew(i) {
    const c = state.crew[i];
    if (!c || state.time < c.readyAt) { hud.toast(c ? c.def.name + ' is still recharging.' : ''); return; }
    c.readyAt = state.time + c.def.cooldown;
    if (c.def.id === 'marisol') { state.turbo = 5; hud.toast('Marisol: TURBO SURGE'); }
    if (c.def.id === 'dex') { state.jam = 6; state.heat = Math.max(0, state.heat - 30); hud.toast('Dex: SIGNAL JAM — dispatch frozen'); }
    if (c.def.id === 'pip') { state.ghost = 7; hud.toast('Pip: GHOST STEP — stay unseen'); }
    audio.beep('level');
  }

  function fireWeapon() {
    const w = WEAPONS[state.weaponIndex];
    if (state.time < player.fireAt) return;
    player.fireAt = state.time + w.cooldown;
    audio.beep(w.id === 'fists' || w.id === 'bat' ? 'hit' : 'shot');
    addWanted(w.crime);
    // Nearest pedestrian or cop within range reacts / takes the hit.
    let best = null; let bestD = w.range;
    for (const p of peds) {
      const d = Math.hypot(p.x - playerPos().x, p.z - playerPos().z);
      if (d < bestD) { bestD = d; best = p; }
    }
    if (best) {
      best.flee = 6;
      if (bestD < w.range * 0.6) { best.x += (best.x - playerPos().x) * 0.2; best.z += (best.z - playerPos().z) * 0.2; }
      hud.toast('Hit landed with ' + w.name + ' (' + w.damage + ' dmg)');
    }
  }

  function playerPos() {
    return player.car ? { x: player.car.x, z: player.car.z } : { x: player.x, z: player.z };
  }

  function toggleCar() {
    if (player.car) {
      const c = player.car;
      player.x = c.x + 3.4; player.z = c.z;
      player.car = null;
      state.driving = false;
      playerMesh.visible = true;
      hud.toast('On foot');
      return;
    }
    let best = null; let bestD = 7;
    for (const v of vehicles) {
      const d = Math.hypot(v.x - player.x, v.z - player.z);
      if (d < bestD) { bestD = d; best = v; }
    }
    if (best) {
      player.car = best;
      best.parked = false; best.traffic = false;
      state.driving = true;
      playerMesh.visible = false;
      hud.toast('Driving ' + best.name + (best.police ? ' — stolen SCPD cruiser!' : ''));
      if (best.police) addWanted(2);
      if (state.chop.active && state.chop.phase === 'steal' && state.chop.vehicle === best) {
        state.chop.phase = 'deliver';
        hud.toast('Car lifted. Deliver it to the Port Brisa chop-shop.');
      }
    } else {
      hud.toast('No car in reach — walk to one and press E.');
    }
  }

  function objectivePoint() {
    const stage = currentStage();
    if (stage) {
      if (stage.kind === 'goto' || stage.kind === 'pickup') return stage.at;
      if (stage.kind === 'package') {
        const p = packages.find((k) => !k.taken);
        return p ? [p.x, p.z] : null;
      }
      return null; // escape stages have no point
    }
    if (state.chop.active) {
      return state.chop.phase === 'steal' && state.chop.vehicle
        ? [state.chop.vehicle.x, state.chop.vehicle.z] : CHOP_SHOP.at;
    }
    if (state.race.active) return RACE_CHECKPOINTS[state.race.next];
    if (state.missionsDone < MISSIONS.length) return MISSIONS[state.missionsDone].stages[0].at;
    return null;
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: state.cash, rp: state.rp, missionsDone: state.missionsDone,
        packages: state.packages, rep: state.rep,
        taken: packages.map((p) => p.taken),
        x: player.x, z: player.z,
      }));
      hud.toast('Saved to this browser.');
    } catch { hud.toast('Save unavailable in this browser.'); }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) { hud.toast('No save found — starting fresh.'); return false; }
      const s = JSON.parse(raw);
      state.cash = s.cash ?? state.cash;
      state.rp = s.rp ?? 0;
      state.missionsDone = s.missionsDone ?? 0;
      state.rep = s.rep || {};
      packages.forEach((p, i) => { if (s.taken && s.taken[i]) { p.taken = true; p.mesh.visible = false; } });
      state.packages = packages.filter((p) => p.taken).length;
      if (typeof s.x === 'number') { player.x = s.x; player.z = s.z; }
      hud.toast('Save loaded — welcome back to Solara Cay.');
      return true;
    } catch { return false; }
  }

  function update(dt, input) {
    if (!state.started || state.paused || state.over) return;
    state.time += dt;
    crimeCooldown = Math.max(0, crimeCooldown - dt);
    state.turbo = Math.max(0, state.turbo - dt);
    state.ghost = Math.max(0, state.ghost - dt);
    state.jam = Math.max(0, state.jam - dt);

    // --- Movement: driving or on foot ---
    const sprint = input.sprint ? 1.55 : 1;
    if (player.car) {
      const car = player.car;
      const accel = (state.turbo > 0 ? 34 : 22);
      if (input.forward) car.speed += accel * dt;
      else if (input.back) car.speed -= accel * 0.7 * dt;
      else car.speed *= Math.max(0, 1 - 1.6 * dt);
      const maxSpeed = state.turbo > 0 ? 46 : 33;
      car.speed = Math.max(-14, Math.min(maxSpeed, car.speed));
      if (input.left) car.angle += dt * 1.7 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8 + 0.2);
      if (input.right) car.angle -= dt * 1.7 * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 8 + 0.2);
      car.x += Math.sin(car.angle) * car.speed * dt;
      car.z += Math.cos(car.angle) * car.speed * dt;
      const p = { x: car.x, z: car.z };
      collide(p, colliders, 2.4);
      if (p.x !== car.x || p.z !== car.z) { if (Math.abs(car.speed) > 16) { addWanted(1); audio.beep('hit'); } car.speed *= 0.4; }
      car.x = p.x; car.z = p.z;
      syncVehicle(car);
      state.carSpeed = car.speed;
      if (Math.abs(car.speed) > 24 && crimeCooldown <= 0) { addWanted(1); crimeCooldown = 4; }
    } else {
      const spd = 9 * sprint;
      let mx = 0; let mz = 0;
      if (input.forward) mz -= 1;
      if (input.back) mz += 1;
      if (input.left) mx -= 1;
      if (input.right) mx += 1;
      if (mx !== 0 || mz !== 0) {
        const len = Math.hypot(mx, mz);
        const camA = input.camAngle;
        const sin = Math.sin(camA); const cos = Math.cos(camA);
        const wx = (mx * cos - mz * sin) / len;
        const wz = (mx * sin + mz * cos) / len;
        player.x += wx * spd * dt;
        player.z += wz * spd * dt;
        player.angle = Math.atan2(wx, wz);
      }
      const p = { x: player.x, z: player.z };
      collide(p, colliders, 1.1);
      player.x = p.x; player.z = p.z;
      playerMesh.position.set(player.x, Math.abs(Math.sin(state.time * 9)) * (mx || mz ? 0.14 : 0), player.z);
      playerMesh.rotation.y = player.angle;
      state.carSpeed = 0;
    }

    const pp = playerPos();
    state.playerPos = pp;
    state.playerAngle = player.car ? player.car.angle : player.angle;
    state.district = districtAt(pp.x, pp.z);

    // --- Traffic follows its avenue ---
    for (const v of traffic) {
      if (v === player.car || !v.traffic) continue;
      const spd = 11;
      if (v.vertical) { v.z += spd * dt * v.userDir; if (Math.abs(v.z) > 250) v.userDir *= -1; v.angle = v.userDir > 0 ? 0 : Math.PI; }
      else { v.x += spd * dt * v.userDir; if (Math.abs(v.x) > 250) v.userDir *= -1; v.angle = v.userDir > 0 ? Math.PI / 2 : -Math.PI / 2; }
      syncVehicle(v);
    }

    // --- Pedestrians wander, flee danger ---
    for (const p of peds) {
      if (p.flee > 0) {
        p.flee -= dt;
        p.x += Math.sin(p.angle) * 6 * dt; p.z += Math.cos(p.angle) * 6 * dt;
      } else {
        if (rand() < dt * 0.12) p.angle = rand() * Math.PI * 2;
        p.x += Math.sin(p.angle) * p.speed * dt;
        p.z += Math.cos(p.angle) * p.speed * dt;
      }
      if (Math.abs(p.x) > 255) p.x *= -0.95;
      if (Math.abs(p.z) > 255) p.z *= -0.95;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.angle;
    }

    // --- Wanted decay ---
    if (state.wanted > 0) {
      const anyCopNear = cops.some((c) => c.active && Math.hypot(c.x - pp.x, c.z - pp.z) < 55);
      if (!anyCopNear || state.ghost > 0) {
        state.heat -= dt * (state.ghost > 0 ? 7 : 2.6);
        if (state.heat <= 0) { state.heat = 0; state.wanted = 0; hud.toast('Heat lost. All quiet.'); }
        else state.wanted = Math.max(1, Math.min(state.wanted, Math.ceil(state.heat / 34)));
      }
    }

    // --- Police response ---
    state.unitDistances = {};
    state.copDots = [];
    cops.forEach((c, i) => {
      const unit = POLICE_UNITS[i];
      const should = state.wanted >= unit.minStars && state.jam <= 0;
      c.active = should;
      c.mesh.visible = should;
      if (!should) return;
      const d = Math.hypot(c.x - pp.x, c.z - pp.z);
      state.unitDistances[unit.id] = d;
      state.copDots.push([c.x, c.z]);
      const targetAngle = Math.atan2(pp.x - c.x, pp.z - c.z);
      let diff = targetAngle - c.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.angle += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
      const chaseSpeed = d > 90 ? 30 : 21 + state.wanted;
      c.x += Math.sin(c.angle) * chaseSpeed * dt;
      c.z += Math.cos(c.angle) * chaseSpeed * dt;
      const cp = { x: c.x, z: c.z };
      collide(cp, colliders, 2.4);
      c.x = cp.x; c.z = cp.z;
      syncVehicle(c);
      if (c.mesh.userData.lightBar) {
        c.mesh.userData.lightBar.material.color.setHex(Math.floor(state.time * 6) % 2 ? 0xff3355 : 0x3388ff);
      }
      if (d < 4.2 && !player.car) {
        bustTimer += dt;
        if (bustTimer > 2.4) {
          state.health -= 26;
          state.wanted = 0; state.heat = 0; bustTimer = 0;
          player.x = 0; player.z = 30;
          hud.center('BUSTED — hauled to Old Town station. -$150');
          state.cash = Math.max(0, state.cash - 150);
          if (state.health <= 0) { state.health = 100; hud.center('Hospital bill paid. Back on the street.'); state.cash = Math.max(0, state.cash - 200); }
        }
      } else if (d < 6 && player.car) {
        state.health -= dt * 2.2;
        if (state.health <= 0) {
          state.health = 100; state.wanted = 0; state.heat = 0;
          player.car.speed = 0;
          hud.center('WRECKED — you wake at the hospital. -$200');
          state.cash = Math.max(0, state.cash - 200);
        }
      }
    });
    if (cops.every((c) => !c.active || Math.hypot(c.x - pp.x, c.z - pp.z) >= 4.2)) bustTimer = Math.max(0, bustTimer - dt);

    // Roadblocks at 4–5 stars, ahead of the player.
    roadblocks.forEach((rb, i) => {
      const on = state.wanted >= 4;
      rb.visible = on;
      if (on) {
        const ahead = 46 + i * 22;
        rb.position.set(
          Math.max(-250, Math.min(250, pp.x + Math.sin(state.playerAngle) * ahead + (i - 1) * 14)),
          0, Math.max(-250, Math.min(250, pp.z + Math.cos(state.playerAngle) * ahead)));
        rb.rotation.y = state.playerAngle;
        state.unitDistances['blockade'] = state.unitDistances['blockade'] ?? ahead;
      }
    });

    // Helicopter at 5 stars.
    const heliOn = state.wanted >= 5;
    heliMesh.visible = heliOn;
    if (heliOn) {
      heli.angle += dt * 0.7;
      heliMesh.position.set(pp.x + Math.cos(heli.angle) * 26, 30, pp.z + Math.sin(heli.angle) * 26);
      heliMesh.rotation.y = -heli.angle;
      if (heliMesh.userData.rotor) heliMesh.userData.rotor.rotation.y += dt * 22;
      state.unitDistances['air'] = 34;
      state.copDots.push([heliMesh.position.x, heliMesh.position.z]);
    }

    // --- Packages ---
    state.packageDots = [];
    for (const p of packages) {
      if (p.taken) continue;
      state.packageDots.push([p.x, p.z]);
      p.mesh.rotation.y += dt * 1.6;
      if (Math.hypot(p.x - pp.x, p.z - pp.z) < 3.4) {
        p.taken = true; p.mesh.visible = false;
        state.packages += 1;
        addCash(150); addRp(40);
        audio.beep('pickup');
        hud.toast('Brass conch ' + state.packages + '/12 — +$150');
        const stage = currentStage();
        if (stage && stage.kind === 'package') completeStage();
        if (state.packages === 12) hud.center('ALL 12 CONCHES — Cay Collector! +$1,000');
        if (state.packages === 12) addCash(1000);
      }
    }

    // --- Objective / mission / activity progression ---
    const obj = objectivePoint();
    state.objective = obj;
    if (obj) {
      state.objectiveDistance = Math.hypot(obj[0] - pp.x, obj[1] - pp.z);
      marker.visible = !!state.mission || (!state.race.active && !state.chop.active);
      marker.position.set(obj[0], 0, obj[1]);
    } else marker.visible = false;

    const stage = currentStage();
    if (stage) {
      if ((stage.kind === 'goto' || stage.kind === 'pickup') && obj && state.objectiveDistance < 6) {
        if (stage.kind === 'pickup') addWanted(1);
        completeStage();
      } else if (stage.kind === 'escape' && state.wanted < 2 && state.missionsDone < 5) completeStage();
      else if (stage.kind === 'escape' && state.mission && state.mission.index === 5 && state.wanted < 3) completeStage();
    }

    if (state.race.active) {
      state.race.time += dt;
      const cp = RACE_CHECKPOINTS[state.race.next];
      raceMarker.visible = true;
      raceMarker.position.set(cp[0], 0, cp[1]);
      if (Math.hypot(cp[0] - pp.x, cp[1] - pp.z) < 9) {
        state.race.next += 1;
        audio.beep('pickup');
        if (state.race.next >= state.race.total) {
          state.race.active = false;
          const t = state.race.time;
          addCash(1200); addRp(200); addRep('strip', 20);
          hud.center('RACE WON — ' + t.toFixed(1) + 's · $1,200');
        } else hud.toast('Checkpoint ' + state.race.next + '/' + state.race.total);
      }
    } else raceMarker.visible = state.chop.active;

    if (state.chop.active && state.chop.phase === 'deliver') {
      raceMarker.visible = true;
      raceMarker.position.set(CHOP_SHOP.at[0], 0, CHOP_SHOP.at[1]);
      if (player.car && state.chop.vehicle === player.car &&
        Math.hypot(CHOP_SHOP.at[0] - pp.x, CHOP_SHOP.at[1] - pp.z) < 9) {
        state.chop.active = false;
        addCash(800); addRp(120); addRep('port', 18); addWanted(1);
        hud.center('CHOP-SHOP PAID — $800');
        const v = player.car;
        toggleCar();
        v.parked = true;
      }
    }
  }

  return {
    state, player, vehicles, packages, cops,
    startMission, startRace, startChop, useCrew, fireWeapon, toggleCar,
    save, load, update, addWanted,
    nextMissionIndex() { return state.missionsDone; },
    nearMissionStart() {
      if (state.mission || state.missionsDone >= MISSIONS.length) return false;
      const at = MISSIONS[state.missionsDone].stages[0].at;
      const pp = playerPos();
      return Math.hypot(at[0] - pp.x, at[1] - pp.z) < 9;
    },
  };
}
