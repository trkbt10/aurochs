/**
 * @file Generic editor reducer factory
 */

import { useReducer, useCallback, type Reducer } from "react";
import type { EditorState, EditorAction } from "../types";

/**
 * Update function type for immutable updates
 */
export type UpdateFn<T> = (state: T, path: string, value: unknown) => T;

/**
 * Create an editor reducer with the given update function
 */
export function createEditorReducer<T>(
  updateFn: UpdateFn<T>
): Reducer<EditorState<T>, EditorAction<T>> {
  return function reducer(
    state: EditorState<T>,
    action: EditorAction<T>
  ): EditorState<T> {
    switch (action.type) {
      case "SET_VALUE":
        return {
          value: action.payload,
          originalValue: action.payload,
          isDirty: false,
        };

      case "UPDATE_FIELD": {
        const newValue = updateFn(state.value, action.path, action.value);
        return {
          ...state,
          value: newValue,
          isDirty: true,
        };
      }

      case "RESET":
        return {
          ...state,
          value: state.originalValue,
          isDirty: false,
        };

      default:
        return state;
    }
  };
}

/**
 * Hook for creating and using an editor reducer
 */
export function useEditorReducer<T>(
  initialValue: T,
  updateFn: UpdateFn<T>
): {
  state: EditorState<T>;
  setValue: (value: T) => void;
  updateField: (path: string, value: unknown) => void;
  reset: () => void;
} {
  const reducer = useCallback(
    () => createEditorReducer(updateFn),
    [updateFn]
  );

  const [state, dispatch] = useReducer(reducer(), {
    value: initialValue,
    originalValue: initialValue,
    isDirty: false,
  });

  const setValue = useCallback((value: T) => {
    dispatch({ type: "SET_VALUE", payload: value });
  }, []);

  const updateField = useCallback((path: string, value: unknown) => {
    dispatch({ type: "UPDATE_FIELD", path, value });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return { state, setValue, updateField, reset };
}

/**
 * Simple object update function for flat objects
 */
export function simpleUpdate<T extends Record<string, unknown>>(
  state: T,
  path: string,
  value: unknown
): T {
  return { ...state, [path]: value };
}

/**
 * Nested object update function using dot notation paths
 */
export function nestedUpdate<T>(
  state: T,
  path: string,
  value: unknown
): T {
  const parts = path.split(".");
  if (parts.length === 1) {
    return { ...state, [path]: value } as T;
  }

  const [first, ...rest] = parts;
  const nested = (state as Record<string, unknown>)[first];
  return {
    ...state,
    [first]: nestedUpdate(nested, rest.join("."), value),
  } as T;
}
