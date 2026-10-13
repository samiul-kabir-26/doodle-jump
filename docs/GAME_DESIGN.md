# Game Design Specification

The goal is to reproduce the feel of the original **Doodle Jump** (Lima Sky, 2009) as closely as possible, with all visuals driven by the theme system. All numbers below are **defaults**; they live in `shared/constants.js` and some are overridable through admin settings (marked ⚙).

## 1. Coordinate System & Rendering

- **Logical resolution:** 360 × 640 (portrait 9:16). World units = logical pixels.
- **World Y axis** points **up** for gameplay logic (height climbed); converted to screen space at render time: `screenY = cameraY + 640 - worldY` (implementation may store y-down; keep one convention in `engine/camera.js`).
- Canvas scaled with `devicePixelRatio` for crispness; letterboxed to keep aspect ratio. Desktop shows the game column centred with themed side background.
- Layers (back → front): background (tiled vertically, parallax 0.5) → platforms → items/power-ups → monsters/black holes → projectiles → player → HUD (DOM overlay with Tailwind).

## 2. Game Loop

```
accumulator += min(frameDelta, 250ms)
while accumulator >= STEP (1/60 s):
    input.poll(); world.update(STEP); accumulator -= STEP
render(interpolation = accumulator / STEP)
```
- `requestAnimationFrame` driven; simulation is deterministic given seed + inputs (enables future replay validation).
- Paused when tab hidden (`visibilitychange`) or pause pressed.

## 3. Player (the "Doodler")

| Property | Value |
|---|---|
| Sprite box | 60 × 60 (art is scaled to fit, aspect preserved) |
| Hitbox (body) | 36 × 50, centred horizontally |
| Feet hitbox (platform collision) | 28 × 6 at bottom of body, inset 4 px |
| Gravity | 1300 px/s² ⚙ |
| Jump velocity (normal platform) | 640 px/s → apex ≈ 157 px |
| Max fall speed | 900 px/s |
| Horizontal max speed | 330 px/s |
| Horizontal accel / decel (keys) | 2200 / 1800 px/s² (snappy, slight slide like original) |
| Screen wrap | Leaving left edge reappears on right and vice-versa (centre crosses edge) |
| Facing | Sprite slot `player.left` / `player.right` by last horizontal input; `player.shoot` while firing (200 ms) |
| Squash | On each bounce, 80 ms vertical squash (scaleY 0.85) — cosmetic |

**Collision rule (critical for feel):** the player only lands on a platform when **falling** (`vy` downward) **and** the feet's bottom crossed the platform's top edge between the previous and current step (swept test), **and** horizontal overlap ≥ 1 px. Jumping up passes through platforms.

## 4. Camera

- Camera only moves **up**. When the player rises above 45% of the screen height, the camera follows so the player stays at that line.
- `maxHeight` = highest camera-tracked player Y reached. Entities below `cameraBottom − 50` are despawned.
- **Death by falling:** player's top goes below the camera bottom → falling animation: camera scrolls down quickly for 1 s showing the player dropping, then game over.

## 5. Platforms

Size 58 × 15 (sprite box 64 × 18). Each type has its own theme slot.

| Type | Slot | Behaviour | First appears (score) |
|---|---|---|---|
| Normal (green) | `platform.normal` | Static, bounce | 0 |
| Moving horizontal (blue) | `platform.moving` | Moves L↔R, speed 60–150 px/s scaled by difficulty, bounces at edges | 500 |
| Moving vertical (blue variant) | `platform.moving` | Oscillates ±40 px vertically | 6 000 |
| Breakable (brown) | `platform.breakable`, `platform.breakable_broken` | **No bounce**; breaks and falls when landed on (emits `platform.broken`) | 1 000 |
| Disappearing (white) | `platform.disappearing` | Bounces once then fades out (150 ms) | 4 000 |
| Exploding (orange) | `platform.exploding` | Changes colour after 2 s on-screen, explodes at 3.5 s (removed) | 12 000 |

Rules:
- Breakable platforms are **never** required for progress: generator guarantees a bounceable platform within reachable distance (`maxGap`).
- `maxGap` ≤ 0.85 × normal apex (≈ 133 px) at all difficulties.

## 6. Bounce Items & Power-ups

| Item | Slot | Placement | Effect | Duration |
|---|---|---|---|---|
| Spring | `item.spring` / `item.spring_used` | On top of normal/moving platform | Jump velocity 1050 px/s (apex ≈ 425 px) | — |
| Trampoline | `item.trampoline` | On platform | 1200 px/s + player sprite spins 360° | — |
| Propeller hat | `item.propeller`, `player.propeller` overlay | On platform | Constant ascent 520 px/s, steerable, immune to monsters | 3.0 s |
| Jetpack | `item.jetpack`, `player.jetpack` overlay | On platform | Ascent ramps to 950 px/s, immune | 3.5 s |
| Spring shoes | `item.spring_shoes`, `player.spring_shoes` overlay | On platform | Next 5 bounces at 1.5× velocity | 5 bounces |
| Shield (v1.1) | `item.shield` | On platform | Immune to monsters/black hole | 8 s |

- At most one active ascent power-up (propeller/jetpack). Collecting another while active is ignored.
- When a propeller/jetpack ends, the item falls off screen (cosmetic) and normal gravity resumes.
- Spawn probability per generated platform (after score 300): spring 6%, trampoline 1.5%, propeller 1.2%, jetpack 0.6%, spring shoes 1%. ⚙ globally scalable.

## 7. Hazards

| Hazard | Slot | Behaviour | First appears |
|---|---|---|---|
| Monster (static) | `monster.basic` | Hovers above a platform gap with small wobble | 2 000 |
| Monster (moving) | `monster.flyer` | Moves horizontally | 5 000 |
| Big monster | `monster.big` | 2 hits to kill by shooting | 10 000 |
| Black hole | `hazard.black_hole` | Pulls player in on contact radius → death | 8 000 |
| UFO (v1.1) | `hazard.ufo` | Tractor beam; shoot to kill | 15 000 |

Interactions:
- **Stomp:** landing on a monster from above while falling kills it and bounces at normal jump velocity → `monster.killed {method:"stomp"}`.
- **Touch** from side/below → player death (unless propeller/jetpack/shield active) → `game.ended {reason:"monster"}`.
- **Shoot:** projectiles kill monsters (big: 2 hits) → `monster.killed {method:"shot"}`.
- **Black hole:** death (`reason:"black_hole"`), shrink-and-spin animation.
- Hazards spawn with a guaranteed safe path: no hazard inside the only reachable platform column.
- Probability: monster 3% per platform row after 2 000, rising to 7% at 20 000; black hole 1% after 8 000.

## 8. Shooting

- Desktop: **Space** or **↑** fires straight up; mouse click fires toward cursor (clamped to ±60° from vertical).
- Mobile: tap on upper 60% of screen fires toward tap (same clamp); left/right control zones are the lower 40%.
- Projectile: slot `projectile`, 10 × 10, speed 900 px/s, max 3 on screen, cooldown 150 ms.
- Player sprite shows `player.shoot` for 200 ms. Shots fired counted in stats (not individually emitted as events).

## 9. Controls

| Input | Action |
|---|---|
| ← / → , A / D | Move |
| Space / ↑ / click | Shoot |
| P / Esc | Pause |
| Tilt (mobile, opt-in) | `gamma` angle → horizontal velocity (deadzone 3°, full speed at 25°); iOS requires `DeviceOrientationEvent.requestPermission()` triggered by a user tap |
| Touch zones (mobile default) | Hold left/right half of lower 40% |
| M | Mute |

## 10. Level Generation

- Generated in rows ahead of the camera (buffer: 2 screens). Seeded PRNG `mulberry32(seed)`; **all** randomness in the simulation goes through it.
- Each step: `gap = lerp(minGap, maxGap, difficulty) ± jitter`, `x = rng * (360 − 58)`.
- Platform type chosen from weighted table for the current difficulty band; if the last bounceable platform is more than `maxGap` below, force a normal platform.

### Difficulty curve (score → parameters)

| Score | minGap–maxGap | Normal | Moving | Breakable (extra, decorative) | Disappearing | Hazards |
|---|---|---|---|---|---|---|
| 0–500 | 25–60 | 100% | 0 | 10% | 0 | none |
| 500–2 000 | 35–75 | 80% | 20% | 15% | 0 | none |
| 2 000–5 000 | 45–90 | 65% | 30% | 20% | 5% | monsters |
| 5 000–10 000 | 55–105 | 50% | 35% | 25% | 15% | + flyers |
| 10 000–20 000 | 70–120 | 40% | 40% | 30% | 20% | + big, black holes |
| 20 000+ | 85–133 | 30% | 45% | 30% | 25% | all, higher rate |

Global difficulty multiplier ⚙ (0.5–2.0) scales gap and hazard rates.

## 11. Scoring

- **Score = floor(maxHeight / 2)** — height-based only, like the original (≈ 1 point per half logical pixel climbed). Displayed live in HUD.
- Kills, power-ups, etc. do **not** add score; they are tracked as stats and emitted as events so the host can reward them separately.
- **Milestones** at 1 000, 5 000, 10 000, 25 000, 50 000, 100 000 — shown as a brief HUD toast; server derives `milestone.reached` events from the validated final score.
- Run stats collected client-side: `platformsLanded`, `platformsBroken`, `springsUsed`, `trampolinesUsed`, `powerups{propeller,jetpack,spring_shoes}`, `monstersKilled{stomp,shot}`, `shotsFired`, `maxHeight`, `durationMs`.

## 12. Game Over

Reasons: `fell`, `monster`, `black_hole`, `quit`.
1. Death animation (1 s).
2. Client calls `POST /sessions/:id/end` with score + stats.
3. Game-over overlay: score, personal best (🏆 if new), rank, Play Again, Leaderboard, Menu. Shows "Score not saved (offline)" if the request failed (retry once in background).
4. Posts `dj:game_over` to parent window if embedded.

## 13. Screens & HUD (DOM overlay, Tailwind)

| Screen | Content |
|---|---|
| Boot / loading | Logo (theme), progress bar while assets load (timeout 5 s → defaults) |
| Nickname (standalone, first run) | Input + Continue |
| Main menu | Title, animated doodler bouncing on a platform, Play, Leaderboard, Settings (controls, sound) |
| Playing HUD | Score top-left, pause button top-right, milestone toast, power-up timer bar |
| Pause | Resume, Restart, Menu |
| Game over | See §12 |
| Leaderboard | Tabs Today/Week/All, list, highlighted self row |

Background uses a graph-paper style by default (theme slot `background` + `colors.background`).

## 14. Audio

Slots: `sound.jump`, `sound.spring`, `sound.trampoline`, `sound.break`, `sound.propeller`, `sound.jetpack`, `sound.shoot`, `sound.monster_kill`, `sound.fall`, `sound.game_over`. Web Audio API, unlocked on first user gesture; mute persisted.

## 15. Default Theme Assets

Ship original, license-clean default art (SVG preferred) in `public/default-assets/`, styled after the hand-drawn look (doodler with snout, green/blue/brown/white platforms, graph-paper background). Do **not** copy original Lima Sky assets.
