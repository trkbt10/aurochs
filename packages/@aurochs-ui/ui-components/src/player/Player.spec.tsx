/**
 * @file Player component tests
 *
 * Tests that Player is fully controlled and reflects external state.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Player } from "./Player";
import type { PlayerMedia, PlayerAction } from "./types";

describe("Player", () => {
  const defaultMedia: PlayerMedia = {
    title: "Test Procedure",
    subtitle: "Module1",
  };

  describe("state reflection", () => {
    it("shows Play button in idle state", () => {
      render(
        <Player state="idle" media={defaultMedia} onPlay={() => {}} variant="panel" />
      );

      expect(screen.getByRole("button", { name: "Play" })).toBeDefined();
    });

    it("shows Pause button in playing state when onPause is provided", () => {
      render(
        <Player
          state="playing"
          media={defaultMedia}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      expect(screen.getByRole("button", { name: "Pause" })).toBeDefined();
    });

    it("shows Running indicator in playing state when onPause is not provided", () => {
      render(
        <Player
          state="playing"
          media={defaultMedia}
          onPlay={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      expect(screen.getByRole("button", { name: "Running..." })).toBeDefined();
    });

    it("shows Resume button in paused state", () => {
      render(
        <Player
          state="paused"
          media={defaultMedia}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      expect(screen.getByRole("button", { name: "Resume" })).toBeDefined();
    });

    it("shows Replay button in completed state", () => {
      render(
        <Player state="completed" media={defaultMedia} onPlay={() => {}} variant="panel" />
      );

      expect(screen.getByRole("button", { name: "Replay" })).toBeDefined();
    });

    it("shows Retry button in error state", () => {
      render(
        <Player
          state="error"
          media={defaultMedia}
          error={{ message: "Error" }}
          onPlay={() => {}}
          variant="panel"
        />
      );

      expect(screen.getByRole("button", { name: "Retry" })).toBeDefined();
    });
  });

  describe("media display", () => {
    it("renders media title and subtitle", () => {
      render(<Player state="idle" media={defaultMedia} variant="panel" />);

      expect(screen.getByText("Test Procedure")).toBeDefined();
      expect(screen.getByText("Module1")).toBeDefined();
    });

    it("renders error state with error message", () => {
      const error = { message: "Runtime error", detail: "Stack trace here" };
      render(
        <Player state="error" media={defaultMedia} error={error} variant="panel" />
      );

      expect(screen.getByText("Runtime error")).toBeDefined();
      expect(screen.getByText("Stack trace here")).toBeDefined();
    });
  });

  describe("callbacks", () => {
    it("calls onPlay when play button clicked", () => {
      const onPlay = vi.fn();
      render(
        <Player state="idle" media={defaultMedia} onPlay={onPlay} variant="panel" />
      );

      fireEvent.click(screen.getByRole("button", { name: "Play" }));
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it("calls onPause when pause button clicked", () => {
      const onPause = vi.fn();
      render(
        <Player
          state="playing"
          media={defaultMedia}
          onPlay={() => {}}
          onPause={onPause}
          onStop={() => {}}
          variant="panel"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Pause" }));
      expect(onPause).toHaveBeenCalledTimes(1);
    });

    it("calls onStop when stop button clicked", () => {
      const onStop = vi.fn();
      render(
        <Player
          state="playing"
          media={defaultMedia}
          onPlay={() => {}}
          onStop={onStop}
          variant="panel"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Stop" }));
      expect(onStop).toHaveBeenCalledTimes(1);
    });

    it("calls onPlay for resume in paused state", () => {
      const onPlay = vi.fn();
      render(
        <Player
          state="paused"
          media={defaultMedia}
          onPlay={onPlay}
          onPause={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Resume" }));
      expect(onPlay).toHaveBeenCalledTimes(1);
    });

    it("calls onPlay for replay in completed state", () => {
      const onPlay = vi.fn();
      render(
        <Player state="completed" media={defaultMedia} onPlay={onPlay} variant="panel" />
      );

      fireEvent.click(screen.getByRole("button", { name: "Replay" }));
      expect(onPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("button enablement", () => {
    it("disables stop button in idle state", () => {
      render(
        <Player
          state="idle"
          media={defaultMedia}
          onPlay={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
      expect(stopButton.disabled).toBe(true);
    });

    it("enables stop button in playing state", () => {
      render(
        <Player
          state="playing"
          media={defaultMedia}
          onPlay={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
      expect(stopButton.disabled).toBe(false);
    });

    it("enables stop button in paused state", () => {
      render(
        <Player
          state="paused"
          media={defaultMedia}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          variant="panel"
        />
      );

      const stopButton = screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
      expect(stopButton.disabled).toBe(false);
    });
  });

  describe("custom actions", () => {
    it("renders left and right actions", () => {
      const leftAction: PlayerAction = {
        id: "prev",
        icon: <span data-testid="prev-icon">P</span>,
        label: "Previous",
        onClick: vi.fn(),
      };
      const rightAction: PlayerAction = {
        id: "next",
        icon: <span data-testid="next-icon">N</span>,
        label: "Next",
        onClick: vi.fn(),
      };

      render(
        <Player
          state="idle"
          media={defaultMedia}
          leftActions={[leftAction]}
          rightActions={[rightAction]}
          variant="panel"
        />
      );

      expect(screen.getByRole("button", { name: "Previous" })).toBeDefined();
      expect(screen.getByRole("button", { name: "Next" })).toBeDefined();
    });

    it("calls custom action onClick", () => {
      const onClick = vi.fn();
      const action: PlayerAction = {
        id: "custom",
        icon: <span>C</span>,
        label: "Custom Action",
        onClick,
      };

      render(
        <Player
          state="idle"
          media={defaultMedia}
          rightActions={[action]}
          variant="panel"
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Custom Action" }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("variants", () => {
    it("renders floating variant with dark background styles", () => {
      const { container } = render(
        <Player state="idle" media={defaultMedia} variant="floating" />
      );
      const playerDiv = container.firstChild as HTMLElement;
      expect(playerDiv.style.backdropFilter).toBe("blur(12px)");
    });

    it("renders panel variant", () => {
      const { container } = render(
        <Player state="idle" media={defaultMedia} variant="panel" />
      );
      const playerDiv = container.firstChild as HTMLElement;
      expect(playerDiv).toBeDefined();
    });
  });
});
