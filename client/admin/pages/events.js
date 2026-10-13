import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';

export function renderEventsPage(container) {
  let events = [];
  let isLive = false;
  let liveTimer = null;
  let selectedEvent = null;

  // Filters
  let filterCategory = '';
  let filterTrust = '';
  let filterSearch = '';

  async function loadData() {
    try {
      let query = `?limit=100&order=desc`;
      if (filterCategory) query += `&category=${filterCategory}`;
      if (filterTrust) query += `&trust=${filterTrust}`;
      if (filterSearch) query += `&q=${encodeURIComponent(filterSearch)}`;

      const data = await adminApi.get(`/events${query}`);
      events = data.events || [];
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load events: ${err.message}</div>`;
    }
  }

  async function pollLive() {
    if (!isLive || events.length === 0) return;
    try {
      const topSeq = events[0].seq;
      const data = await adminApi.get(`/events?after=${topSeq}&limit=50&order=desc`);
      if (data.events && data.events.length > 0) {
        events = [...data.events, ...events];
        render();
      }
    } catch {}
  }

  function render() {
    container.innerHTML = `
      <div class="space-y-6 relative">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Events Stream</h1>
            <p class="text-xs text-gray-500">Append-only audit trail and integration event feed</p>
          </div>
          <div class="flex items-center space-x-2">
            <button id="btn-live" class="px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center space-x-1.5 ${
              isLive ? 'bg-green-600 text-white border-green-700 animate-pulse' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }">
              <span>●</span>
              <span>${isLive ? 'LIVE TAIL (2s)' : 'PAUSED'}</span>
            </button>
            <a href="/api/v1/admin/events/export?format=csv" download class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl shadow-xs">Export CSV</a>
            <a href="/api/v1/admin/events/export?format=ndjson" download class="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold rounded-xl shadow-xs">Export NDJSON</a>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap gap-3 items-center">
          <div class="flex-1 min-w-[200px]">
            <input id="in-filter-search" type="text" value="${filterSearch}" placeholder="Search event data JSON..." class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
          </div>
          <div>
            <select id="sel-cat" class="px-3 py-1.5 text-xs border border-gray-300 rounded-xl bg-white font-medium">
              <option value="">All Categories</option>
              <option value="score" ${filterCategory === 'score' ? 'selected' : ''}>Score</option>
              <option value="gameplay" ${filterCategory === 'gameplay' ? 'selected' : ''}>Gameplay</option>
              <option value="player" ${filterCategory === 'player' ? 'selected' : ''}>Player</option>
              <option value="leaderboard" ${filterCategory === 'leaderboard' ? 'selected' : ''}>Leaderboard</option>
              <option value="admin" ${filterCategory === 'admin' ? 'selected' : ''}>Admin</option>
              <option value="system" ${filterCategory === 'system' ? 'selected' : ''}>System</option>
            </select>
          </div>
          <div>
            <select id="sel-trust" class="px-3 py-1.5 text-xs border border-gray-300 rounded-xl bg-white font-medium">
              <option value="">All Trust</option>
              <option value="server" ${filterTrust === 'server' ? 'selected' : ''}>Server</option>
              <option value="client" ${filterTrust === 'client' ? 'selected' : ''}>Client</option>
            </select>
          </div>
          <button id="btn-apply-filters" class="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs">Apply</button>
        </div>

        <!-- Events Table -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div class="divide-y divide-gray-100 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th class="px-4 py-2.5">Seq</th>
                  <th class="px-4 py-2.5">Time (UTC)</th>
                  <th class="px-4 py-2.5">Type</th>
                  <th class="px-4 py-2.5">Trust</th>
                  <th class="px-4 py-2.5">Player</th>
                  <th class="px-4 py-2.5">Summary</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-medium text-gray-700">
                ${
                  events.map((e) => `
                    <tr class="event-row hover:bg-gray-50/80 cursor-pointer transition-colors" data-id="${e.id}">
                      <td class="px-4 py-2.5 font-mono text-[11px] text-gray-400">#${e.seq}</td>
                      <td class="px-4 py-2.5 text-gray-500 whitespace-nowrap">${new Date(e.occurredAt).toLocaleTimeString()}</td>
                      <td class="px-4 py-2.5">
                        <span class="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          e.category === 'score' ? 'bg-amber-100 text-amber-800' :
                          e.category === 'gameplay' ? 'bg-green-100 text-green-800' :
                          e.category === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                        }">${e.type}</span>
                      </td>
                      <td class="px-4 py-2.5">
                        <span class="text-[10px] font-bold uppercase ${e.trust === 'server' ? 'text-green-600' : 'text-amber-500'}">${e.trust}</span>
                      </td>
                      <td class="px-4 py-2.5 text-gray-600 truncate max-w-[120px]">${e.player?.displayName || e.player?.id || '-'}</td>
                      <td class="px-4 py-2.5 text-gray-500 font-mono text-[11px] truncate max-w-[200px]">${JSON.stringify(e.data)}</td>
                    </tr>
                  `).join('') || `<tr><td colspan="6" class="p-8 text-center text-gray-400">No events matching filters</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Detail Drawer -->
        ${selectedEvent ? renderDetailDrawer(selectedEvent) : ''}
      </div>
    `;

    bindEvents();
  }

  function renderDetailDrawer(e) {
    return `
      <div class="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-gray-200 z-50 p-6 flex flex-col justify-between animate-slide-left">
        <div class="space-y-4 overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <span class="text-[10px] font-mono text-gray-400 uppercase">Seq #${e.seq}</span>
              <h3 class="text-base font-bold text-gray-900">${e.type}</h3>
            </div>
            <button id="btn-close-drawer" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">✕</button>
          </div>

          <div class="space-y-2 text-xs">
            <div><span class="font-bold text-gray-500">Event ID:</span> <span class="font-mono text-gray-800">${e.id}</span></div>
            <div><span class="font-bold text-gray-500">Occurred:</span> <span class="text-gray-800">${e.occurredAt}</span></div>
            <div><span class="font-bold text-gray-500">Trust Level:</span> <span class="font-bold uppercase ${e.trust === 'server' ? 'text-green-600' : 'text-amber-500'}">${e.trust}</span></div>
            ${e.sessionId ? `<div><span class="font-bold text-gray-500">Session ID:</span> <span class="font-mono text-gray-800">${e.sessionId}</span></div>` : ''}
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-bold text-gray-700">Data Envelope</span>
              <button id="btn-copy-json" class="text-[10px] font-bold text-green-600 hover:text-green-700">Copy JSON</button>
            </div>
            <pre class="bg-gray-900 text-gray-100 p-3 rounded-xl text-xs font-mono overflow-x-auto max-h-96">${JSON.stringify(e, null, 2)}</pre>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    container.querySelector('#btn-live')?.addEventListener('click', () => {
      isLive = !isLive;
      if (isLive) {
        liveTimer = setInterval(pollLive, 2000);
      } else {
        if (liveTimer) clearInterval(liveTimer);
      }
      render();
    });

    container.querySelector('#btn-apply-filters')?.addEventListener('click', () => {
      filterSearch = container.querySelector('#in-filter-search')?.value.trim() || '';
      filterCategory = container.querySelector('#sel-cat')?.value || '';
      filterTrust = container.querySelector('#sel-trust')?.value || '';
      loadData();
    });

    container.querySelectorAll('.event-row').forEach((row) => {
      row.onclick = () => {
        const id = row.dataset.id;
        selectedEvent = events.find((e) => e.id === id);
        render();
      };
    });

    container.querySelector('#btn-close-drawer')?.addEventListener('click', () => {
      selectedEvent = null;
      render();
    });

    container.querySelector('#btn-copy-json')?.addEventListener('click', () => {
      if (selectedEvent) {
        navigator.clipboard.writeText(JSON.stringify(selectedEvent, null, 2));
        toast.info('Event JSON copied to clipboard');
      }
    });
  }

  loadData();

  return () => {
    if (liveTimer) clearInterval(liveTimer);
  };
}
