import { GameLoop } from './engine/loop.js';
import { Camera } from './engine/camera.js';
import { AssetManager } from './engine/assets.js';
import { AudioManager } from './engine/audio.js';
import { InputHandler } from './engine/input.js';
import { createRNG } from './engine/rng.js';
import { World } from './world/world.js';
import { ThemeLoader } from './theme/loader.js';
import { EventQueue } from './net/eventQueue.js';
import { HostBridge } from './net/hostBridge.js';
import { api } from './net/api.js';

import { renderBootScene } from './scenes/boot.js';
import { renderNicknameScene } from './scenes/nickname.js';
import { renderMenuScene } from './scenes/menu.js';
import { renderPlayHUD } from './scenes/play.js';
import { renderPauseScene } from './scenes/pause.js';
import { renderGameOverScene } from './scenes/gameOver.js';
import { renderLeaderboardScene } from './scenes/leaderboard.js';

import { GAME_CONSTANTS } from '../../shared/constants.js';

class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.uiContainer = document.getElementById('ui-overlay');

    this.state = 'boot'; // 'boot' | 'nickname' | 'menu' | 'playing' | 'paused' | 'gameOver' | 'leaderboard'
    this.dpr = window.devicePixelRatio || 1;

    // Managers
    this.themeLoader = new ThemeLoader();
    this.assets = new AssetManager();
    this.audio = new AudioManager();
    this.eventQueue = new EventQueue();

    // Player state
    this.player = null;
    this.playerToken = localStorage.getItem('dj_player_token') || null;
    this.personalBest = null;

    // Run state
    this.world = null;
    this.sessionId = null;
    this.hudController = null;
    this.lastScoreReportTime = 0;

    // Menu preview doodler
    this.menuDoodlerY = 80;
    this.menuDoodlerVy = 500;

    this.initCanvas();
    this.initInput();
    this.initBridge();
    this.initLoop();
    this.boot();
  }

  initCanvas() {
    const resize = () => {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      this.canvas.width = GAME_CONSTANTS.LOGICAL_WIDTH * this.dpr;
      this.canvas.height = GAME_CONSTANTS.LOGICAL_HEIGHT * this.dpr;
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(this.dpr, this.dpr);
    };

    window.addEventListener('resize', resize);
    resize();
  }

  initInput() {
    this.input = new InputHandler({
      onPause: () => {
        if (this.state === 'playing') this.pauseGame();
        else if (this.state === 'paused') this.resumeGame();
      },
      onMute: () => {
        const isMuted = this.audio.toggleMute();
        this.updateMuteState(isMuted);
      },
      onShoot: (params) => {
        if (this.state === 'playing' && this.world) {
          this.world.shoot(params);
        }
      }
    });

    this.input.bindCanvas(this.canvas, () => {
      const rect = this.canvas.getBoundingClientRect();
      return rect.width / GAME_CONSTANTS.LOGICAL_WIDTH;
    });
  }

  initBridge() {
    this.bridge = new HostBridge({
      onInit: async ({ token, muted }) => {
        if (muted !== undefined) this.audio.setMuted(muted);
        if (token) await this.identifyPlayer({ launchToken: token });
      },
      onPause: () => this.pauseGame(),
      onResume: () => this.resumeGame(),
      onRestart: () => this.showMenu(),
      onSetMuted: (muted) => this.audio.setMuted(muted),
      onPreviewTheme: (draftTheme) => {
        this.themeLoader.hotApply(draftTheme);
        this.assets.setTheme(draftTheme);
      }
    });
  }

  initLoop() {
    this.loop = new GameLoop({
      onUpdate: (dt) => this.update(dt),
      onRender: (alpha) => this.render(alpha),
      onVisibilityChange: (hidden) => {
        if (hidden && this.state === 'playing') {
          this.pauseGame();
          if (this.world) {
            this.eventQueue.push('game.paused', { height: Math.floor(this.world.player.y), cause: 'visibility' });
          }
        }
      }
    });
  }

  async boot() {
    const urlParams = new URLSearchParams(window.location.search);
    const launchToken = urlParams.get('token');
    const isPreviewDraft = urlParams.get('preview') === 'draft';

    // Strip token from URL immediately per PRD/INTEGRATION specs
    if (launchToken) {
      urlParams.delete('token');
      const newQuery = urlParams.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '');
      window.history.replaceState({}, document.title, newUrl);
    }

    renderBootScene(this.uiContainer, 0.1);

    // 1. Fetch Config
    const configData = await this.themeLoader.load(isPreviewDraft);
    this.assets.setTheme(configData.theme);

    // 2. Preload Assets
    await this.assets.preload((pct) => {
      renderBootScene(this.uiContainer, 0.2 + pct * 0.7);
    });

    this.bridge.post('dj:ready', {
      version: '1.0.0',
      themeVersion: this.themeLoader.themeVersion
    });

    // 3. Identify Player
    if (launchToken) {
      await this.identifyPlayer({ launchToken });
    } else {
      const storedId = localStorage.getItem('dj_player_id');
      const storedName = localStorage.getItem('dj_nickname');
      const storedToken = localStorage.getItem('dj_player_token');

      if (storedToken && storedName) {
        this.player = { id: storedId, displayName: storedName };
        this.playerToken = storedToken;
        this.showMenu();
      } else {
        this.showNicknamePrompt();
      }
    }

    this.loop.start();
  }

  async identifyPlayer({ launchToken = null, nickname = null, deviceId = null }) {
    try {
      const result = await api.identify({ launchToken, nickname, deviceId });
      this.player = result.player;
      this.playerToken = result.playerToken;

      localStorage.setItem('dj_player_id', this.player.id);
      localStorage.setItem('dj_nickname', this.player.displayName);
      localStorage.setItem('dj_player_token', this.playerToken);

      this.bridge.post('dj:identified', {
        playerId: this.player.id,
        externalUserId: this.player.externalUserId,
        displayName: this.player.displayName
      });

      this.showMenu();
    } catch (err) {
      console.error('Player identify failed:', err);
      this.showNicknamePrompt(err.message);
    }
  }

  showNicknamePrompt(errMsg = null) {
    this.state = 'nickname';
    renderNicknameScene(this.uiContainer, (name) => {
      this.identifyPlayer({ nickname: name });
    });
    if (errMsg) {
      const el = this.uiContainer.querySelector('#nickname-error');
      if (el) {
        el.textContent = errMsg;
        el.classList.remove('hidden');
      }
    }
  }

  showMenu() {
    this.state = 'menu';
    renderMenuScene(this.uiContainer, {
      theme: this.themeLoader.currentTheme,
      playerName: this.player?.displayName,
      personalBest: this.personalBest,
      isMuted: this.audio.muted,
      tiltActive: this.input.tiltEnabled,
      onPlay: () => this.startGame(),
      onLeaderboard: () => this.showLeaderboard(),
      onToggleMute: () => {
        const isMuted = this.audio.toggleMute();
        this.showMenu();
      },
      onToggleTilt: async () => {
        if (!this.input.tiltEnabled) {
          const ok = await this.input.enableTilt();
          if (ok) this.showMenu();
        } else {
          this.input.disableTilt();
          this.showMenu();
        }
      }
    });
  }

  showLeaderboard() {
    this.state = 'leaderboard';
    renderLeaderboardScene(this.uiContainer, {
      currentPlayerId: this.player?.id,
      playerToken: this.playerToken,
      onBack: () => this.showMenu()
    });
  }

  async startGame() {
    let seed = Math.floor(Math.random() * 0xffffffff);
    let sessionRes = null;

    if (this.playerToken) {
      try {
        sessionRes = await api.startSession(this.playerToken, {
          input: this.input.tiltEnabled ? 'tilt' : 'touch',
          version: '1.0.0'
        });
        seed = sessionRes.seed;
        this.sessionId = sessionRes.sessionId;
      } catch (err) {
        console.warn('Offline run started:', err.message);
        this.sessionId = `offline_${Date.now()}`;
      }
    } else {
      this.sessionId = `guest_${Date.now()}`;
    }

    const rng = createRNG(seed);
    this.world = new World({
      rng,
      gameplay: this.themeLoader.gameplay,
      audio: this.audio,
      onEvent: (type, data) => {
        this.eventQueue.push(type, data, Math.floor(this.world.runDurationMs));
      },
      onGameOver: (endData) => this.handleGameOver(endData),
      onMilestone: (m) => {
        if (this.hudController) this.hudController.showMilestone(m);
      }
    });

    if (this.playerToken && sessionRes) {
      this.eventQueue.startSession(this.sessionId, this.playerToken);
    }

    this.state = 'playing';
    this.hudController = renderPlayHUD(this.uiContainer, {
      onPause: () => this.pauseGame(),
      onMute: () => {
        const isMuted = this.audio.toggleMute();
        this.updateMuteState(isMuted);
      },
      isMuted: this.audio.muted
    });

    this.bridge.post('dj:game_started', { sessionId: this.sessionId });
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    renderPauseScene(this.uiContainer, {
      onResume: () => this.resumeGame(),
      onRestart: () => this.startGame(),
      onMenu: () => this.showMenu()
    });
    this.eventQueue.push('game.paused', { height: Math.floor(this.world?.player?.y || 0), cause: 'user' });
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hudController = renderPlayHUD(this.uiContainer, {
      onPause: () => this.pauseGame(),
      onMute: () => {
        const isMuted = this.audio.toggleMute();
        this.updateMuteState(isMuted);
      },
      isMuted: this.audio.muted
    });
    this.eventQueue.push('game.resumed', { height: Math.floor(this.world?.player?.y || 0), pausedMs: 0 });
  }

  updateMuteState(isMuted) {
    const btn = this.uiContainer.querySelector('#hud-mute-btn') || this.uiContainer.querySelector('#btn-mute');
    if (btn) btn.textContent = isMuted ? '🔇' : '🔊';
  }

  async handleGameOver(runSummary) {
    this.state = 'gameOver';
    this.eventQueue.stopSession();

    let serverResult = null;
    let isOffline = false;

    if (this.playerToken && !this.sessionId.startsWith('offline_') && !this.sessionId.startsWith('guest_')) {
      try {
        serverResult = await api.endSession(this.sessionId, this.playerToken, {
          score: runSummary.score,
          maxHeight: runSummary.maxHeight,
          durationMs: runSummary.durationMs,
          reason: runSummary.reason,
          stats: runSummary.stats
        });
        if (serverResult.personalBest?.score) {
          this.personalBest = serverResult.personalBest.score;
        }
      } catch (err) {
        console.warn('Score submission failed:', err);
        isOffline = true;
      }
    } else {
      isOffline = true;
    }

    this.bridge.post('dj:game_over', {
      sessionId: this.sessionId,
      score: runSummary.score,
      accepted: Boolean(serverResult?.accepted),
      personalBest: serverResult?.personalBest,
      rank: serverResult?.rank
    });

    renderGameOverScene(this.uiContainer, {
      score: runSummary.score,
      personalBest: serverResult?.personalBest || { score: Math.max(runSummary.score, this.personalBest || 0), isNew: false },
      rank: serverResult?.rank,
      isOffline,
      rejectedReason: serverResult?.accepted === false ? serverResult.reason : null,
      onPlayAgain: () => this.startGame(),
      onLeaderboard: () => this.showLeaderboard(),
      onMenu: () => this.showMenu()
    });
  }

  update(dt) {
    const inputAxis = this.input.poll();

    if (this.state === 'playing' && this.world) {
      this.world.update(dt, inputAxis);

      // Update HUD
      if (this.hudController) {
        this.hudController.updateScore(this.world.score);
        const powerupActive = Boolean(this.world.player.activePowerup);
        const ratio = this.world.player.powerupTimer / 3.5;
        this.hudController.updatePowerup(powerupActive, ratio);
      }

      // Throttled score postMessage (1 / s)
      const now = performance.now();
      if (now - this.lastScoreReportTime >= 1000) {
        this.lastScoreReportTime = now;
        this.bridge.post('dj:score', { score: this.world.score });
      }
    } else if (this.state === 'menu' || this.state === 'boot') {
      // Menu bouncing doodle animation
      this.menuDoodlerVy -= 1300 * dt;
      this.menuDoodlerY += this.menuDoodlerVy * dt;
      if (this.menuDoodlerY <= 60 && this.menuDoodlerVy < 0) {
        this.menuDoodlerY = 60;
        this.menuDoodlerVy = 640;
      }
    }
  }

  render(alpha) {
    this.ctx.clearRect(0, 0, GAME_CONSTANTS.LOGICAL_WIDTH, GAME_CONSTANTS.LOGICAL_HEIGHT);

    if (this.state === 'playing' || this.state === 'paused' || this.state === 'gameOver') {
      if (this.world) {
        this.world.render(this.ctx, this.assets);
      }
    } else {
      // Render menu background & bouncing doodler
      const colors = this.themeLoader.currentTheme.colors || {};
      this.ctx.fillStyle = colors.background || '#f8f5e6';
      this.ctx.fillRect(0, 0, GAME_CONSTANTS.LOGICAL_WIDTH, GAME_CONSTANTS.LOGICAL_HEIGHT);

      // Grid
      const gridSize = 24;
      this.ctx.strokeStyle = colors.gridLines || '#e3dcc3';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      for (let x = 0; x <= GAME_CONSTANTS.LOGICAL_WIDTH; x += gridSize) {
        this.ctx.moveTo(x + 0.5, 0);
        this.ctx.lineTo(x + 0.5, GAME_CONSTANTS.LOGICAL_HEIGHT);
      }
      for (let y = 0; y <= GAME_CONSTANTS.LOGICAL_HEIGHT; y += gridSize) {
        this.ctx.moveTo(0, y + 0.5);
        this.ctx.lineTo(GAME_CONSTANTS.LOGICAL_WIDTH, y + 0.5);
      }
      this.ctx.stroke();

      // Platform under doodler
      const platX = 148;
      const platY = 640 - 50;
      this.assets.drawSprite(this.ctx, 'platform.normal', platX, platY, 64, 18);

      // Bouncing doodler
      const doodlerScreenY = 640 - (this.menuDoodlerY + 60);
      this.assets.drawSprite(this.ctx, 'player.right', 150, doodlerScreenY, 60, 60);
    }
  }
}

// Boot game when DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.__DJ_GAME__ = new GameApp();
});
