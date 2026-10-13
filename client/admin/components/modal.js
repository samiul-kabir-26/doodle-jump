export const modal = {
  confirm({ title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) {
    return new Promise((resolve) => {
      const container = document.getElementById('modal-container');
      if (!container) return resolve(false);

      container.classList.remove('hidden');
      container.innerHTML = `
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-left animate-scale-up">
          <h3 class="text-lg font-bold text-gray-900 mb-2">${title}</h3>
          <p class="text-sm text-gray-600 mb-6 leading-relaxed">${message}</p>
          <div class="flex justify-end space-x-3">
            <button id="modal-cancel" class="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              ${cancelText}
            </button>
            <button id="modal-confirm" class="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md transition-transform active:scale-95 ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            }">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      const cleanup = () => {
        container.classList.add('hidden');
        container.innerHTML = '';
      };

      container.querySelector('#modal-cancel').onclick = () => {
        cleanup();
        resolve(false);
      };

      container.querySelector('#modal-confirm').onclick = () => {
        cleanup();
        resolve(true);
      };
    });
  },

  prompt({ title = 'Input', message, placeholder = '', defaultValue = '', confirmText = 'Save' }) {
    return new Promise((resolve) => {
      const container = document.getElementById('modal-container');
      if (!container) return resolve(null);

      container.classList.remove('hidden');
      container.innerHTML = `
        <div class="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-left animate-scale-up">
          <h3 class="text-lg font-bold text-gray-900 mb-2">${title}</h3>
          ${message ? `<p class="text-sm text-gray-600 mb-4">${message}</p>` : ''}
          <input id="modal-input" type="text" value="${defaultValue}" placeholder="${placeholder}" class="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl mb-6 focus:outline-hidden focus:ring-2 focus:ring-green-500" />
          <div class="flex justify-end space-x-3">
            <button id="modal-cancel" class="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button id="modal-confirm" class="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-transform active:scale-95">
              ${confirmText}
            </button>
          </div>
        </div>
      `;

      const input = container.querySelector('#modal-input');
      input.focus();

      const cleanup = () => {
        container.classList.add('hidden');
        container.innerHTML = '';
      };

      container.querySelector('#modal-cancel').onclick = () => {
        cleanup();
        resolve(null);
      };

      container.querySelector('#modal-confirm').onclick = () => {
        const val = input.value.trim();
        cleanup();
        resolve(val);
      };
    });
  }
};
