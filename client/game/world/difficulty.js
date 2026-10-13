import { DIFFICULTY_BANDS } from '../../../shared/constants.js';

export function getDifficulty(score, multiplier = 1.0) {
  let band = DIFFICULTY_BANDS[0];
  for (const b of DIFFICULTY_BANDS) {
    if (score < b.maxScore) {
      band = b;
      break;
    }
  }

  // Scale gaps by multiplier, capped at reachability maxGap of 133 px
  const minGap = Math.min(100, Math.floor(band.minGap * multiplier));
  const maxGap = Math.min(133, Math.floor(band.maxGap * multiplier));

  return {
    band,
    minGap,
    maxGap,
    weights: band.weights,
    hazards: band.hazards
  };
}
