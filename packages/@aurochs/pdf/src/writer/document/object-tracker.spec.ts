/**
 * @file Object Tracker Tests
 */

import { createPdfObjectTracker } from "./object-tracker";

describe("PdfObjectTracker", () => {
  it("allocates sequential object numbers starting from 1", () => {
    const tracker = createPdfObjectTracker();

    expect(tracker.allocate()).toBe(1);
    expect(tracker.allocate()).toBe(2);
    expect(tracker.allocate()).toBe(3);
  });

  it("reserves specific object numbers", () => {
    const tracker = createPdfObjectTracker();

    tracker.reserve(5);
    expect(tracker.allocate()).toBe(6);
  });

  it("stores and retrieves object data", () => {
    const tracker = createPdfObjectTracker();
    const objNum = tracker.allocate();
    const data = new TextEncoder().encode("test data");

    tracker.set(objNum, data);

    expect(tracker.has(objNum)).toBe(true);
    expect(tracker.get(objNum)?.data).toEqual(data);
  });

  it("returns entries sorted by object number", () => {
    const tracker = createPdfObjectTracker();

    const obj3 = tracker.allocate(); // 1
    const obj1 = tracker.allocate(); // 2
    const obj2 = tracker.allocate(); // 3

    tracker.set(obj3, new Uint8Array([3]));
    tracker.set(obj1, new Uint8Array([1]));
    tracker.set(obj2, new Uint8Array([2]));

    const entries = tracker.getAll();
    expect(entries.map((e) => e.objNum)).toEqual([1, 2, 3]);
  });

  it("calculates correct size", () => {
    const tracker = createPdfObjectTracker();

    tracker.allocate();
    tracker.allocate();
    tracker.allocate();

    // Size includes free entry 0, so 4 total
    expect(tracker.getSize()).toBe(4);
  });

  it("reports not having unset objects", () => {
    const tracker = createPdfObjectTracker();
    const objNum = tracker.allocate();

    expect(tracker.has(objNum)).toBe(false);

    tracker.set(objNum, new Uint8Array([]));

    expect(tracker.has(objNum)).toBe(true);
  });
});
