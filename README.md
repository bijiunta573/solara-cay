# Solara Cay

An original third-person open-world crime game for the browser, built for the
[make.fun GTA 6 bounty (gta6-01)](https://make.fun/bounty/gta6-01).

![make.fun bounty](https://make.fun/badge/gta6-01.svg)
![make.fun rank](https://make.fun/badge/gta6-01/bijiunta573/solara-cay/rank.svg)
![make.fun reward](https://make.fun/badge/gta6-01/bijiunta573/solara-cay/reward.svg)

Play it: serve `game/` with any static server (`node serve.ts`) and open
`game/index.html` in desktop Chrome. No build step, no network needed — three.js
is vendored in `game/vendor/`.

## The game

You are Nico Ferran, a wheelman back on Solara Cay. One island city, nine named
districts (Marina Sol, Downtown Cay, Coral Heights, Port Brisa, Old Town Solara,
Palm Gardens, Cay International, Neon Strip, Farol Point), explorable on foot and
by car, with traffic and pedestrians throughout.

- **Story:** 6 missions of 3–4 stages each, tracked stage-by-stage in the HUD.
- **Wanted system:** 1–5 stars with a live SCPD dispatch panel — named police
  units with roles and distances, roadblocks at 4–5 stars, a helicopter at 5.
- **Crew:** Marisol Vega (Turbo Surge), Dex Okafor (Signal Jam) and Pip Laurent
  (Ghost Step), each on a cooldown, triggered with Z / X / C.
- **Weapons:** 5 slots — Fists, Harbor Bat, Cay-9 Pistol, Brisa SMG, Farol Rifle.
- **Activities:** the Neon Strip street race (9 checkpoints) and Port Brisa
  chop-shop car deliveries.
- **Collectibles:** 12 hidden brass conch packages across the island.
- **Radio:** 3 synthesized stations (Radio Sol 98.1, Brisa Bass 101.4, Farol
  Talk 88.7) generated live with WebAudio — press R.
- **Progression:** career rank / RP ladder plus per-district standing.
- **Look:** round minimap, and a cinematic grade — teal-magenta wash, vignette
  and film grain over the three.js world.
- **Save/load:** progress persists in localStorage (press V to save).

## Controls

WASD move/drive · mouse drag camera · E enter/exit car · click/F use weapon ·
1–5 weapons · Z/X/C crew abilities · M start mission at a gold marker ·
T street race · G chop-shop job · R radio · Shift sprint · P pause · V save

## Layout

- `game/index.html` — page, HUD styling and the cinematic grade overlays
- `game/src/data.js` — districts, missions, crew, weapons, radio, police data
- `game/src/world.js` — island, roads, buildings, palms, lighthouse, markers
- `game/src/entities.js` — player, cars, pedestrians, police, helicopter meshes
- `game/src/game.js` — simulation: missions, wanted/police AI, race, chop-shop,
  packages, rank, standing, save/load
- `game/src/hud.js` — HUD panels, mission tracker, dispatch panel, minimap
- `game/src/audio.js` — procedural radio stations and sound effects
- `game/src/main.js` — boot, input, third-person camera, main loop
- `main.ts` — the make.fun hand-in program (copies `game/` and `screenshots/`
  to the output and writes the dossier)

MIT licensed — see `LICENSE`.
