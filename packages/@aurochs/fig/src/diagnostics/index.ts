/**
 * @file Diagnostic utilities — exposed only for calibration scripts
 * and tests. Production code should import directly from
 * `./defensive` (the marker call) and never read the counters.
 */
export {
  defensiveMark,
  getDefensiveCounters,
  resetDefensiveCounters,
  setDefensiveTrace,
} from "./defensive";
