// ============================================================
// tea house — filtering & random-selection logic
//
// Pure functions only: given a list of activities and a filter
// description, return the matching subset or a random pick.
// ============================================================

/**
 * @typedef {{
 *   maxMinutes?: number|null,
 *   energy?: string[]|null,
 *   mood?: string[]|null,
 *   category?: string[]|null,
 *   location?: string[]|null,
 *   onlyEnabled?: boolean,
 *   onlyFavorite?: boolean
 * }} Filters
 */

const ENERGY_ORDER = ['very-low', 'low', 'medium', 'high'];

/**
 * @param {import('./data.js').Activity[]} activities
 * @param {Filters} filters
 */
export function filterActivities(activities, filters = {}) {
  const {
    maxMinutes = null,
    energy = null,
    mood = null,
    category = null,
    location = null,
    onlyEnabled = true,
    onlyFavorite = false,
  } = filters;

  return activities.filter((a) => {
    if (onlyEnabled && !a.enabled) return false;
    if (onlyFavorite && !a.favorite) return false;
    if (maxMinutes != null && a.timeMinutes > maxMinutes) return false;
    if (energy && energy.length && !energy.includes(a.energy)) return false;
    if (mood && mood.length && !mood.includes(a.mood)) return false;
    if (category && category.length && !category.includes(a.category)) return false;
    if (location && location.length && !location.includes(a.location)) return false;
    return true;
  });
}

/**
 * Picks a uniformly random activity from a pool.
 * @param {import('./data.js').Activity[]} pool
 * @returns {import('./data.js').Activity|null}
 */
export function pickRandom(pool) {
  if (!pool || pool.length === 0) return null;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/**
 * Simple energy-level comparator, useful if we ever want
 * "at least this much energy" style filters.
 */
export function energyAtLeast(activityEnergy, minEnergy) {
  return ENERGY_ORDER.indexOf(activityEnergy) >= ENERGY_ORDER.indexOf(minEnergy);
}
