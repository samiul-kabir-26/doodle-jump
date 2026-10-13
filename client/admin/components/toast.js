export const toast = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = `pointer-events-auto flex items-center px-4 py-3 rounded-xl shadow-xl text-sm font-semibold transition-all transform duration-300 translate-y-4 opacity-0 border ${
      type === 'success'
        ? 'bg-green-800 text-white border-green-700'
        : type === 'error'
        ? 'bg-red-800 text-white border-red-700'
        : 'bg-gray-800 text-white border-gray-700'
    }`;

    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    el.innerHTML = `<span class="mr-2 font-bold">${icon}</span><span>${message}</span>`;
    container.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.remove('translate-y-4', 'opacity-0');
      el.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      el.classList.remove('translate-y-0', 'opacity-100');
      el.classList.add('translate-y-4', 'opacity-0');
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  success(msg) {
    this.show(msg, 'success');
  },

  error(msg) {
    this.show(msg, 'error', 4000);
  },

  info(msg) {
    this.show(msg, 'info');
  }
};
