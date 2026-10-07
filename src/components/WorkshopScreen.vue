<template>
  <section class="workshop" aria-labelledby="ws-title">
    <ScreenHeader :title="$t('workshop.title')">
      <span class="chip chip-gold"><AppIcon name="crown" /> {{ crowns }}</span>
      <span class="chip"><AppIcon name="star" /> {{ stars }}</span>
    </ScreenHeader>

    <div class="speech speech--inline">
      <PixelPortrait id="gontran" height="4.5rem" decorative />
      <p class="speech-text">« {{ $t('workshop.intro') }} »</p>
    </div>

    <section v-for="g in groups" :key="g.id" class="ws-group" :aria-labelledby="'ws-' + g.id">
      <h2 :id="'ws-' + g.id" class="section-title">{{ $t('workshop.groups.' + g.id) }}</h2>
      <ul class="ws-grid" role="list">
        <li v-for="u in g.items" :key="u.id" class="ws-card card" :class="{ 'is-max': u.max, 'is-locked': u.reason === 'locked' }">
          <div class="ws-head">
            <SpriteIcon v-if="u.tower" :type="u.tower" :level="3" elite :px="40" />
            <AppIcon v-else :name="u.icon" class="ws-icon" />
            <div>
              <h3 class="ws-name">{{ u.tower ? $t('workshop.mastery', { tower: $t('towers.' + u.tower + '.name') }) : $t('workshop.list.' + u.id + '.name') }}</h3>
              <p class="ws-rank">
                <span v-for="r in u.ranks" :key="r" class="rank-pip" :class="{ on: r <= u.rank }" aria-hidden="true"></span>
                <span class="sr-only">{{ $t('workshop.rank', { n: u.rank, max: u.ranks }) }}</span>
              </p>
            </div>
          </div>
          <p class="ws-desc">
            {{ u.tower ? $t('towers.' + u.tower + '.elite') + ' — ' + $t('towers.' + u.tower + '.eliteDesc') : $t('workshop.list.' + u.id + '.desc', u.params) }}
          </p>
          <p v-if="!u.max && u.reason === 'stars'" class="ws-req"><AppIcon name="star" /> {{ $t('workshop.needStars', { n: u.needStars }) }}</p>
          <p v-if="u.reason === 'locked'" class="ws-req"><AppIcon name="lock" /> {{ $t('workshop.needTower', { n: u.unlockLevel }) }}</p>
          <button v-if="!u.max" type="button" class="btn" :class="u.ok ? 'btn-primary' : 'btn-secondary'" :disabled="!u.ok" @click="buy(u.id)">
            <AppIcon name="crown" /> {{ u.price }}
          </button>
          <span v-else class="badge badge-gold"><AppIcon name="check" /> {{ $t('workshop.maxed') }}</span>
        </li>
      </ul>
    </section>
  </section>
</template>

<script>
/**
 * @file Gontran's workshop: permanent upgrades bought with crowns.
 */
import SpriteIcon from './SpriteIcon.vue';
import AppIcon from './AppIcon.vue';
import ScreenHeader from './ScreenHeader.vue';
import PixelPortrait from './PixelPortrait.vue';
import { services } from '../services/index.js';
import { TowerFactory, TOWER_UNLOCK } from '../core/index.js';
import { UpgradeCatalog } from '../core/progression/UpgradeCatalog.js';

export default {
  name: 'WorkshopScreen',
  components: { AppIcon, ScreenHeader, PixelPortrait, SpriteIcon },
  computed: {
    saves() {
      // eslint-disable-next-line no-unused-expressions
      this.$store.progressTick;
      return services.saves;
    },
    crowns() {
      return this.saves.progress.crowns;
    },
    stars() {
      return this.saves.totalStars;
    },
    groups() {
      const order = ['defence', 'arsenal', 'command', 'mastery'];
      return order.map((id) => ({
        id,
        items: UpgradeCatalog.all()
          .filter((u) => u.group === id)
          .map((u) => {
            const rank = this.saves.ranks[u.id] || 0;
            const check = this.saves.checkUpgrade(u.id);
            const next = Math.min(rank + 1, u.prices.length);
            return {
              id: u.id,
              icon: u.icon,
              tower: u.tower && u.group === 'mastery' ? u.tower : null,
              color: u.tower ? TowerFactory.get(u.tower).color : null,
              rank,
              ranks: u.prices.length,
              max: rank >= u.prices.length,
              ok: check.ok,
              reason: check.reason,
              price: check.price,
              needStars: check.stars,
              unlockLevel: u.tower ? TOWER_UNLOCK[u.tower] : 0,
              params: u.params ? u.params(next) : {},
            };
          }),
      }));
    },
  },
  methods: {
    buy(id) {
      if (services.saves.buyUpgrade(id)) {
        services.audio.sfx('upgrade');
        this.$actions.toast(this.$t('workshop.bought'), 'success');
      } else {
        services.audio.sfx('error');
      }
    },
  },
};
</script>
