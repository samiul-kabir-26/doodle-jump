import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

export function renderThemePage(container) {
  let draft = null;
  let published = null;
  let activeTab = 'editor'; // 'editor' | 'history'
  let versions = [];
  let saveDebounceTimer = null;

  async function loadData() {
    try {
      const data = await adminApi.get('/theme');
      draft = data.draft;
      published = data.published;
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load theme: ${err.message}</div>`;
    }
  }

  function handleDraftChange() {
    // Notify iframe live
    const iframe = container.querySelector('#preview-iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'dj:preview_theme', payload: draft }, '*');
    }

    // Debounce save to server
    if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
    saveDebounceTimer = setTimeout(async () => {
      try {
        await adminApi.put('/theme/draft', draft);
        toast.info('Draft autosaved');
      } catch (err) {
        toast.error(`Autosave failed: ${err.message}`);
      }
    }, 500);
  }

  function render() {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Theme & Reskinning</h1>
            <p class="text-xs text-gray-500">Live preview draft edits and publish new game versions</p>
          </div>
          <div class="flex items-center space-x-2">
            <div class="flex bg-white rounded-xl shadow-xs border border-gray-200 p-1 space-x-1">
              <button id="tab-editor" class="px-3 py-1 text-xs font-bold rounded-lg ${activeTab === 'editor' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}">Theme Editor</button>
              <button id="tab-history" class="px-3 py-1 text-xs font-bold rounded-lg ${activeTab === 'history' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}">Version History</button>
            </div>
            <button id="btn-publish" class="px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-transform flex items-center space-x-1">
              <span>🚀</span>
              <span>Publish</span>
            </button>
          </div>
        </div>

        ${activeTab === 'editor' ? renderEditorView() : renderHistoryView()}
      </div>
    `;

    bindEvents();
  }

  function renderEditorView() {
    const branding = draft.branding || {};
    const colors = draft.colors || {};
    const sprites = draft.sprites || {};
    const texts = draft.texts || {};

    return `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Form Controls (7 cols) -->
        <div class="lg:col-span-7 space-y-4">
          <!-- Action bar -->
          <div class="bg-white p-3 rounded-2xl border border-gray-200 flex items-center justify-between text-xs">
            <span class="text-gray-500 font-medium">Published version: <b class="text-gray-800">v${published?.version || 0}</b></span>
            <div class="flex items-center space-x-2">
              <button id="btn-reset-defaults" class="px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Reset Defaults</button>
              <button id="btn-discard" class="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg font-bold">Discard Draft</button>
            </div>
          </div>

          <!-- Section 1: Branding -->
          <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">1. Branding & Typography</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Game Title</label>
                <input id="in-title" type="text" value="${branding.title || ''}" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Subtitle</label>
                <input id="in-subtitle" type="text" value="${branding.subtitle || ''}" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Font Family</label>
                <input id="in-font" type="text" value="${branding.fontFamily || ''}" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Logo URL</label>
                <input id="in-logo" type="text" value="${branding.logo || ''}" class="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-xl" />
              </div>
            </div>
          </div>

          <!-- Section 2: Colors -->
          <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">2. Color Palette</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Background</label>
                <div class="flex items-center space-x-2">
                  <input id="in-c-bg" type="color" value="${colors.background || '#f8f5e6'}" class="w-8 h-8 rounded-lg cursor-pointer" />
                  <span class="text-xs font-mono text-gray-600">${colors.background || ''}</span>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Primary Color</label>
                <div class="flex items-center space-x-2">
                  <input id="in-c-pri" type="color" value="${colors.primary || '#16a34a'}" class="w-8 h-8 rounded-lg cursor-pointer" />
                  <span class="text-xs font-mono text-gray-600">${colors.primary || ''}</span>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-bold text-gray-500 uppercase mb-1">Grid Lines</label>
                <div class="flex items-center space-x-2">
                  <input id="in-c-grid" type="color" value="${colors.gridLines || '#e3dcc3'}" class="w-8 h-8 rounded-lg cursor-pointer" />
                  <span class="text-xs font-mono text-gray-600">${colors.gridLines || ''}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section 3: Player Sprites -->
          <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">3. Player Sprites (The Doodler)</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              ${renderSpriteSlotField('player.right', 'Facing Right', sprites['player.right'])}
              ${renderSpriteSlotField('player.left', 'Facing Left', sprites['player.left'])}
              ${renderSpriteSlotField('player.shoot', 'Shooting Up', sprites['player.shoot'])}
            </div>
          </div>

          <!-- Section 4: Platforms -->
          <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">4. Platform Sprites</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              ${renderSpriteSlotField('platform.normal', 'Normal Platform', sprites['platform.normal'])}
              ${renderSpriteSlotField('platform.moving', 'Moving Platform', sprites['platform.moving'])}
              ${renderSpriteSlotField('platform.breakable', 'Breakable Platform', sprites['platform.breakable'])}
              ${renderSpriteSlotField('platform.disappearing', 'Disappearing', sprites['platform.disappearing'])}
              ${renderSpriteSlotField('platform.exploding', 'Exploding', sprites['platform.exploding'])}
            </div>
          </div>

          <!-- Section 5: Items & Hazards -->
          <div class="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
            <h3 class="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2">5. Items & Hazards</h3>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              ${renderSpriteSlotField('item.spring', 'Spring', sprites['item.spring'])}
              ${renderSpriteSlotField('item.trampoline', 'Trampoline', sprites['item.trampoline'])}
              ${renderSpriteSlotField('item.propeller', 'Propeller Item', sprites['item.propeller'])}
              ${renderSpriteSlotField('item.jetpack', 'Jetpack Item', sprites['item.jetpack'])}
              ${renderSpriteSlotField('monster.basic', 'Basic Monster', sprites['monster.basic'])}
              ${renderSpriteSlotField('hazard.black_hole', 'Black Hole', sprites['hazard.black_hole'])}
            </div>
          </div>
        </div>

        <!-- Phone Preview Column (5 cols) -->
        <div class="lg:col-span-5 sticky top-6">
          <div class="bg-white p-4 rounded-3xl border border-gray-200 shadow-xl flex flex-col items-center">
            <div class="flex items-center justify-between w-full mb-3 text-xs font-bold text-gray-600 px-2">
              <span class="flex items-center space-x-1.5">
                <span class="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
                <span>Live Draft Preview</span>
              </span>
              <button id="btn-reload-preview" class="hover:text-green-600 flex items-center space-x-1 text-gray-400">
                <span>🔄</span>
                <span>Restart</span>
              </button>
            </div>

            <!-- Phone Frame -->
            <div class="w-full max-w-[320px] aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-inner border-4 border-gray-800 relative">
              <iframe id="preview-iframe" src="/?preview=draft&embed=1" class="w-full h-full border-0"></iframe>
            </div>

            <p class="text-[11px] text-gray-400 text-center mt-3">Changes reflect live in the preview. Click Publish to release to players.</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderSpriteSlotField(slot, label, slotConfig = {}) {
    const src = slotConfig?.src || '';
    return `
      <div class="bg-gray-50 p-2.5 rounded-xl border border-gray-200 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold text-gray-700 truncate">${label}</span>
          <img src="${src}" alt="${slot}" class="w-6 h-6 object-contain bg-white rounded-md border border-gray-200 p-0.5" />
        </div>
        <input
          type="text"
          value="${src}"
          data-slot="${slot}"
          class="sprite-src-in w-full px-2 py-1 text-[11px] font-mono border border-gray-300 rounded-lg bg-white"
          placeholder="/uploads/... or /default-assets/..."
        />
      </div>
    `;
  }

  function renderHistoryView() {
    return `
      <div class="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div class="p-4 border-b border-gray-200">
          <h3 class="text-sm font-bold text-gray-800">Published Versions</h3>
        </div>
        <div class="divide-y divide-gray-100" id="versions-list">
          <div class="p-8 text-center text-xs text-gray-400">Loading versions...</div>
        </div>
      </div>
    `;
  }

  async function loadVersions() {
    try {
      const data = await adminApi.get('/theme/versions');
      versions = data.versions || [];
      const listEl = container.querySelector('#versions-list');
      if (!listEl) return;

      if (versions.length === 0) {
        listEl.innerHTML = `<div class="p-8 text-center text-xs text-gray-400">No versions published yet</div>`;
        return;
      }

      listEl.innerHTML = versions.map((v) => `
        <div class="p-4 flex items-center justify-between hover:bg-gray-50">
          <div>
            <div class="flex items-center space-x-2">
              <span class="font-bold text-sm text-gray-800">Version ${v.version}</span>
              ${v.version === published?.version ? '<span class="px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-extrabold rounded-full">ACTIVE</span>' : ''}
            </div>
            <p class="text-xs text-gray-500 mt-0.5">${v.note || 'No release note'}</p>
            <p class="text-[10px] text-gray-400 mt-0.5">${new Date(v.publishedAt).toLocaleString()}</p>
          </div>
          <div>
            <button class="btn-rollback px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl" data-version="${v.version}">
              Rollback to this
            </button>
          </div>
        </div>
      `).join('');

      container.querySelectorAll('.btn-rollback').forEach((btn) => {
        btn.onclick = async () => {
          const vNum = parseInt(btn.dataset.version, 10);
          const ok = await modal.confirm({
            title: `Rollback to Version ${vNum}?`,
            message: `This will create a new published version with the exact assets and settings of version ${vNum}.`
          });
          if (ok) {
            await adminApi.post(`/theme/rollback/${vNum}`);
            toast.success(`Rolled back to version ${vNum}`);
            loadData();
          }
        };
      });
    } catch (err) {
      toast.error(`Failed to load versions: ${err.message}`);
    }
  }

  function bindEvents() {
    container.querySelector('#tab-editor')?.addEventListener('click', () => {
      activeTab = 'editor';
      render();
    });

    container.querySelector('#tab-history')?.addEventListener('click', () => {
      activeTab = 'history';
      render();
      loadVersions();
    });

    container.querySelector('#btn-reload-preview')?.addEventListener('click', () => {
      const iframe = container.querySelector('#preview-iframe');
      if (iframe) iframe.src = '/?preview=draft&embed=1&t=' + Date.now();
    });

    // Inputs binding
    const bindInput = (id, fn) => {
      const el = container.querySelector(id);
      if (el) el.oninput = () => { fn(el.value); handleDraftChange(); };
    };

    bindInput('#in-title', (v) => { draft.branding.title = v; });
    bindInput('#in-subtitle', (v) => { draft.branding.subtitle = v; });
    bindInput('#in-font', (v) => { draft.branding.fontFamily = v; });
    bindInput('#in-logo', (v) => { draft.branding.logo = v; });
    bindInput('#in-c-bg', (v) => { draft.colors.background = v; });
    bindInput('#in-c-pri', (v) => { draft.colors.primary = v; });
    bindInput('#in-c-grid', (v) => { draft.colors.gridLines = v; });

    container.querySelectorAll('.sprite-src-in').forEach((input) => {
      input.oninput = () => {
        const slot = input.dataset.slot;
        if (!draft.sprites[slot]) draft.sprites[slot] = {};
        draft.sprites[slot].src = input.value.trim();
        handleDraftChange();
      };
    });

    // Reset defaults
    container.querySelector('#btn-reset-defaults')?.addEventListener('click', async () => {
      const ok = await modal.confirm({
        title: 'Reset to Bundled Defaults?',
        message: 'This will reset your draft theme to the original bundled assets.'
      });
      if (ok) {
        await adminApi.post('/theme/reset-defaults');
        toast.success('Reset to defaults');
        loadData();
      }
    });

    // Discard draft
    container.querySelector('#btn-discard')?.addEventListener('click', async () => {
      const ok = await modal.confirm({
        title: 'Discard Draft?',
        message: 'All unsaved changes in your draft will be reverted to the currently published theme.'
      });
      if (ok) {
        await adminApi.post('/theme/draft/discard');
        toast.info('Draft discarded');
        loadData();
      }
    });

    // Publish
    container.querySelector('#btn-publish')?.addEventListener('click', async () => {
      const note = await modal.prompt({
        title: 'Publish Theme Version',
        message: 'Add an optional release note for this version (e.g. "Halloween Theme")',
        placeholder: 'Release note...'
      });
      if (note !== null) {
        try {
          const res = await adminApi.post('/theme/publish', { note });
          toast.success(`Published version ${res.version} successfully!`);
          loadData();
        } catch (err) {
          toast.error(`Publish failed: ${err.message}`);
        }
      }
    });
  }

  loadData();
}
