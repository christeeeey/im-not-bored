// ============================================================
// tea house — data layer
//
// This is the single shared source of truth for activities.
// Pour, Browse, and Collection all read/write through this module,
// so there is exactly one activity list in the whole app.
//
// Storage is localStorage today. The public API below (getAll, add,
// update, remove, markCompleted, subscribe) is deliberately storage-
// agnostic — swapping this for a Supabase-backed implementation later
// only means rewriting the inside of this file, not any page code.
// ============================================================

const STORAGE_KEY = 'tea-house:activities:v1';

/** @typedef {{
 *   id: string,
 *   name: string,
 *   description: string,
 *   displayTime: string,
 *   timeMinutes: number,
 *   energy: 'very-low'|'low'|'medium'|'high',
 *   category: string,
 *   mood: string,
 *   location: 'indoors'|'outdoors'|'anywhere',
 *   equipment: string,
 *   instructions: string[],
 *   favorite: boolean,
 *   enabled: boolean,
 *   timesCompleted: number,
 *   lastCompleted: string|null
 * }} Activity
 */

function generateId() {
  return 'act_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** @type {Activity[]} */
const SEED_ACTIVITIES = [
  {
    name: 'Simple back stretch',
    description: 'Loosen the shoulders, neck, and upper back after sitting.',
    displayTime: 'about 2 min',
    timeMinutes: 2,
    energy: 'low',
    category: 'movement',
    mood: 'restless',
    location: 'indoors',
    equipment: 'none',
    instructions: [
      'Roll your shoulders backward five times.',
      'Reach both arms overhead for 20 seconds.',
      'Perform a gentle seated spinal twist on each side.'
    ],
  },
  {
    name: 'Read five pages',
    description: 'Pick up whatever book is nearest and read a handful of pages, no pressure to finish a chapter.',
    displayTime: 'about 10 min',
    timeMinutes: 10,
    energy: 'low',
    category: 'reading',
    mood: 'tired',
    location: 'indoors',
    equipment: 'a book',
    instructions: [
      'Find the nearest book, even one you haven\u2019t started.',
      'Read five pages without checking your phone.',
      'Dog-ear or bookmark where you stop.'
    ],
  },
  {
    name: 'Take a short walk',
    description: 'Step outside and walk without a destination in mind.',
    displayTime: 'about 10 min',
    timeMinutes: 10,
    energy: 'low',
    category: 'outside',
    mood: 'restless',
    location: 'outdoors',
    equipment: 'none',
    instructions: [
      'Leave your phone in your pocket, screen off.',
      'Walk in one direction for five minutes.',
      'Turn around and walk back a different way if you can.'
    ],
  },
  {
    name: 'Sketch something nearby',
    description: 'Draw whatever object is closest to you, loosely and without judging the result.',
    displayTime: 'about 15 min',
    timeMinutes: 15,
    energy: 'medium',
    category: 'creative',
    mood: 'creative',
    location: 'anywhere',
    equipment: 'paper and pencil',
    instructions: [
      'Choose the nearest object with an interesting shape.',
      'Sketch it for ten minutes without erasing.',
      'Add a few lines of shading if you have time left.'
    ],
  },
  {
    name: 'Tidy one surface',
    description: 'Clear and wipe down a single desk, counter, or shelf.',
    displayTime: 'about 8 min',
    timeMinutes: 8,
    energy: 'medium',
    category: 'organize',
    mood: 'bored',
    location: 'indoors',
    equipment: 'none',
    instructions: [
      'Pick one flat surface that has been bothering you.',
      'Remove everything and sort into keep, put-away, and toss.',
      'Wipe the surface down before putting the keepers back.'
    ],
  },
  {
    name: 'Learn ten words in a new language',
    description: 'Use a notebook or app to pick up a handful of new vocabulary.',
    displayTime: 'about 10 min',
    timeMinutes: 10,
    energy: 'medium',
    category: 'learn',
    mood: 'focused',
    location: 'anywhere',
    equipment: 'notebook or app',
    instructions: [
      'Choose a language you\u2019re curious about, familiar or new.',
      'Write down ten words with their meanings.',
      'Say each one aloud twice.'
    ],
  },
  {
    name: 'Water and check on your plants',
    description: 'Give your plants a slow once-over: water, light, dead leaves.',
    displayTime: 'about 5 min',
    timeMinutes: 5,
    energy: 'low',
    category: 'organize',
    mood: 'restless',
    location: 'indoors',
    equipment: 'watering can',
    instructions: [
      'Check the soil of each plant with a finger.',
      'Water the ones that are dry.',
      'Trim off any yellowing leaves.'
    ],
  },
  {
    name: 'Stretch and breathe',
    description: 'A slow, seated breathing exercise paired with light stretching.',
    displayTime: 'about 5 min',
    timeMinutes: 5,
    energy: 'very-low',
    category: 'movement',
    mood: 'tired',
    location: 'anywhere',
    equipment: 'none',
    instructions: [
      'Sit comfortably and close your eyes.',
      'Breathe in for four counts, hold for four, out for six.',
      'Repeat for eight rounds, stretching gently between.'
    ],
  },
  {
    name: 'Write three lines in a journal',
    description: 'Put down whatever is on your mind, three lines and no more.',
    displayTime: 'about 5 min',
    timeMinutes: 5,
    energy: 'low',
    category: 'reflect',
    mood: 'bored',
    location: 'anywhere',
    equipment: 'notebook or app',
    instructions: [
      'Open a notebook or blank note.',
      'Write three honest lines about your day so far.',
      'Close it without rereading.'
    ],
  },
  {
    name: 'Sit outside for a while',
    description: 'No task, just fresh air and a change of scenery.',
    displayTime: 'about 15 min',
    timeMinutes: 15,
    energy: 'very-low',
    category: 'outside',
    mood: 'tired',
    location: 'outdoors',
    equipment: 'none',
    instructions: [
      'Find a spot outside, a porch, bench, or step.',
      'Sit without a screen for fifteen minutes.',
      'Notice three things you can hear.'
    ],
  },
  {
    name: 'Cook something small',
    description: 'Prepare a simple snack or side dish from what you have.',
    displayTime: 'about 20 min',
    timeMinutes: 20,
    energy: 'medium',
    category: 'create',
    mood: 'creative',
    location: 'indoors',
    equipment: 'kitchen basics',
    instructions: [
      'Look through your fridge and pantry for options.',
      'Pick something that takes under twenty minutes.',
      'Make it slowly, without rushing.'
    ],
  },
  {
    name: 'Do a full declutter pass',
    description: 'Clear a whole room, section by section.',
    displayTime: 'about 30 min',
    timeMinutes: 30,
    energy: 'high',
    category: 'organize',
    mood: 'focused',
    location: 'indoors',
    equipment: 'trash bags',
    instructions: [
      'Choose one room to focus on entirely.',
      'Work section by section: surfaces, floor, drawers.',
      'Set aside a bag for donations as you go.'
    ],
  },
  {
    name: 'Go for a run or bike ride',
    description: 'Get your heart rate up outdoors for a stretch of time.',
    displayTime: 'about 25 min',
    timeMinutes: 25,
    energy: 'high',
    category: 'outside',
    mood: 'restless',
    location: 'outdoors',
    equipment: 'running shoes or bike',
    instructions: [
      'Change into something you can move in.',
      'Pick a familiar route so you can relax into it.',
      'Cool down with a slow walk for the last few minutes.'
    ],
  },
  {
    name: 'Learn a few chords or a short piece',
    description: 'Spend focused time with an instrument, however rusty.',
    displayTime: 'about 20 min',
    timeMinutes: 20,
    energy: 'medium',
    category: 'create',
    mood: 'creative',
    location: 'indoors',
    equipment: 'instrument',
    instructions: [
      'Pick up whatever instrument is nearest, even if you\u2019re a beginner.',
      'Practice one small phrase slowly and repeatedly.',
      'Play it through once at full speed to finish.'
    ],
  },
  {
    name: 'Call someone you\u2019ve been meaning to',
    description: 'A short, unhurried call with a friend or family member.',
    displayTime: 'about 15 min',
    timeMinutes: 15,
    energy: 'medium',
    category: 'connect',
    mood: 'bored',
    location: 'anywhere',
    equipment: 'phone',
    instructions: [
      'Think of one person you\u2019ve been meaning to talk to.',
      'Call rather than text, if you can.',
      'Let the conversation go wherever it wants.'
    ],
  },
  {
    name: 'Fold and put away laundry',
    description: 'One manageable, screen-free chore, start to finish.',
    displayTime: 'about 15 min',
    timeMinutes: 15,
    energy: 'medium',
    category: 'organize',
    mood: 'restless',
    location: 'indoors',
    equipment: 'none',
    instructions: [
      'Pull the clean laundry into one pile.',
      'Fold it fully before putting any of it away.',
      'Put everything away before sitting back down.'
    ],
  },
  {
    name: 'Rearrange or refresh a small space',
    description: 'Move furniture or decor in one corner of a room.',
    displayTime: 'about 20 min',
    timeMinutes: 20,
    energy: 'high',
    category: 'create',
    mood: 'creative',
    location: 'indoors',
    equipment: 'none',
    instructions: [
      'Pick a corner or shelf that feels stale.',
      'Remove everything from it first.',
      'Rebuild it with a new arrangement.'
    ],
  },
];

/**
 * @param {Partial<Activity>} partial
 * @returns {Activity}
 */
function hydrate(partial) {
  return {
    id: partial.id || generateId(),
    name: partial.name || 'Untitled activity',
    description: partial.description || '',
    displayTime: partial.displayTime || '',
    timeMinutes: Number.isFinite(partial.timeMinutes) ? partial.timeMinutes : 5,
    energy: partial.energy || 'low',
    category: partial.category || 'other',
    mood: partial.mood || '',
    location: partial.location || 'anywhere',
    equipment: partial.equipment || 'none',
    instructions: Array.isArray(partial.instructions) ? partial.instructions : [],
    favorite: !!partial.favorite,
    enabled: partial.enabled === undefined ? true : !!partial.enabled,
    timesCompleted: Number.isFinite(partial.timesCompleted) ? partial.timesCompleted : 0,
    lastCompleted: partial.lastCompleted || null,
  };
}

class ActivityStore {
  constructor() {
    /** @type {Activity[]} */
    this._items = [];
    /** @type {Set<Function>} */
    this._subscribers = new Set();
    this._load();
  }

  _load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      raw = null;
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this._items = parsed.map(hydrate);
        return;
      } catch (e) {
        // fall through to reseed on parse failure
      }
    }

    this._items = SEED_ACTIVITIES.map(hydrate);
    this._persist();
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._items));
    } catch (e) {
      // localStorage may be unavailable (private mode, quota) — the app
      // still works for the current session, it just won't persist.
    }
    this._notify();
  }

  _notify() {
    for (const fn of this._subscribers) fn(this.getAll());
  }

  /** @returns {Activity[]} */
  getAll() {
    return this._items.map((a) => ({ ...a }));
  }

  /** @param {string} id */
  getById(id) {
    const found = this._items.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  /** @param {Partial<Activity>} data @returns {Activity} */
  add(data) {
    const activity = hydrate(data);
    this._items = [activity, ...this._items];
    this._persist();
    return { ...activity };
  }

  /** @param {string} id @param {Partial<Activity>} patch */
  update(id, patch) {
    let updated = null;
    this._items = this._items.map((a) => {
      if (a.id !== id) return a;
      updated = hydrate({ ...a, ...patch, id: a.id });
      return updated;
    });
    if (updated) this._persist();
    return updated ? { ...updated } : null;
  }

  /** @param {string} id */
  remove(id) {
    this._items = this._items.filter((a) => a.id !== id);
    this._persist();
  }

  /** @param {string} id */
  toggleFavorite(id) {
    const a = this.getById(id);
    if (!a) return null;
    return this.update(id, { favorite: !a.favorite });
  }

  /** @param {string} id */
  toggleEnabled(id) {
    const a = this.getById(id);
    if (!a) return null;
    return this.update(id, { enabled: !a.enabled });
  }

  /** Marks an activity done: bumps timesCompleted and lastCompleted. */
  markCompleted(id) {
    const a = this.getById(id);
    if (!a) return null;
    return this.update(id, {
      timesCompleted: (a.timesCompleted || 0) + 1,
      lastCompleted: new Date().toISOString(),
    });
  }

  /** @param {(items: Activity[]) => void} fn @returns {() => void} unsubscribe */
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }
}

export const db = new ActivityStore();

export const CATEGORIES = [
  'movement', 'reading', 'outside', 'creative', 'organize',
  'learn', 'reflect', 'create', 'connect', 'other',
];

export const ENERGY_LEVELS = ['very-low', 'low', 'medium', 'high'];

export const ENERGY_LABELS = {
  'very-low': 'very low',
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
};

export const MOODS = ['tired', 'restless', 'bored', 'focused', 'creative'];

export const LOCATIONS = ['indoors', 'outdoors', 'anywhere'];
