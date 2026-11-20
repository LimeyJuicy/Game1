// Supported skeleton types
export const SkeletonType = {
  Fox: 'fox',
  Human: 'human',
  Bird: 'bird',
  Dragon: 'dragon',
  Kaiju: 'kaiju',
  Spider: 'spider',
  Snake: 'snake',
  Fish: 'fish',
  Horse: 'horse',
  Error: 'error',
  None: 'none'
} as const;
export type SkeletonType = typeof SkeletonType[keyof typeof SkeletonType];

// Hand skeleton variation types for human skeleton
export const HandSkeletonType = {
  AllFingers: 'all-fingers',
  ThumbAndIndex: 'thumb-and-index',
  SimplifiedHand: 'simplified-hand',
  SingleBone: 'single-bone'
} as const;
export type HandSkeletonType = typeof HandSkeletonType[keyof typeof HandSkeletonType];
