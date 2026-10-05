/**
 * @file One-use tickets proving a rewarded video was watched.
 */

/** Rewards that a video ad can unlock. */
export const REWARDS = Object.freeze(['revive', 'double-crowns'])

/**
 * Reward ticket (anti-cheat).
 *
 * A reward (extra shot, doubled gold) is only granted on presentation of a
 * ticket issued by the ad service AFTER a video watched to the end. Live
 * tickets are kept in a WeakMap private to this module: a hand-crafted object
 * is rejected, and each ticket can only be used once, for the intended
 * reward.
 */
const live = new WeakMap()

export class RewardTicket {
  /** @param {string} purpose */
  constructor(purpose) {
    if (!REWARDS.includes(purpose)) throw new Error(`Unknown reward: ${purpose}`)
    this.purpose = purpose
    Object.freeze(this)
  }

  /** Reserved for ad services. */
  static issue(purpose) {
    const ticket = new RewardTicket(purpose)
    live.set(ticket, purpose)
    return ticket
  }

  /**
   * Redeems a ticket. True only once, and only for the matching reward.
   * @param {unknown} ticket
   * @param {string} purpose
   */
  static redeem(ticket, purpose) {
    if (!(ticket instanceof RewardTicket) || live.get(ticket) !== purpose) return false
    live.delete(ticket)
    return true
  }
}
