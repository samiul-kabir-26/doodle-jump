import crypto from 'crypto';
import { themesRepo } from '../repositories/themes.repo.js';
import { settingsRepo } from '../repositories/settings.repo.js';
import { eventService } from './event.service.js';
import { themeSchema, DEFAULT_THEME } from '../../shared/themeSchema.js';
import { env } from '../config/env.js';
import { getDatabase } from '../db/connection.js';

export const themeService = {
  getConfig({ previewDraft = false, isAdmin = false } = {}, db = null) {
    const database = db || getDatabase();
    let themeVersion = 0;
    let theme = DEFAULT_THEME;

    if (previewDraft && isAdmin) {
      const draft = themesRepo.getDraft(database);
      if (draft) {
        try {
          theme = JSON.parse(draft.theme);
          themeVersion = draft.base_version;
        } catch {}
      }
    } else {
      const published = themesRepo.getLatestPublished(database);
      if (published) {
        try {
          theme = JSON.parse(published.theme);
          themeVersion = published.version;
        } catch {}
      }
    }

    const gameplay = settingsRepo.get('gameplay', database) || {
      difficultyMultiplier: 1.0,
      powerupRateMultiplier: 1.0,
      enabled: {
        monsters: true,
        blackHoles: true,
        jetpack: true,
        propeller: true,
        springShoes: true,
        trampoline: true,
        shooting: true
      }
    };

    const features = {
      anonymousAllowed: env.ALLOW_ANONYMOUS,
      leaderboardPeriods: ['daily', 'weekly', 'all']
    };

    const hash = crypto
      .createHash('sha256')
      .update(`${themeVersion}:${JSON.stringify(theme)}:${JSON.stringify(gameplay)}`)
      .digest('hex')
      .slice(0, 16);

    return {
      themeVersion,
      theme,
      gameplay,
      features,
      etag: `"${hash}"`
    };
  },

  getThemeAdmin(db = null) {
    const database = db || getDatabase();
    const draftRow = themesRepo.getDraft(database);
    const pubRow = themesRepo.getLatestPublished(database);

    const draft = draftRow ? JSON.parse(draftRow.theme) : DEFAULT_THEME;
    const published = pubRow
      ? {
          version: pubRow.version,
          theme: JSON.parse(pubRow.theme),
          publishedAt: new Date(pubRow.published_at).toISOString()
        }
      : {
          version: 0,
          theme: DEFAULT_THEME,
          publishedAt: new Date().toISOString()
        };

    return {
      draft,
      published
    };
  },

  saveDraft(themeObj, db = null) {
    const database = db || getDatabase();
    const validated = themeSchema.parse(themeObj);
    const pub = themesRepo.getLatestPublished(database);
    const baseVersion = pub ? pub.version : 0;
    themesRepo.saveDraft(JSON.stringify(validated), baseVersion, database);
    return validated;
  },

  patchDraft(patchObj, db = null) {
    const database = db || getDatabase();
    const draftRow = themesRepo.getDraft(database);
    const current = draftRow ? JSON.parse(draftRow.theme) : DEFAULT_THEME;

    // Deep merge helper
    function deepMerge(target, source) {
      for (const key of Object.keys(source)) {
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key]) &&
          target[key] &&
          typeof target[key] === 'object'
        ) {
          deepMerge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    }

    const merged = deepMerge(structuredClone(current), patchObj);
    return this.saveDraft(merged, database);
  },

  discardDraft(db = null) {
    const database = db || getDatabase();
    const pub = themesRepo.getLatestPublished(database);
    const themeToSave = pub ? pub.theme : JSON.stringify(DEFAULT_THEME);
    const baseVersion = pub ? pub.version : 0;
    themesRepo.saveDraft(themeToSave, baseVersion, database);
    return JSON.parse(themeToSave);
  },

  resetDefaults(db = null) {
    const database = db || getDatabase();
    return this.saveDraft(DEFAULT_THEME, database);
  },

  publish(note = null, db = null) {
    const database = db || getDatabase();
    const draftRow = themesRepo.getDraft(database);
    const draftTheme = draftRow ? JSON.parse(draftRow.theme) : DEFAULT_THEME;
    const validated = themeSchema.parse(draftTheme);

    const latest = themesRepo.getLatestPublished(database);
    const newVersion = (latest ? latest.version : 0) + 1;
    const now = Date.now();

    themesRepo.createVersion(newVersion, JSON.stringify(validated), note, now, database);
    themesRepo.saveDraft(JSON.stringify(validated), newVersion, database);

    eventService.emit(
      'admin.theme_published',
      {
        data: {
          version: newVersion,
          note: note || undefined,
          changedSlots: Object.keys(validated.sprites || {})
        }
      },
      database
    );

    return { version: newVersion };
  },

  listVersions(db = null) {
    const database = db || getDatabase();
    const rows = themesRepo.listVersions(database);
    return rows.map((r) => ({
      version: r.version,
      note: r.note,
      publishedAt: new Date(r.published_at).toISOString()
    }));
  },

  getVersion(version, db = null) {
    const database = db || getDatabase();
    const row = themesRepo.getVersion(version, database);
    if (!row) {
      const err = new Error('Version not found');
      err.code = 'NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    return {
      version: row.version,
      note: row.note,
      publishedAt: new Date(row.published_at).toISOString(),
      theme: JSON.parse(row.theme)
    };
  },

  rollback(targetVersion, db = null) {
    const database = db || getDatabase();
    const target = this.getVersion(targetVersion, database);
    return this.publish(`Rollback to version ${targetVersion}`, database);
  }
};
