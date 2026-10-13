export function renderMenuScene(container, { theme, playerName, personalBest, isMuted, onPlay, onLeaderboard, onToggleMute, onToggleTilt, tiltActive }) {
  const branding = theme.branding || {};
  const texts = theme.texts || {};

  container.innerHTML = `
    <div class="absolute inset-0 flex flex-col justify-between p-6 select-none pointer-events-auto">
      <!-- Top Bar: Player badge & Mute -->
      <div class="flex items-center justify-between">
        <div class="bg-black/10 backdrop-blur-xs px-3 py-1.5 rounded-full flex items-center space-x-2 border border-black/5">
          <span class="text-xs font-bold text-gray-700">👤 ${playerName || 'Guest'}</span>
          ${personalBest ? `<span class="text-xs text-amber-600 font-extrabold">★ ${personalBest}</span>` : ''}
        </div>
        <div class="flex items-center space-x-2">
          <button id="btn-tilt" class="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 active:scale-95 flex items-center justify-center text-sm font-bold border border-black/5 ${tiltActive ? 'text-green-700 font-extrabold' : 'text-gray-600'}" title="Toggle Tilt Controls">
            📱
          </button>
          <button id="btn-mute" class="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 active:scale-95 flex items-center justify-center text-sm font-bold border border-black/5 text-gray-700" title="Toggle Sound">
            ${isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <!-- Center Branding -->
      <div class="flex flex-col items-center my-auto">
        <img src="${branding.logo || '/default-assets/logo.svg'}" alt="${branding.title || 'Jumpy Doodle'}" class="w-64 max-w-full drop-shadow-lg mb-2" />
        <p class="text-xs font-medium text-gray-600 tracking-wide">${branding.subtitle || 'How high can you go?'}</p>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col space-y-3 mb-6">
        <button id="btn-play" class="w-full py-4 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-extrabold text-xl rounded-2xl shadow-xl transition-transform tracking-wide">
          ${texts.play || 'PLAY'}
        </button>
        <button id="btn-leaderboard" class="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-base rounded-2xl shadow-lg transition-transform flex items-center justify-center space-x-2">
          <span>🏆</span>
          <span>${texts.leaderboard || 'LEADERBOARD'}</span>
        </button>
      </div>
    </div>
  `;

  container.querySelector('#btn-play').addEventListener('click', onPlay);
  container.querySelector('#btn-leaderboard').addEventListener('click', onLeaderboard);
  container.querySelector('#btn-mute').addEventListener('click', onToggleMute);
  container.querySelector('#btn-tilt').addEventListener('click', onToggleTilt);
}
