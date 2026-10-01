<template>
  <section class="game" :class="{ 'is-paused': paused }" aria-labelledby="game-title">
    <h1 id="game-title" class="sr-only">
      Bastion — {{ $t('levels.level', { n: levelNumber }) }} : {{ $t('levels.names.' + levelId) }}
    </h1>

    <!-- HUD ------------------------------------------------------------ -->
    <div class="hud">
      <div class="hud-stats">
        <div class="stat" :class="{ 'is-hit': livesHit }">
          <span class="stat-icon stat-icon--lives" aria-hidden="true">♥</span>
          <span class="stat-label">{{ $t('hud.lives') }}</span>
          <span class="stat-value">{{ hud.lives }}</span>
        </div>
        <div class="stat">
          <span class="coin" aria-hidden="true"></span>
          <span class="stat-label">{{ $t('hud.gold') }}</span>
          <span class="stat-value">{{ hud.gold }}</span>
        </div>
        <div class="stat">
          <span class="stat-icon" aria-hidden="true">≋</span>
          <span class="stat-label">{{ $t('hud.wave') }}</span>
          <span class="stat-value">{{ hud.wave }}/{{ hud.total }}</span>
        </div>
        <div class="stat stat--score">
          <span class="stat-icon" aria-hidden="true">✦</span>
          <span class="stat-label">{{ $t('hud.score') }}</span>
          <span class="stat-value">{{ hud.score }}</span>
        </div>
      </div>
      <div class="hud-controls">
        <button type="button" class="icon-btn" :aria-label="paused ? $t('hud.resume') : $t('hud.pause')" :title="paused ? $t('hud.resume') : $t('hud.pause')" :aria-pressed="paused ? 'true' : 'false'" :disabled="!!end" @click="togglePause">
          <svg v-if="paused" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
        </button>
        <button type="button" class="icon-btn icon-btn--text" :aria-label="$t('hud.speed', { n: speed })" :title="$t('hud.speed', { n: speed })" :disabled="!!end" @click="cycleSpeed">
          ×{{ speed }}
        </button>
        <button type="button" class="icon-btn" :aria-label="$t('hud.save')" :title="$t('hud.save')" :disabled="!!end" @click="saveAndQuit">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 2v5h9V5Zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" fill="currentColor" /></svg>
        </button>
      </div>
    </div>

    <div class="game-layout">
      <!-- Board ------------------------------------------------------- -->
      <div ref="boardWrap" class="board-wrap">
        <div class="board-frame">
          <canvas
            ref="canvas"
            class="board"
            tabindex="0"
            role="application"
            :aria-label="$t('hud.board')"
            aria-describedby="board-help"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerleave="hoverCell = null"
            @keydown="onKeyDown"
            @focus="keyboard = true"
            @blur="keyboard = false"
          ></canvas>
          <p id="board-help" class="sr-only">1-4 / Enter / U / S / Space / P / Esc</p>

          <div v-if="paused && !end" class="board-overlay board-overlay--soft">
            <button type="button" class="btn btn-primary btn-lg" @click="togglePause">{{ $t('hud.resume') }}</button>
          </div>

          <div v-if="end" class="board-overlay" role="dialog" aria-modal="true" aria-labelledby="end-title">
            <div class="end-card card">
              <h2 id="end-title" class="end-title" :class="end.won ? 'is-won' : 'is-lost'">{{ end.won ? $t('end.won') : $t('end.lost') }}</h2>
              <p class="end-text">{{ end.won ? $t('end.wonText') : $t('end.lostText') }}</p>
              <p v-if="end.won" class="end-stars" :aria-label="$t('menu.stars', { count: end.stars })">
                <span v-for="s in 3" :key="s" :class="s <= end.stars ? 'star-on' : 'star-off'" :style="{ animationDelay: s * 0.15 + 's' }" aria-hidden="true">★</span>
              </p>
              <p class="end-score">{{ $t('end.score', { score: end.score }) }}</p>
              <p v-for="id in end.unlocked" :key="id" class="notice notice--success">
                {{ $t('end.unlocked', { power: $t('powers.' + id + '.name') }) }}
              </p>
              <p v-if="end.won && !hasNextLevel" class="notice">{{ $t('end.allDone') }}</p>
              <div class="end-actions">
                <button v-if="end.won && hasNextLevel" ref="endPrimary" type="button" class="btn btn-primary" @click="nextLevel">{{ $t('end.next') }}</button>
                <button ref="endRetry" type="button" class="btn" :class="end.won && hasNextLevel ? 'btn-secondary' : 'btn-primary'" @click="restart">{{ $t('end.retry') }}</button>
                <button type="button" class="btn btn-ghost" @click="$actions.go('levels')">{{ $t('end.levels') }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="wave-bar">
          <button type="button" class="btn btn-primary btn-wave" :class="{ 'is-pulsing': hud.canStart }" :disabled="!hud.canStart" @click="startWave">
            <span v-if="hud.canStart">{{ hud.wave === 0 ? $t('hud.startFirst') : $t('hud.startWave') }}</span>
            <span v-else>{{ $t('hud.waveRunning') }}</span>
            <kbd v-if="hud.canStart" aria-hidden="true">␣</kbd>
          </button>
          <div v-if="nextWave.length && hud.canStart" class="next-wave">
            <span class="next-wave-label">{{ $t('hud.nextWave') }}</span>
            <ul class="next-wave-list" role="list">
              <li v-for="g in nextWave" :key="g.type" class="chip">
                <span class="dot" :style="{ background: g.color }" aria-hidden="true"></span>
                {{ g.count }} × {{ $t('enemies.' + g.type) }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Sidebar ------------------------------------------------------ -->
      <aside class="sidebar">
        <PowerBar :powers="powerList" :wave-running="hud.state === 'wave' && !paused" @activate="activatePower" />
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
        <button type="button" class="btn btn-ghost btn-menu" @click="quit">
          <span aria-hidden="true">←</span> {{ $t('hud.menu') }}
        </button>
      </aside>
    </div>
  </section>
</template>

<script>
/**
 * @file Game screen controller: connects the engine (Game, Renderer, GameLoop) to the UI and handles input.
 */
import { markRaw } from 'vue';
import { Game, GameLoop, Renderer, LevelCatalog, Difficulty, TowerFactory, EnemyFactory } from '../core/index.js';
import { services } from '../services/index.js';
import TowerShop from './TowerShop.vue';
import TowerPanel from './TowerPanel.vue';
import PowerBar from './PowerBar.vue';

const SPEEDS = [1, 2, 3];

/**
 * Controller component: wires the engine (Game, Renderer, GameLoop)
 * to the DOM. Engine objects are kept out of Vue reactivity for speed;
 * the HUD is refreshed ~10 times per second through `tick`.
 */
export default {
  name: 'GameScreen',
  components: { TowerShop, TowerPanel, PowerBar },
  data() {
    return {
      tick: 0,
      hud: { lives: 0, gold: 0, wave: 0, total: 0, score: 0, state: 'building', canStart: true },
      levelId: '',
      levelNumber: 1,
      selectedCell: null,
      selectedTowerId: null,
      armedType: null,
      hoverCell: null,
      upgradePreview: false,
      keyboard: false,
      speed: 1,
      paused: false,
      livesHit: false,
      end: null,
    };
  },
  computed: {
    hasNextLevel() {
      return !!LevelCatalog.get(this.levelIndex + 1);
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
      return {
        id: t.id,
        type: t.type,
        color: t.constructor.color,
        level: t.level,
        maxLevel: t.maxLevel,
        damage: t.stats.damage,
        range: t.range.toFixed(1),
        rate: t.stats.fireRate.toFixed(1),
        kills: t.kills,
        canUpgrade: t.canUpgrade,
        upgradePrice: t.upgradePrice,
        affordable: this.hud.gold >= t.upgradePrice,
        sellValue: t.sellValue,
        targeting: t.targeting.constructor.id,
      };
    },
    shopItems() {
      return TowerFactory.catalogue().map((item) => ({ ...item, affordable: this.hud.gold >= item.cost }));
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
      return this.engine.game.waves.preview().map((g) => ({ ...g, color: EnemyFactory.registry.get(g.type).stats.color }));
    },
  },
  watch: {
    '$store.theme'(mode) {
      if (this.engine.renderer) this.engine.renderer.setMode(mode);
    },
  },
  created() {
    // Non-reactive holder for engine objects.
    this.engine = markRaw({ game: null, renderer: null, loop: null, observer: null, lastSync: 0, size: '' });
    this.levelIndex = this.$store.game.levelIndex;
  },
  mounted() {
    this.setupGame();
    this._onPageHide = () => this.autosave();
    this._onVisibility = () => {
      if (document.hidden) this.autosave();
    };
    this._onResize = () => this.resize();
    window.addEventListener('pagehide', this._onPageHide);
    document.addEventListener('visibilitychange', this._onVisibility);
    window.addEventListener('resize', this._onResize, { passive: true });
  },
  beforeUnmount() {
    this.autosave();
    this.$store.savedGame = services.saves.loadGame();
    this.teardown();
    window.removeEventListener('pagehide', this._onPageHide);
    document.removeEventListener('visibilitychange', this._onVisibility);
    window.removeEventListener('resize', this._onResize);
  },
  methods: {
    // ------------------------------------------------------------- setup
    /**
     * Creates (or restores from the save) the Game, then the Renderer and the GameLoop,
     * and starts the loop. Called once when the screen is mounted.
     */
    setupGame() {
      const { resume, levelIndex } = this.$store.game;
      let game = null;
      if (resume) game = Game.restore(services.saves.loadGame());
      if (!game) {
        const level = LevelCatalog.get(levelIndex) || LevelCatalog.get(0);
        game = new Game({
          level,
          difficulty: Difficulty.get(this.$store.difficulty),
          unlockedPowers: services.saves.unlockedPowers,
        });
      }
      this.levelIndex = game.level.index;
      this.levelId = game.level.id;
      this.levelNumber = game.level.number;

      const renderer = new Renderer(this.$refs.canvas, game.level);
      renderer.setMode(this.$store.theme);
      renderer.reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

      const loop = new GameLoop(
        (dt) => game.update(dt),
        () => this.frame(),
      );

      this.engine.game = markRaw(game);
      this.engine.renderer = markRaw(renderer);
      this.engine.loop = markRaw(loop);
      this.bindGameEvents(game);

      if (typeof ResizeObserver === 'function') {
        this.engine.observer = new ResizeObserver(() => this.resize());
        this.engine.observer.observe(this.$refs.boardWrap);
      }
      this.resize();
      this.sync();
      loop.start();
      if (game.state === 'wave' && resume) {
        // Resumed mid-wave: start paused so the player can get ready.
        this.paused = true;
        game.paused = true;
      }
    },

    /** Turns engine events into toasts, autosaves and the end-of-level dialog. */
    bindGameEvents(game) {
      const t = (k, p) => this.$t(k, p);
      game.on('waveStart', ({ wave }) => this.$actions.toast(t('toast.waveStart', { n: wave })));
      game.on('waveEnd', ({ wave, bonus }) => {
        this.$actions.toast(t('toast.waveEnd', { n: wave, bonus }), 'success');
        this.autosave();
      });
      game.on('leak', () => {
        this.livesHit = false;
        requestAnimationFrame(() => (this.livesHit = true));
        clearTimeout(this._hitTimer);
        this._hitTimer = setTimeout(() => (this.livesHit = false), 500);
      });
      game.on('power', (id) => this.$actions.toast(t('toast.power', { power: t('powers.' + id + '.name') }), 'power'));
      game.on('won', ({ stars, score }) => {
        const unlocked = services.saves.completeLevel(game.level, game.difficulty.id, stars, score);
        services.saves.clearGame();
        this.finish({ won: true, stars, score, unlocked });
      });
      game.on('lost', ({ score }) => {
        services.saves.clearGame();
        this.finish({ won: false, stars: 0, score, unlocked: [] });
      });
    },

    finish(result) {
      this.end = result;
      this.clearSelection();
      this.sync();
      this.$nextTick(() => {
        const btn = this.$refs.endPrimary || this.$refs.endRetry;
        if (btn) btn.focus();
      });
    },

    teardown() {
      const { loop, observer, game } = this.engine;
      if (loop) loop.stop();
      if (observer) observer.disconnect();
      if (game) game.removeAllListeners();
      clearTimeout(this._hitTimer);
    },

    /**
     * Fits the board to the available space. In portrait the board may be rotated
     * by the Renderer to get bigger tiles. Skipped when the size did not change.
     */
    resize() {
      const wrap = this.$refs.boardWrap;
      const r = this.engine.renderer;
      if (!wrap || !r) return;
      const width = wrap.clientWidth;
      const portrait = window.innerHeight > window.innerWidth;
      const top = wrap.getBoundingClientRect().top + window.scrollY;
      const reserve = 76; // room for the wave bar under the board
      const maxHeight = portrait ? window.innerHeight * 0.52 : Math.max(220, window.innerHeight - top - reserve);
      const key = `${width}x${Math.round(maxHeight)}`;
      if (key === this.engine.size) return;
      this.engine.size = key;
      r.resize(width, maxHeight);
    },

    // ------------------------------------------------------------- frame
    /** Called by the GameLoop once per displayed frame: draws, and refreshes the HUD every 100 ms. */
    frame() {
      const { game, renderer } = this.engine;
      renderer.render(game, {
        selectedCell: this.selectedCell,
        selectedTower: this.selectedTower,
        hoverCell: this.hoverCell,
        previewType: this.armedType ? TowerFactory.get(this.armedType) : null,
        upgradePreview: this.upgradePreview,
      });
      const now = performance.now();
      if (now - this.engine.lastSync > 100) this.sync(now);
    },

    /**
     * Copies the engine values the template needs into reactive data.
     * Throttled by frame() so Vue does not re-render 60 times per second.
     */
    sync(now = performance.now()) {
      const g = this.engine.game;
      if (!g) return;
      this.engine.lastSync = now;
      const h = this.hud;
      h.lives = g.lives;
      h.gold = g.gold;
      h.wave = g.waves.current;
      h.total = g.waves.total;
      h.score = g.score;
      h.state = g.state;
      h.canStart = g.canStartWave;
      this.tick++;
    },

    /** Saves the game in progress to localStorage (between waves, on quit, when the tab is hidden). */
    autosave() {
      const g = this.engine.game;
      if (!g || g.isOver) return;
      // Never save an untouched game over an existing save.
      if (g.waves.current === 0 && g.towers.length === 0) return;
      services.saves.saveGame(g.serialize());
    },

    // ------------------------------------------------------------- input
    onPointerDown(evt) {
      if (this.end) return;
      const cell = this.engine.renderer.cellFromEvent(evt);
      this.handleCell(cell);
    },

    onPointerMove(evt) {
      if (evt.pointerType !== 'mouse') return;
      this.hoverCell = this.engine.renderer.cellFromEvent(evt);
    },

    /**
     * Tap / click / Enter on a cell: selects a tower, or selects an empty cell
     * and builds the "armed" tower type on it if there is one.
     * @param {{col:number,row:number}} cell
     */
    handleCell({ col, row }) {
      const game = this.engine.game;
      if (!game.map.inBounds(col, row)) return;
      const tower = game.map.towerAt(col, row);
      if (tower) {
        this.selectedTowerId = tower.id;
        this.selectedCell = { col, row };
        this.armedType = null;
        this.sync();
        return;
      }
      this.selectedTowerId = null;
      this.selectedCell = { col, row };
      if (this.armedType && game.map.isBuildable(col, row)) this.build(this.armedType);
      this.sync();
    },

    /** Keyboard controls of the board (see the README for the list of keys). */
    onKeyDown(evt) {
      const game = this.engine.game;
      if (!game || this.end) return;
      const cell = this.selectedCell || { col: Math.floor(game.map.cols / 2), row: Math.floor(game.map.rows / 2) };
      // Arrow keys follow what is on screen, even when the board is rotated (portrait phones).
      const moves = this.engine.renderer.rotated
        ? { ArrowLeft: [0, 1], ArrowRight: [0, -1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
        : { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (moves[evt.key]) {
        evt.preventDefault();
        const [dc, dr] = moves[evt.key];
        const col = Math.min(game.map.cols - 1, Math.max(0, cell.col + dc));
        const row = Math.min(game.map.rows - 1, Math.max(0, cell.row + dr));
        const tower = game.map.towerAt(col, row);
        this.selectedCell = { col, row };
        this.selectedTowerId = tower ? tower.id : null;
        this.sync();
        return;
      }
      const types = TowerFactory.catalogue().map((c) => c.type);
      const key = evt.key.toLowerCase();
      if (/^[1-9]$/.test(evt.key) && types[Number(evt.key) - 1]) {
        evt.preventDefault();
        this.selectedCell = cell;
        this.pickTower(types[Number(evt.key) - 1]);
      } else if (evt.key === 'Enter') {
        evt.preventDefault();
        this.handleCell(cell);
      } else if (evt.key === ' ') {
        evt.preventDefault();
        this.startWave();
      } else if (key === 'p') {
        this.togglePause();
      } else if (key === 'u' && this.selectedTower) {
        this.upgrade();
      } else if (key === 's' && this.selectedTower) {
        this.sell();
      } else if (evt.key === 'Escape') {
        this.clearSelection();
      }
    },

    clearSelection() {
      this.selectedCell = null;
      this.selectedTowerId = null;
      this.armedType = null;
      this.upgradePreview = false;
    },

    // ------------------------------------------------------------- actions
    /**
     * Shop click: builds immediately on the selected free cell,
     * otherwise "arms" the type so the next tap on a free cell builds it.
     * @param {string} type
     */
    pickTower(type) {
      const game = this.engine.game;
      const c = this.selectedCell;
      if (!game.canAfford(type)) {
        this.$actions.toast(this.$t('toast.noGold'), 'warn');
        return;
      }
      if (c && game.map.isBuildable(c.col, c.row)) {
        this.build(type);
      } else {
        // Arm the tower: the next tap on a free tile builds it.
        this.armedType = this.armedType === type ? null : type;
      }
    },

    build(type) {
      const game = this.engine.game;
      const c = this.selectedCell;
      const tower = game.buildTower(type, c.col, c.row);
      if (!tower) return;
      // Keep the tower armed while the player can afford another one (fast building).
      if (!game.canAfford(type)) this.armedType = null;
      this.selectedCell = null;
      this.sync();
    },

    upgrade() {
      if (this.selectedTower && this.engine.game.upgradeTower(this.selectedTower)) this.sync();
    },

    sell() {
      if (this.selectedTower && this.engine.game.sellTower(this.selectedTower)) {
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

    togglePause() {
      if (this.end) return;
      this.paused = !this.paused;
      this.engine.game.paused = this.paused;
      if (!this.paused) this.$refs.canvas.focus({ preventScroll: true });
    },

    cycleSpeed() {
      this.speed = SPEEDS[(SPEEDS.indexOf(this.speed) + 1) % SPEEDS.length];
      this.engine.loop.timeScale = this.speed;
    },

    activatePower(id) {
      if (this.engine.game.activatePower(id)) this.sync();
    },

    saveAndQuit() {
      const g = this.engine.game;
      services.saves.saveGame(g.serialize());
      this.$actions.toast(this.$t('toast.saved'), 'success');
      this.$actions.go('menu');
    },

    quit() {
      this.$actions.go('menu');
    },

    restart() {
      this.$actions.startLevel(this.levelIndex);
    },

    nextLevel() {
      this.$actions.startLevel(this.levelIndex + 1);
    },
  },
};
</script>
