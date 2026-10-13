import { DEFAULT_THEME } from '../../../shared/themeSchema.js';
import { api } from '../net/api.js';

export class ThemeLoader {
  constructor() {
    this.currentTheme = DEFAULT_THEME;
    this.gameplay = {};
    this.features = {};
    this.themeVersion = 0;
  }

  applyColors(theme) {
    const colors = theme.colors || {};
    const root = document.documentElement;
    if (colors.background) root.style.setProperty('--bg-color', colors.background);
    if (colors.gridLines) root.style.setProperty('--grid-lines', colors.gridLines);
    if (colors.hudText) root.style.setProperty('--hud-text', colors.hudText);
    if (colors.primary) root.style.setProperty('--primary-color', colors.primary);
    if (colors.primaryText) root.style.setProperty('--primary-text', colors.primaryText);
    if (colors.accent) root.style.setProperty('--accent-color', colors.accent);
    if (colors.overlay) root.style.setProperty('--overlay-color', colors.overlay);

    if (theme.branding?.fontFamily) {
      document.body.style.fontFamily = theme.branding.fontFamily;
    }
  }

  async load(previewDraft = false) {
    try {
      const data = await api.fetchConfig(previewDraft);
      this.currentTheme = data.theme || DEFAULT_THEME;
      this.gameplay = data.gameplay || {};
      this.features = data.features || {};
      this.themeVersion = data.themeVersion || 0;
      this.applyColors(this.currentTheme);
      return data;
    } catch (err) {
      console.warn('Failed to fetch config, using default theme:', err.message);
      this.currentTheme = DEFAULT_THEME;
      this.applyColors(DEFAULT_THEME);
      return {
        theme: DEFAULT_THEME,
        gameplay: {},
        features: {},
        themeVersion: 0
      };
    }
  }

  hotApply(newTheme) {
    if (!newTheme) return;
    this.currentTheme = newTheme;
    this.applyColors(newTheme);
  }
}
