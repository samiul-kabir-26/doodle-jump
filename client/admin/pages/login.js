import { adminApi } from '../api.js';
import { toast } from '../components/toast.js';

export function renderLoginPage(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div class="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 text-center">
        <div class="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl shadow-xs">
          🛠
        </div>
        <h1 class="text-2xl font-black text-gray-900 mb-1">Admin Login</h1>
        <p class="text-xs text-gray-500 mb-6">Jumpy Doodle Microservice Panel</p>

        <form id="admin-login-form" class="space-y-4 text-left">
          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Username</label>
            <input
              id="admin-username"
              type="text"
              required
              class="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-green-500 font-medium"
              placeholder="admin"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Password</label>
            <input
              id="admin-password"
              type="password"
              required
              class="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-green-500 font-medium"
            />
          </div>

          <div id="login-error" class="hidden text-xs text-red-600 bg-red-50 p-2.5 rounded-xl font-medium border border-red-200"></div>

          <button
            type="submit"
            id="login-btn"
            class="w-full py-3 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-lg transition-transform"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#admin-login-form');
  const userIn = container.querySelector('#admin-username');
  const passIn = container.querySelector('#admin-password');
  const errEl = container.querySelector('#login-error');
  const btn = container.querySelector('#login-btn');

  userIn.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.classList.add('hidden');
    btn.disabled = true;
    btn.textContent = 'Signing in...';

    try {
      await adminApi.post('/login', {
        username: userIn.value.trim(),
        password: passIn.value
      });
      toast.success('Logged in successfully');
      onLoginSuccess();
    } catch (err) {
      errEl.textContent = err.message || 'Invalid username or password';
      errEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });
}
