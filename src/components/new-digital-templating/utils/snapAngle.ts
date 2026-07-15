// digitalTemplating/utils/snapAngle.ts
export const SNAP_ANGLES = [0, 90, -90, 180, -180] as const;
export const SNAP_THRESHOLD = 5;

export function snapAngle(angle: number) {
  for (const a of SNAP_ANGLES) {
    if (Math.abs(angle - a) <= SNAP_THRESHOLD) return a;
  }
  return angle;
}
