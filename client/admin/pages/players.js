import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

export function renderPlayersPage(container) {
  let players = [];
  let total = 0;
  let searchQ = '';
  let selectedPlayer = null;
  let selectedSession = null;

  async function loadData() {
    try {
      const data = await adminApi.get(`/players?q=${encodeURIComponent(searchQ)}&limit=50`);
      players = data.players || [];
      total = data.total || 0;
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load players: ${err.message}</div>`;
    }
  }

  async function openPlayerDetail(id) {
    try {
      selectedPlayer = await adminApi.get(`/players/${id}`);
      selectedSession = null;
      render();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function openSessionDetail(id) {
    try {
      selectedSession = await adminApi.get(`/sessions/${id}`);
      render();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function render() {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Players & Sessions</h1>
            <p class="text-xs text-gray-500">Inspect player histories, verify cheat reports, and manage bans</p>
          </div>
          <div class="flex items-center space-x-2">
            <input id="in-player-search" type="text" value="${searchQ}" placeholder="Search player name or ID..." class="px-3.5 py-1.5 text-xs border border-gray-300 rounded-xl bg-white w-64" />
            <button id="btn-search" class="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs">Search</button>
          </div>
        </div>

        <!-- Table -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div class="divide-y divide-gray-100 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th class="px-4 py-2.5">Player ID</th>
                  <th class="px-4 py-2.5">Display Name</th>
                  <th class="px-4 py-2.5">Mode</th>
                  <th class="px-4 py-2.5">External ID</th>
                  <th class="px-4 py-2.5">Status</th>
                  <th class="px-4 py-2.5">Created</th>
                  <th class="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-medium text-gray-700">
                ${
                  players.map((p) => `
                    <tr class="hover:bg-gray-50 cursor-pointer" data-id="${p.id}">
                      <td class="px-4 py-3 font-mono text-[11px] text-gray-400">${p.id}</td>
                      <td class="px-4 py-3 font-bold text-gray-900">${p.display_name}</td>
                      <td class="px-4 py-3">
                        <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${p.mode === 'host' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}">${p.mode}</span>
                      </td>
                      <td class="px-4 py-3 font-mono text-gray-500 text-[11px]">${p.external_user_id || '-'}</td>
                      <td class="px-4 py-3">
                        ${
                          p.banned_at
                            ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">BANNED</span>`
                            : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">ACTIVE</span>`
                        }
                      </td>
                      <td class="px-4 py-3 text-gray-500 text-[11px]">${new Date(p.created_at).toLocaleDateString()}</td>
                      <td class="px-4 py-3 text-right">
                        <button class="btn-inspect text-xs font-bold text-green-600 hover:text-green-800 mr-2" data-id="${p.id}">Inspect</button>
                      </td>
                    </tr>
                  `).join('') || `<tr><td colspan="7" class="p-8 text-center text-gray-400">No players found</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Player Details Modal / Drawer -->
        ${selectedPlayer ? renderPlayerDrawer(selectedPlayer) : ''}
        ${selectedSession ? renderSessionDrawer(selectedSession) : ''}
      </div>
    `;

    bindEvents();
  }

  function renderPlayerDrawer(data) {
    const p = data.player;
    const stats = data.stats;
    const sessions = data.recentSessions || [];

    return `
      <div class="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 z-50 p-6 flex flex-col justify-between overflow-y-auto">
        <div class="space-y-5">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <span class="text-[10px] font-mono text-gray-400">${p.id}</span>
              <h3 class="text-xl font-black text-gray-900">${p.display_name}</h3>
            </div>
            <button id="btn-close-player" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">✕</button>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl text-center border border-gray-100">
            <div>
              <p class="text-[10px] font-bold text-gray-400">BEST SCORE</p>
              <p class="text-base font-black text-green-600">${(stats?.bestScore || 0).toLocaleString()}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-gray-400">TOTAL RUNS</p>
              <p class="text-base font-black text-gray-800">${stats?.totalRuns || 0}</p>
            </div>
            <div>
              <p class="text-[10px] font-bold text-gray-400">ALL RANK</p>
              <p class="text-base font-black text-blue-600">#${stats?.rank?.all || '-'}</p>
            </div>
          </div>

          <!-- Ban / Unban actions -->
          <div class="flex items-center justify-between bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <span class="text-xs font-semibold text-gray-600">Account Status: <b class="${p.banned_at ? 'text-red-600' : 'text-green-600'}">${p.banned_at ? 'Banned' : 'Active'}</b></span>
            ${
              p.banned_at
                ? `<button id="btn-unban-player" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl" data-id="${p.id}">Unban Player</button>`
                : `<button id="btn-ban-player" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl" data-id="${p.id}">Ban Player</button>`
            }
          </div>

          <!-- Recent Sessions list -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider">Recent Sessions (Click to inspect)</h4>
            <div class="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden bg-white">
              ${
                sessions.map((s) => `
                  <div class="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between btn-view-session" data-id="${s.id}">
                    <div>
                      <div class="flex items-center space-x-2">
                        <span class="text-xs font-black text-gray-800">Score: ${(s.score || 0).toLocaleString()}</span>
                        <span class="px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                          s.status === 'completed' ? 'bg-green-100 text-green-800' :
                          s.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                        }">${s.status}</span>
                      </div>
                      <p class="text-[10px] text-gray-400 mt-0.5">${new Date(s.started_at).toLocaleString()} • Duration: ${Math.round((s.duration_ms || 0) / 1000)}s</p>
                    </div>
                    <span class="text-xs text-gray-400 font-bold">›</span>
                  </div>
                `).join('') || `<p class="p-4 text-center text-xs text-gray-400">No sessions found</p>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSessionDrawer(data) {
    const s = data.session;
    const events = data.events || [];

    return `
      <div class="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 z-50 p-6 flex flex-col justify-between overflow-y-auto">
        <div class="space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <span class="text-[10px] font-mono text-gray-400">Session #${s.id}</span>
              <h3 class="text-lg font-black text-gray-900">Run Inspection</h3>
            </div>
            <button id="btn-close-session" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">✕</button>
          </div>

          <div class="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-2xl border border-gray-100">
            <div><span class="text-gray-400">Score:</span> <b class="text-green-700">${s.score}</b></div>
            <div><span class="text-gray-400">Max Height:</span> <b>${s.max_height}</b></div>
            <div><span class="text-gray-400">Duration:</span> <b>${Math.round(s.duration_ms / 1000)}s</b></div>
            <div><span class="text-gray-400">Status:</span> <b class="uppercase">${s.status}</b></div>
          </div>

          <div>
            <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Event Timeline (${events.length} events)</h4>
            <div class="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              ${
                events.map((e) => `
                  <div class="p-2 bg-gray-50 rounded-xl text-xs flex items-center justify-between border border-gray-100">
                    <span class="font-mono text-[10px] text-gray-600">${e.type}</span>
                    <span class="text-[10px] text-gray-400 font-mono">${new Date(e.occurred_at).toLocaleTimeString()}</span>
                  </div>
                `).join('') || `<p class="text-xs text-gray-400">No events logged</p>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    container.querySelector('#btn-search')?.addEventListener('click', () => {
      searchQ = container.querySelector('#in-player-search')?.value.trim() || '';
      loadData();
    });

    container.querySelectorAll('.btn-inspect').forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        openPlayerDetail(btn.dataset.id);
      };
    });

    container.querySelector('#btn-close-player')?.addEventListener('click', () => {
      selectedPlayer = null;
      render();
    });

    container.querySelector('#btn-close-session')?.addEventListener('click', () => {
      selectedSession = null;
      render();
    });

    container.querySelectorAll('.btn-view-session').forEach((el) => {
      el.onclick = () => {
        openSessionDetail(el.dataset.id);
      };
    });

    container.querySelector('#btn-ban-player')?.addEventListener('click', async () => {
      const id = selectedPlayer.player.id;
      const reason = await modal.prompt({
        title: 'Ban Player',
        message: 'Reason for ban:',
        placeholder: 'Cheating'
      });
      if (reason !== null) {
        await adminApi.post(`/players/${id}/ban`, { reason });
        toast.success('Player banned');
        openPlayerDetail(id);
      }
    });

    container.querySelector('#btn-unban-player')?.addEventListener('click', async () => {
      const id = selectedPlayer.player.id;
      const ok = await modal.confirm({ title: 'Unban Player?', message: 'Restore player status?' });
      if (ok) {
        await adminApi.post(`/players/${id}/unban`);
        toast.success('Player unbanned');
        openPlayerDetail(id);
      }
    });
  }

  loadData();
}
