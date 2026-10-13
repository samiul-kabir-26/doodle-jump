import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';
import { modal } from '../components/modal.js';

export function renderAssetsPage(container) {
  let assets = [];
  let kindFilter = 'all';

  async function loadData() {
    try {
      const q = kindFilter === 'all' ? '' : `?kind=${kindFilter}`;
      const data = await adminApi.get(`/assets${q}`);
      assets = data.assets || [];
      render();
    } catch (err) {
      container.innerHTML = `<div class="p-8 text-center text-red-500">Failed to load assets: ${err.message}</div>`;
    }
  }

  function render() {
    container.innerHTML = `
      <div class="space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 class="text-2xl font-black text-gray-900 tracking-tight">Asset Library</h1>
            <p class="text-xs text-gray-500">Upload and manage sprites, backgrounds, and audio files</p>
          </div>
          <div class="flex bg-white rounded-xl shadow-xs border border-gray-200 p-1 space-x-1">
            <button class="filter-btn px-3 py-1 text-xs font-bold rounded-lg ${kindFilter === 'all' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-kind="all">All Assets</button>
            <button class="filter-btn px-3 py-1 text-xs font-bold rounded-lg ${kindFilter === 'image' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-kind="image">Images</button>
            <button class="filter-btn px-3 py-1 text-xs font-bold rounded-lg ${kindFilter === 'audio' ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'}" data-kind="audio">Audio</button>
          </div>
        </div>

        <!-- Upload Box -->
        <div id="drop-zone" class="border-2 border-dashed border-gray-300 hover:border-green-500 rounded-3xl p-8 bg-white text-center cursor-pointer transition-colors shadow-xs">
          <input id="file-input" type="file" multiple class="hidden" accept="image/png,image/webp,image/svg+xml,image/gif,audio/mpeg,audio/wav,audio/ogg" />
          <div class="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-xl">
            ⬆
          </div>
          <p class="text-sm font-bold text-gray-800 mb-1">Click to upload or drag & drop files</p>
          <p class="text-xs text-gray-400">PNG, WebP, SVG, GIF (≤ 2 MB) or MP3, WAV, OGG (≤ 4 MB)</p>
        </div>

        <!-- Assets Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          ${
            assets.map((a) => `
              <div class="bg-white rounded-2xl border border-gray-200 shadow-xs p-3 flex flex-col justify-between group hover:shadow-md transition-shadow">
                <!-- Preview -->
                <div class="w-full aspect-square bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:8px_8px] rounded-xl flex items-center justify-center mb-2 overflow-hidden border border-gray-100 relative">
                  ${
                    a.kind === 'image'
                      ? `<img src="${a.url}" alt="${a.originalName}" class="max-w-full max-h-full object-contain p-2" />`
                      : `<audio controls src="${a.url}" class="w-full scale-75"></audio>`
                  }
                  ${
                    a.usedInSlots && a.usedInSlots.length > 0
                      ? `<span class="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-green-600 text-white text-[9px] font-extrabold rounded-md shadow-xs" title="${a.usedInSlots.join(', ')}">IN USE</span>`
                      : ''
                  }
                </div>

                <!-- Info -->
                <div class="space-y-1">
                  <p class="text-xs font-bold text-gray-800 truncate" title="${a.originalName}">${a.originalName}</p>
                  <p class="text-[10px] text-gray-400 font-mono">${(a.bytes / 1024).toFixed(1)} KB ${a.width ? `• ${a.width}×${a.height}` : ''}</p>
                  <div class="pt-2 flex items-center justify-between border-t border-gray-100">
                    <button class="btn-copy-url text-[10px] font-bold text-green-600 hover:text-green-700" data-url="${a.url}">Copy URL</button>
                    <button class="btn-delete text-[10px] font-bold ${a.usedInSlots?.length > 0 ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:text-red-700'}" data-id="${a.id}" ${a.usedInSlots?.length > 0 ? 'disabled' : ''}>Delete</button>
                  </div>
                </div>
              </div>
            `).join('') || `<div class="col-span-full p-12 text-center text-xs text-gray-400">No assets found in library</div>`
          }
        </div>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.onclick = () => {
        kindFilter = btn.dataset.kind;
        loadData();
      };
    });

    const dropZone = container.querySelector('#drop-zone');
    const fileInput = container.querySelector('#file-input');

    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => {
      e.preventDefault();
      dropZone.classList.add('border-green-500', 'bg-green-50/20');
    };

    dropZone.ondragleave = () => {
      dropZone.classList.remove('border-green-500', 'bg-green-50/20');
    };

    dropZone.ondrop = async (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-green-500', 'bg-green-50/20');
      if (e.dataTransfer.files.length > 0) {
        await uploadFiles(e.dataTransfer.files);
      }
    };

    fileInput.onchange = async () => {
      if (fileInput.files.length > 0) {
        await uploadFiles(fileInput.files);
      }
    };

    container.querySelectorAll('.btn-copy-url').forEach((btn) => {
      btn.onclick = () => {
        navigator.clipboard.writeText(btn.dataset.url);
        toast.info('Asset URL copied to clipboard');
      };
    });

    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const ok = await modal.confirm({
          title: 'Delete Asset?',
          message: 'Are you sure you want to permanently delete this asset from storage?',
          isDanger: true
        });
        if (ok) {
          try {
            await adminApi.delete(`/assets/${id}`);
            toast.success('Asset deleted');
            loadData();
          } catch (err) {
            toast.error(err.message);
          }
        }
      };
    });
  }

  async function uploadFiles(fileList) {
    let successCount = 0;
    for (const file of fileList) {
      try {
        await adminApi.uploadAsset(file);
        successCount++;
      } catch (err) {
        toast.error(`Failed to upload ${file.name}: ${err.message}`);
      }
    }
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} file(s)`);
      loadData();
    }
  }

  loadData();
}
