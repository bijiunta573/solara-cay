// Solara Cay — static game data: districts, missions, crew, weapons, radio, packages.
// Every name, place and story beat in this file is original to Solara Cay.

export const ISLAND_HALF = 260;

export const DISTRICTS = [
  { id: 'marina', name: 'Marina Sol', cx: -150, cz: -150, color: 0x2ec4b6, blurb: 'Yachts, boardwalk and salt air.' },
  { id: 'downtown', name: 'Downtown Cay', cx: 0, cz: -140, color: 0xffd166, blurb: 'Glass towers and neon avenues.' },
  { id: 'coral', name: 'Coral Heights', cx: 150, cz: -150, color: 0xef476f, blurb: 'Hillside villas above the bay.' },
  { id: 'port', name: 'Port Brisa', cx: -160, cz: 0, color: 0x118ab2, blurb: 'Cranes, containers and chop-shops.' },
  { id: 'oldtown', name: 'Old Town Solara', cx: 0, cz: 0, color: 0xf4a261, blurb: 'Plazas, arcades and old debts.' },
  { id: 'gardens', name: 'Palm Gardens', cx: 150, cz: 0, color: 0x06d6a0, blurb: 'Botanical streets and quiet money.' },
  { id: 'airport', name: 'Cay International', cx: -150, cz: 150, color: 0x9b5de5, blurb: 'Runways, hangars and fast exits.' },
  { id: 'strip', name: 'Neon Strip', cx: 10, cz: 150, color: 0xf15bb5, blurb: 'Clubs, casinos and street races.' },
  { id: 'lighthouse', name: 'Farol Point', cx: 160, cz: 150, color: 0xfee440, blurb: 'The lighthouse at the edge of the cay.' },
];

export function districtAt(x, z) {
  let best = DISTRICTS[4]; let bestD = Infinity;
  for (const d of DISTRICTS) {
    const dist = (d.cx - x) * (d.cx - x) + (d.cz - z) * (d.cz - z);
    if (dist < bestD) { bestD = dist; best = d; }
  }
  return best;
}

export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 8, range: 3, cooldown: 0.35, crime: 1 },
  { id: 'bat', name: 'Harbor Bat', damage: 16, range: 3.4, cooldown: 0.5, crime: 1 },
  { id: 'pistol', name: 'Cay-9 Pistol', damage: 26, range: 42, cooldown: 0.32, crime: 2 },
  { id: 'smg', name: 'Brisa SMG', damage: 20, range: 48, cooldown: 0.12, crime: 2 },
  { id: 'rifle', name: 'Farol Rifle', damage: 44, range: 80, cooldown: 0.22, crime: 3 },
];

export const CREW = [
  { id: 'marisol', name: 'Marisol Vega', role: 'Wheelwoman', ability: 'Turbo Surge', key: 'Z', cooldown: 18, desc: 'Boosts any car you drive for 5s.' },
  { id: 'dex', name: 'Dex Okafor', role: 'Hacker', ability: 'Signal Jam', key: 'X', cooldown: 30, desc: 'Freezes police dispatch for 6s and drops heat slowly.' },
  { id: 'pip', name: 'Pip Laurent', role: 'Lookout', ability: 'Ghost Step', key: 'C', cooldown: 24, desc: 'You become hard to spot for 7s; wanted decays faster.' },
];

export const RADIO = [
  { id: 'sol', name: 'Radio Sol 98.1', style: 'Sun-drenched synth pop', bpm: 112, base: 220 },
  { id: 'brisa', name: 'Brisa Bass 101.4', style: 'Island bass and drums', bpm: 128, base: 196 },
  { id: 'farol', name: 'Farol Talk 88.7', style: 'Late-night Cay talk and jazz', bpm: 84, base: 262 },
];

export const POLICE_UNITS = [
  { id: 'patrol-1', name: 'Patrol One', role: 'Pursuit', minStars: 1 },
  { id: 'patrol-2', name: 'Patrol Two', role: 'Pursuit', minStars: 2 },
  { id: 'interceptor', name: 'Interceptor Kestrel', role: 'High-speed chase', minStars: 3 },
  { id: 'blockade', name: 'Blockade Team', role: 'Roadblocks', minStars: 4 },
  { id: 'air', name: 'Air Unit Gaviota', role: 'Helicopter tracking', minStars: 5 },
];

// Twelve hidden packages: brass conch shells hidden around the cay.
export const PACKAGE_SPOTS = [
  [-150, -150], [-30, -205], [150, -150], [205, -40], [-205, 20], [40, -60],
  [0, 40], [150, 10], [-150, 150], [-60, 205], [30, 150], [160, 150],
];

export const MISSIONS = [
  {
    id: 'm1', title: 'First Light Freight', giver: 'Marisol Vega',
    intro: 'A courier vanished on the marina road. Recover the freight and bring it home.',
    stages: [
      { text: 'Reach the Marina Sol boardwalk marker', kind: 'goto', at: [-150, -132] },
      { text: 'Pick up the lost freight crate', kind: 'pickup', at: [-196, -196] },
      { text: 'Deliver the freight to Old Town Solara plaza', kind: 'goto', at: [0, 12] },
      { text: 'Lose the heat: drop below 2 stars', kind: 'escape' },
    ],
    reward: { cash: 900, rp: 120 },
  },
  {
    id: 'm2', title: 'Neon Ledger', giver: 'Dex Okafor',
    intro: 'A casino ledger names every debtor on the Strip. Lift it and wipe the names.',
    stages: [
      { text: 'Meet Dex at the Neon Strip', kind: 'goto', at: [10, 132] },
      { text: 'Grab the ledger from Coral Heights', kind: 'pickup', at: [196, -196] },
      { text: 'Reach the Palm Gardens safehouse', kind: 'goto', at: [150, 18] },
    ],
    reward: { cash: 1400, rp: 180 },
  },
  {
    id: 'm3', title: 'Port Brisa Shuffle', giver: 'Pip Laurent',
    intro: 'Customs is counting containers tonight. Move one before they count yours.',
    stages: [
      { text: 'Enter Port Brisa docks', kind: 'goto', at: [-160, 14] },
      { text: 'Collect the dock manifest', kind: 'pickup', at: [-206, -30] },
      { text: 'Deliver the manifest to Downtown Cay', kind: 'goto', at: [-14, -140] },
      { text: 'Escape: drop below 2 stars', kind: 'escape' },
    ],
    reward: { cash: 1900, rp: 240 },
  },
  {
    id: 'm4', title: 'Runway Ghosts', giver: 'Marisol Vega',
    intro: 'A charter jet lands at Cay International with cargo that cannot be logged.',
    stages: [
      { text: 'Reach Cay International hangars', kind: 'goto', at: [-150, 132] },
      { text: 'Pick up the unlogged cargo', kind: 'pickup', at: [-206, 196] },
      { text: 'Race the cargo to Farol Point lighthouse', kind: 'goto', at: [160, 168] },
    ],
    reward: { cash: 2600, rp: 320 },
  },
  {
    id: 'm5', title: 'The Conch Circuit', giver: 'Dex Okafor',
    intro: 'Someone hid brass conches across the cay as a dead-drop trail. Walk it.',
    stages: [
      { text: 'Find a hidden package anywhere on the cay', kind: 'package' },
      { text: 'Reach the Old Town Solara plaza', kind: 'goto', at: [0, -14] },
      { text: 'Pick up the circuit key at Downtown Cay', kind: 'pickup', at: [30, -196] },
      { text: 'Bring the key to the Neon Strip', kind: 'goto', at: [-16, 150] },
    ],
    reward: { cash: 3400, rp: 420 },
  },
  {
    id: 'm6', title: 'Solara Sunrise', giver: 'The Crew',
    intro: 'One last run at dawn: every district, every camera, one clean getaway.',
    stages: [
      { text: 'Start the sunrise run at Farol Point', kind: 'goto', at: [140, 150] },
      { text: 'Hit the Marina Sol checkpoint', kind: 'goto', at: [-132, -150] },
      { text: 'Hit the Port Brisa checkpoint', kind: 'goto', at: [-140, 0] },
      { text: 'Finish at Downtown Cay and drop below 3 stars', kind: 'escape' },
    ],
    reward: { cash: 6000, rp: 800 },
  },
];

export const RACE_CHECKPOINTS = [
  [10, 110], [90, 60], [150, 0], [90, -80], [0, -140], [-90, -80], [-150, 0], [-80, 90], [10, 130],
];

export const CHOP_SHOP = { at: [-178, 26], name: 'Brisa Chop-Shop, Port Brisa' };
export const SAFEHOUSE = { at: [150, 18], name: 'Palm Gardens Safehouse' };

export const RANKS = [
  { rp: 0, title: 'Beach Runner' }, { rp: 300, title: 'Errand Hand' },
  { rp: 800, title: 'Wheel Holder' }, { rp: 1500, title: 'Cay Fixer' },
  { rp: 2600, title: 'Harbor Name' }, { rp: 4200, title: 'Solara Legend' },
];

export function rankFor(rp) {
  let current = RANKS[0]; let next = null;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (rp >= RANKS[i].rp) { current = RANKS[i]; next = RANKS[i + 1] || null; }
  }
  return { current, next };
}
