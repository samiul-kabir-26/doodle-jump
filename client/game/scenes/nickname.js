export function renderNicknameScene(container, onSubmit) {
  container.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-6 select-none pointer-events-auto">
      <div class="bg-white rounded-2xl p-6 w-full max-w-xs shadow-2xl border border-gray-200 text-center animate-scale-up">
        <h2 class="text-xl font-bold text-gray-800 mb-1">Choose a Nickname</h2>
        <p class="text-xs text-gray-500 mb-5">Enter a name for the leaderboard (3–20 chars)</p>
        <form id="nickname-form" class="space-y-4">
          <input
            id="nickname-input"
            type="text"
            maxlength="20"
            minlength="3"
            placeholder="Your nickname..."
            required
            autocomplete="off"
            class="w-full px-4 py-2 text-center text-lg font-semibold rounded-xl border-2 border-green-500 focus:outline-hidden focus:ring-2 focus:ring-green-400 text-gray-800 placeholder-gray-400"
          />
          <div id="nickname-error" class="text-xs text-red-500 hidden font-medium"></div>
          <button
            type="submit"
            class="w-full py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold rounded-xl shadow-lg transition-transform"
          >
            Play Now
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#nickname-form');
  const input = container.querySelector('#nickname-input');
  const errDiv = container.querySelector('#nickname-error');

  input.focus();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (name.length < 3 || name.length > 20) {
      errDiv.textContent = 'Name must be 3 to 20 characters';
      errDiv.classList.remove('hidden');
      return;
    }
    errDiv.classList.add('hidden');
    onSubmit(name);
  });
}
