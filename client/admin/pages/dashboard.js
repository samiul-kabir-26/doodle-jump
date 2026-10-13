import { adminApi } from '../api.js';

export function renderDashboardPage(container) {
  let range = '24h';
  let refreshTimer = null;

  async function loadData() {
    try {
      const data = await adminApi.get(`/dashboard?range=${range}`);
      renderView(data);
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load dashboard: ${err.message}</div>`;
    }
  }

  function renderView(data) {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Title & Range selector -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Dashboard</h1>
            <p class="text-xs text-gray-500">Overview of gameplay activity, player metrics, and webhook health</p>
          </div>
          <div class="flex bg-white rounded-xl shadow-xs border border-gray-200 p-1 space-x-1">
            <button class="range-btn px-3 py-1 text-xs font-bold rounded-lg transition-colors ${range === '24h' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-range="24h">24 Hours</button>
            <button class="range-btn px-3 py-1 text-xs font-bold rounded-lg transition-colors ${range === '7d' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-range="7d">7 Days</button>
            <button class="range-btn px-3 py-1 text-xs font-bold rounded-lg transition-colors ${range === '30d' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-range="30d">30 Days</button>
          </div>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Runs</p>
            <p class="text-2xl font-black text-gray-900">${(data.runs || 0).toLocaleString()}</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Unique Players</p>
            <p class="text-2xl font-black text-blue-600">${(data.uniquePlayers || 0).toLocaleString()}</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Avg Score</p>
            <p class="text-2xl font-black text-amber-600">${(data.avgScore || 0).toLocaleString()}</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Max Score</p>
            <p class="text-2xl font-black text-green-600">${(data.maxScore || 0).toLocaleString()}</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs col-span-2 md:col-span-1">
            <p class="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rejected Runs</p>
            <p class="text-2xl font-black ${data.rejectedRuns > 0 ? 'text-red-500' : 'text-gray-400'}">${(data.rejectedRuns || 0).toLocaleString()}</p>
          </div>
        </div>

        <!-- Chart & Webhook Status -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Events Activity Canvas Chart -->
          <div class="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-gray-800">Events / Minute (Last 24h)</h3>
              <span class="text-[10px] font-semibold text-gray-400">Activity volume</span>
            </div>
            <div class="w-full h-48 relative">
              <canvas id="events-chart" class="w-full h-full block"></canvas>
            </div>
          </div>

          <!-- Webhook Health Card -->
          <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-gray-800">Webhook Status</h3>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                data.webhook.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }">
                ${data.webhook.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>

            <div class="space-y-3 pt-2">
              <div class="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                <span class="text-gray-500 font-medium">Pending Deliveries</span>
                <span class="font-bold text-gray-800">${data.webhook.pending || 0}</span>
              </div>
              <div class="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                <span class="text-gray-500 font-medium">Failed in 24h</span>
                <span class="font-bold ${data.webhook.failedLast24h > 0 ? 'text-red-600' : 'text-gray-800'}">${data.webhook.failedLast24h || 0}</span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500 font-medium">Last Success</span>
                <span class="font-bold text-gray-700">${data.webhook.lastSuccessAt ? new Date(data.webhook.lastSuccessAt).toLocaleTimeString() : 'Never'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Latest Events -->
        <div class="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div class="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 class="text-sm font-bold text-gray-800">Latest Live Events</h3>
            <span class="text-[10px] font-semibold text-gray-400">Refreshes every 5s</span>
          </div>

          <div class="divide-y divide-gray-100 overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-gray-50 text-gray-400 font-bold uppercase text-[10px]">
                <tr>
                  <th class="px-4 py-2">Seq</th>
                  <th class="px-4 py-2">Time</th>
                  <th class="px-4 py-2">Type</th>
                  <th class="px-4 py-2">Trust</th>
                  <th class="px-4 py-2">Player</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 font-medium text-gray-700">
                ${
                  (data.latestEvents || []).map((e) => `
                    <tr class="hover:bg-gray-50/80">
                      <td class="px-4 py-2.5 font-mono text-[11px] text-gray-400">#${e.seq}</td>
                      <td class="px-4 py-2.5 text-gray-500">${new Date(e.occurredAt).toLocaleTimeString()}</td>
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
                    </tr>
                  `).join('') || `<tr><td colspan="5" class="p-6 text-center text-gray-400">No events recorded yet</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Render chart
    drawChart(data.eventsPerMinute || []);

    // Bind range buttons
    container.querySelectorAll('.range-btn').forEach((btn) => {
      btn.onclick = () => {
        range = btn.dataset.range;
        loadData();
      };
    });
  }

  function drawChart(points) {
    const canvas = container.querySelector('#events-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    if (points.length < 2) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Not enough data to display chart', w / 2, h / 2);
      return;
    }

    const counts = points.map((p) => p.count);
    const max = Math.max(5, ...counts);

    ctx.beginPath();
    ctx.strokeStyle = '#16a34a';
    ctx.lineWidth = 2;

    points.forEach((p, idx) => {
      const x = (idx / (points.length - 1)) * (w - 20) + 10;
      const y = h - 20 - (p.count / max) * (h - 40);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  loadData();
  refreshTimer = setInterval(loadData, 5000);

  return () => {
    if (refreshTimer) clearInterval(refreshTimer);
  };
}
