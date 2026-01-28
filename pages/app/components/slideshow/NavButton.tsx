/**
 * @file NavButton
 *
 * Navigation button component for slideshow presentation mode.
 */

import type { MouseEvent } from "react";

type Direction = "prev" | "next";

type Props = {
  direction: Direction;
  disabled: boolean;
  onClick: () => void;
};

function PrevIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}











export function NavButton({ direction, disabled, onClick }: Props) {
  function handleClick(e: MouseEvent) {
    e.stopPropagation();
    onClick();
  }

  return (
    <button
      className={`nav-button ${direction}`}
      onClick={handleClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous slide" : "Next slide"}
    >
      {direction === "prev" ? <PrevIcon /> : <NextIcon />}
    </button>
  );
}
