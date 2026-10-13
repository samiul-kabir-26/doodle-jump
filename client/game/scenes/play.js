export function renderPlayHUD(container, { onPause, onMute, isMuted }) {
  container.innerHTML = `
    <div class="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none select-none">
      <!-- Top HUD Header -->
      <div class="flex items-center justify-between">
        <!-- Score Display -->
        <div class="bg-black/20 backdrop-blur-xs px-3.5 py-1.5 rounded-xl border border-white/20 shadow-xs pointer-events-auto">
          <span id="hud-score" class="text-2xl font-black text-white tracking-wider drop-shadow-md">0</span>
        </div>

        <!-- Controls (Mute & Pause) -->
        <div class="flex items-center space-x-2 pointer-events-auto">
          <button id="hud-mute-btn" class="w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 active:scale-95 flex items-center justify-center text-sm border border-white/20 text-white shadow-xs">
            ${isMuted ? '🔇' : '🔊'}
          </button>
          <button id="hud-pause-btn" class="w-9 h-9 rounded-full bg-black/20 hover:bg-black/30 active:scale-95 flex items-center justify-center text-sm font-black border border-white/20 text-white shadow-xs">
            ⏸
          </button>
        </div>
      </div>

      <!-- Powerup Countdown Progress -->
      <div id="hud-powerup-bar" class="w-48 mx-auto hidden bg-black/30 rounded-full h-2 overflow-hidden border border-white/20 shadow-xs">
        <div id="hud-powerup-fill" class="bg-amber-400 h-2 rounded-full transition-all duration-75" style="width: 100%"></div>
      </div>

      <!-- Milestone Toast -->
      <div id="hud-toast" class="transition-all duration-300 transform -translate-y-4 opacity-0 text-center my-auto pointer-events-none">
        <div class="inline-block bg-amber-500 text-white font-extrabold px-5 py-2 rounded-2xl shadow-xl text-lg border-2 border-white animate-pulse">
          🎉 <span id="hud-toast-text">1000 MILESTONE!</span>
        </div>
      </div>

      <!-- Bottom Spacer for touch zones -->
      <div class="h-10"></div>
    </div>
  `;

  const pauseBtn = container.querySelector('#hud-pause-btn');
  const muteBtn = container.querySelector('#hud-mute-btn');
  pauseBtn.addEventListener('click', onPause);
  muteBtn.addEventListener('click', onMute);

  return {
    updateScore(score) {
      const el = container.querySelector('#hud-score');
      if (el) el.textContent = score.toLocaleString();
    },
    updatePowerup(active, ratio) {
      const bar = container.querySelector('#hud-powerup-bar');
      const fill = container.querySelector('#hud-powerup-fill');
      if (!bar || !fill) return;

      if (active) {
        bar.classList.remove('hidden');
        fill.style.width = `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%`;
      } else {
        bar.classList.add('hidden');
      }
    },
    showMilestone(milestone) {
      const toast = container.querySelector('#hud-toast');
      const text = container.querySelector('#hud-toast-text');
      if (!toast || !text) return;

      text.textContent = `${milestone.toLocaleString()} MILESTONE!`;
      toast.classList.remove('-translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');

      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('-translate-y-4', 'opacity-0');
      }, 2000);
    }
  };
}
