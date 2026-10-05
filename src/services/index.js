/**
 * @file Service container: creates every service once and shares it with the app.
 */

import { StorageService } from './StorageService.js';
import { SaveManager } from './SaveManager.js';
import { I18nService } from './I18nService.js';
import { ThemeService } from './ThemeService.js';
import { AudioService } from './audio/AudioService.js';
import { NoAdService } from './ads/AdService.js';
import fr from '../locales/fr.js';
import en from '../locales/en.js';

/**
 * Service container (simple dependency injection).
 * Every service is a single instance shared by the whole app.
 */
class ServiceContainer {
  constructor() {
    this.storage = new StorageService('bastion-td');
    this.saves = new SaveManager(this.storage);
    this.i18n = new I18nService({ fr, en }, 'en');
    this.theme = new ThemeService();
    this.audio = new AudioService();
    /** Portal SDK (CrazyGames, Poki) or a silent stand-in on our own site. */
    this.ads = new NoAdService();
  }

  /** Applies saved settings (language, theme, volumes) — call once at startup. */
  bootstrap() {
    const settings = this.saves.settings;
    this.i18n.setLocale(this.i18n.detect(settings.locale));
    this.theme.setMode(settings.theme);
    this.audio.setVolumes({ sfx: settings.sfx, music: settings.music });
    // Persist user choices.
    this.i18n.on('change', (locale) => this.saves.updateSettings({ locale }));
    this.theme.on('change', () => this.saves.updateSettings({ theme: this.theme.mode }));
    this.saves.on('settings', (s) => this.audio.setVolumes({ sfx: s.sfx, music: s.music }));

    // Browsers only allow sound after a user gesture.
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.audio.unlock();
        if (!this.audio.scene) this.audio.music('menu');
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock);
      document.addEventListener('visibilitychange', () => this.audio.suspend(document.hidden));
    }
    return this;
  }

  /**
   * Loads the portal SDK of this build (no-op on our own site), then wires
   * its events: sound off during ads, the portal's mute button, its language.
   */
  async connectPortal() {
    const { createAdService } = await import('./ads/createAdService.js');
    const ads = await createAdService();
    this.ads = ads;
    ads.on('pause', () => this.audio.setAdMuted(true));
    ads.on('resume', () => this.audio.setAdMuted(false));
    ads.on('mute', (muted) => this.audio.setPortalMuted(muted));
    this.audio.setPortalMuted(ads.portalMuted);
    if (ads.locale && !this.saves.settings.locale) {
      const code = ads.locale.slice(0, 2).toLowerCase();
      this.i18n.setLocale(this.i18n.dictionaries[code] ? code : 'en');
    }
    ads.loadingFinished();
    return ads;
  }
}

export const services = new ServiceContainer();
