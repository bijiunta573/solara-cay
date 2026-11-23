// Solara Cay — boot, input, third-person camera and the main loop.
// Loads the vendored three.js global, builds the island, wires every system together.

import { RADIO } from './data.js';
import { createAudio } from './audio.js';
import { createGame } from './game.js';
import { createHud } from './hud.js';
import { buildWorld } from './world.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
const { colliders } = buildWorld(scene, 7);

window.__scene = scene;
const audio = createAudio();
const hud = createHud(document.getElementById('app'));
const game = createGame(scene, colliders, audio, hud);
window.__game = game;
const state = game.state;

const keys = {};
let camAngle = 0;
let camPitch = 0.2;
let dragging = false;

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  audio.ensure();
  if (!state.started || state.paused) return;
  if (e.code === 'KeyE') game.toggleCar();
  if (e.code === 'KeyF') game.fireWeapon();
  if (e.code === 'KeyM' && game.nearMissionStart()) game.startMission(game.nextMissionIndex());
  if (e.code === 'KeyT') game.startRace();
  if (e.code === 'KeyG') game.startChop();
  if (e.code === 'KeyV') game.save();
  if (e.code === 'KeyZ') game.useCrew(0);
  if (e.code === 'KeyX') game.useCrew(1);
  if (e.code === 'KeyC') game.useCrew(2);
  if (e.code === 'KeyR') {
    state.radioIndex = (state.radioIndex + 2) % 4 - 1; // -1 off, then 0,1,2
    if (state.radioIndex >= 0) { state.radio = RADIO[state.radioIndex]; audio.setStation(state.radioIndex, RADIO); }
    else { state.radio = null; audio.setStation(-1, RADIO); }
  }
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5));
    if (n >= 1 && n <= 5) state.weaponIndex = n - 1;
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', () => { dragging = true; });
window.addEventListener('mouseup', () => { dragging = false; });
window.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  camAngle -= e.movementX * 0.005;
  camPitch = Math.max(0.08, Math.min(1.1, camPitch + e.movementY * 0.004));
});
canvas.addEventListener('click', () => { if (state.started && !state.paused) game.fireWeapon(); });
window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' && state.started) {
    state.paused = !state.paused;
    hud.showPause(state.paused);
  }
});

function readInput() {
  return {
    forward: !!(keys.KeyW || keys.ArrowUp),
    back: !!(keys.KeyS || keys.ArrowDown),
    left: !!(keys.KeyA || keys.ArrowLeft),
    right: !!(keys.KeyD || keys.ArrowRight),
    sprint: !!(keys.ShiftLeft || keys.ShiftRight),
    camAngle,
  };
}

function startGame(loadSave) {
  state.started = true;
  state.paused = false;
  hud.showMenu(false);
  hud.showHud(true);
  if (loadSave) game.load();
  audio.ensure();
  status.textContent = 'Solara Cay. Explore the island, find the gold marker, press M to work.';
  hud.toast('Welcome to Solara Cay, Nico. Gold marker = next story job. T = race, G = chop-shop.');
}

hud.on('startBtn', () => startGame(false));
hud.on('continueBtn', () => startGame(true));
hud.on('resumeBtn', () => { state.paused = false; hud.showPause(false); });
hud.on('saveBtn', () => game.save());
hud.on('quitBtn', () => { state.paused = false; hud.showPause(false); state.started = false; hud.showHud(false); hud.showMenu(true); });

// Screenshot staging for shots.json: deterministic scenes of real gameplay state.
function stageShot(name) {
  hud.showMenu(false);
  hud.showHud(true);
  state.started = true;
  if (name === 'play') {
    game.startMission(0);
    game.addWanted(3);
    // Put the player in a car on the Downtown avenue for a chase frame.
    const car = game.vehicles[0];
    car.x = 4; car.z = -120; car.angle = Math.PI;
    game.player.x = 6; game.player.z = -116;
    game.toggleCar();
    camAngle = Math.PI - 0.5;
  } else if (name === 'end') {
    game.startMission(1);
    game.addWanted(4);
    game.player.x = 10; game.player.z = 128;
    camAngle = 0.6;
  } else {
    camAngle = 2.2;
  }
  let frames = 0;
  function paint() {
    game.update(1 / 30, { forward: name !== 'start', back: false, left: false, right: false, sprint: false, camAngle });
    updateCamera(1);
    hud.update(state);
    hud.drawMinimap(state);
    renderer.render(scene, camera);
    frames += 1;
    if (frames < 24) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

const camTarget = new THREE.Vector3();
function updateCamera(smooth) {
  const p = state.playerPos;
  const dist = state.driving ? 12 : 8.5;
  const cx = p.x - Math.sin(camAngle) * Math.cos(camPitch) * dist;
  const cz = p.z - Math.cos(camAngle) * Math.cos(camPitch) * dist;
  const cy = 2.6 + Math.sin(camPitch) * dist;
  if (smooth === 1) camera.position.set(cx, cy, cz);
  else camera.position.lerp(camTarget.set(cx, cy, cz), 0.16);
  camera.lookAt(p.x, 1.9, p.z);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (state.started && !state.paused) {
    // Keep the camera behind the driver while moving.
    if (state.driving && (keys.KeyW || keys.KeyS)) camAngle += ((state.playerAngle - camAngle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * dt * 1.4;
    game.update(dt, readInput());
    hud.update(state);
    hud.drawMinimap(state);
  }
  updateCamera(0);
  renderer.render(scene, camera);
}

if (shot) stageShot(shot);
else {
  hud.showHud(false);
  requestAnimationFrame(frame);
}
