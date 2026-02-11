/**
 * @file Vitest setup for DOM-related mocks
 */

import { installIntersectionObserverMock } from "./test-utils/intersection-observer";
import { installResizeObserverMock, resetResizeObserverMock } from "./test-utils/resize-observer";

installResizeObserverMock();
installIntersectionObserverMock();

afterEach(() => {
  resetResizeObserverMock();
});
