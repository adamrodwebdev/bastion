/**
 * @file Service container: creates every service once and shares it with the app.
 */

import { StorageService } from './StorageService.js';
import { SaveManager } from './SaveManager.js';
import { I18nService } from './I18nService.js';
import { ThemeService } from './ThemeService.js';
import { AudioService } from './AudioService.js';
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
  }

  /** Applies saved settings (language, theme) — call once at startup. */
  bootstrap() {
    const settings = this.saves.settings;
    this.i18n.setLocale(this.i18n.detect(settings.locale));
    this.theme.setMode(settings.theme);
    this.audio.setSound(settings.sound !== false);
    this.audio.setMusic(settings.music !== false);
    // Browsers only allow audio after a user gesture.
    if (typeof window !== 'undefined') {
      const unlock = () => this.audio.unlock();
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock);
    }
    // Persist user choices.
    this.i18n.on('change', (locale) => this.saves.updateSettings({ locale }));
    this.theme.on('change', () => this.saves.updateSettings({ theme: this.theme.mode }));
    this.audio.on('change', () => this.saves.updateSettings({ sound: this.audio.soundOn, music: this.audio.musicOn }));
    return this;
  }
}

export const services = new ServiceContainer();
