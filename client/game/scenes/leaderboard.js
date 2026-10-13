import { api } from '../net/api.js';

export function renderLeaderboardScene(container, { currentPlayerId, playerToken, onBack }) {
  let currentPeriod = 'all';

  function renderLayout() {
    container.innerHTML = `
      <div class="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col p-4 select-none pointer-events-auto">
        <!-- Top Bar -->
        <div class="flex items-center justify-between mb-4">
          <button id="lb-back" class="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 active:scale-95 flex items-center justify-center text-sm font-bold text-gray-700">
            ←
          </button>
          <h2 class="text-xl font-black text-gray-800 tracking-wide">LEADERBOARD</h2>
          <div class="w-9"></div>
        </div>

        <!-- Period Tabs -->
        <div class="flex bg-gray-100 p-1 rounded-xl mb-3 space-x-1">
          <button class="lb-tab flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentPeriod === 'daily' ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500'}" data-period="daily">Today</button>
          <button class="lb-tab flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentPeriod === 'weekly' ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500'}" data-period="weekly">This Week</button>
          <button class="lb-tab flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${currentPeriod === 'all' ? 'bg-white text-green-700 shadow-xs' : 'text-gray-500'}" data-period="all">All Time</button>
        </div>

        <!-- Table Header -->
        <div class="flex text-[10px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">
          <span class="w-10">Rank</span>
          <span class="flex-1">Player</span>
          <span class="w-20 text-right">Score</span>
        </div>

        <!-- Scrollable Leaderboard List -->
        <div id="lb-list" class="flex-1 overflow-y-auto space-y-1 pr-1 pb-2">
          <div class="py-12 text-center text-xs text-gray-400">Loading rankings...</div>
        </div>

        <!-- Pinned My Score Box (if applicable) -->
        <div id="lb-my-row" class="mt-2 pt-2 border-t border-gray-100"></div>
      </div>
    `;

    container.querySelector('#lb-back').addEventListener('click', onBack);

    container.querySelectorAll('.lb-tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentPeriod = btn.dataset.period;
        renderLayout();
        loadData();
      });
    });
  }

  async function loadData() {
    const listEl = container.querySelector('#lb-list');
    const myRowEl = container.querySelector('#lb-my-row');

    try {
      const data = await api.fetchLeaderboard({ period: currentPeriod, limit: 100 });
      let myRankData = null;
      if (playerToken) {
        myRankData = await api.fetchMeLeaderboard(currentPeriod, playerToken);
      }

      if (!data.entries || data.entries.length === 0) {
        listEl.innerHTML = `<div class="py-12 text-center text-xs text-gray-400">No scores recorded yet for this period. Be the first!</div>`;
        myRowEl.innerHTML = '';
        return;
      }

      let isMeInList = false;

      listEl.innerHTML = data.entries
        .map((entry) => {
          const isMe = entry.playerId === currentPlayerId;
          if (isMe) isMeInList = true;

          let rankBadge = `#${entry.rank}`;
          if (entry.rank === 1) rankBadge = '🥇';
          else if (entry.rank === 2) rankBadge = '🥈';
          else if (entry.rank === 3) rankBadge = '🥉';

          return `
            <div class="flex items-center px-3 py-2 rounded-xl text-xs font-semibold ${
              isMe ? 'bg-green-50 border border-green-200 text-green-900 font-bold' : 'bg-gray-50/70 text-gray-700'
            }">
              <span class="w-10 text-xs font-bold text-gray-500">${rankBadge}</span>
              <span class="flex-1 truncate">${entry.displayName} ${isMe ? '<span class="text-[10px] text-green-600 font-extrabold">(You)</span>' : ''}</span>
              <span class="w-20 text-right font-black text-gray-800">${entry.score.toLocaleString()}</span>
            </div>
          `;
        })
        .join('');

      // Pin my row at bottom if I have a score but am not in the current list
      if (!isMeInList && myRankData && myRankData.rank) {
        myRowEl.innerHTML = `
          <div class="flex items-center px-3 py-2 bg-green-50 rounded-xl border border-green-200 text-xs text-green-900 font-bold">
            <span class="w-10 text-xs font-extrabold text-green-700">#${myRankData.rank}</span>
            <span class="flex-1 truncate">Your Best Ranking</span>
            <span class="w-20 text-right font-black text-green-800">${myRankData.score.toLocaleString()}</span>
          </div>
        `;
      } else {
        myRowEl.innerHTML = '';
      }
    } catch (err) {
      listEl.innerHTML = `<div class="py-12 text-center text-xs text-red-400">Failed to load leaderboard (${err.message})</div>`;
    }
  }

  renderLayout();
  loadData();
}
