/**
 * @file Vitest setup for DOM-related mocks
 */

import { afterEach } from "vitest";
import { installResizeObserverMock, resetResizeObserverMock } from "./test-utils/resize-observer";

installResizeObserverMock();

afterEach(() => {
  resetResizeObserverMock();
});
