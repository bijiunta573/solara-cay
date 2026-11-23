// Solara Cay — world building: island terrain, road grid, buildings, palms, props.
// Builds the whole three.js scene graph for the island city. Original procedural art.

const ROAD_LINES = [-180, -90, 0, 90, 180];
const BUILDING_COLORS = [0xf2e8cf, 0xe8b4b8, 0xa8dadc, 0xf4a261, 0xe9c46a, 0x90be6d, 0xcdb4db, 0xffc8dd, 0xbde0fe, 0xffafcc];

function mat(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function seededRandom(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildWorld(scene, seed = 7) {
  const rand = seededRandom(seed);
  const colliders = [];
  scene.fog = new THREE.Fog(0xa8d4e6, 260, 950);
  scene.background = new THREE.Color(0x87ceeb);

  const sun = new THREE.DirectionalLight(0xffe3b3, 1.05);
  sun.position.set(160, 240, 80);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.55));
  scene.add(new THREE.HemisphereLight(0xffe8c9, 0x2e6f6a, 0.35));

  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), mat(0x1b7f9e));
  ocean.rotation.x = -Math.PI / 2; ocean.position.y = -1.2;
  scene.add(ocean);
  const sand = new THREE.Mesh(new THREE.BoxGeometry(580, 2, 580), mat(0xeed9a4));
  sand.position.y = -1.16;
  scene.add(sand);
  const grass = new THREE.Mesh(new THREE.BoxGeometry(540, 2, 540), mat(0x69a85f));
  grass.position.y = -1.01;
  scene.add(grass);

  const roadMat = mat(0x3c4148);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf7e26b });
  for (const v of ROAD_LINES) {
    const ns = new THREE.Mesh(new THREE.BoxGeometry(16, 0.24, 540), roadMat);
    ns.position.set(v, 0.15, 0); scene.add(ns);
    const ew = new THREE.Mesh(new THREE.BoxGeometry(540, 0.24, 16), roadMat);
    ew.position.set(0, 0.15, v); scene.add(ew);
    for (let d = -260; d <= 260; d += 26) {
      const dashA = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.28, 9), lineMat);
      dashA.position.set(v, 0.16, d); scene.add(dashA);
      const dashB = new THREE.Mesh(new THREE.BoxGeometry(9, 0.28, 0.7), lineMat);
      dashB.position.set(d, 0.16, v); scene.add(dashB);
    }
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(238, 254, 48), roadMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.14;
  scene.add(ring);

  const roofMat = mat(0x8d6e63);
  const BLOCK_CENTERS = [-225, -135, -45, 45, 135, 225];
  for (const bx of BLOCK_CENTERS) {
    for (const bz of BLOCK_CENTERS) {
      const jx = bx + (rand() - 0.5) * 10;
      const jz = bz + (rand() - 0.5) * 10;
      const downtownBoost = Math.max(0, 60 - Math.hypot(jx, jz + 140)) / 60;
      const h = 8 + rand() * 22 + downtownBoost * 46;
      const w = 16 + rand() * 12;
      const color = BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)];
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), mat(color));
      b.position.set(jx, h / 2, jz);
      scene.add(b);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.5, 1.2, w + 1.5), roofMat);
      roof.position.set(jx, h + 0.6, jz);
      scene.add(roof);
      colliders.push({ x: jx, z: jz, r: w * 0.72 });
    }
  }

  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(17, 17, 0.5, 24), mat(0xd9d2c4));
  plaza.position.set(0, 0.25, 0); scene.add(plaza);
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.2, 4, 12), mat(0x118ab2));
  fountain.position.set(0, 2, 0); scene.add(fountain);
  colliders.push({ x: 0, z: 0, r: 5 });

  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 5, 30, 14), mat(0xf8f4ec));
  tower.position.set(196, 15, 196); scene.add(tower);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.6, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe45e }));
  lamp.position.set(196, 32, 196); scene.add(lamp);
  colliders.push({ x: 196, z: 196, r: 6 });

  const trunkMat = mat(0x8a5a33);
  const leafMat = mat(0x2f9e44);
  for (let i = 0; i < 130; i += 1) {
    const x = (rand() - 0.5) * 500;
    const z = (rand() - 0.5) * 500;
    if (ROAD_LINES.some((v) => Math.abs(v - x) < 12 || Math.abs(v - z) < 12)) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z); trunk.rotation.z = (rand() - 0.5) * 0.24;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.4, 7), leafMat);
    crown.position.set(x, 7.8, z);
    scene.add(crown);
  }

  const poleMat = mat(0x37474f);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff3a6 });
  for (const v of ROAD_LINES) {
    for (let d = -240; d <= 240; d += 60) {
      for (const off of [-10, 10]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 5), poleMat);
        pole.position.set(v + off, 3.5, d); scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
        bulb.position.set(v + off, 7.2, d); scene.add(bulb);
      }
    }
  }

  return { colliders, lamp };
}

export function makeMarker(color = 0xffd166) {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 26, 14, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 13;
  group.add(beam);
  const disc = new THREE.Mesh(new THREE.RingGeometry(2.8, 4.2, 24),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.35;
  group.add(disc);
  return group;
}

export function collide(pos, colliders, radius = 1.2) {
  for (const c of colliders) {
    const dx = pos.x - c.x; const dz = pos.z - c.z;
    const d2 = dx * dx + dz * dz;
    const min = c.r + radius;
    if (d2 < min * min && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = c.x + (dx / d) * min;
      pos.z = c.z + (dz / d) * min;
    }
  }
  const lim = 262;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}
