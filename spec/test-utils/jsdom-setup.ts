/**
 * @file jsdom setup for bun test
 *
 * Preload this file with: bun test --preload ./spec/test-utils/jsdom-setup.ts
 */

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});

// @ts-expect-error - global assignment for test environment
globalThis.window = dom.window;
// @ts-expect-error - global assignment for test environment
globalThis.document = dom.window.document;
// @ts-expect-error - global assignment for test environment
globalThis.navigator = dom.window.navigator;
// @ts-expect-error - global assignment for test environment
globalThis.HTMLElement = dom.window.HTMLElement;
// @ts-expect-error - global assignment for test environment
globalThis.SVGElement = dom.window.SVGElement;
// @ts-expect-error - global assignment for test environment
globalThis.Element = dom.window.Element;
// @ts-expect-error - global assignment for test environment
globalThis.Node = dom.window.Node;
// @ts-expect-error - global assignment for test environment
globalThis.DocumentFragment = dom.window.DocumentFragment;
// @ts-expect-error - global assignment for test environment
globalThis.DOMParser = dom.window.DOMParser;
// @ts-expect-error - global assignment for test environment
globalThis.XMLSerializer = dom.window.XMLSerializer;
// @ts-expect-error - global assignment for test environment
globalThis.getComputedStyle = dom.window.getComputedStyle;
// @ts-expect-error - global assignment for test environment
globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16);
// @ts-expect-error - global assignment for test environment
globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
