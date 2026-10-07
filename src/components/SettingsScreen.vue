<template>
  <section class="settings" aria-labelledby="settings-title">
    <ScreenHeader :title="$t('settings.title')" />

    <div class="settings-grid">
      <section class="card settings-card">
        <h2 class="section-title">{{ $t('settings.sound') }}</h2>
        <label class="field">
          <span>{{ $t('settings.music') }} · {{ Math.round(s.music * 100) }} %</span>
          <input id="set-music" type="range" min="0" max="1" step="0.05" :value="s.music" @input="set('music', Number($event.target.value))" />
        </label>
        <label class="field">
          <span>{{ $t('settings.sfx') }} · {{ Math.round(s.sfx * 100) }} %</span>
          <input id="set-sfx" type="range" min="0" max="1" step="0.05" :value="s.sfx" @input="set('sfx', Number($event.target.value))" @change="test" />
        </label>
      </section>

      <section class="card settings-card">
        <h2 class="section-title">{{ $t('settings.game') }}</h2>
        <label class="toggle">
          <input id="set-story" type="checkbox" :checked="s.story" @change="set('story', $event.target.checked)" />
          <span><strong>{{ $t('settings.story') }}</strong><small>{{ $t('settings.storyDesc') }}</small></span>
        </label>
        <label class="toggle">
          <input id="set-tutorials" type="checkbox" :checked="s.tutorials" @change="set('tutorials', $event.target.checked)" />
          <span><strong>{{ $t('settings.tutorials') }}</strong><small>{{ $t('settings.tutorialsDesc') }}</small></span>
        </label>
        <DifficultyPicker />
      </section>

      <section class="card settings-card">
        <h2 class="section-title">{{ $t('settings.display') }}</h2>
        <label class="toggle">
          <input id="set-gore" type="checkbox" :checked="s.gore" @change="set('gore', $event.target.checked)" />
          <span><strong>{{ $t('settings.gore') }}</strong><small>{{ $t('settings.goreDesc') }}</small></span>
        </label>
        <label class="toggle">
          <input id="set-particles" type="checkbox" :checked="s.particles" @change="set('particles', $event.target.checked)" />
          <span><strong>{{ $t('settings.particles') }}</strong><small>{{ $t('settings.particlesDesc') }}</small></span>
        </label>
      </section>

      <section class="card settings-card">
        <h2 class="section-title">{{ $t('settings.players') }}</h2>
        <label v-for="i in [0, 1]" :key="i" class="field">
          <span>{{ $t('coop.player', { n: i + 1 }) }}</span>
          <input :id="'set-name-' + i" type="text" maxlength="16" autocomplete="off" :value="s.names[i]" :placeholder="$t('coop.player', { n: i + 1 })" @change="setName(i, $event.target.value)" />
        </label>
      </section>

      <section class="card settings-card">
        <h2 class="section-title">{{ $t('settings.keys') }}</h2>
        <dl class="keys">
          <div v-for="k in keys" :key="k"><dt>{{ $t('settings.keyList.' + k + '.keys') }}</dt><dd>{{ $t('settings.keyList.' + k + '.what') }}</dd></div>
        </dl>
      </section>

      <section class="card settings-card settings-danger">
        <h2 class="section-title">{{ $t('settings.data') }}</h2>
        <p>{{ $t('settings.dataDesc') }}</p>
        <div v-if="confirmReset" class="reset-confirm" role="alertdialog" aria-labelledby="reset-text">
          <p id="reset-text">{{ $t('settings.resetConfirm') }}</p>
          <div class="reset-actions">
            <button ref="resetYes" type="button" class="btn btn-danger" @click="reset">{{ $t('settings.reset') }}</button>
            <button type="button" class="btn btn-secondary" @click="confirmReset = false">{{ $t('app.cancel') }}</button>
          </div>
        </div>
        <button v-else type="button" class="btn btn-ghost btn-danger-text" @click="askReset">{{ $t('settings.reset') }}</button>
      </section>
    </div>
  </section>
</template>

<script>
/**
 * @file Settings: sound, story and tutorials, player names, keys, reset.
 */
import ScreenHeader from './ScreenHeader.vue';
import DifficultyPicker from './DifficultyPicker.vue';
import { services } from '../services/index.js';

export default {
  name: 'SettingsScreen',
  components: { ScreenHeader, DifficultyPicker },
  data() {
    return { confirmReset: false, keys: ['build', 'move', 'select', 'upgrade', 'wave', 'powers', 'pause', 'p2'] };
  },
  computed: {
    s() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves.settings;
    },
  },
  methods: {
    set(key, value) {
      services.saves.updateSettings({ [key]: value });
    },
    setName(i, value) {
      const names = [...this.s.names];
      names[i] = value.trim().slice(0, 16);
      services.saves.updateSettings({ names });
    },
    test() {
      services.audio.unlock();
      services.audio.sfx('build');
    },
    askReset() {
      this.confirmReset = true;
      this.$nextTick(() => this.$refs.resetYes && this.$refs.resetYes.focus());
    },
    reset() {
      services.saves.resetAll();
      this.$store.savedGame = null;
      this.confirmReset = false;
      this.$actions.toast(this.$t('settings.resetDone'), 'success');
    },
  },
};
</script>
