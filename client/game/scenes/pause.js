export function renderPauseScene(container, { onResume, onRestart, onMenu }) {
  container.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 select-none pointer-events-auto">
      <div class="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4 border border-gray-100">
        <h2 class="text-2xl font-black text-gray-800 tracking-wide">PAUSED</h2>
        <div class="flex flex-col space-y-2.5 pt-2">
          <button id="pause-resume" class="w-full py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold rounded-xl shadow-md transition-transform">
            Resume
          </button>
          <button id="pause-restart" class="w-full py-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-bold rounded-xl transition-transform">
            Restart
          </button>
          <button id="pause-menu" class="w-full py-3 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-bold rounded-xl transition-transform">
            Main Menu
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#pause-resume').addEventListener('click', onResume);
  container.querySelector('#pause-restart').addEventListener('click', onRestart);
  container.querySelector('#pause-menu').addEventListener('click', onMenu);
}
