/**
 * @file Service container: creates every service once and shares it with the app.
 */

import { StorageService } from './StorageService.js';
import { SaveManager } from './SaveManager.js';
import { I18nService } from './I18nService.js';
import { ThemeService } from './ThemeService.js';
import { AudioService } from './audio/AudioService.js';
import { Haptics } from './Haptics.js';
import { MotionService } from './MotionService.js';
import { TextureService } from './TextureService.js';
import { NoAdService } from './ads/AdService.js';
import { LOADERS, LANGUAGE_NAMES } from '../locales/index.js';

/**
 * Builds whose portal keeps the saves (Playgama: `bridge.storage` only, never
 * localStorage). There the saves stay in memory until the portal has loaded them.
 */
const PORTAL_SAVES = typeof __TARGET__ !== 'undefined' && __TARGET__ === 'playgama';

/**
 * Service container (simple dependency injection).
 * Every service is a single instance shared by the whole app.
 */
class ServiceContainer {
  constructor() {
    this.storage = new StorageService('bastion-td', PORTAL_SAVES ? null : StorageService.detectBackend());
    this.saves = new SaveManager(this.storage);
    this.i18n = new I18nService(LOADERS, LANGUAGE_NAMES, 'en');
    this.theme = new ThemeService();
    this.audio = new AudioService();
    this.haptics = new Haptics();
    this.motion = new MotionService();
    /** Parchment, wood, iron and cloth of the interface, painted at startup (in a worker where possible). */
    this.textures = new TextureService();
    /** Portal SDK (CrazyGames, Poki, Playgama) or a silent stand-in on our own site. */
    this.ads = new NoAdService();
  }

  /**
   * Portals that own the saves and the language (Playgama): their SDK starts
   * before anything is read, and the saves are loaded from it. No-op elsewhere.
   */
  async preparePortal() {
    if (!PORTAL_SAVES) return;
    const { createAdService } = await import('./ads/createAdService.js');
    this.ads = await createAdService();
    const storage = this.ads.cloudStorage;
    if (storage) {
      this.storage = new StorageService('bastion-td', storage);
      this.saves = new SaveManager(this.storage);
    }
  }

  /**
   * Applies saved settings (language, theme, volumes) — call once at startup.
   * @returns {Promise<this>} resolved once the player's language is loaded
   */
  async bootstrap() {
    const settings = this.saves.settings;
    // Playgama: the interface follows the portal's language at every launch,
    // English when the game does not have it.
    const portal = this.ads.localeAuthoritative && this.ads.locale ? this.ads.locale.slice(0, 2).toLowerCase() : null;
    const locale = portal ? (this.i18n.loaders[portal] ? portal : 'en') : this.i18n.detect(settings.locale);
    await this.i18n.setLocale(locale);
    this.theme.setMode(settings.theme);
    this.audio.setVolumes({ sfx: settings.sfx, music: settings.music });
    this.audio.setUserMuted(settings.muted);
    this.haptics.setEnabled(settings.haptics);
    this.motion.setEnabled(settings.motion);
    // Persist user choices.
    this.i18n.on('change', (locale) => this.saves.updateSettings({ locale }));
    this.theme.on('change', () => this.saves.updateSettings({ theme: this.theme.mode }));
    this.saves.on('settings', (s) => {
      this.audio.setVolumes({ sfx: s.sfx, music: s.music });
      this.audio.setUserMuted(s.muted);
      this.haptics.setEnabled(s.haptics);
      this.motion.setEnabled(s.motion);
    });

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
   * Loads the portal SDK of this build (no-op on our own site; already started
   * by preparePortal on Playgama), then wires its events: sound off during ads,
   * the portal's mute button and pause, its language.
   */
  async connectPortal() {
    let ads = this.ads;
    if (ads.id === 'none') {
      const { createAdService } = await import('./ads/createAdService.js');
      ads = await createAdService();
      this.ads = ads;
    }
    ads.on('pause', () => this.audio.setAdMuted(true));
    ads.on('resume', () => this.audio.setAdMuted(false));
    ads.on('mute', (muted) => this.audio.setPortalMuted(muted));
    ads.on('portalPause', (paused) => this.audio.setPortalPaused(paused));
    this.audio.setPortalMuted(ads.portalMuted);
    this.audio.setPortalPaused(ads.portalPaused);
    if (ads.locale && !ads.localeAuthoritative && !this.saves.settings.locale) {
      const code = ads.locale.slice(0, 2).toLowerCase();
      this.i18n.setLocale(this.i18n.loaders[code] ? code : 'en');
    }
    ads.loadingFinished();
    return ads;
  }
}

export const services = new ServiceContainer();
