/**
 * @file Vitest setup for DOM-related mocks
 */

import { installResizeObserverMock, resetResizeObserverMock } from "./test-utils/resize-observer";

installResizeObserverMock();

afterEach(() => {
  resetResizeObserverMock();
});
