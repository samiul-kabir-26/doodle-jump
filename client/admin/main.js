import { AdminRouter } from './router.js';

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('admin-app');
  const router = new AdminRouter(root);
  router.init();
});
