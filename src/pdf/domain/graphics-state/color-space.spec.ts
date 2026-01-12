import { getColorSpaceComponents } from "./color-space";

describe("getColorSpaceComponents", () => {
  test("DeviceGray returns 1", () => {
    expect(getColorSpaceComponents("DeviceGray")).toBe(1);
  });

  test("DeviceRGB returns 3", () => {
    expect(getColorSpaceComponents("DeviceRGB")).toBe(3);
  });

  test("DeviceCMYK returns 4", () => {
    expect(getColorSpaceComponents("DeviceCMYK")).toBe(4);
  });

  test("Pattern returns 0", () => {
    expect(getColorSpaceComponents("Pattern")).toBe(0);
  });

  describe("ICCBased", () => {
    test("without alternateColorSpace returns 3 (default RGB)", () => {
      expect(getColorSpaceComponents("ICCBased")).toBe(3);
    });

    test("with DeviceGray alternate returns 1", () => {
      expect(getColorSpaceComponents("ICCBased", "DeviceGray")).toBe(1);
    });

    test("with DeviceRGB alternate returns 3", () => {
      expect(getColorSpaceComponents("ICCBased", "DeviceRGB")).toBe(3);
    });

    test("with DeviceCMYK alternate returns 4", () => {
      expect(getColorSpaceComponents("ICCBased", "DeviceCMYK")).toBe(4);
    });
  });

  test("unknown color space returns 3 (default)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getColorSpaceComponents("Unknown" as any)).toBe(3);
  });
});
