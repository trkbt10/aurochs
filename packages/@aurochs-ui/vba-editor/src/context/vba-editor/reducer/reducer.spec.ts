/**
 * @file Reducer tests
 */

import type { VbaProgramIr, VbaModule } from "@aurochs-office/vba";
import { vbaEditorReducer, createInitialState } from "./reducer";
import type { VbaEditorAction, VbaEditorState } from "../types";

// =============================================================================
// Test Fixtures
// =============================================================================

const mockModule: VbaModule = {
  name: "Module1",
  type: "standard",
  sourceCode: 'Sub Test()\n  MsgBox "Hello"\nEnd Sub',
  streamOffset: 0,
  procedures: [
    {
      name: "Test",
      type: "sub",
      visibility: "public",
      parameters: [],
      returnType: null,
    },
  ],
};

const mockClassModule: VbaModule = {
  name: "Class1",
  type: "class",
  sourceCode: "Private mValue As Integer\n\nPublic Property Get Value() As Integer\n  Value = mValue\nEnd Property",
  streamOffset: 100,
  procedures: [
    {
      name: "Value",
      type: "propertyGet",
      visibility: "public",
      parameters: [],
      returnType: "Integer",
    },
  ],
};

const mockProgram: VbaProgramIr = {
  project: {
    name: "TestProject",
    helpFile: null,
    helpContext: 0,
    constants: null,
    version: { major: 1, minor: 0 },
  },
  modules: [mockModule, mockClassModule],
  references: [],
};

// =============================================================================
// Tests
// =============================================================================

describe("createInitialState", () => {
  it("creates empty state when no program provided", () => {
    const state = createInitialState();

    expect(state.program).toBeUndefined();
    expect(state.activeModuleName).toBeUndefined();
    expect(state.mode).toBe("editing");
  });

  it("creates state with program and selects first module", () => {
    const state = createInitialState(mockProgram);

    expect(state.program).toBe(mockProgram);
    expect(state.activeModuleName).toBe("Module1");
    expect(state.cursor).toEqual({ line: 1, column: 1 });
  });
});

describe("vbaEditorReducer", () => {
  describe("LOAD_PROGRAM", () => {
    it("loads program and selects first module", () => {
      const state = createInitialState();
      const action: VbaEditorAction = { type: "LOAD_PROGRAM", program: mockProgram };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program).toBe(mockProgram);
      expect(newState.activeModuleName).toBe("Module1");
    });
  });

  describe("CLEAR_PROGRAM", () => {
    it("clears program and resets state", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = { type: "CLEAR_PROGRAM" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program).toBeUndefined();
      expect(newState.activeModuleName).toBeUndefined();
    });
  });

  describe("SELECT_MODULE", () => {
    it("selects existing module", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = { type: "SELECT_MODULE", moduleName: "Class1" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.activeModuleName).toBe("Class1");
      expect(newState.cursor).toEqual({ line: 1, column: 1 });
    });

    it("ignores non-existent module", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = { type: "SELECT_MODULE", moduleName: "NonExistent" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.activeModuleName).toBe("Module1");
    });
  });

  describe("SELECT_PROCEDURE", () => {
    it("selects procedure", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = { type: "SELECT_PROCEDURE", procedureName: "Test" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.selectedProcedureName).toBe("Test");
    });
  });

  describe("SET_CURSOR", () => {
    it("sets cursor position and clears selection", () => {
      const state: VbaEditorState = {
        ...createInitialState(mockProgram),
        selection: { startLine: 1, startColumn: 1, endLine: 2, endColumn: 5 },
      };
      const action: VbaEditorAction = { type: "SET_CURSOR", line: 3, column: 10 };

      const newState = vbaEditorReducer(state, action);

      expect(newState.cursor).toEqual({ line: 3, column: 10 });
      expect(newState.selection).toBeUndefined();
    });
  });

  describe("SET_SELECTION", () => {
    it("sets selection range", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = {
        type: "SET_SELECTION",
        startLine: 1,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.selection).toEqual({
        startLine: 1,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      });
    });
  });

  describe("CLEAR_SELECTION", () => {
    it("clears selection", () => {
      const state: VbaEditorState = {
        ...createInitialState(mockProgram),
        selection: { startLine: 1, startColumn: 1, endLine: 2, endColumn: 5 },
      };
      const action: VbaEditorAction = { type: "CLEAR_SELECTION" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.selection).toBeUndefined();
    });
  });

  describe("UPDATE_MODULE_SOURCE", () => {
    it("updates source and pushes to history", () => {
      const state = createInitialState(mockProgram);
      const newSource = 'Sub NewTest()\n  MsgBox "New"\nEnd Sub';
      const action: VbaEditorAction = {
        type: "UPDATE_MODULE_SOURCE",
        moduleName: "Module1",
        source: newSource,
        cursorOffset: 10,
      };

      const newState = vbaEditorReducer(state, action);

      const entry = newState.sourceHistory.present.get("Module1");
      expect(entry?.source).toBe(newSource);
      expect(entry?.cursorOffset).toBe(10);
      expect(newState.sourceHistory.past.length).toBe(1);
    });
  });

  describe("UNDO/REDO", () => {
    it("undoes source change", () => {
      // eslint-disable-next-line no-restricted-syntax -- Sequential state updates in test
      let state = createInitialState(mockProgram);
      state = vbaEditorReducer(state, {
        type: "UPDATE_MODULE_SOURCE",
        moduleName: "Module1",
        source: "Modified",
        cursorOffset: 5,
      });

      const undone = vbaEditorReducer(state, { type: "UNDO" });

      expect(undone.sourceHistory.present.get("Module1")).toBeUndefined();
      expect(undone.sourceHistory.future.length).toBe(1);
    });

    it("redoes source change", () => {
      // eslint-disable-next-line no-restricted-syntax -- Sequential state updates in test
      let state = createInitialState(mockProgram);
      state = vbaEditorReducer(state, {
        type: "UPDATE_MODULE_SOURCE",
        moduleName: "Module1",
        source: "Modified",
        cursorOffset: 8,
      });
      state = vbaEditorReducer(state, { type: "UNDO" });

      const redone = vbaEditorReducer(state, { type: "REDO" });

      const entry = redone.sourceHistory.present.get("Module1");
      expect(entry?.source).toBe("Modified");
      expect(entry?.cursorOffset).toBe(8);
    });

    it("restores cursor offset on undo", () => {
      // eslint-disable-next-line no-restricted-syntax -- Sequential state updates in test
      let state = createInitialState(mockProgram);
      state = vbaEditorReducer(state, {
        type: "UPDATE_MODULE_SOURCE",
        moduleName: "Module1",
        source: "First",
        cursorOffset: 3,
      });
      state = vbaEditorReducer(state, {
        type: "UPDATE_MODULE_SOURCE",
        moduleName: "Module1",
        source: "Second",
        cursorOffset: 6,
      });

      const undone = vbaEditorReducer(state, { type: "UNDO" });

      expect(undone.pendingCursorOffset).toBe(3);
    });
  });

  describe("SET_MODE", () => {
    it("sets editor mode", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = { type: "SET_MODE", mode: "readonly" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.mode).toBe("readonly");
    });
  });

  describe("CREATE_MODULE", () => {
    it("creates a new module and selects it", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = {
        type: "CREATE_MODULE",
        moduleType: "standard",
        moduleName: "Module2",
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules.length).toBe(3);
      expect(newState.program?.modules[2].name).toBe("Module2");
      expect(newState.program?.modules[2].type).toBe("standard");
      expect(newState.activeModuleName).toBe("Module2");
    });

    it("does not create module with duplicate name", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = {
        type: "CREATE_MODULE",
        moduleType: "standard",
        moduleName: "Module1", // Already exists
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules.length).toBe(2);
    });
  });

  describe("DELETE_MODULE", () => {
    it("deletes a standard module", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = { type: "DELETE_MODULE", moduleName: "Module1" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules.length).toBe(1);
      expect(newState.program?.modules[0].name).toBe("Class1");
      expect(newState.activeModuleName).toBe("Class1");
    });

    it("does not delete document module", () => {
      const docModule: VbaModule = {
        name: "ThisWorkbook",
        type: "document",
        sourceCode: "",
        streamOffset: 0,
        procedures: [],
      };
      const programWithDoc: VbaProgramIr = {
        ...mockProgram,
        modules: [docModule, mockModule],
      };
      const state = createInitialState(programWithDoc);
      const action: VbaEditorAction = { type: "DELETE_MODULE", moduleName: "ThisWorkbook" };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules.length).toBe(2);
    });
  });

  describe("RENAME_MODULE", () => {
    it("renames a module and updates active module name", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = {
        type: "RENAME_MODULE",
        oldName: "Module1",
        newName: "RenamedModule",
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules[0].name).toBe("RenamedModule");
      expect(newState.activeModuleName).toBe("RenamedModule");
    });

    it("does not rename to existing name", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = {
        type: "RENAME_MODULE",
        oldName: "Module1",
        newName: "Class1", // Already exists
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules[0].name).toBe("Module1");
    });

    it("does not rename document module", () => {
      const docModule: VbaModule = {
        name: "ThisWorkbook",
        type: "document",
        sourceCode: "",
        streamOffset: 0,
        procedures: [],
      };
      const programWithDoc: VbaProgramIr = {
        ...mockProgram,
        modules: [docModule, mockModule],
      };
      const state = createInitialState(programWithDoc);
      const action: VbaEditorAction = {
        type: "RENAME_MODULE",
        oldName: "ThisWorkbook",
        newName: "NewName",
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules[0].name).toBe("ThisWorkbook");
    });
  });

  describe("REORDER_MODULES", () => {
    it("reorders modules", () => {
      const state = createInitialState(mockProgram);
      const action: VbaEditorAction = {
        type: "REORDER_MODULES",
        moduleNames: ["Class1", "Module1"],
      };

      const newState = vbaEditorReducer(state, action);

      expect(newState.program?.modules[0].name).toBe("Class1");
      expect(newState.program?.modules[1].name).toBe("Module1");
    });
  });
});
