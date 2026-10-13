import { adminApi } from './api.js';
import { renderLoginPage } from './pages/login.js';
import { renderDashboardPage } from './pages/dashboard.js';
import { renderThemePage } from './pages/theme.js';
import { renderAssetsPage } from './pages/assets.js';
import { renderEventsPage } from './pages/events.js';
import { renderLeaderboardPage } from './pages/leaderboard.js';
import { renderPlayersPage } from './pages/players.js';
import { renderSettingsPage } from './pages/settings.js';

export class AdminRouter {
  constructor(rootContainer) {
    this.root = rootContainer;
    this.currentUser = null;
    this.cleanupCurrentPage = null;

    window.addEventListener('popstate', () => this.route());
    window.addEventListener('admin:unauthorized', () => this.navigate('/admin/login'));
  }

  async init() {
    await this.checkAuth();
    this.route();
  }

  async checkAuth() {
    try {
      const data = await adminApi.get('/me');
      this.currentUser = data;
    } catch {
      this.currentUser = null;
    }
  }

  navigate(path) {
    window.history.pushState({}, '', path);
    this.route();
  }

  async route() {
    if (this.cleanupCurrentPage) {
      this.cleanupCurrentPage();
      this.cleanupCurrentPage = null;
    }

    const path = window.location.pathname.replace(/\/$/, '') || '/admin';

    // If not authenticated, force login
    if (!this.currentUser && path !== '/admin/login') {
      await this.checkAuth();
      if (!this.currentUser) {
        return this.renderLogin();
      }
    }

    if (path === '/admin/login') {
      if (this.currentUser) {
        return this.navigate('/admin');
      }
      return this.renderLogin();
    }

    this.renderLayout(path);
  }

  renderLogin() {
    renderLoginPage(this.root, async () => {
      await this.checkAuth();
      this.navigate('/admin');
    });
  }

  renderLayout(activePath) {
    this.root.innerHTML = `
      <div class="min-h-screen flex flex-col bg-gray-100">
        <!-- Top Navigation Bar -->
        <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div class="flex items-center space-x-3">
            <span class="text-xl">🕹️</span>
            <div>
              <span class="font-black text-sm text-gray-900 tracking-tight">JUMPY DOODLE</span>
              <span class="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-md uppercase">Admin Panel</span>
            </div>
          </div>

          <div class="flex items-center space-x-4 text-xs font-semibold">
            <a href="/" target="_blank" class="text-gray-500 hover:text-green-600 flex items-center space-x-1">
              <span>🎮 Play Game</span>
            </a>
            <span class="text-gray-300">|</span>
            <span class="text-gray-700">👤 ${this.currentUser?.username || 'admin'}</span>
            <button id="btn-logout" class="text-red-600 hover:text-red-700 font-bold">Logout</button>
          </div>
        </header>

        <!-- Main Body (Sidebar + Content) -->
        <div class="flex-1 flex flex-col md:flex-row">
          <!-- Sidebar -->
          <aside class="w-full md:w-60 bg-white border-r border-gray-200 p-4 space-y-1 shrink-0">
            ${this.renderNavItem('/admin', '▣ Dashboard', activePath === '/admin' || activePath === '/admin/dashboard')}
            ${this.renderNavItem('/admin/theme', '🎨 Theme & Reskin', activePath === '/admin/theme')}
            ${this.renderNavItem('/admin/assets', '🖼 Assets', activePath === '/admin/assets')}
            ${this.renderNavItem('/admin/events', '⚡ Event Stream', activePath === '/admin/events')}
            ${this.renderNavItem('/admin/leaderboard', '🏆 Leaderboard', activePath === '/admin/leaderboard')}
            ${this.renderNavItem('/admin/players', '👤 Players & Runs', activePath === '/admin/players')}
            ${this.renderNavItem('/admin/settings', '⚙ System Settings', activePath === '/admin/settings')}
          </aside>

          <!-- Content Body -->
          <main id="admin-content" class="flex-1 p-6 lg:p-8 overflow-y-auto max-w-7xl w-full mx-auto"></main>
        </div>
      </div>
    `;

    this.root.querySelector('#btn-logout')?.addEventListener('click', async () => {
      await adminApi.post('/logout');
      this.currentUser = null;
      this.navigate('/admin/login');
    });

    this.root.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(link.getAttribute('href'));
      });
    });

    const content = this.root.querySelector('#admin-content');

    // Route matching
    if (activePath === '/admin' || activePath === '/admin/dashboard') {
      this.cleanupCurrentPage = renderDashboardPage(content);
    } else if (activePath === '/admin/theme') {
      this.cleanupCurrentPage = renderThemePage(content);
    } else if (activePath === '/admin/assets') {
      this.cleanupCurrentPage = renderAssetsPage(content);
    } else if (activePath === '/admin/events') {
      this.cleanupCurrentPage = renderEventsPage(content);
    } else if (activePath === '/admin/leaderboard') {
      this.cleanupCurrentPage = renderLeaderboardPage(content);
    } else if (activePath === '/admin/players') {
      this.cleanupCurrentPage = renderPlayersPage(content);
    } else if (activePath === '/admin/settings') {
      this.cleanupCurrentPage = renderSettingsPage(content);
    } else {
      content.innerHTML = `<div class="p-8 text-center text-gray-500">404 - Page not found</div>`;
    }
  }

  renderNavItem(href, label, isActive) {
    return `
      <a href="${href}" class="nav-link block px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
        isActive ? 'bg-green-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }">
        ${label}
      </a>
    `;
  }
}
