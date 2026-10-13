import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';

export function renderSettingsPage(container) {
  let settings = null;
  let deliveries = [];

  async function loadData() {
    try {
      settings = await adminApi.get('/settings');
      const delivRes = await adminApi.get('/webhooks/deliveries?limit=10');
      deliveries = delivRes.deliveries || [];
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load settings: ${err.message}</div>`;
    }
  }

  function render() {
    const gp = settings.gameplay || {};
    const ac = settings.antiCheat || {};
    const wh = settings.webhook || {};
    const integ = settings.integration || {};

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">System Settings</h1>
          <p class="text-xs text-gray-500">Tunables, anti-cheat limits, webhooks, and integration config</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- 1. Gameplay Tuning -->
          <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🎮 Gameplay Mechanics</h3>

            <div class="space-y-3">
              <div>
                <div class="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Difficulty Multiplier</span>
                  <span id="lbl-diff">${gp.difficultyMultiplier || 1.0}×</span>
                </div>
                <input id="in-diff" type="range" min="0.5" max="2.0" step="0.1" value="${gp.difficultyMultiplier || 1.0}" class="w-full accent-green-600" />
              </div>

              <div>
                <div class="flex justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Power-up Spawn Rate Multiplier</span>
                  <span id="lbl-powerup">${gp.powerupRateMultiplier || 1.0}×</span>
                </div>
                <input id="in-powerup" type="range" min="0.5" max="2.0" step="0.1" value="${gp.powerupRateMultiplier || 1.0}" class="w-full accent-green-600" />
              </div>

              <div class="pt-2 border-t border-gray-100">
                <span class="block text-xs font-bold text-gray-700 mb-2">Enabled Entities</span>
                <div class="grid grid-cols-2 gap-2 text-xs font-semibold text-gray-600">
                  <label class="flex items-center space-x-2"><input type="checkbox" class="chk-entity" data-key="monsters" ${gp.enabled?.monsters !== false ? 'checked' : ''} /> <span>Monsters</span></label>
                  <label class="flex items-center space-x-2"><input type="checkbox" class="chk-entity" data-key="blackHoles" ${gp.enabled?.blackHoles !== false ? 'checked' : ''} /> <span>Black Holes</span></label>
                  <label class="flex items-center space-x-2"><input type="checkbox" class="chk-entity" data-key="propeller" ${gp.enabled?.propeller !== false ? 'checked' : ''} /> <span>Propeller Hat</span></label>
                  <label class="flex items-center space-x-2"><input type="checkbox" class="chk-entity" data-key="jetpack" ${gp.enabled?.jetpack !== false ? 'checked' : ''} /> <span>Jetpack</span></label>
                  <label class="flex items-center space-x-2"><input type="checkbox" class="chk-entity" data-key="springShoes" ${gp.enabled?.springShoes !== false ? 'checked' : ''} /> <span>Spring Shoes</span></label>
                  <label class="flex items-center space-x-2"><input type="checkbox" class="chk-entity" data-key="shooting" ${gp.enabled?.shooting !== false ? 'checked' : ''} /> <span>Shooting</span></label>
                </div>
              </div>

              <button id="btn-save-gameplay" class="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                Save Gameplay Settings
              </button>
            </div>
          </div>

          <!-- 2. Anti-Cheat -->
          <div class="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🛡 Anti-Cheat Rules</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Max Score Rate (points / second)</label>
                <input id="in-max-rate" type="number" value="${ac.maxScoreRate || 450}" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
                <p class="text-[10px] text-gray-400 mt-1">Runs with higher score rates are flagged and rejected.</p>
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Min Run Duration (ms)</label>
                <input id="in-min-dur" type="number" value="${ac.minDurationMs || 3000}" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>

              <button id="btn-save-anticheat" class="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors">
                Save Anti-Cheat Settings
              </button>
            </div>
          </div>

          <!-- 3. Webhooks & Delivery -->
          <div class="lg:col-span-2 bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <div class="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 class="text-sm font-bold text-gray-800">⚡ Webhook Outbound Events</h3>
              <label class="flex items-center space-x-2 text-xs font-bold cursor-pointer">
                <input id="chk-wh-enabled" type="checkbox" ${wh.enabled ? 'checked' : ''} class="w-4 h-4 text-green-600 rounded-sm" />
                <span>Enable Webhook Dispatch</span>
              </label>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">Webhook Target URL</label>
                <input id="in-wh-url" type="url" value="${wh.url || ''}" placeholder="https://api.yourhost.com/hooks/doodle-jump" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>

              <div>
                <label class="block text-xs font-bold text-gray-700 mb-1">HMAC Secret (${wh.secretSet ? 'Configured ✓' : 'Unset'})</label>
                <input id="in-wh-secret" type="password" placeholder="Leave blank to keep existing secret" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button id="btn-save-webhook" class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs">
                Save Webhook Settings
              </button>
              <button id="btn-test-webhook" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl">
                Send Test Webhook Ping
              </button>
            </div>

            <!-- Recent Deliveries Table -->
            <div class="pt-4 border-t border-gray-100">
              <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Recent Webhook Deliveries</h4>
              <div class="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                <table class="w-full text-left text-xs">
                  <thead class="bg-gray-50 text-gray-400 font-bold text-[10px]">
                    <tr>
                      <th class="px-3 py-2">ID</th>
                      <th class="px-3 py-2">Event</th>
                      <th class="px-3 py-2">Status</th>
                      <th class="px-3 py-2">HTTP</th>
                      <th class="px-3 py-2">Attempts</th>
                      <th class="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 font-medium text-gray-700">
                    ${
                      deliveries.map((d) => `
                        <tr>
                          <td class="px-3 py-2 font-mono text-[10px] text-gray-400">${d.id}</td>
                          <td class="px-3 py-2 font-mono text-[10px] text-gray-700">${d.event_type || 'event'}</td>
                          <td class="px-3 py-2">
                            <span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                              d.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              d.status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }">${d.status}</span>
                          </td>
                          <td class="px-3 py-2 text-gray-500">${d.last_status_code || '-'}</td>
                          <td class="px-3 py-2 text-gray-500">${d.attempts}</td>
                          <td class="px-3 py-2 text-right">
                            ${d.status !== 'delivered' ? `<button class="btn-retry-delivery text-[10px] font-bold text-green-600 hover:text-green-800" data-id="${d.id}">Retry</button>` : '-'}
                          </td>
                        </tr>
                      `).join('') || `<tr><td colspan="6" class="p-4 text-center text-gray-400">No deliveries recorded</td></tr>`
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- 4. Host Integration Information -->
          <div class="lg:col-span-2 bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-3">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">🔗 Host Embed Snippet</h3>
            <p class="text-xs text-gray-500">Copy this iframe snippet to embed Jumpy Doodle into any host application:</p>
            <pre class="bg-gray-900 text-gray-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto">&lt;iframe
  src="${integ.baseUrl}/?token=HOST_LAUNCH_JWT"
  style="width: 100%; max-width: 420px; aspect-ratio: 9/16; border: 0;"
  allow="accelerometer; gyroscope; autoplay"
  title="Jumpy Doodle"&gt;&lt;/iframe&gt;</pre>
          </div>
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    // Slider live labels
    const diffIn = container.querySelector('#in-diff');
    const diffLbl = container.querySelector('#lbl-diff');
    diffIn.oninput = () => { diffLbl.textContent = `${diffIn.value}×`; };

    const powIn = container.querySelector('#in-powerup');
    const powLbl = container.querySelector('#lbl-powerup');
    powIn.oninput = () => { powLbl.textContent = `${powIn.value}×`; };

    // Save gameplay
    container.querySelector('#btn-save-gameplay').onclick = async () => {
      const enabled = {};
      container.querySelectorAll('.chk-entity').forEach((chk) => {
        enabled[chk.dataset.key] = chk.checked;
      });

      try {
        await adminApi.put('/settings', {
          gameplay: {
            difficultyMultiplier: parseFloat(diffIn.value),
            powerupRateMultiplier: parseFloat(powIn.value),
            enabled
          }
        });
        toast.success('Gameplay settings updated');
        loadData();
      } catch (err) {
        toast.error(err.message);
      }
    };

    // Save anti-cheat
    container.querySelector('#btn-save-anticheat').onclick = async () => {
      const maxRate = parseInt(container.querySelector('#in-max-rate').value, 10);
      const minDur = parseInt(container.querySelector('#in-min-dur').value, 10);

      try {
        await adminApi.put('/settings', {
          antiCheat: {
            maxScoreRate: maxRate,
            minDurationMs: minDur
          }
        });
        toast.success('Anti-cheat settings updated');
        loadData();
      } catch (err) {
        toast.error(err.message);
      }
    };

    // Save webhook
    container.querySelector('#btn-save-webhook').onclick = async () => {
      const enabled = container.querySelector('#chk-wh-enabled').checked;
      const url = container.querySelector('#in-wh-url').value.trim();
      const secret = container.querySelector('#in-wh-secret').value.trim();

      try {
        await adminApi.put('/settings', {
          webhook: {
            enabled,
            url,
            secret: secret || undefined
          }
        });
        toast.success('Webhook settings updated');
        loadData();
      } catch (err) {
        toast.error(err.message);
      }
    };

    // Test webhook
    container.querySelector('#btn-test-webhook').onclick = async () => {
      toast.info('Sending test webhook ping...');
      try {
        const res = await adminApi.post('/webhooks/test');
        if (res.status === 'delivered') {
          toast.success(`Webhook delivered! HTTP ${res.responseCode} in ${res.durationMs}ms`);
        } else {
          toast.error(`Webhook test failed: HTTP ${res.responseCode || 'No response'}`);
        }
        loadData();
      } catch (err) {
        toast.error(`Test ping error: ${err.message}`);
      }
    };

    // Retry delivery
    container.querySelectorAll('.btn-retry-delivery').forEach((btn) => {
      btn.onclick = async () => {
        try {
          await adminApi.post(`/webhooks/deliveries/${btn.dataset.id}/retry`);
          toast.success('Delivery requeued for sending');
          loadData();
        } catch (err) {
          toast.error(err.message);
        }
      };
    });
  }

  loadData();
}
