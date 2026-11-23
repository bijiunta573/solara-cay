// Solara Cay — entities: player character, cars, traffic, pedestrians, police, helicopter.
// All meshes are original procedural builds from three.js primitives.

function lam(color) { return new THREE.MeshLambertMaterial({ color }); }

const CAR_COLORS = [0xe63946, 0x457b9d, 0x2a9d8f, 0xe9c46a, 0xf4a261, 0x9b5de5, 0xf1fa8c, 0x06d6a0, 0xef476f, 0x118ab2];

export function makePerson(shirt = 0xef476f, pants = 0x264653) {
  const g = new THREE.Group();
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.0, 0.5), lam(pants));
  legs.position.y = 0.5; g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.55), lam(shirt));
  torso.position.y = 1.55; g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), lam(0xe8b08a));
  head.position.y = 2.35; g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.22, 10), lam(0xffd166));
  cap.position.y = 2.62; g.add(cap);
  g.userData.torso = torso;
  return g;
}

export function makeCar(color, police = false) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.6), lam(police ? 0xf4f6f8 : color));
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.3), lam(police ? 0x22223b : 0x1d3557));
  cabin.position.set(0, 1.3, -0.2); g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = lam(0x14151a);
  for (const [wx, wz] of [[-1.05, 1.5], [1.05, 1.5], [-1.05, -1.5], [1.05, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz); g.add(w);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.28, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff3355 }));
    bar.position.set(0, 1.85, -0.2); g.add(bar);
    g.userData.lightBar = bar;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.3, 4.64), lam(0x118ab2));
    stripe.position.y = 0.5; g.add(stripe);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6bd });
  for (const lx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), lightMat);
    hl.position.set(lx, 0.72, 2.32); g.add(hl);
  }
  return g;
}

export function makeHelicopter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.9, 12, 10), lam(0x22223b));
  body.scale.set(1, 0.85, 1.5); g.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 6), lam(0x22223b));
  tail.position.set(0, 0.3, -4.6); g.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xdddddd }));
  rotor.position.y = 1.9; g.add(rotor);
  g.userData.rotor = rotor;
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff6bd }));
  spot.position.set(0, -1.4, 1.2); g.add(spot);
  return g;
}

export function makePackageMesh() {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc93c }));
  shell.scale.set(1, 0.72, 1);
  shell.position.y = 1.4; g.add(shell);
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 7, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
  glow.position.y = 3.5; g.add(glow);
  g.userData.shell = shell;
  return g;
}

export function makeRoadblock() {
  const g = new THREE.Group();
  for (let i = -1; i <= 1; i += 1) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.1, 0.6), lam(i % 2 ? 0xf4f6f8 : 0xe63946));
    barrier.position.set(i * 3.6, 0.55, 0); g.add(barrier);
  }
  return g;
}

// A drivable / traffic car record.
export function createVehicle(scene, x, z, angle, color, opts = {}) {
  const mesh = makeCar(color, !!opts.police);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  scene.add(mesh);
  return {
    mesh, x, z, angle, speed: 0,
    color, police: !!opts.police,
    parked: !!opts.parked,
    traffic: !!opts.traffic,
    lane: opts.lane || 0,
    health: 100,
    name: opts.name || 'Cay Coupe',
  };
}

export function syncVehicle(v) {
  v.mesh.position.set(v.x, 0, v.z);
  v.mesh.rotation.y = v.angle;
}

export function createPedestrian(scene, x, z, rand) {
  const mesh = makePerson(CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)], 0x264653);
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return { mesh, x, z, angle: rand() * Math.PI * 2, speed: 1.2 + rand() * 1.4, phase: rand() * 6, flee: 0 };
}

export function randomCarColor(rand) {
  return CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
}
