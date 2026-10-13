import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/default-assets');

const svgs = {
  'logo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 80" width="280" height="80">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="2" dy="4" stdDeviation="2" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  <rect x="5" y="5" width="270" height="70" rx="20" fill="#70c040" filter="url(#shadow)"/>
  <rect x="8" y="8" width="264" height="64" rx="17" fill="none" stroke="#559930" stroke-width="3" stroke-dasharray="6,4"/>
  <text x="140" y="48" font-family="'Comic Sans MS', cursive, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="1">JUMPY DOODLE</text>
  <circle cx="28" cy="24" r="7" fill="#f8e71c"/>
  <circle cx="250" cy="56" r="5" fill="#f8e71c"/>
</svg>`,

  'doodler-right.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <!-- Feet -->
  <ellipse cx="20" cy="56" rx="4" ry="3" fill="#8ca93e"/>
  <ellipse cx="28" cy="57" rx="4" ry="2.5" fill="#8ca93e"/>
  <ellipse cx="36" cy="56" rx="4" ry="3" fill="#8ca93e"/>
  <ellipse cx="44" cy="57" rx="4" ry="2.5" fill="#8ca93e"/>
  <!-- Body -->
  <path d="M 18,36 C 16,18 24,10 35,10 C 47,10 52,20 52,36 C 52,48 46,54 34,54 C 22,54 18,48 18,36 Z" fill="#bada55" stroke="#728c28" stroke-width="2.5"/>
  <!-- Snout -->
  <path d="M 45,28 C 54,27 58,28 60,31 C 58,34 54,34 45,33 Z" fill="#bada55" stroke="#728c28" stroke-width="2.5"/>
  <!-- Snout hole -->
  <ellipse cx="58" cy="31" rx="1.5" ry="2.5" fill="#586d1f"/>
  <!-- Eyes -->
  <ellipse cx="33" cy="20" rx="3.5" ry="4.5" fill="#ffffff" stroke="#728c28" stroke-width="1.5"/>
  <ellipse cx="42" cy="19" rx="3.5" ry="4.5" fill="#ffffff" stroke="#728c28" stroke-width="1.5"/>
  <!-- Pupils -->
  <circle cx="35" cy="20" r="2" fill="#1f2937"/>
  <circle cx="44" cy="19" r="2" fill="#1f2937"/>
  <circle cx="36" cy="19" r="0.7" fill="#ffffff"/>
  <circle cx="45" cy="18" r="0.7" fill="#ffffff"/>
</svg>`,

  'doodler-left.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <!-- Feet -->
  <ellipse cx="40" cy="56" rx="4" ry="3" fill="#8ca93e"/>
  <ellipse cx="32" cy="57" rx="4" ry="2.5" fill="#8ca93e"/>
  <ellipse cx="24" cy="56" rx="4" ry="3" fill="#8ca93e"/>
  <ellipse cx="16" cy="57" rx="4" ry="2.5" fill="#8ca93e"/>
  <!-- Body -->
  <path d="M 42,36 C 44,18 36,10 25,10 C 13,10 8,20 8,36 C 8,48 14,54 26,54 C 38,54 42,48 42,36 Z" fill="#bada55" stroke="#728c28" stroke-width="2.5"/>
  <!-- Snout -->
  <path d="M 15,28 C 6,27 2,28 0,31 C 2,34 6,34 15,33 Z" fill="#bada55" stroke="#728c28" stroke-width="2.5"/>
  <!-- Snout hole -->
  <ellipse cx="2" cy="31" rx="1.5" ry="2.5" fill="#586d1f"/>
  <!-- Eyes -->
  <ellipse cx="27" cy="20" rx="3.5" ry="4.5" fill="#ffffff" stroke="#728c28" stroke-width="1.5"/>
  <ellipse cx="18" cy="19" rx="3.5" ry="4.5" fill="#ffffff" stroke="#728c28" stroke-width="1.5"/>
  <!-- Pupils -->
  <circle cx="25" cy="20" r="2" fill="#1f2937"/>
  <circle cx="16" cy="19" r="2" fill="#1f2937"/>
  <circle cx="24" cy="19" r="0.7" fill="#ffffff"/>
  <circle cx="15" cy="18" r="0.7" fill="#ffffff"/>
</svg>`,

  'doodler-shoot.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="60" height="60">
  <!-- Feet -->
  <ellipse cx="20" cy="56" rx="4" ry="3" fill="#8ca93e"/>
  <ellipse cx="28" cy="57" rx="4" ry="2.5" fill="#8ca93e"/>
  <ellipse cx="32" cy="57" rx="4" ry="2.5" fill="#8ca93e"/>
  <ellipse cx="40" cy="56" rx="4" ry="3" fill="#8ca93e"/>
  <!-- Body -->
  <path d="M 18,38 C 17,22 23,16 30,16 C 37,16 43,22 42,38 C 42,48 38,54 30,54 C 22,54 18,48 18,38 Z" fill="#bada55" stroke="#728c28" stroke-width="2.5"/>
  <!-- Snout pointing straight up -->
  <path d="M 27,18 L 26,4 C 27,1 33,1 34,4 L 33,18 Z" fill="#bada55" stroke="#728c28" stroke-width="2.5"/>
  <!-- Snout hole -->
  <ellipse cx="30" cy="3" rx="3" ry="1.8" fill="#586d1f"/>
  <!-- Eyes -->
  <ellipse cx="24" cy="25" rx="3.5" ry="4.5" fill="#ffffff" stroke="#728c28" stroke-width="1.5"/>
  <ellipse cx="36" cy="25" rx="3.5" ry="4.5" fill="#ffffff" stroke="#728c28" stroke-width="1.5"/>
  <!-- Pupils looking up -->
  <circle cx="24" cy="23" r="2" fill="#1f2937"/>
  <circle cx="36" cy="23" r="2" fill="#1f2937"/>
</svg>`,

  'propeller-hat.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 25" width="40" height="25">
  <rect x="18" y="6" width="4" height="10" fill="#4a5568"/>
  <ellipse cx="20" cy="5" rx="16" ry="3" fill="#f59e0b"/>
  <circle cx="20" cy="5" r="3" fill="#dc2626"/>
  <!-- Cap base -->
  <path d="M 10,18 C 10,13 30,13 30,18 Z" fill="#3b82f6"/>
</svg>`,

  'jetpack-worn.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 40" width="30" height="40">
  <rect x="4" y="6" width="9" height="24" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
  <rect x="17" y="6" width="9" height="24" rx="4" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
  <path d="M 6,30 L 11,30 L 8.5,38 Z" fill="#f97316"/>
  <path d="M 19,30 L 24,30 L 21.5,38 Z" fill="#f97316"/>
  <path d="M 7,30 L 10,30 L 8.5,35 Z" fill="#fde047"/>
  <path d="M 20,30 L 23,30 L 21.5,35 Z" fill="#fde047"/>
</svg>`,

  'spring-shoes-worn.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20" width="40" height="20">
  <path d="M 8,2 L 18,2 L 15,10 L 11,10 Z" fill="#ef4444"/>
  <path d="M 22,2 L 32,2 L 29,10 L 25,10 Z" fill="#ef4444"/>
  <path d="M 13,10 Q 17,13 13,16 Q 9,18 13,20" fill="none" stroke="#64748b" stroke-width="2"/>
  <path d="M 27,10 Q 31,13 27,16 Q 23,18 27,20" fill="none" stroke="#64748b" stroke-width="2"/>
</svg>`,

  'platform-normal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 18" width="64" height="18">
  <rect x="2" y="2" width="60" height="14" rx="7" fill="#69be28" stroke="#4a871b" stroke-width="1.5"/>
  <!-- Highlight -->
  <path d="M 9,5 L 55,5" stroke="#9de356" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  'platform-moving.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 18" width="64" height="18">
  <rect x="2" y="2" width="60" height="14" rx="7" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/>
  <path d="M 9,5 L 55,5" stroke="#93c5fd" stroke-width="2" stroke-linecap="round"/>
  <!-- Arrow indicators -->
  <polygon points="12,9 16,6 16,12" fill="#ffffff" opacity="0.7"/>
  <polygon points="52,9 48,6 48,12" fill="#ffffff" opacity="0.7"/>
</svg>`,

  'platform-breakable.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 18" width="64" height="18">
  <rect x="2" y="2" width="60" height="14" rx="5" fill="#a16207" stroke="#713f12" stroke-width="1.5"/>
  <!-- Cracks -->
  <path d="M 28,2 L 32,7 L 30,11 L 34,16" stroke="#451a03" stroke-width="1.5" fill="none"/>
</svg>`,

  'platform-broken.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 24" width="64" height="24">
  <!-- Left broken half -->
  <polygon points="2,2 28,2 26,16 2,14" fill="#a16207" stroke="#713f12" stroke-width="1.5"/>
  <!-- Right broken half falling -->
  <polygon points="34,6 62,2 62,14 36,20" fill="#a16207" stroke="#713f12" stroke-width="1.5"/>
</svg>`,

  'platform-disappearing.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 18" width="64" height="18">
  <rect x="2" y="2" width="60" height="14" rx="7" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" opacity="0.9"/>
  <ellipse cx="20" cy="9" rx="8" ry="4" fill="#e2e8f0" opacity="0.5"/>
  <ellipse cx="44" cy="9" rx="8" ry="4" fill="#e2e8f0" opacity="0.5"/>
</svg>`,

  'platform-exploding.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 18" width="64" height="18">
  <rect x="2" y="2" width="60" height="14" rx="7" fill="#ea580c" stroke="#9a3412" stroke-width="1.5"/>
  <path d="M 8,2 L 14,16 M 20,2 L 26,16 M 32,2 L 38,16 M 44,2 L 50,16" stroke="#fbbf24" stroke-width="2"/>
</svg>`,

  'spring.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 16" width="20" height="16">
  <rect x="2" y="13" width="16" height="3" rx="1" fill="#475569"/>
  <path d="M 5,13 Q 15,10 5,8 Q 15,5 5,2 L 15,2" fill="none" stroke="#94a3b8" stroke-width="2"/>
</svg>`,

  'spring-used.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 30" width="20" height="30">
  <rect x="2" y="27" width="16" height="3" rx="1" fill="#475569"/>
  <path d="M 5,27 Q 16,21 5,16 Q 16,10 5,5 L 15,2" fill="none" stroke="#94a3b8" stroke-width="2"/>
</svg>`,

  'trampoline.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 16" width="32" height="16">
  <!-- Legs -->
  <line x1="6" y1="9" x2="4" y2="15" stroke="#334155" stroke-width="2"/>
  <line x1="26" y1="9" x2="28" y2="15" stroke="#334155" stroke-width="2"/>
  <!-- Rim -->
  <rect x="2" y="4" width="28" height="6" rx="3" fill="#dc2626" stroke="#991b1b" stroke-width="1"/>
  <!-- Mesh -->
  <ellipse cx="16" cy="7" rx="11" ry="2" fill="#1e293b"/>
</svg>`,

  'propeller-item.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 20" width="28" height="20">
  <rect x="12" y="5" width="4" height="8" fill="#4a5568"/>
  <ellipse cx="14" cy="4" rx="12" ry="2.5" fill="#f59e0b"/>
  <circle cx="14" cy="4" r="2.5" fill="#dc2626"/>
  <path d="M 6,15 C 6,10 22,10 22,15 Z" fill="#3b82f6"/>
</svg>`,

  'jetpack-item.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30" width="24" height="30">
  <rect x="2" y="4" width="8" height="20" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
  <rect x="14" y="4" width="8" height="20" rx="3" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
  <rect x="8" y="10" width="8" height="8" fill="#ef4444"/>
  <path d="M 4,24 L 8,24 L 6,29 Z" fill="#f97316"/>
  <path d="M 16,24 L 20,24 L 18,29 Z" fill="#f97316"/>
</svg>`,

  'spring-shoes-item.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 18" width="30" height="18">
  <path d="M 4,2 L 12,2 L 10,8 L 6,8 Z" fill="#ef4444"/>
  <path d="M 16,2 L 24,2 L 22,8 L 18,8 Z" fill="#ef4444"/>
  <path d="M 8,8 Q 12,11 8,14 Q 4,16 8,18" fill="none" stroke="#64748b" stroke-width="1.5"/>
  <path d="M 20,8 Q 24,11 20,14 Q 16,16 20,18" fill="none" stroke="#64748b" stroke-width="1.5"/>
</svg>`,

  'shield.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28">
  <circle cx="14" cy="14" r="12" fill="#38bdf8" fill-opacity="0.3" stroke="#0284c7" stroke-width="2"/>
  <path d="M 14,6 L 21,9 L 21,15 C 21,19 14,22 14,22 C 14,22 7,19 7,15 L 7,9 Z" fill="#0284c7" opacity="0.8"/>
</svg>`,

  'monster-basic.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40" width="50" height="40">
  <!-- Body -->
  <path d="M 8,24 C 6,10 18,6 25,6 C 32,6 44,10 42,24 C 41,34 33,36 25,36 C 17,36 9,34 8,24 Z" fill="#9333ea" stroke="#6b21a8" stroke-width="2"/>
  <!-- Horns -->
  <polygon points="12,8 10,2 16,7" fill="#fbbf24"/>
  <polygon points="38,8 40,2 34,7" fill="#fbbf24"/>
  <!-- Eye -->
  <ellipse cx="25" cy="18" rx="8" ry="8" fill="#ffffff" stroke="#6b21a8" stroke-width="1.5"/>
  <circle cx="25" cy="18" r="4" fill="#dc2626"/>
  <circle cx="26" cy="17" r="1.5" fill="#ffffff"/>
  <!-- Mouth -->
  <path d="M 18,28 Q 25,33 32,28" stroke="#4a044e" stroke-width="2" fill="none"/>
</svg>`,

  'monster-flyer.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 40" width="50" height="40">
  <!-- Wings -->
  <path d="M 4,14 C 0,6 12,8 16,14 Z" fill="#67e8f9" opacity="0.8"/>
  <path d="M 46,14 C 50,6 38,8 34,14 Z" fill="#67e8f9" opacity="0.8"/>
  <!-- Body -->
  <circle cx="25" cy="20" r="14" fill="#06b6d4" stroke="#0e7490" stroke-width="2"/>
  <!-- Eyes -->
  <circle cx="20" cy="18" r="3.5" fill="#ffffff"/>
  <circle cx="30" cy="18" r="3.5" fill="#ffffff"/>
  <circle cx="21" cy="18" r="2" fill="#0f172a"/>
  <circle cx="31" cy="18" r="2" fill="#0f172a"/>
  <!-- Smile with tooth -->
  <path d="M 19,25 Q 25,30 31,25" stroke="#0e7490" stroke-width="2" fill="none"/>
</svg>`,

  'monster-big.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 55" width="70" height="55">
  <!-- Body -->
  <path d="M 10,32 C 6,12 24,8 35,8 C 46,8 64,12 60,32 C 58,48 46,50 35,50 C 24,50 12,48 10,32 Z" fill="#e11d48" stroke="#9f1239" stroke-width="2.5"/>
  <!-- Spikes -->
  <polygon points="18,10 14,2 24,8" fill="#facc15"/>
  <polygon points="35,8 35,0 39,8" fill="#facc15"/>
  <polygon points="52,10 56,2 46,8" fill="#facc15"/>
  <!-- 3 Eyes -->
  <circle cx="22" cy="22" r="5" fill="#ffffff" stroke="#9f1239" stroke-width="1.5"/>
  <circle cx="35" cy="20" r="6" fill="#ffffff" stroke="#9f1239" stroke-width="1.5"/>
  <circle cx="48" cy="22" r="5" fill="#ffffff" stroke="#9f1239" stroke-width="1.5"/>
  <circle cx="22" cy="22" r="2.5" fill="#1e1b4b"/>
  <circle cx="35" cy="20" r="3" fill="#1e1b4b"/>
  <circle cx="48" cy="22" r="2.5" fill="#1e1b4b"/>
  <!-- Mouth with fangs -->
  <path d="M 22,36 Q 35,44 48,36" stroke="#4c0519" stroke-width="2.5" fill="none"/>
  <polygon points="28,37 31,41 33,37" fill="#ffffff"/>
  <polygon points="37,37 39,41 42,37" fill="#ffffff"/>
</svg>`,

  'black-hole.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <radialGradient id="bh" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#000000"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="85%" stop-color="#6366f1" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="24" cy="24" r="22" fill="url(#bh)"/>
  <circle cx="24" cy="24" r="10" fill="#000000" stroke="#c084fc" stroke-width="1.5"/>
  <!-- Spiral arms -->
  <path d="M 24,14 A 10,10 0 0,1 34,24" stroke="#e9d5ff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/>
  <path d="M 24,34 A 10,10 0 0,1 14,24" stroke="#e9d5ff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.6"/>
</svg>`,

  'ufo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="60" height="40">
  <!-- Dome -->
  <ellipse cx="30" cy="16" rx="14" ry="10" fill="#67e8f9" opacity="0.8" stroke="#0891b2" stroke-width="1.5"/>
  <circle cx="30" cy="16" r="4" fill="#a5f3fc"/>
  <!-- Saucer -->
  <ellipse cx="30" cy="24" rx="26" ry="8" fill="#475569" stroke="#1e293b" stroke-width="2"/>
  <!-- Lights -->
  <circle cx="16" cy="24" r="2" fill="#facc15"/>
  <circle cx="25" cy="26" r="2" fill="#22c55e"/>
  <circle cx="35" cy="26" r="2" fill="#22c55e"/>
  <circle cx="44" cy="24" r="2" fill="#facc15"/>
</svg>`,

  'projectile.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10">
  <circle cx="5" cy="5" r="4" fill="#f59e0b" stroke="#b45309" stroke-width="1"/>
  <circle cx="4" cy="4" r="1.5" fill="#fef08a"/>
</svg>`
};

for (const [filename, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(outDir, filename), content.trim());
}
console.log('SVGs created successfully:', Object.keys(svgs).length);
