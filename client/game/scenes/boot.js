export function renderBootScene(container, progress = 0, logoSrc = '/default-assets/logo.svg') {
  container.innerHTML = `
    <div class="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
      <img src="${logoSrc}" alt="Logo" class="w-64 max-w-full mb-8 drop-shadow-md animate-bounce" />
      <div class="w-48 bg-gray-200/80 rounded-full h-3 mb-2 overflow-hidden border border-gray-300">
        <div class="bg-green-600 h-3 rounded-full transition-all duration-150" style="width: ${Math.round(progress * 100)}%"></div>
      </div>
      <p class="text-xs font-semibold text-gray-600 tracking-wider">LOADING...</p>
    </div>
  `;
}
