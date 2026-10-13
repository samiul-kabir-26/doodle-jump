import { z } from 'zod';

const assetPathRegex = /^\/(default-assets|uploads)\/[a-zA-Z0-9_\-./]+$/;

const assetPathSchema = z.string().regex(assetPathRegex, {
  message: 'Asset src must be a local path starting with /default-assets/ or /uploads/'
});

const spriteSlotSchema = z.object({
  src: assetPathSchema,
  scale: z.number().min(0.2).max(3.0).optional().default(1),
  offsetY: z.number().min(-50).max(50).optional().default(0)
});

const colorSchema = z.string().min(1).max(50);
const textSchema = z.string().max(40);

export const THEME_SPRITE_SLOTS = [
  'player.left',
  'player.right',
  'player.shoot',
  'player.propeller',
  'player.jetpack',
  'player.spring_shoes',
  'platform.normal',
  'platform.moving',
  'platform.breakable',
  'platform.breakable_broken',
  'platform.disappearing',
  'platform.exploding',
  'item.spring',
  'item.spring_used',
  'item.trampoline',
  'item.propeller',
  'item.jetpack',
  'item.spring_shoes',
  'item.shield',
  'monster.basic',
  'monster.flyer',
  'monster.big',
  'hazard.black_hole',
  'hazard.ufo',
  'projectile'
];

export const THEME_SOUND_SLOTS = [
  'sound.jump',
  'sound.spring',
  'sound.trampoline',
  'sound.break',
  'sound.propeller',
  'sound.jetpack',
  'sound.shoot',
  'sound.monster_kill',
  'sound.fall',
  'sound.game_over'
];

export const themeSchema = z.object({
  schemaVersion: z.literal(1).default(1),
  branding: z.object({
    title: textSchema.default('Jumpy Doodle'),
    subtitle: textSchema.default('How high can you go?'),
    logo: assetPathSchema.default('/default-assets/logo.svg'),
    favicon: assetPathSchema.optional(),
    fontFamily: z.string().default('sans-serif')
  }).default({}),
  colors: z.object({
    background: colorSchema.default('#f8f5e6'),
    gridLines: colorSchema.default('#e3dcc3'),
    hudText: colorSchema.default('#1f2937'),
    primary: colorSchema.default('#16a34a'),
    primaryText: colorSchema.default('#ffffff'),
    accent: colorSchema.default('#f59e0b'),
    overlay: colorSchema.default('rgba(0,0,0,0.5)')
  }).default({}),
  sprites: z.record(z.string(), spriteSlotSchema).default({}),
  background: z.object({
    image: assetPathSchema.nullable().default(null),
    parallax: z.number().min(0).max(1).default(0.5),
    pattern: z.enum(['graph-paper', 'plain']).default('graph-paper')
  }).default({}),
  sounds: z.record(z.string(), assetPathSchema).default({}),
  texts: z.object({
    play: textSchema.default('Play'),
    playAgain: textSchema.default('Play again'),
    leaderboard: textSchema.default('Leaderboard'),
    gameOver: textSchema.default('Game over!'),
    newBest: textSchema.default('New best!'),
    paused: textSchema.default('Paused'),
    resume: textSchema.default('Resume'),
    menu: textSchema.default('Menu'),
    score: textSchema.default('Score'),
    best: textSchema.default('Best')
  }).default({})
});

export const DEFAULT_THEME = {
  schemaVersion: 1,
  branding: {
    title: 'Jumpy Doodle',
    subtitle: 'How high can you go?',
    logo: '/default-assets/logo.svg',
    fontFamily: 'sans-serif'
  },
  colors: {
    background: '#f8f5e6',
    gridLines: '#e3dcc3',
    hudText: '#1f2937',
    primary: '#16a34a',
    primaryText: '#ffffff',
    accent: '#f59e0b',
    overlay: 'rgba(0,0,0,0.5)'
  },
  sprites: {
    'player.left': { src: '/default-assets/doodler-left.svg', scale: 1, offsetY: 0 },
    'player.right': { src: '/default-assets/doodler-right.svg', scale: 1, offsetY: 0 },
    'player.shoot': { src: '/default-assets/doodler-shoot.svg', scale: 1, offsetY: 0 },
    'player.propeller': { src: '/default-assets/propeller-hat.svg', scale: 1, offsetY: -20 },
    'player.jetpack': { src: '/default-assets/jetpack-worn.svg', scale: 1, offsetY: 5 },
    'player.spring_shoes': { src: '/default-assets/spring-shoes-worn.svg', scale: 1, offsetY: 20 },
    'platform.normal': { src: '/default-assets/platform-normal.svg', scale: 1, offsetY: 0 },
    'platform.moving': { src: '/default-assets/platform-moving.svg', scale: 1, offsetY: 0 },
    'platform.breakable': { src: '/default-assets/platform-breakable.svg', scale: 1, offsetY: 0 },
    'platform.breakable_broken': { src: '/default-assets/platform-broken.svg', scale: 1, offsetY: 0 },
    'platform.disappearing': { src: '/default-assets/platform-disappearing.svg', scale: 1, offsetY: 0 },
    'platform.exploding': { src: '/default-assets/platform-exploding.svg', scale: 1, offsetY: 0 },
    'item.spring': { src: '/default-assets/spring.svg', scale: 1, offsetY: 0 },
    'item.spring_used': { src: '/default-assets/spring-used.svg', scale: 1, offsetY: 0 },
    'item.trampoline': { src: '/default-assets/trampoline.svg', scale: 1, offsetY: 0 },
    'item.propeller': { src: '/default-assets/propeller-item.svg', scale: 1, offsetY: 0 },
    'item.jetpack': { src: '/default-assets/jetpack-item.svg', scale: 1, offsetY: 0 },
    'item.spring_shoes': { src: '/default-assets/spring-shoes-item.svg', scale: 1, offsetY: 0 },
    'item.shield': { src: '/default-assets/shield.svg', scale: 1, offsetY: 0 },
    'monster.basic': { src: '/default-assets/monster-basic.svg', scale: 1, offsetY: 0 },
    'monster.flyer': { src: '/default-assets/monster-flyer.svg', scale: 1, offsetY: 0 },
    'monster.big': { src: '/default-assets/monster-big.svg', scale: 1, offsetY: 0 },
    'hazard.black_hole': { src: '/default-assets/black-hole.svg', scale: 1, offsetY: 0 },
    'hazard.ufo': { src: '/default-assets/ufo.svg', scale: 1, offsetY: 0 },
    'projectile': { src: '/default-assets/projectile.svg', scale: 1, offsetY: 0 }
  },
  background: {
    image: null,
    parallax: 0.5,
    pattern: 'graph-paper'
  },
  sounds: {
    'sound.jump': '/default-assets/sfx/jump.mp3',
    'sound.spring': '/default-assets/sfx/spring.mp3',
    'sound.trampoline': '/default-assets/sfx/trampoline.mp3',
    'sound.break': '/default-assets/sfx/break.mp3',
    'sound.propeller': '/default-assets/sfx/propeller.mp3',
    'sound.jetpack': '/default-assets/sfx/jetpack.mp3',
    'sound.shoot': '/default-assets/sfx/shoot.mp3',
    'sound.monster_kill': '/default-assets/sfx/monster_kill.mp3',
    'sound.fall': '/default-assets/sfx/fall.mp3',
    'sound.game_over': '/default-assets/sfx/game_over.mp3'
  },
  texts: {
    play: 'Play',
    playAgain: 'Play again',
    leaderboard: 'Leaderboard',
    gameOver: 'Game over!',
    newBest: 'New best!',
    paused: 'Paused',
    resume: 'Resume',
    menu: 'Menu',
    score: 'Score',
    best: 'Best'
  }
};
