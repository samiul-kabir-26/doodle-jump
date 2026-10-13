import { Player } from '../entities/player.js';
import { Projectile } from '../entities/projectile.js';
import { LevelGenerator } from './generator.js';
import { Camera } from '../engine/camera.js';
import { collision } from '../engine/collision.js';
import { calculateScore, GAME_CONSTANTS } from '../../../shared/constants.js';

export class World {
  constructor({ rng, gameplay = {}, audio, onEvent, onGameOver, onMilestone }) {
    this.rng = rng;
    this.gameplay = gameplay;
    this.audio = audio;
    this.onEvent = onEvent;
    this.onGameOver = onGameOver;
    this.onMilestone = onMilestone;

    this.camera = new Camera();
    this.player = new Player(150, 80);
    this.generator = new LevelGenerator(rng, gameplay);

    this.platforms = [];
    this.monsters = [];
    this.blackHoles = [];
    this.projectiles = [];

    this.shootCooldown = 0;
    this.score = 0;
    this.runDurationMs = 0;
    this.reachedMilestones = new Set();

    this.isDying = false;
    this.deathTimer = 0;
    this.deathReason = null;

    this.stats = {
      platformsLanded: 0,
      platformsBroken: 0,
      springsUsed: 0,
      trampolinesUsed: 0,
      powerups: { propeller: 0, jetpack: 0, spring_shoes: 0 },
      monstersKilled: { stomp: 0, shot: 0 },
      shotsFired: 0
    };

    this.init();
  }

  init() {
    this.camera.reset();
    this.player.reset(150, 80);
    this.generator.reset();
    this.platforms = this.generator.generateInitialPlatforms();
    this.monsters = [];
    this.blackHoles = [];
    this.projectiles = [];
    this.score = 0;
    this.runDurationMs = 0;
    this.reachedMilestones.clear();
    this.isDying = false;
    this.deathTimer = 0;
    this.deathReason = null;

    this.stats = {
      platformsLanded: 0,
      platformsBroken: 0,
      springsUsed: 0,
      trampolinesUsed: 0,
      powerups: { propeller: 0, jetpack: 0, spring_shoes: 0 },
      monstersKilled: { stomp: 0, shot: 0 },
      shotsFired: 0
    };
  }

  shoot({ angle = 0, screenX = null, screenY = null } = {}) {
    if (this.isDying || this.shootCooldown > 0) return;
    if (this.projectiles.length >= GAME_CONSTANTS.PROJECTILE.MAX_ACTIVE) return;
    if (this.gameplay.enabled?.shooting === false) return;

    let aimAngle = angle;
    if (screenX !== null && screenY !== null) {
      // Calculate angle from player centre to target
      const playerScreenX = this.player.x + this.player.width / 2;
      const playerScreenY = this.camera.toScreenY(this.player.y + this.player.height / 2);
      const dx = screenX - playerScreenX;
      const dy = playerScreenY - screenY; // Screen Y is down, world Y is up
      aimAngle = Math.atan2(dx, dy);
    }

    const bullet = new Projectile({
      x: this.player.x + (this.player.width - GAME_CONSTANTS.PROJECTILE.WIDTH) / 2,
      y: this.player.y + this.player.height,
      angle: aimAngle
    });

    this.projectiles.push(bullet);
    this.shootCooldown = GAME_CONSTANTS.PROJECTILE.COOLDOWN;
    this.player.triggerShoot();
    this.stats.shotsFired++;
    if (this.audio) this.audio.play('sound.shoot');
  }

  triggerDeath(reason) {
    if (this.isDying) return;
    this.isDying = true;
    this.deathReason = reason;
    this.deathTimer = 1.0; // 1s death animation
    if (reason === 'fell') {
      this.camera.startFallingAnimation();
      if (this.audio) this.audio.play('sound.fall');
    } else {
      if (this.audio) this.audio.play('sound.game_over');
    }
  }

  update(dt, inputAxis) {
    this.runDurationMs += dt * 1000;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    if (this.isDying) {
      this.deathTimer -= dt;
      this.camera.update(this.player.y, dt);
      if (this.deathTimer <= 0) {
        if (this.onGameOver) {
          this.onGameOver({
            score: this.score,
            maxHeight: Math.floor(this.camera.maxHeight),
            durationMs: Math.floor(this.runDurationMs),
            reason: this.deathReason,
            stats: this.stats
          });
        }
      }
      return;
    }

    // 1. Update entities
    this.player.update(dt, inputAxis);
    this.camera.update(this.player.y, dt);
    this.score = calculateScore(this.camera.maxHeight);

    // Milestones check toast
    for (const m of GAME_CONSTANTS.MILESTONES) {
      if (this.score >= m && !this.reachedMilestones.has(m)) {
        this.reachedMilestones.add(m);
        if (this.onMilestone) this.onMilestone(m);
      }
    }

    // Generate upcoming chunk
    this.generator.generateChunk(
      this.camera.y + 1280,
      this.score,
      this.platforms,
      this.monsters,
      this.blackHoles
    );

    // Update platforms
    for (const plat of this.platforms) {
      plat.update(dt);
    }

    // Update monsters
    for (const m of this.monsters) {
      m.update(dt);
    }

    // Update black holes
    for (const bh of this.blackHoles) {
      bh.update(dt);
    }

    // Update projectiles
    for (const p of this.projectiles) {
      p.update(dt);
    }

    // 2. Collision checks: Player vs Platforms & Items
    for (const plat of this.platforms) {
      if (plat.broken || plat.exploded || (plat.fading && plat.fadeAlpha <= 0)) continue;

      if (collision.checkFeetPlatformLanding(this.player, plat)) {
        // Check if landed on item
        if (plat.item && !plat.item.used) {
          plat.item.used = true;
          const h = Math.floor(plat.y);

          if (plat.item.type === 'spring') {
            this.player.triggerSpring();
            this.stats.springsUsed++;
            if (this.audio) this.audio.play('sound.spring');
            if (this.onEvent) this.onEvent('spring.used', { kind: 'spring', height: h });
          } else if (plat.item.type === 'trampoline') {
            this.player.triggerTrampoline();
            this.stats.trampolinesUsed++;
            if (this.audio) this.audio.play('sound.trampoline');
            if (this.onEvent) this.onEvent('spring.used', { kind: 'trampoline', height: h });
          } else if (plat.item.type === 'propeller') {
            this.player.triggerPropeller();
            this.stats.powerups.propeller++;
            if (this.audio) this.audio.play('sound.propeller');
            if (this.onEvent) this.onEvent('powerup.collected', { kind: 'propeller', height: h });
          } else if (plat.item.type === 'jetpack') {
            this.player.triggerJetpack();
            this.stats.powerups.jetpack++;
            if (this.audio) this.audio.play('sound.jetpack');
            if (this.onEvent) this.onEvent('powerup.collected', { kind: 'jetpack', height: h });
          } else if (plat.item.type === 'spring_shoes') {
            this.player.triggerSpringShoes();
            this.stats.powerups.spring_shoes++;
            if (this.audio) this.audio.play('sound.spring');
            if (this.onEvent) this.onEvent('powerup.collected', { kind: 'spring_shoes', height: h });
          }
        } else {
          // Standard platform landing
          const bounced = plat.onLand();
          if (bounced) {
            this.player.bounce();
            this.stats.platformsLanded++;
            if (this.audio) this.audio.play('sound.jump');
          } else {
            // Breakable cracked
            this.stats.platformsBroken++;
            if (this.audio) this.audio.play('sound.break');
            if (this.onEvent) this.onEvent('platform.broken', { height: Math.floor(plat.y) });
          }
        }
        break; // Only land on one platform per frame
      }
    }

    // 3. Collision checks: Projectiles vs Monsters
    for (const p of this.projectiles) {
      if (p.dead) continue;
      for (const m of this.monsters) {
        if (m.dead) continue;
        if (collision.checkAABB(p, m)) {
          p.dead = true;
          const killed = m.takeDamage();
          if (killed) {
            this.stats.monstersKilled.shot++;
            if (this.audio) this.audio.play('sound.monster_kill');
            if (this.onEvent) {
              this.onEvent('monster.killed', {
                monster: m.type,
                method: 'shot',
                height: Math.floor(m.y)
              });
            }
          }
          break;
        }
      }
    }

    // 4. Collision checks: Player vs Monsters
    for (const m of this.monsters) {
      if (m.dead) continue;

      // Stomp check from above
      if (collision.checkMonsterStomp(this.player, m)) {
        this.player.bounce();
        m.dead = true;
        this.stats.monstersKilled.stomp++;
        if (this.audio) this.audio.play('sound.monster_kill');
        if (this.onEvent) {
          this.onEvent('monster.killed', {
            monster: m.type,
            method: 'stomp',
            height: Math.floor(m.y)
          });
        }
        continue;
      }

      // Touch check
      if (collision.checkPlayerOverlap(this.player, m)) {
        if (this.player.isImmune()) {
          m.dead = true;
          if (this.audio) this.audio.play('sound.monster_kill');
        } else {
          this.triggerDeath('monster');
          return;
        }
      }
    }

    // 5. Collision checks: Player vs Black Holes
    for (const bh of this.blackHoles) {
      const playerCenter = {
        x: this.player.x + this.player.width / 2 - 24,
        y: this.player.y + this.player.height / 2 - 24,
        radius: 20
      };
      if (collision.checkCircleOverlap(playerCenter, bh)) {
        if (!this.player.isImmune()) {
          this.triggerDeath('black_hole');
          return;
        }
      }
    }

    // 6. Check death by falling
    if (this.camera.isBelowCamera(this.player.y, this.player.height, 0)) {
      this.triggerDeath('fell');
      return;
    }

    // 7. Despawn entities below camera
    this.platforms = this.platforms.filter((p) => !this.camera.isBelowCamera(p.y, p.height));
    this.monsters = this.monsters.filter((m) => !m.dead && !this.camera.isBelowCamera(m.y, m.height));
    this.blackHoles = this.blackHoles.filter((b) => !this.camera.isBelowCamera(b.y, b.height));
    this.projectiles = this.projectiles.filter((p) => !p.dead && p.y <= this.camera.y + 700);
  }

  render(ctx, assetManager) {
    // 1. Draw tiled background / grid
    this.renderBackground(ctx, assetManager);

    // 2. Draw platforms and attached items
    for (const p of this.platforms) {
      p.render(ctx, this.camera, assetManager);
    }

    // 3. Draw black holes
    for (const bh of this.blackHoles) {
      bh.render(ctx, this.camera, assetManager);
    }

    // 4. Draw monsters
    for (const m of this.monsters) {
      m.render(ctx, this.camera, assetManager);
    }

    // 5. Draw projectiles
    for (const p of this.projectiles) {
      p.render(ctx, this.camera, assetManager);
    }

    // 6. Draw player
    this.player.render(ctx, this.camera, assetManager);
  }

  renderBackground(ctx, assetManager) {
    const bg = assetManager.theme.background || {};
    const colors = assetManager.theme.colors || {};

    // Base background color
    ctx.fillStyle = colors.background || '#f8f5e6';
    ctx.fillRect(0, 0, GAME_CONSTANTS.LOGICAL_WIDTH, GAME_CONSTANTS.LOGICAL_HEIGHT);

    // Pattern (graph paper)
    if (bg.pattern === 'graph-paper') {
      const gridSize = 24;
      const parallax = bg.parallax !== undefined ? bg.parallax : 0.5;
      const offsetY = (this.camera.y * parallax) % gridSize;

      ctx.save();
      ctx.strokeStyle = colors.gridLines || '#e3dcc3';
      ctx.lineWidth = 1;
      ctx.beginPath();

      // Vertical lines
      for (let x = 0; x <= GAME_CONSTANTS.LOGICAL_WIDTH; x += gridSize) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, GAME_CONSTANTS.LOGICAL_HEIGHT);
      }

      // Horizontal lines with parallax scroll
      for (let y = offsetY; y <= GAME_CONSTANTS.LOGICAL_HEIGHT; y += gridSize) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(GAME_CONSTANTS.LOGICAL_WIDTH, y + 0.5);
      }

      ctx.stroke();
      ctx.restore();
    }
  }
}
