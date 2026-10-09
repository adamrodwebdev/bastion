<template>
  <section class="game" :class="{ 'is-paused': paused, 'is-coop': coop }" aria-labelledby="game-title">
    <h1 id="game-title" class="sr-only">Bastion — {{ training ? $t('training.lessons.' + training + '.title') : $t('briefing.level', { n: levelNumber }) }}</h1>

    <!-- HUD ------------------------------------------------------------ -->
    <div class="hud">
      <div class="hud-stats">
        <div class="stat" :class="{ 'is-hit': livesHit }">
          <AppIcon name="heart" class="stat-icon stat-icon--lives" />
          <span class="stat-label">{{ $t('hud.lives') }}</span>
          <span class="stat-value">{{ hud.lives }}</span>
        </div>
        <div v-for="p in hud.players" :key="p.id" class="stat" :class="coop ? 'stat--p' + p.id : ''">
          <AppIcon name="coin" class="coin-icon" />
          <span class="stat-label">{{ coop ? playerName(p.id) : $t('hud.gold') }}</span>
          <span class="stat-value">{{ p.gold }}</span>
        </div>
        <div class="stat">
          <AppIcon name="wave" class="stat-icon" />
          <span class="stat-label">{{ $t('hud.wave') }}</span>
          <span class="stat-value">{{ hud.wave }}/{{ hud.total }}</span>
        </div>
      </div>
      <div class="hud-controls">
        <button type="button" class="icon-btn" data-tutorial="pause" :aria-label="paused ? $t('hud.resume') : $t('hud.pause')" :title="paused ? $t('hud.resume') : $t('hud.pause')" :disabled="!!end" @click="togglePause">
          <AppIcon :name="paused ? 'play' : 'pause'" />
        </button>
        <button type="button" class="icon-btn icon-btn--text" data-tutorial="speed" :aria-label="$t('hud.speed', { n: speed })" :title="$t('hud.speed', { n: speed })" :disabled="!!end" @click="cycleSpeed">×{{ speed }}</button>
        <button v-if="!training" type="button" class="icon-btn" :aria-label="$t('hud.save')" :title="$t('hud.save')" :disabled="!!end" @click="saveAndQuit">
          <AppIcon name="save" />
        </button>
      </div>
    </div>

    <div v-if="boss" class="boss-bar" role="status">
      <span class="boss-name"><AppIcon name="skull" /> {{ $t('chapters.c' + level.chapter + '.boss') }}</span>
      <span class="boss-track"><span class="boss-fill" :style="{ width: boss.ratio * 100 + '%' }"></span></span>
    </div>

    <CoachBubble v-if="coachText && !end" :text="coachText" :next="coachNext" @dismiss="dismissCoach" @next="ackCoach" />
    <div v-if="spot && coachText && !end" class="spotlight" :style="spot" aria-hidden="true"></div>

    <div class="game-layout">
      <!-- Board ------------------------------------------------------- -->
      <div ref="boardWrap" class="board-wrap">
        <div class="board-frame">
          <canvas
            ref="canvas"
            class="board"
            :class="{ 'is-aiming': !!aiming }"
            tabindex="0"
            role="application"
            :aria-label="$t('hud.board')"
            aria-describedby="board-help"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerleave="hover = null"
            @keydown="onKeyDown"
          ></canvas>
          <p id="board-help" class="sr-only">{{ $t('hud.keys') }}</p>
          <p class="sr-only" aria-live="polite">{{ announce }}</p>

          <div v-if="paused && !end" class="board-overlay board-overlay--soft">
            <div class="pause-card card">
              <h2 class="pause-title">{{ $t('hud.paused') }}</h2>
              <button type="button" class="btn btn-primary btn-lg" @click="togglePause">{{ $t('hud.resume') }}</button>
              <button type="button" class="btn btn-secondary" @click="restart">{{ $t('end.retry') }}</button>
              <button v-if="training" type="button" class="btn btn-ghost" @click="quit">{{ $t('training.quit') }}</button>
              <button v-else type="button" class="btn btn-ghost" @click="saveAndQuit">{{ $t('hud.save') }}</button>
            </div>
          </div>

          <EndPanel v-if="end" :result="end" @next="nextLevel" @retry="restart" @levels="toLevels" @revive="revive" @double="doubleCrowns" />
        </div>

        <div class="wave-bar">
          <button type="button" class="btn btn-primary btn-wave" :class="{ 'is-pulsing': hud.canStart && hud.state === 'prepare' }" :disabled="!hud.canStart" data-tutorial="wave" @click="startWave">
            <span v-if="hud.state === 'prepare'">{{ $t('hud.startFirst') }}</span>
            <span v-else-if="hud.canStart" class="btn-stack">
              <span>{{ $t('hud.callNext', { s: hud.countdown }) }}</span>
              <small v-if="hud.bonus">{{ $t('hud.earlyBonus', { n: hud.bonus }) }}</small>
            </span>
            <span v-else>{{ hud.done ? $t('hud.lastWave') : $t('hud.waveRunning') }}</span>
            <kbd aria-hidden="true">␣</kbd>
          </button>
          <div v-if="nextWave.length && hud.canStart" class="next-wave" data-tutorial="next-wave">
            <span class="next-wave-label">{{ $t('hud.nextWave') }}</span>
            <ul class="next-wave-list" role="list">
              <li v-for="g in nextWave" :key="g.type" class="chip">
                <SpriteIcon kind="enemy" :type="g.type" :px="20" />
                {{ g.count }} × {{ $t('enemies.' + g.type + '.name') }}
              </li>
            </ul>
          </div>
        </div>

        <p v-if="coop && p2Card" class="p2-card">
          <span class="player-dot player-dot--2" aria-hidden="true"></span>
          {{ p2Card }}
        </p>
      </div>

      <!-- Sidebar ------------------------------------------------------ -->
      <aside class="sidebar">
        <div v-if="coop" class="player-switch segmented-track" role="group" :aria-label="$t('coop.whoPlays')">
          <button v-for="p in [1, 2]" :key="p" type="button" class="segmented-option" :class="['player-tab--' + p, { 'is-active': activePlayer === p }]" :aria-pressed="activePlayer === p ? 'true' : 'false'" @click="setActivePlayer(p)">
            <span class="player-dot" :class="'player-dot--' + p" aria-hidden="true"></span>{{ playerName(p) }}
          </button>
        </div>
        <PowerBar :powers="powerList" :enabled="hud.state === 'running' && !paused" :aiming="aiming" @activate="onPower" />
        <TowerPanel
          v-if="towerInfo"
          :info="towerInfo"
          @upgrade="upgrade"
          @sell="sell"
          @targeting="setTargeting"
          @close="clearSelection"
          @preview="upgradePreview = $event"
        />
        <TowerShop v-else :items="shopItems" :armed-type="armedType" :cell-state="cellState" :disabled="!!end" @pick="pickTower" />
        <button type="button" class="btn btn-ghost btn-menu" @click="quit"><AppIcon name="back" /> {{ $t('hud.menu') }}</button>
      </aside>
    </div>
  </section>
</template>

<script>
/**
 * @file Game screen controller (solo and cooperation): connects the engine
 * (Game, Renderer, GameLoop) to the UI and handles mouse, touch and keyboard.
 *
 * Cooperation: both players share the board and the lives, each has his own
 * gold and towers. Player 1 plays with the mouse or by touch; player 2 with
 * the keyboard (his own cursor) or by touch after picking his name in the
 * sidebar.
 */
import SpriteIcon from './SpriteIcon.vue';
import { markRaw } from 'vue';
import { Game, GameLoop, Renderer, LevelCatalog, Difficulty, TowerFactory, EnemyFactory, COOP_HP } from '../core/index.js';
import { achievementsFor, evaluateAchievements, runOf } from '../core/progression/Achievements.js';
import { Tutorial } from '../core/tutorial/Tutorial.js';
import { LESSONS, lessonById, trainingLevel, TrainingScript, TRAINING_REWARD } from '../core/tutorial/Training.js';
import { StoryRepository } from '../core/story/StoryRepository.js';
import { RewardTicket } from '../services/ads/RewardTicket.js';
import { services } from '../services/index.js';
import AppIcon from './AppIcon.vue';
import TowerShop from './TowerShop.vue';
import TowerPanel from './TowerPanel.vue';
import PowerBar from './PowerBar.vue';
import EndPanel from './EndPanel.vue';
import CoachBubble from './CoachBubble.vue';

const SPEEDS = [1, 2, 3];
const TOWER_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const POWER_KEYS = ['q', 'w', 'e', 'r', 't'];

export default {
  name: 'GameScreen',
  components: { AppIcon, TowerShop, TowerPanel, PowerBar, EndPanel, CoachBubble, SpriteIcon },
  data() {
    return {
      tick: 0,
      hud: { lives: 0, players: [], wave: 0, total: 0, state: 'prepare', canStart: true, countdown: 0, bonus: 0, done: false },
      levelNumber: 1,
      coop: false,
      activePlayer: 1,
      selectedCell: null,
      selectedTowerId: null,
      armedType: null,
      hover: null,
      p2: { col: 8, row: 4 },
      upgradePreview: false,
      aiming: null,
      aimPoint: null,
      speed: 1,
      paused: false,
      livesHit: false,
      end: null,
      coachText: '',
      coachNext: false,
      coachCell: null,
      spot: null,
      spotTarget: null,
      training: null,
      announce: '',
    };
  },
  computed: {
    level() {
      return LevelCatalog.byNumber(this.levelNumber);
    },
    selectedTower() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      if (!this.selectedTowerId || !this.engine.game) return null;
      return this.engine.game.towers.find((t) => t.id === this.selectedTowerId) || null;
    },
    towerInfo() {
      const t = this.selectedTower;
      if (!t) return null;
      const s = t.stats;
      const stats = [];
      if (t.type === 'barracks') stats.push({ key: 'soldiers', value: s.soldiers }, { key: 'hp', value: Math.round(s.hp * this.engine.game.modifier('soldierHp')) }, { key: 'dps', value: t.dps });
      else if (t.type === 'watch') stats.push({ key: 'range', value: t.range.toFixed(1) }, { key: 'buff', value: `+${Math.round(s.rangeBuff * 100)}%` });
      else if (t.type === 'treasury') stats.push({ key: 'income', value: Math.round(s.income * this.engine.game.modifier('income')) });
      else stats.push({ key: 'damage', value: Math.round(s.damage) }, { key: 'range', value: t.range.toFixed(1) }, { key: 'dps', value: t.dps });
      stats.push({ key: 'kills', value: t.kills });
      const owner = this.coop ? this.activePlayer : 1;
      return {
        id: t.id,
        type: t.type,
        color: t.constructor.color,
        level: t.level,
        maxLevel: t.baseLevels + (t.constructor.elite ? 1 : 0),
        elite: t.isElite,
        nextElite: t.canUpgrade && t.level >= t.baseLevels,
        eliteLocked: !t.canUpgrade && t.constructor.elite && !t.eliteUnlocked,
        stats,
        canTarget: t.constructor.targets !== 'none',
        canUpgrade: t.canUpgrade,
        upgradePrice: t.upgradePrice,
        affordable: this.engine.game.player(t.owner).gold >= t.upgradePrice,
        sellValue: this.engine.game.sellValue(t),
        targeting: t.targeting.constructor.id,
        mine: !this.coop || t.owner === owner,
      };
    },
    shopItems() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      const g = this.engine.game;
      if (!g) return [];
      const gold = g.player(this.coop ? this.activePlayer : 1).gold;
      return TowerFactory.catalogue()
        .filter((c) => g.isTowerAllowed(c.type))
        .map((c, i) => ({ ...c, cost: g.priceOf(c.type), affordable: gold >= g.priceOf(c.type), key: this.coop ? null : TOWER_KEYS[i] }));
    },
    cellState() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      const c = this.selectedCell;
      if (!c || !this.engine.game) return 'none';
      return this.engine.game.map.isBuildable(c.col, c.row) ? 'buildable' : 'blocked';
    },
    powerList() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      if (!this.engine.game) return [];
      return this.engine.game.powers.powers.map((p) => ({
        id: p.id,
        icon: p.constructor.icon,
        state: p.state,
        ready: p.isReady,
        progress: p.progress,
        seconds: Math.ceil(p.remaining),
      }));
    },
    nextWave() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      if (!this.engine.game) return [];
      return this.engine.game.waves.preview().map((g) => ({ ...g, color: EnemyFactory.get(g.type).stats.color }));
    },
    boss() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      const g = this.engine.game;
      const b = g && g.enemies.find((e) => e.boss && e.alive);
      return b ? { ratio: b.hpRatio } : null;
    },
    p2Card() {
      // eslint-disable-next-line no-unused-expressions
      this.tick;
      const g = this.engine.game;
      if (!g || !this.coop) return '';
      const t = g.map.towerAt(this.p2.col, this.p2.row);
      if (!t) return this.$t('coop.p2Help');
      const up = t.canUpgrade ? this.$t('coop.p2Upgrade', { n: t.upgradePrice }) : this.$t('tower.max');
      return `${this.$t('towers.' + t.type + '.name')} · ${this.$t('tower.level', { n: t.level })} · ${up}`;
    },
  },
  watch: {
    '$store.theme'(mode) {
      if (this.engine.renderer) this.engine.renderer.setMode(mode);
    },
  },
  created() {
    // Non-reactive holder for engine objects (kept out of Vue for speed).
    this.engine = markRaw({ game: null, renderer: null, loop: null, observer: null, lastSync: 0, size: '', tutorial: null });
    this.levelNumber = this.$store.game.levelNumber;
    this.coop = this.$store.game.track === 'coop';
    this.rewards = { revive: false, double: false };
  },
  mounted() {
    this.setupGame();
    this._onPageHide = () => this.autosave();
    this._onVisibility = () => {
      if (document.hidden) {
        this.autosave();
        if (!this.paused && !this.end) this.togglePause();
      }
    };
    this._onResize = () => this.resize();
    this._onKey = (e) => this.onGlobalKey(e);
    window.addEventListener('pagehide', this._onPageHide);
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('keydown', this._onKey);
    services.ads?.gameplayStart();
    services.audio?.music('battle', { chapter: this.level.chapter });
  },
  beforeUnmount() {
    this.autosave();
    this.$store.savedGame = services.saves.loadGame();
    this.teardown();
    window.removeEventListener('pagehide', this._onPageHide);
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKey);
    services.ads?.gameplayStop();
    services.audio?.music('menu');
  },
  methods: {
    // ------------------------------------------------------------- setup
    setupGame() {
      const { resume, levelNumber, loadout } = this.$store.game;
      const track = this.coop ? 'coop' : 'solo';
      let game = null;
      const lesson = this.$store.game.training ? lessonById(this.$store.game.training) : null;
      if (lesson) {
        // Training: its own small map, gentle difficulty, no workshop bonus.
        this.training = lesson.id;
        game = new Game({ level: trainingLevel(lesson), difficulty: Difficulty.get('easy'), loadout: lesson.loadout, mods: {}, players: 1 });
      }
      if (!game && resume) game = Game.restore(services.saves.loadGame());
      if (!game) {
        const level = LevelCatalog.byNumber(levelNumber) || LevelCatalog.byNumber(1);
        game = new Game({
          level,
          difficulty: Difficulty.get(this.$store.difficulty),
          loadout: loadout && loadout.length ? loadout : services.saves.loadout(track),
          mods: services.saves.mods(),
          players: this.coop ? 2 : 1,
          hpMult: this.coop ? COOP_HP : 1,
        });
      }
      this.coop = game.playerCount === 2;
      this.levelNumber = game.level.number;

      const renderer = new Renderer(this.$refs.canvas, game.level);
      renderer.setMode(this.$store.theme);
      renderer.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      renderer.setOptions({ gore: services.saves.settings.gore, particles: services.saves.settings.particles });
      renderer.attach(game);

      const loop = new GameLoop(
        (dt) => game.update(dt),
        () => this.frame(),
      );

      this.engine.game = markRaw(game);
      this.engine.renderer = markRaw(renderer);
      this.engine.loop = markRaw(loop);
      this.bindGameEvents(game);

      if (lesson) {
        this.engine.tutorial = markRaw(new TrainingScript(lesson));
      } else if (services.saves.settings.tutorials && !this.coop) {
        const seenPowers = (id) => services.saves.hasSeen('tutorials', id);
        const newPowers = game.powers.powers.map((p) => p.id).filter((id) => !seenPowers(`power-${id}`));
        this.engine.tutorial = markRaw(new Tutorial({ level: game.level, newPowers, seen: seenPowers }));
      }

      if (typeof ResizeObserver === 'function') {
        this.engine.observer = new ResizeObserver(() => this.resize());
        this.engine.observer.observe(this.$refs.boardWrap);
      }
      this.resize();
      this.sync();
      loop.start();
      if (game.state === 'running' && resume) {
        // Resumed mid-level: start paused so the player can get ready.
        this.paused = true;
        game.paused = true;
      }
      this.$nextTick(() => this.$refs.canvas && this.$refs.canvas.focus({ preventScroll: true }));
    },

    bindGameEvents(game) {
      const t = (k, p) => this.$t(k, p);
      const audio = services.audio;
      game.on('waveStart', ({ wave, total, early, bonus }) => {
        this.$actions.toast(early ? t('toast.early', { n: wave, bonus }) : t('toast.waveStart', { n: wave, total }));
        this.announce = t('toast.waveStart', { n: wave, total });
        audio?.sfx('horn');
        this.autosave();
      });
      game.on('leak', () => {
        if (game.lives <= game.maxLives * 0.3) audio?.surge(3, 3);
        this.livesHit = false;
        requestAnimationFrame(() => (this.livesHit = true));
        clearTimeout(this._hitTimer);
        this._hitTimer = setTimeout(() => (this.livesHit = false), 500);
        audio?.sfx('leak');
      });
      game.on('kill', (e) => audio?.sfx(e.boss ? 'bossDown' : 'kill'));
      game.on('hit', ({ kind }) => audio?.sfx('hit-' + kind));
      game.on('build', () => audio?.sfx('build'));
      game.on('upgrade', () => audio?.sfx('upgrade'));
      game.on('sell', () => audio?.sfx('sell'));
      game.on('heal', () => audio?.sfx('heal'));
      game.on('power', ({ id }) => {
        this.$actions.toast(t('toast.power', { power: t('powers.' + id + '.name') }), 'power');
        audio?.sfx('power-' + id);
      });
      game.on('won', ({ stars, score }) => this.finish(true, stars, score));
      game.on('lost', ({ score }) => this.finish(false, 0, score));
    },

    finish(won, stars, score) {
      if (this.training) return this.finishTraining(won, stars, score);
      const game = this.engine.game;
      const level = game.level;
      const track = this.coop ? 'coop' : 'solo';
      services.saves.clearGame();
      // Wave messages would cover the result panel.
      this.$store.toasts.splice(0);
      services.audio?.sfx(won ? 'victory' : 'defeat');
      services.audio?.music(won ? 'victory' : 'menu');
      services.ads?.gameplayStop();
      const mask = won ? evaluateAchievements(level, runOf(game)) : 0;
      const before = services.saves.achievementsFor(level.number, track);
      const res = services.saves.completeLevel({ level, difficulty: game.difficulty.id, won, stars, score, mask, track });
      const ids = achievementsFor(level);
      this.end = {
        won,
        stars,
        score,
        crowns: res.crowns,
        challenges: ids.map((id, i) => ({ id, passed: Boolean(mask & (1 << i)), newly: Boolean(mask & (1 << i)) && !(before & (1 << i)) })),
        newPowers: res.newPowers,
        last: won && level.number === LevelCatalog.count,
        canRevive: !won && !game.revived && services.ads?.rewardedAvailable,
        canDouble: won && res.crowns.total > 0 && services.ads?.rewardedAvailable,
      };
      if (won) services.ads?.happytime();
      services.ads?.reportProgress((services.saves.campaign('solo').completed / LevelCatalog.count) * 100);
      this.clearSelection();
      this.sync();
      for (const id of this.engine.tutorial?.finished || []) services.saves.markSeen('tutorials', id);
      if (won && StoryRepository.beatAfter(level.number) && services.saves.settings.story) {
        this.$actions.showStory(StoryRepository.beatAfter(level.number).id);
      }
    },

    finishTraining(won, stars, score) {
      const id = this.training;
      services.audio?.sfx(won ? 'victory' : 'defeat');
      services.audio?.music(won ? 'victory' : 'menu');
      this.$store.toasts.splice(0);
      const crowns = won ? services.saves.completeTraining(id, TRAINING_REWARD) : 0;
      // What a lesson taught needs no repeat in the campaign.
      const taught = { t1: 'basics', t2: 'targeting', t3: 'early' }[id];
      if (won && taught) services.saves.markSeen('tutorials', taught);
      const next = LESSONS[LESSONS.findIndex((l) => l.id === id) + 1] || null;
      this.end = {
        won,
        stars,
        score,
        training: id,
        nextLesson: next ? next.id : null,
        crowns: { total: crowns, parts: crowns ? [{ id: 'training', amount: crowns }] : [] },
        challenges: [],
        newPowers: [],
        last: false,
        canRevive: false,
        canDouble: false,
      };
      this.clearSelection();
      this.sync();
    },

    teardown() {
      const { loop, observer, game } = this.engine;
      if (loop) loop.stop();
      if (observer) observer.disconnect();
      if (game) game.removeAllListeners();
      clearTimeout(this._hitTimer);
    },

    resize() {
      const wrap = this.$refs.boardWrap;
      const r = this.engine.renderer;
      if (!wrap || !r) return;
      const width = wrap.clientWidth;
      const portrait = window.innerHeight > window.innerWidth;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const reserve = 70;
      const maxHeight = portrait ? window.innerHeight * 0.52 : Math.max(200, window.innerHeight - top - reserve);
      const key = `${width}x${Math.round(maxHeight)}`;
      if (key === this.engine.size) return;
      this.engine.size = key;
      r.resize(width, maxHeight);
    },

    // ------------------------------------------------------------- frame
    frame() {
      const { game, renderer } = this.engine;
      const cursors = this.coop ? [{ ...this.p2, player: 2 }] : [];
      const power = this.aiming ? game.powers.get(this.aiming) : null;
      renderer.render(game, {
        selectedCell: this.selectedCell,
        selectedTower: this.selectedTower,
        hoverCell: this.hover,
        previewType: this.armedType ? TowerFactory.get(this.armedType) : null,
        upgradePreview: this.upgradePreview,
        aim: power && this.aimPoint ? { ...this.aimPoint, radius: power.constructor.radius } : null,
        cursors,
        coop: this.coop,
        hint: this.coachText && !this.end ? this.coachCell : null,
      });
      const now = performance.now();
      if (now - this.engine.lastSync > 100) this.sync(now);
    },

    /** Copies what the template needs (throttled: Vue does not re-render 60 times per second). */
    sync(now = performance.now()) {
      const g = this.engine.game;
      if (!g) return;
      this.engine.lastSync = now;
      const h = this.hud;
      h.lives = g.lives;
      h.players = g.players.map((p) => ({ id: p.id, gold: p.gold }));
      h.wave = g.waves.current;
      h.total = g.waves.total;
      h.state = g.state;
      h.canStart = g.canStartWave;
      h.countdown = g.countdown === null ? 0 : Math.ceil(g.countdown);
      h.bonus = g.earlyBonus;
      h.done = !g.waves.hasMoreWaves;
      this.tick++;
      if (!g.isOver) services.audio?.intensity(g.enemies.some((e) => e.boss) ? 3 : g.state === 'running' ? 2 : 1);
      const tut = this.engine.tutorial;
      if (tut && !this.end) {
        const step = tut.current({
          game: g,
          cellSelected: Boolean(this.selectedCell),
          selected: this.selectedCell,
          selectedTower: this.selectedTower,
          armedType: this.armedType,
          speed: this.speed,
          aiming: this.aiming,
        });
        this.coachText = step ? this.coachMessage(step) : '';
        this.coachNext = Boolean(step && step.next);
        this.coachCell = step && step.cell ? { col: step.cell[0], row: step.cell[1] } : null;
        this.placeSpotlight(step && step.target);
        for (const id of tut.finished.splice(0)) services.saves.markSeen('tutorials', id);
      }
    },

    coachMessage(step) {
      if (step.raw) return this.$t(step.key);
      const p = { ...step.params };
      if (p.type) p.tower = this.$t('towers.' + p.type + '.name');
      if (p.type) p.desc = this.$t('towers.' + p.type + '.desc');
      if (p.power) {
        p.desc = this.$t('powers.' + p.power + '.desc');
        p.power = this.$t('powers.' + p.power + '.name');
      }
      return this.$t('tutorial.' + step.key, p);
    },

    dismissCoach() {
      this.engine.tutorial?.dismiss();
      this.sync();
    },

    /** "Next" on a training explanation. */
    ackCoach() {
      this.engine.tutorial?.ack?.();
      this.sync();
    },

    /** Golden ring around the interface element the coach talks about. */
    placeSpotlight(target) {
      const el = target ? document.querySelector(`[data-tutorial="${target}"]`) : null;
      if (!el || !el.offsetParent) {
        this.spot = null;
        this.spotTarget = null;
        return;
      }
      const r = el.getBoundingClientRect();
      // On phones the shop or the powers can sit below the fold: bring them in once.
      if (target !== this.spotTarget) {
        this.spotTarget = target;
        if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      const pad = 6;
      this.spot = { left: `${r.left - pad}px`, top: `${r.top - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` };
    },

    autosave() {
      const g = this.engine.game;
      // Training games are short and never saved (the campaign save stays untouched).
      if (!g || g.isOver || this.training) return;
      if (g.state === 'prepare' && g.towers.length === 0) return;
      services.saves.saveGame({ ...g.serialize(), track: this.coop ? 'coop' : 'solo' });
    },

    playerName(id) {
      const n = services.saves.settings.names[id - 1];
      return n || this.$t('coop.player', { n: id });
    },

    // ------------------------------------------------------------- input
    owner() {
      return this.coop ? this.activePlayer : 1;
    },

    setActivePlayer(p) {
      this.activePlayer = p;
      this.armedType = null;
      this.selectedTowerId = null;
    },

    onPointerDown(evt) {
      if (this.end || this.paused) return;
      const r = this.engine.renderer;
      if (this.aiming) {
        this.castAimed(r.worldFromEvent(evt), this.owner());
        return;
      }
      this.handleCell(r.cellFromEvent(evt), this.owner());
    },

    onPointerMove(evt) {
      const r = this.engine.renderer;
      if (this.aiming) this.aimPoint = r.worldFromEvent(evt);
      if (evt.pointerType !== 'mouse') return;
      this.hover = r.cellFromEvent(evt);
    },

    handleCell({ col, row }, owner) {
      const game = this.engine.game;
      if (!game.map.inBounds(col, row)) return;
      const tower = game.map.towerAt(col, row);
      if (tower) {
        if (this.coop && tower.owner !== owner) this.setActivePlayer(tower.owner);
        this.selectedTowerId = tower.id;
        this.selectedCell = { col, row };
        this.armedType = null;
        this.sync();
        return;
      }
      this.selectedTowerId = null;
      this.selectedCell = { col, row };
      if (this.armedType && game.map.isBuildable(col, row)) this.build(this.armedType, owner);
      this.sync();
    },

    /** Keys on the focused board (solo, and player 2 in cooperation). */
    onKeyDown(evt) {
      if (this.coop) return; // cooperation keys are global (see onGlobalKey)
      const game = this.engine.game;
      if (!game || this.end) return;
      const cell = this.selectedCell || { col: Math.floor(game.map.cols / 2), row: Math.floor(game.map.rows / 2) };
      const dir = this.arrow(evt.key);
      if (dir) {
        evt.preventDefault();
        const col = Math.min(game.map.cols - 1, Math.max(0, cell.col + dir[0]));
        const row = Math.min(game.map.rows - 1, Math.max(0, cell.row + dir[1]));
        const tower = game.map.towerAt(col, row);
        this.selectedCell = { col, row };
        this.selectedTowerId = tower ? tower.id : null;
        if (this.aiming) this.aimPoint = { x: col + 0.5, y: row + 0.5 };
        this.sync();
        return;
      }
      const key = evt.key.toLowerCase();
      const ti = TOWER_KEYS.indexOf(evt.key);
      if (ti >= 0 && this.shopItems[ti]) {
        evt.preventDefault();
        this.selectedCell = cell;
        this.pickTower(this.shopItems[ti].type);
      } else if (evt.key === 'Enter') {
        evt.preventDefault();
        if (this.aiming) this.castAimed({ x: cell.col + 0.5, y: cell.row + 0.5 }, 1);
        else this.handleCell(cell, 1);
      } else if (key === 'u' && this.selectedTower) {
        this.upgrade();
      } else if (key === 's' && this.selectedTower) {
        this.sell();
      }
    },

    /** Keys anywhere: wave, pause, powers (and player 2 in cooperation). */
    onGlobalKey(evt) {
      const game = this.engine.game;
      if (!game || this.$store.story || evt.target?.tagName === 'INPUT' || evt.target?.tagName === 'SELECT') return;
      const key = evt.key.toLowerCase();
      if (evt.key === 'Escape') {
        if (this.aiming) this.aiming = null;
        else if (this.selectedCell || this.armedType) this.clearSelection();
        else if (!this.end) this.togglePause();
        return;
      }
      if (this.end) return;
      if (key === 'p') {
        this.togglePause();
        return;
      }
      if (evt.key === ' ' && (document.activeElement === this.$refs.canvas || document.activeElement === document.body || this.coop)) {
        evt.preventDefault();
        this.startWave();
        return;
      }
      const pi = POWER_KEYS.indexOf(key);
      if (pi >= 0 && game.powers.powers[pi]) {
        evt.preventDefault();
        const owner = this.coop ? 2 : 1;
        const id = game.powers.powers[pi].id;
        if (this.coop && game.powers.powers[pi].targeted) this.castAt(id, { x: this.p2.col + 0.5, y: this.p2.row + 0.5 }, 2);
        else this.onPower(id, owner);
        return;
      }
      if (!this.coop) return;
      // Player 2: keyboard cursor.
      const dir = this.arrow(evt.key);
      if (dir) {
        evt.preventDefault();
        this.p2 = {
          col: Math.min(game.map.cols - 1, Math.max(0, this.p2.col + dir[0])),
          row: Math.min(game.map.rows - 1, Math.max(0, this.p2.row + dir[1])),
        };
        this.sync();
        return;
      }
      const ti = TOWER_KEYS.indexOf(evt.key);
      const allowed = TowerFactory.catalogue().filter((c) => game.isTowerAllowed(c.type));
      if (ti >= 0 && allowed[ti]) {
        evt.preventDefault();
        const type = allowed[ti].type;
        if (!game.canAfford(type, 2)) this.$actions.toast(this.$t('toast.noGoldP', { name: this.playerName(2) }), 'warn');
        else game.buildTower(type, this.p2.col, this.p2.row, 2);
        this.sync();
        return;
      }
      const t = game.map.towerAt(this.p2.col, this.p2.row);
      if (t && t.owner === 2 && key === 'u') game.upgradeTower(t, 2);
      else if (t && t.owner === 2 && (evt.key === 'Backspace' || evt.key === 'Delete')) game.sellTower(t, 2);
      this.sync();
    },

    /** Grid direction of an arrow key, or null. */
    arrow(key) {
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const d = map[key];
      if (!d) return null;
      // Arrow keys follow what is on screen, even when the board is rotated.
      if (this.engine.renderer?.rotated) return [d[1], -d[0]];
      return d;
    },

    clearSelection() {
      this.selectedCell = null;
      this.selectedTowerId = null;
      this.armedType = null;
      this.upgradePreview = false;
      this.aiming = null;
    },

    // ------------------------------------------------------------- actions
    pickTower(type) {
      const game = this.engine.game;
      const owner = this.owner();
      const c = this.selectedCell;
      if (!game.canAfford(type, owner)) {
        this.$actions.toast(this.$t('toast.noGold'), 'warn');
        services.audio?.sfx('error');
        return;
      }
      if (c && game.map.isBuildable(c.col, c.row)) this.build(type, owner);
      else this.armedType = this.armedType === type ? null : type;
    },

    build(type, owner) {
      const game = this.engine.game;
      const c = this.selectedCell;
      const tower = game.buildTower(type, c.col, c.row, owner);
      if (!tower) return;
      // Keep the tower armed while the player can afford another one (fast building).
      if (!game.canAfford(type, owner)) this.armedType = null;
      this.selectedCell = null;
      this.sync();
    },

    upgrade() {
      const t = this.selectedTower;
      if (t && this.engine.game.upgradeTower(t, t.owner)) this.sync();
    },

    sell() {
      const t = this.selectedTower;
      if (t && this.engine.game.sellTower(t, t.owner)) {
        this.clearSelection();
        this.sync();
      }
    },

    setTargeting(id) {
      if (this.selectedTower) this.selectedTower.setTargeting(id);
      this.sync();
    },

    startWave() {
      if (this.paused) this.togglePause();
      if (this.engine.game.startWave()) this.sync();
    },

    onPower(id, owner = this.owner()) {
      const game = this.engine.game;
      const p = game.powers.get(id);
      if (!p || !p.isReady || game.state !== 'running') return;
      if (p.targeted) {
        this.aiming = this.aiming === id ? null : id;
        this.armedType = null;
        this.selectedTowerId = null;
        this.aimPoint = this.selectedCell ? { x: this.selectedCell.col + 0.5, y: this.selectedCell.row + 0.5 } : null;
        if (this.aiming) this.$actions.toast(this.$t('powers.aimHelp'));
        return;
      }
      if (game.activatePower(id, null, owner)) this.sync();
    },

    castAimed(point, owner) {
      const id = this.aiming;
      this.aiming = null;
      this.castAt(id, point, owner);
    },

    castAt(id, point, owner) {
      if (this.engine.game.activatePower(id, point, owner)) this.sync();
    },

    togglePause() {
      if (this.end) return;
      this.paused = !this.paused;
      this.engine.game.paused = this.paused;
      if (this.paused) services.ads?.gameplayStop();
      else {
        services.ads?.gameplayStart();
        this.$refs.canvas?.focus({ preventScroll: true });
      }
    },

    cycleSpeed() {
      this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
      this.engine.loop.timeScale = this.speed;
    },

    async revive() {
      const ticket = await services.ads?.rewarded('revive');
      if (!RewardTicket.redeem(ticket, 'revive')) return;
      if (this.engine.game.revive(5)) {
        this.end = null;
        services.ads?.gameplayStart();
        services.audio?.music('battle', { chapter: this.level.chapter });
      }
    },

    async doubleCrowns() {
      const ticket = await services.ads?.rewarded('double-crowns');
      if (!RewardTicket.redeem(ticket, 'double-crowns') || !this.end) return;
      services.saves.addBonusCrowns(this.end.crowns.total);
      this.end = { ...this.end, crowns: { ...this.end.crowns, total: this.end.crowns.total * 2 }, canDouble: false };
    },

    saveAndQuit() {
      const g = this.engine.game;
      services.saves.saveGame({ ...g.serialize(), track: this.coop ? 'coop' : 'solo' });
      this.$actions.toast(this.$t('toast.saved'), 'success');
      this.$actions.openCampaign(this.coop ? 'coop' : 'solo');
    },

    quit() {
      if (this.training) this.$actions.go('learn');
      else this.$actions.openCampaign(this.coop ? 'coop' : 'solo');
    },

    async restart() {
      if (this.training) return this.$actions.startTraining(this.training);
      await this.$actions.betweenLevels();
      this.$actions.startLevel(this.levelNumber, { track: this.coop ? 'coop' : 'solo' });
    },

    async nextLevel() {
      if (this.training) {
        if (this.end && this.end.nextLesson) this.$actions.startTraining(this.end.nextLesson);
        else this.$actions.openCampaign('solo');
        return;
      }
      await this.$actions.betweenLevels();
      const track = this.coop ? 'coop' : 'solo';
      this.$actions.openCampaign(track);
      this.$store.chapter = Math.min(10, Math.floor(this.levelNumber / 10) + 1);
      this.$actions.openBriefing(Math.min(LevelCatalog.count, this.levelNumber + 1));
    },

    async toLevels() {
      if (this.training) return this.$actions.go('learn');
      await this.$actions.betweenLevels();
      this.$actions.openCampaign(this.coop ? 'coop' : 'solo');
    },
  },
};
</script>
