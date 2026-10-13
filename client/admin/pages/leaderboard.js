import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

export function renderLeaderboardPage(container) {
  let period = 'all';
  let includeHidden = true;
  let entries = [];
  let total = 0;

  async function loadData() {
    try {
      const data = await adminApi.get(
        `/leaderboard?period=${period}&includeHidden=${includeHidden}&limit=100`
      );
      entries = data.entries || [];
      total = data.total || 0;
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load leaderboard: ${err.message}</div>`;
    }
  }

  function render() {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Leaderboard Moderation</h1>
            <p class="text-xs text-gray-500">Manage scores, hide suspicious entries, and moderate rankings</p>
          </div>
          <div class="flex items-center space-x-2">
            <div class="flex bg-white rounded-xl shadow-xs border border-gray-200 p-1 space-x-1">
              <button class="period-btn px-3 py-1 text-xs font-bold rounded-lg ${period === 'daily' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-period="daily">Today</button>
              <button class="period-btn px-3 py-1 text-xs font-bold rounded-lg ${period === 'weekly' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-period="weekly">This Week</button>
              <button class="period-btn px-3 py-1 text-xs font-bold rounded-lg ${period === 'all' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-period="all">All Time</button>
            </div>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-gray-200 text-xs">
          <div class="flex items-center space-x-2">
            <input id="chk-hidden" type="checkbox" ${includeHidden ? 'checked' : ''} class="w-4 h-4 text-green-600 rounded-sm" />
            <label for="chk-hidden" class="font-bold text-gray-700 cursor-pointer">Show Hidden & Banned Scores</label>
          </div>
          <span class="text-gray-500 font-medium">Total ranked players: <b class="text-gray-900">${total.toLocaleString()}</b></span>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div class="divide-y divide-gray-100 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th class="px-4 py-2.5">Rank</th>
                  <th class="px-4 py-2.5">Player</th>
                  <th class="px-4 py-2.5">Score</th>
                  <th class="px-4 py-2.5">Achieved At</th>
                  <th class="px-4 py-2.5">Status</th>
                  <th class="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-medium text-gray-700">
                ${
                  entries.map((e) => `
                    <tr class="hover:bg-gray-50/80 ${e.hiddenAt ? 'bg-gray-50/90 text-gray-400' : ''}">
                      <td class="px-4 py-3 font-bold text-gray-500">#${e.rank}</td>
                      <td class="px-4 py-3 font-bold text-gray-900">
                        ${e.displayName}
                        ${e.banned ? '<span class="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-extrabold rounded-md">BANNED</span>' : ''}
                      </td>
                      <td class="px-4 py-3 font-mono font-black text-gray-800">${e.score.toLocaleString()}</td>
                      <td class="px-4 py-3 text-gray-500 text-[11px]">${new Date(e.achievedAt).toLocaleString()}</td>
                      <td class="px-4 py-3">
                        ${
                          e.hiddenAt
                            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800" title="${e.hiddenReason || 'Hidden'}">HIDDEN (${e.hiddenReason || 'reason omitted'})</span>`
                            : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">PUBLIC</span>`
                        }
                      </td>
                      <td class="px-4 py-3 text-right space-x-2">
                        ${
                          e.hiddenAt
                            ? `<button class="btn-restore text-xs font-bold text-green-600 hover:text-green-800" data-id="${e.id}">Restore</button>`
                            : `<button class="btn-hide text-xs font-bold text-amber-600 hover:text-amber-800" data-id="${e.id}">Hide</button>`
                        }
                        ${
                          !e.banned
                            ? `<button class="btn-ban text-xs font-bold text-red-600 hover:text-red-800" data-player="${e.playerId}">Ban Player</button>`
                            : ''
                        }
                      </td>
                    </tr>
                  `).join('') || `<tr><td colspan="6" class="p-8 text-center text-gray-400">No entries recorded</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('.period-btn').forEach((btn) => {
      btn.onclick = () => {
        period = btn.dataset.period;
        loadData();
      };
    });

    const chk = container.querySelector('#chk-hidden');
    if (chk) {
      chk.onchange = () => {
        includeHidden = chk.checked;
        loadData();
      };
    }

    container.querySelectorAll('.btn-hide').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const reason = await modal.prompt({
          title: 'Hide Score',
          message: 'Provide a reason for hiding this score (e.g. "Cheating investigation")',
          placeholder: 'Reason...'
        });
        if (reason !== null) {
          try {
            await adminApi.post(`/scores/${id}/hide`, { reason });
            toast.success('Score hidden from public leaderboard');
            loadData();
          } catch (err) {
            toast.error(err.message);
          }
        }
      };
    });

    container.querySelectorAll('.btn-restore').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const ok = await modal.confirm({
          title: 'Restore Score?',
          message: 'This score will reappear on the public leaderboard.'
        });
        if (ok) {
          try {
            await adminApi.post(`/scores/${id}/restore`);
            toast.success('Score restored');
            loadData();
          } catch (err) {
            toast.error(err.message);
          }
        }
      };
    });

    container.querySelectorAll('.btn-ban').forEach((btn) => {
      btn.onclick = async () => {
        const pId = btn.dataset.player;
        const reason = await modal.prompt({
          title: 'Ban Player',
          message: 'Specify reason for ban (their scores will be excluded from leaderboards):',
          placeholder: 'Cheating / abusive name'
        });
        if (reason !== null) {
          try {
            await adminApi.post(`/players/${pId}/ban`, { reason });
            toast.success('Player banned');
            loadData();
          } catch (err) {
            toast.error(err.message);
          }
        }
      };
    });
  }

  loadData();
}
