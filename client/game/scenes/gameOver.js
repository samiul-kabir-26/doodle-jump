export function renderGameOverScene(container, {
  score,
  personalBest = null,
  rank = null,
  isOffline = false,
  rejectedReason = null,
  onPlayAgain,
  onLeaderboard,
  onMenu
}) {
  const isNewPB = personalBest?.isNew;
  const bestScore = personalBest?.score || score;

  container.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-5 select-none pointer-events-auto">
      <div class="bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl text-center space-y-4 border border-gray-100 animate-scale-up">
        <!-- Header -->
        <h2 class="text-2xl font-black text-gray-800 tracking-wider">GAME OVER</h2>

        <!-- Score Box -->
        <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <p class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Score</p>
          <p class="text-4xl font-black text-green-600 mb-2">${score.toLocaleString()}</p>

          <div class="flex items-center justify-center space-x-2 text-xs font-bold text-gray-600">
            <span>Best: ${bestScore.toLocaleString()}</span>
            ${isNewPB ? '<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold animate-pulse">🏆 New Best!</span>' : ''}
          </div>
        </div>

        <!-- Rank Stats -->
        ${rank ? `
          <div class="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-xl text-center border border-gray-100">
            <div>
              <p class="text-[10px] font-bold text-gray-400">TODAY</p>
              <p class="text-xs font-extrabold text-gray-800">#${rank.daily || '-'}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-gray-400">WEEK</p>
              <p class="text-xs font-extrabold text-gray-800">#${rank.weekly || '-'}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-gray-400">ALL-TIME</p>
              <p class="text-xs font-extrabold text-gray-800">#${rank.all || '-'}</p>
            </div>
          </div>
        ` : ''}

        ${isOffline ? `
          <p class="text-xs font-semibold text-amber-600">Score not saved (offline mode)</p>
        ` : ''}

        ${rejectedReason ? `
          <p class="text-xs font-semibold text-red-500">Unranked run (${rejectedReason})</p>
        ` : ''}

        <!-- Actions -->
        <div class="flex flex-col space-y-2.5 pt-1">
          <button id="go-again" class="w-full py-3.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-extrabold text-lg rounded-xl shadow-lg transition-transform">
            Play Again
          </button>
          <button id="go-lead" class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition-transform flex items-center justify-center space-x-1">
            <span>🏆</span>
            <span>Leaderboard</span>
          </button>
          <button id="go-menu" class="w-full py-2 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-bold text-sm rounded-xl transition-transform">
            Menu
          </button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#go-again').addEventListener('click', onPlayAgain);
  container.querySelector('#go-lead').addEventListener('click', onLeaderboard);
  container.querySelector('#go-menu').addEventListener('click', onMenu);
}
