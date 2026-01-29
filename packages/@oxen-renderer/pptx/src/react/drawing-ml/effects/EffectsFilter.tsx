/**
 * @file Effects Filter Component
 *
 * A React component that applies effects to its children.
 * Wraps useEffects hook for convenient usage.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Effects
 */

import type { ReactNode } from "react";
import type { Effects } from "@oxen-office/pptx/domain/effects";
import { useEffects } from "./useEffects";

// =============================================================================
// Types
// =============================================================================

type EffectsFilterProps = {
  /** Effects to apply */
  readonly effects?: Effects;
  /** Children to render with effects */
  readonly children: ReactNode;
  /** Additional class name for the group */
  readonly className?: string;
};

type EffectsWrapperProps = {
  /** Effects to apply */
  readonly effects?: Effects;
  /** Children to render with effects */
  readonly children: ReactNode;
  /** Additional class name for the group */
  readonly className?: string;
  /** Additional transform */
  readonly transform?: string;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Applies effects to children using SVG filter.
 * Automatically adds defs when effects are present.
 *
 * @example
 * ```tsx
 * <svg>
 *   <EffectsFilter effects={{ shadow: { ... } }}>
 *     <rect width="100" height="100" fill="blue" />
 *   </EffectsFilter>
 * </svg>
 * ```
 */
export function EffectsFilter({ effects, children, className }: EffectsFilterProps): ReactNode {
  const fx = useEffects(effects);

  if (!fx.hasEffects) {
    return <g className={className}>{children}</g>;
  }

  return (
    <>
      {fx.filterDef && <defs>{fx.filterDef}</defs>}
      <g filter={fx.filterUrl} className={className}>
        {children}
      </g>
    </>
  );
}

/**
 * Effects wrapper that assumes defs are managed externally.
 * Use this when you have a shared <defs> block.
 *
 * @example
 * ```tsx
 * <svg>
 *   <defs>
 *     {fx.filterDef}
 *   </defs>
 *   <EffectsWrapper effects={effects}>
 *     <rect width="100" height="100" fill="blue" />
 *   </EffectsWrapper>
 * </svg>
 * ```
 */
export function EffectsWrapper({
  effects,
  children,
  className,
  transform,
}: EffectsWrapperProps): ReactNode {
  const fx = useEffects(effects);

  const filterProp = fx.hasEffects ? fx.filterUrl : undefined;

  return (
    <g filter={filterProp} className={className} transform={transform}>
      {children}
    </g>
  );
}

/**
 * Returns the filter def element without wrapping.
 * Useful when you need to manually place defs.
 */
export function EffectsFilterDef({ effects }: { effects?: Effects }): ReactNode {
  const fx = useEffects(effects);
  return fx.filterDef ?? null;
}
