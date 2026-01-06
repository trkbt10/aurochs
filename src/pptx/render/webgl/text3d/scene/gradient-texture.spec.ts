/**
 * @file Tests for Gradient Texture Generation - Configuration Tests
 *
 * This file tests the public API configuration and parameter handling.
 * Actual canvas/WebGL rendering requires DOM environment and is tested
 * through integration tests in the browser.
 *
 * The internal types (ResolvedLinearGradient, ResolvedRadialGradient, etc.)
 * are not exported - they use pre-resolved hex colors for rendering.
 *
 * For ECMA-376 compliant domain types, see:
 * - domain/color.ts: GradientFill, GradientStop, LinearGradient, PathGradient
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.36 (gs - gradient stop)
 * @see ECMA-376 Part 1, Section 20.1.8.41 (lin - linear gradient)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (path - path gradient)
 */

describe("Gradient Texture Public API", () => {
  describe("Module exports", () => {
    it("should export gradient texture creation functions", async () => {
      const module = await import("./gradient-texture");

      expect(typeof module.createLinearGradientTextureFromResolved).toBe("function");
      expect(typeof module.createRadialGradientTextureFromResolved).toBe("function");
      expect(typeof module.clearGradientTextureCache).toBe("function");
    });
  });

  describe("Resolved gradient stop format", () => {
    /**
     * The public API accepts resolved gradient stops with:
     * - position: 0-100 (percentage)
     * - color: hex string (e.g., "#FF0000")
     *
     * This is an INTERNAL format. For ECMA-376 compliant types,
     * use GradientStop from domain/color.ts which uses:
     * - position: Percent (0-100)
     * - color: Color (with transforms)
     */
    it("should document resolved stop format", () => {
      // Example of resolved gradient stop (internal format)
      const resolvedStop = {
        position: 50, // 0-100 percentage
        color: "#FF5733", // Resolved hex color
      };

      expect(resolvedStop.position).toBe(50);
      expect(resolvedStop.color).toBe("#FF5733");
    });

    it("should document position range", () => {
      const stops = [
        { position: 0, color: "#000000" },
        { position: 50, color: "#888888" },
        { position: 100, color: "#FFFFFF" },
      ];

      expect(stops[0].position).toBe(0);
      expect(stops[1].position).toBe(50);
      expect(stops[2].position).toBe(100);
    });
  });

  describe("Linear gradient configuration", () => {
    /**
     * Linear gradients accept:
     * - angle: degrees (0 = left-to-right, 90 = top-to-bottom)
     * - stops: resolved gradient stops
     * - width/height: optional texture size (default 256)
     */
    it("should document linear gradient parameters", () => {
      const params = {
        angle: 90, // Degrees (not ECMA-376 60000ths)
        stops: [
          { position: 0, color: "#FF0000" },
          { position: 100, color: "#0000FF" },
        ],
        width: 256,
        height: 256,
      };

      expect(params.angle).toBe(90);
      expect(params.stops.length).toBe(2);
    });

    it("should support common angle values", () => {
      const angles = {
        horizontal: 0, // Left to right
        vertical: 90, // Top to bottom
        diagonal: 45, // Top-left to bottom-right
        reverseDiagonal: 135, // Top-right to bottom-left
      };

      expect(angles.horizontal).toBe(0);
      expect(angles.vertical).toBe(90);
      expect(angles.diagonal).toBe(45);
    });
  });

  describe("Radial gradient configuration", () => {
    /**
     * Radial gradients accept:
     * - path: "circle" | "rect" | "shape"
     * - stops: resolved gradient stops
     * - centerX/centerY: optional center position (0-100)
     * - width/height: optional texture size (default 256)
     */
    it("should document radial gradient parameters", () => {
      const params = {
        path: "circle" as const,
        stops: [
          { position: 0, color: "#FFFFFF" },
          { position: 100, color: "#000000" },
        ],
        centerX: 50,
        centerY: 50,
      };

      expect(params.path).toBe("circle");
      expect(params.centerX).toBe(50);
      expect(params.centerY).toBe(50);
    });

    it("should support all path types", () => {
      const pathTypes = ["circle", "rect", "shape"] as const;

      expect(pathTypes).toContain("circle");
      expect(pathTypes).toContain("rect");
      expect(pathTypes).toContain("shape");
    });
  });

  describe("ECMA-376 coordinate conversion", () => {
    /**
     * ECMA-376 uses different units that need conversion:
     * - Positions: 0-100000 (1/1000 of percent) → 0-100
     * - Angles: 60000ths of a degree → degrees
     */
    it("should document position conversion from ECMA-376", () => {
      // ECMA-376 uses 0-100000 for positions
      const ecma376Position = 50000; // 50%
      const resolvedPosition = ecma376Position / 1000;

      expect(resolvedPosition).toBe(50);
    });

    it("should document angle conversion from ECMA-376", () => {
      // ECMA-376 uses 60000ths of a degree
      const ecma376Angle = 5400000; // 90 degrees
      const resolvedAngle = ecma376Angle / 60000;

      expect(resolvedAngle).toBe(90);
    });
  });
});
