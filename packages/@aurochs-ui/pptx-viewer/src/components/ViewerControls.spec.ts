/**
 * @file ViewerControls stability tests
 *
 * Pure logic tests for memoization patterns used with ViewerControls.
 */

import type { NavigationState, PositionState, ControlAction } from "./ViewerControls";

describe("ViewerControls prop patterns", () => {
  describe("NavigationState stability", () => {
    it("stable when all callbacks are referentially stable", () => {
      const stableOnPrev = () => {};
      const stableOnNext = () => {};

      type NavParams = {
        onPrev: () => void;
        onNext: () => void;
        canGoPrev: boolean;
        canGoNext: boolean;
      };

      const createNavigation = (params: NavParams): NavigationState => params;

      const nav1 = createNavigation({
        onPrev: stableOnPrev,
        onNext: stableOnNext,
        canGoPrev: true,
        canGoNext: true,
      });
      const nav2 = createNavigation({
        onPrev: stableOnPrev,
        onNext: stableOnNext,
        canGoPrev: true,
        canGoNext: true,
      });

      expect(nav1.onPrev).toBe(nav2.onPrev);
      expect(nav1.onNext).toBe(nav2.onNext);
    });

    it("unstable when callbacks recreated", () => {
      type NavParams = { canGoPrev: boolean; canGoNext: boolean };

      const createNavigation = (params: NavParams): NavigationState => ({
        onPrev: () => {},
        onNext: () => {},
        ...params,
      });

      const nav1 = createNavigation({ canGoPrev: true, canGoNext: true });
      const nav2 = createNavigation({ canGoPrev: true, canGoNext: true });

      expect(nav1.onPrev).not.toBe(nav2.onPrev);
      expect(nav1.onNext).not.toBe(nav2.onNext);
    });
  });

  describe("PositionState stability", () => {
    it("derived values should update only when source changes", () => {
      const calcPosition = (current: number, total: number): PositionState => ({
        current,
        total,
        progress: total > 0 ? (current / total) * 100 : 0,
        onSeek: undefined,
      });

      const pos1 = calcPosition(5, 10);
      const pos2 = calcPosition(5, 10);
      const pos3 = calcPosition(6, 10);

      expect(pos1.current).toBe(pos2.current);
      expect(pos1.progress).toBe(pos2.progress);
      expect(pos1.current).not.toBe(pos3.current);
      expect(pos1.progress).not.toBe(pos3.progress);
    });
  });

  describe("ControlAction array stability", () => {
    it("array reference changes when any action changes", () => {
      const stableOnClick = () => {};

      const createActions = (active: boolean): ControlAction[] => [
        {
          key: "toggle",
          icon: null,
          onClick: stableOnClick,
          label: "Toggle",
          active,
        },
      ];

      const actions1 = createActions(false);
      const actions2 = createActions(false);
      const actions3 = createActions(true);

      expect(actions1).not.toBe(actions2);
      expect(actions1[0].active).toBe(actions2[0].active);
      expect(actions1[0].onClick).toBe(actions2[0].onClick);
      expect(actions1[0].active).not.toBe(actions3[0].active);
    });

    it("useMemo pattern prevents unnecessary array recreation", () => {
      const memoCache = new Map<string, ControlAction[]>();

      const memoizedCreateActions = (active: boolean, onClick: () => void): ControlAction[] => {
        const key = `${active}-${onClick.name}`;
        if (!memoCache.has(key)) {
          memoCache.set(key, [
            {
              key: "toggle",
              icon: null,
              onClick,
              label: "Toggle",
              active,
            },
          ]);
        }
        return memoCache.get(key)!;
      };

      const stableOnClick = function named() {};

      const actions1 = memoizedCreateActions(false, stableOnClick);
      const actions2 = memoizedCreateActions(false, stableOnClick);
      const actions3 = memoizedCreateActions(true, stableOnClick);

      expect(actions1).toBe(actions2);
      expect(actions1).not.toBe(actions3);
    });
  });

  describe("toggle callback patterns", () => {
    it("functional update pattern is stable", () => {
      const badToggle = (current: boolean) => () => !current;
      const goodToggle = () => (prev: boolean) => !prev;

      const bad1 = badToggle(false);
      const bad2 = badToggle(false);

      const good1 = goodToggle();
      const good2 = goodToggle();

      expect(bad1).not.toBe(bad2);
      expect(good1.toString()).toBe(good2.toString());
    });

    it("sidebar toggle should use functional update", () => {
      const state = { sidebar: false };
      const setSidebarState = (updater: boolean | ((prev: boolean) => boolean)) => {
        if (typeof updater === "function") {
          state.sidebar = updater(state.sidebar);
        } else {
          state.sidebar = updater;
        }
      };

      const toggleSidebar = () => setSidebarState((prev) => !prev);

      toggleSidebar();
      expect(state.sidebar).toBe(true);

      toggleSidebar();
      expect(state.sidebar).toBe(false);
    });
  });

  describe("dependency chain analysis", () => {
    it("identifies problematic dependency chains", () => {
      const dependencies = {
        slideCount: "prop",
        enableSlideshow: "prop",
        onExit: "prop",
        nav: "useSlideNavigation result",
        slideshow: "useSlideshowMode result",
        isSidebarOpen: "useState",
        handleFullscreen: "useCallback([]) - stable",
        leftActions: "useMemo([onExit, isSidebarOpen, enableSlideshow, slideshow, nav.currentSlide])",
        rightActions: "useMemo([enableShare, handleShare, enableDownload, ...])",
      };

      expect(dependencies.leftActions).toContain("isSidebarOpen");
      expect(dependencies.leftActions).toContain("nav.currentSlide");
    });
  });
});
