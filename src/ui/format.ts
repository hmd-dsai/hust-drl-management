/** "+6", "−2" (dấu trừ thật), "+0". */
export function formatGain(gain: number): string {
  return gain > 0 ? `+${gain}` : gain < 0 ? `−${-gain}` : '+0'
}
