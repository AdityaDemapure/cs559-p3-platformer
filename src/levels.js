// src/levels.js
// 7 hand-made levels. Each level is an object:
// { platforms, movingPlatforms, collectibles, enemies, spawn, goal }

function L({
  platforms = [],
  movingPlatforms = [],
  collectibles = [],
  enemies = [],
  spawn = { pos: [0, 1, 8] },
  goal = { pos: [30, 7.5, 0], radius: 2.2 }
}) {
  return { platforms, movingPlatforms, collectibles, enemies, spawn, goal };
}

export const LEVELS = [
  // =========================
  // LEVEL 1: Tutorial-ish
  // =========================
  L({
    spawn: { pos: [0, 1, 8] },
    goal: { pos: [30, 7.5, 0], radius: 2.2 },
    platforms: [
      { pos: [0, -1.5, 0], size: [40, 2, 40] },

      { pos: [3, 0.0, -2], size: [6, 1, 6] },
      { pos: [8, 1.5, -2], size: [6, 1, 6] },
      { pos: [13, 3.0, -2], size: [6, 1, 6] },

      { pos: [18, 4.0, -2], size: [5, 1, 5] },
      { pos: [25, 4.0, -2], size: [5, 1, 5] },

      { pos: [22, 5.5, 4], size: [2, 8, 2] },

      { pos: [30, 6.0, 0], size: [10, 1, 10] },
    ],
    movingPlatforms: [
      { pos: [10, 5.0, 6], size: [5, 1, 5], axis: "y", amp: 2.0, speed: 1.2 },
      { pos: [20, 7.5, 10], size: [5, 1, 5], axis: "x", amp: 3.5, speed: 1.0 },
    ],
    collectibles: [
      { pos: [8, 3.0, 0] },
      { pos: [18, 6.5, -2] },
      { pos: [25, 6.5, -2] },
      { pos: [30, 8.0, 0] },
    ],
    enemies: [
      { pos: [18, 5.2, 1.5], patrolAxis: "z", amp: 3.0, speed: 1.2 },
    ]
  }),

  // =========================
  // LEVEL 2: Zig-zag run
  // =========================
  L({
    spawn: { pos: [-10, 1, 10] },
    goal: { pos: [18, 9.5, -12], radius: 2.4 },
    platforms: [
      { pos: [0, -1.5, 0], size: [60, 2, 60] },

      { pos: [-10, 0.0, 10], size: [8, 1, 8] },
      { pos: [-4, 1.2, 4], size: [8, 1, 8] },
      { pos: [2, 2.4, -2], size: [8, 1, 8] },
      { pos: [8, 3.6, -8], size: [8, 1, 8] },

      { pos: [14, 5.0, -4], size: [6, 1, 6] },
      { pos: [18, 6.5, -8], size: [6, 1, 6] },
      { pos: [18, 8.0, -12], size: [10, 1, 10] },
    ],
    movingPlatforms: [
      { pos: [10, 4.5, -12], size: [5, 1, 5], axis: "x", amp: 4.0, speed: 1.1 }
    ],
    collectibles: [
      { pos: [-4, 3.0, 4] },
      { pos: [2, 4.1, -2] },
      { pos: [18, 10.0, -12] },
    ],
    enemies: [
      { pos: [8, 4.7, -8], patrolAxis: "x", amp: 2.5, speed: 1.4 }
    ]
  }),

  // =========================
  // LEVEL 3: Moving-platform ride
  // =========================
  L({
    spawn: { pos: [-20, 1, 0] },
    goal: { pos: [22, 8.5, 0], radius: 2.4 },
    platforms: [
      { pos: [0, -1.5, 0], size: [70, 2, 50] },

      { pos: [-20, 0.0, 0], size: [10, 1, 10] },
      { pos: [-8, 2.0, 0], size: [6, 1, 6] },
      { pos: [2, 4.0, 0], size: [6, 1, 6] },
      { pos: [12, 6.0, 0], size: [6, 1, 6] },
      { pos: [22, 7.0, 0], size: [10, 1, 10] },
    ],
    movingPlatforms: [
      { pos: [-14, 1.0, 0], size: [6, 1, 6], axis: "x", amp: 5.5, speed: 0.9 },
      { pos: [-2, 3.0, 0], size: [6, 1, 6], axis: "y", amp: 2.5, speed: 1.3 },
      { pos: [8, 5.0, 0], size: [6, 1, 6], axis: "x", amp: 4.0, speed: 1.2 },
    ],
    collectibles: [
      { pos: [-8, 3.4, 0] },
      { pos: [2, 5.4, 0] },
      { pos: [22, 9.1, 0] },
    ],
    enemies: [
      { pos: [6, 5.3, 2.5], patrolAxis: "z", amp: 3.0, speed: 1.0 }
    ]
  }),

  // =========================
  // LEVEL 4: Vertical climb + columns
  // =========================
  L({
    spawn: { pos: [0, 1, 16] },
    goal: { pos: [0, 16.5, -18], radius: 2.6 },
    platforms: [
      { pos: [0, -1.5, 0], size: [60, 2, 60] },

      { pos: [0, 0.0, 16], size: [10, 1, 10] },
      { pos: [0, 3.0, 10], size: [6, 1, 6] },
      { pos: [-4, 6.0, 4], size: [6, 1, 6] },
      { pos: [4, 9.0, -2], size: [6, 1, 6] },
      { pos: [0, 12.0, -10], size: [6, 1, 6] },
      { pos: [0, 15.0, -18], size: [12, 1, 12] },

      // Decorative / obstacle columns (collidable)
      { pos: [-8, 6.0, 4], size: [2, 12, 2] },
      { pos: [8, 10.0, -2], size: [2, 12, 2] },
      { pos: [0, 12.5, -10], size: [2, 10, 2] },
    ],
    movingPlatforms: [
      { pos: [0, 7.5, 2], size: [6, 1, 6], axis: "x", amp: 5.0, speed: 1.0 }
    ],
    collectibles: [
      { pos: [0, 4.4, 10] },
      { pos: [4, 10.4, -2] },
      { pos: [0, 17.4, -18] },
    ],
    enemies: [
      { pos: [0, 13.2, -10], patrolAxis: "x", amp: 4.0, speed: 1.3 }
    ]
  }),

  // =========================
  // LEVEL 5: Dash gaps + drones
  // =========================
  L({
    spawn: { pos: [-22, 1, -12] },
    goal: { pos: [26, 10.5, -12], radius: 2.6 },
    platforms: [
      { pos: [0, -1.5, 0], size: [80, 2, 70] },

      { pos: [-22, 0.0, -12], size: [10, 1, 10] },
      { pos: [-10, 2.0, -12], size: [6, 1, 6] },
      { pos: [0, 4.0, -12], size: [6, 1, 6] },
      { pos: [10, 6.0, -12], size: [6, 1, 6] },
      { pos: [18, 8.0, -12], size: [6, 1, 6] },
      { pos: [26, 9.0, -12], size: [12, 1, 12] },

      // Side safe ledges
      { pos: [0, 3.0, -4], size: [5, 1, 5] },
      { pos: [10, 5.0, -20], size: [5, 1, 5] },
    ],
    movingPlatforms: [
      { pos: [5, 5.0, -12], size: [5, 1, 5], axis: "z", amp: 4.0, speed: 1.2 }
    ],
    collectibles: [
      { pos: [-10, 3.4, -12] },
      { pos: [10, 7.4, -12] },
      { pos: [26, 11.6, -12] },
    ],
    enemies: [
      { pos: [-2, 5.2, -12], patrolAxis: "z", amp: 3.0, speed: 1.6 },
      { pos: [14, 7.2, -12], patrolAxis: "z", amp: 3.0, speed: 1.8 },
    ]
  }),

  // =========================
  // LEVEL 6: Big arena + moving bridge
  // =========================
  L({
    spawn: { pos: [-26, 1, 8] },
    goal: { pos: [30, 12.5, 8], radius: 2.8 },
    platforms: [
      { pos: [0, -1.5, 0], size: [90, 2, 70] },

      { pos: [-26, 0.0, 8], size: [12, 1, 12] },
      { pos: [-10, 3.0, 8], size: [6, 1, 6] },

      { pos: [6, 6.0, 8], size: [6, 1, 6] },
      { pos: [18, 9.0, 8], size: [6, 1, 6] },
      { pos: [30, 11.0, 8], size: [14, 1, 14] },

      // Tall obstacle posts
      { pos: [0, 5.5, 12], size: [2, 10, 2] },
      { pos: [12, 8.5, 4], size: [2, 10, 2] },
    ],
    movingPlatforms: [
      // Bridge that oscillates between -4 and +4 x, timed jump/dash
      { pos: [-2, 4.5, 8], size: [10, 1, 4], axis: "x", amp: 6.0, speed: 0.9 },
      { pos: [12, 7.5, 8], size: [6, 1, 6], axis: "y", amp: 2.5, speed: 1.1 },
    ],
    collectibles: [
      { pos: [-10, 4.4, 8] },
      { pos: [18, 10.4, 8] },
      { pos: [30, 13.8, 8] },
    ],
    enemies: [
      { pos: [6, 6.9, 12], patrolAxis: "x", amp: 6.0, speed: 1.0 }
    ]
  }),

  // =========================
  // LEVEL 7: Final gauntlet
  // =========================
  L({
    spawn: { pos: [-28, 1, -18] },
    goal: { pos: [34, 16.5, 18], radius: 3.0 },
    platforms: [
      { pos: [0, -1.5, 0], size: [110, 2, 110] },

      { pos: [-28, 0.0, -18], size: [12, 1, 12] },
      { pos: [-14, 3.0, -10], size: [6, 1, 6] },
      { pos: [0, 6.0, -2], size: [6, 1, 6] },
      { pos: [14, 9.0, 6], size: [6, 1, 6] },
      { pos: [24, 12.0, 14], size: [6, 1, 6] },
      { pos: [34, 15.0, 18], size: [16, 1, 16] },

      // Walls that force camera-relative movement awareness
      { pos: [-6, 6.0, -2], size: [2, 14, 2] },
      { pos: [6, 9.0, 6], size: [2, 14, 2] },
      { pos: [20, 12.0, 14], size: [2, 14, 2] },
    ],
    movingPlatforms: [
      { pos: [-6, 4.5, -6], size: [6, 1, 6], axis: "z", amp: 6.0, speed: 1.1 },
      { pos: [8, 7.5, 2], size: [6, 1, 6], axis: "x", amp: 6.0, speed: 1.2 },
      { pos: [22, 10.5, 10], size: [6, 1, 6], axis: "y", amp: 3.0, speed: 1.3 },
    ],
    collectibles: [
      { pos: [-14, 4.4, -10] },
      { pos: [0, 7.4, -2] },
      { pos: [14, 10.4, 6] },
      { pos: [24, 13.4, 14] },
      { pos: [34, 17.8, 18] },
    ],
    enemies: [
      { pos: [-2, 6.2, -2], patrolAxis: "x", amp: 6.0, speed: 1.5 },
      { pos: [12, 9.2, 6], patrolAxis: "z", amp: 6.0, speed: 1.6 },
      { pos: [22, 12.2, 14], patrolAxis: "x", amp: 6.0, speed: 1.7 },
    ]
  }),
];

export const LEVEL_COUNT = LEVELS.length;
