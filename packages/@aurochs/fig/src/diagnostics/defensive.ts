/**
 * @file Opt-in defensive-branch tracer.
 *
 * Why this exists
 * ---------------
 * fig-related code carries many "defensive" branches — fallbacks,
 * heuristic rescues, swallowed try/catch returns, positional default
 * orderings — added over time to keep specific authoring shapes from
 * silently breaking rendering. Each one is a hypothesis: "this case
 * exists in real input and primary handling fails for it."
 *
 * The honest test of that hypothesis is: instrument the branch, run
 * the production fixture corpus + the test suite, and count how
 * often the branch actually fires. A branch that never fires across
 * the corpus is dead defensive code (delete it). A branch that does
 * fire identifies a real input shape that primary handling failed on
 * — at which point the right action per CLAUDE.md is to fix the
 * underlying issue (e.g. consult Figma's true SoT like `overrideKey`),
 * not to add another fallback.
 *
 * Production behaviour
 * --------------------
 * When `AUROCHS_DEFENSIVE_TRACE` is unset, every call here is a
 * single env-var lookup + an early return. No allocation, no warn,
 * no observable side effect. Production code paths can sprinkle
 * `defensiveMark(...)` freely without measurable overhead.
 *
 * When `AUROCHS_DEFENSIVE_TRACE=1`, each call:
 *   - increments an in-process counter keyed by `id`,
 *   - emits one `console.warn` per FIRST hit per id (subsequent hits
 *     update the counter silently to keep stderr readable on long
 *     runs).
 *
 * Diagnostic scripts can read `getDefensiveCounters()` after a run to
 * dump the full histogram. `resetDefensiveCounters()` is provided so
 * an A/B harness can scope counts to a specific phase of work.
 */

const env = (): string | undefined =>
  typeof process !== "undefined" ? process.env?.AUROCHS_DEFENSIVE_TRACE : undefined;

let traceEnabled = env() === "1";

/**
 * Allow tests / scripts to flip the trace state at runtime — e.g.
 * disable during setup phases that would otherwise swamp the warn
 * output. Production code MUST NOT call this.
 */
export function setDefensiveTrace(enabled: boolean): void {
  traceEnabled = enabled;
}

const counters = new Map<string, number>();
const seen = new Set<string>();

/**
 * Record that a defensive / heuristic / fallback branch has been
 * exercised. `id` is a stable short tag (e.g.
 * `guid-translation:phase-1.5:positional-fallback`) — keep it
 * descriptive enough that grepping the codebase for the id reaches
 * exactly one call site. `details` is a plain object stringified into
 * the first-hit warn message; pass small primitives only (counts,
 * GUID strings, type names), not whole nodes.
 */
export function defensiveMark(id: string, details?: Record<string, unknown>): void {
  if (!traceEnabled) { return; }
  counters.set(id, (counters.get(id) ?? 0) + 1);
  if (!seen.has(id)) {
    seen.add(id);
    const summary = details ? ` ${JSON.stringify(details)}` : "";
    // eslint-disable-next-line no-console
    console.warn(`[defensive:${id}] first hit${summary}`);
  }
}

/**
 * Snapshot of the current `id → fire count` map. The returned Map is
 * a copy — mutating it does not affect the live counters.
 */
export function getDefensiveCounters(): ReadonlyMap<string, number> {
  return new Map(counters);
}

/**
 * Wipe all counters and "first-hit" memory. Diagnostic scripts call
 * this between A/B passes so per-pass counts don't bleed.
 */
export function resetDefensiveCounters(): void {
  counters.clear();
  seen.clear();
}
