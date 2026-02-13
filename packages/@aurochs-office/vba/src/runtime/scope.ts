/**
 * @file VBA Scope Management
 *
 * Variable scope handling for VBA runtime.
 * Supports procedure-local, module-level, and global scopes.
 */

import type { VbaRuntimeValue, HostApi, HostObject } from "../host/api";
import type { VbaModule } from "../types";
import { VbaRuntimeError } from "./value";

// =============================================================================
// Scope Types
// =============================================================================

/**
 * Scope types.
 */
export type ScopeType = "global" | "module" | "procedure" | "local" | "with";

/**
 * VBA variable scope interface.
 */
export type VbaScope = {
  /** Declare a variable in this scope */
  readonly declare: (name: string, initialValue?: VbaRuntimeValue) => void;
  /** Check if a variable is declared in this scope (not parent) */
  readonly isDeclared: (name: string) => boolean;
  /** Get a variable's value (searches up the scope chain) */
  readonly get: (name: string) => VbaRuntimeValue;
  /** Set a variable's value (searches up the scope chain, or declares in current) */
  readonly set: (name: string, value: VbaRuntimeValue) => void;
  /** Set a variable in this scope only (no chain lookup) */
  readonly setLocal: (name: string, value: VbaRuntimeValue) => void;
  /** Get all variable names in this scope (not parent) */
  readonly getLocalNames: () => string[];
  /** Create a child scope */
  readonly createChild: (scopeType?: ScopeType) => VbaScope;
  /** Get the scope type */
  readonly getScopeType: () => ScopeType;
};

/**
 * Create a VBA variable scope.
 */
export function createVbaScope(parent: VbaScope | null = null, scopeType: ScopeType = "local"): VbaScope {
  const variables = new Map<string, VbaRuntimeValue>();

  const scope: VbaScope = {
    declare(name: string, initialValue: VbaRuntimeValue = undefined): void {
      const key = name.toLowerCase();
      variables.set(key, initialValue);
    },

    isDeclared(name: string): boolean {
      return variables.has(name.toLowerCase());
    },

    get(name: string): VbaRuntimeValue {
      const key = name.toLowerCase();
      if (variables.has(key)) {
        return variables.get(key);
      }
      if (parent) {
        return parent.get(name);
      }
      // VBA: undeclared variables are implicitly Variant with Empty value
      return undefined;
    },

    set(name: string, value: VbaRuntimeValue): void {
      const key = name.toLowerCase();
      // Look up the scope chain for existing variable
      if (variables.has(key)) {
        variables.set(key, value);
        return;
      }
      if (parent && parent.isDeclared(key)) {
        parent.set(name, value);
        return;
      }
      // Check further up the chain via parent.get !== undefined behavior
      // For simplicity, if not found locally or in immediate parent, declare locally
      if (parent) {
        // Try to find if any ancestor has it
        const existingValue = parent.get(key);
        if (existingValue !== undefined || parentHasVariable(parent, key)) {
          parent.set(name, value);
          return;
        }
      }
      // Not found: implicit declaration in current scope
      variables.set(key, value);
    },

    setLocal(name: string, value: VbaRuntimeValue): void {
      variables.set(name.toLowerCase(), value);
    },

    getLocalNames(): string[] {
      return Array.from(variables.keys());
    },

    createChild(childScopeType: ScopeType = "local"): VbaScope {
      return createVbaScope(scope, childScopeType);
    },

    getScopeType(): ScopeType {
      return scopeType;
    },
  };

  return scope;
}

/**
 * Check if a scope or its ancestors have a variable.
 */
function parentHasVariable(scope: VbaScope, name: string): boolean {
  // We can only check via isDeclared at each level
  // This is a limitation - we can't traverse the full chain without access to internals
  return scope.isDeclared(name);
}

// =============================================================================
// Execution Context
// =============================================================================

/**
 * Exit flags for procedure control flow.
 */
type ExitFlags = {
  exitSub: boolean;
  exitFunction: boolean;
  exitFor: boolean;
  exitDo: boolean;
  exitProperty: boolean;
};

/**
 * VBA execution context interface.
 */
export type VbaExecutionContext = {
  /** Global scope (shared across all modules) */
  readonly globalScope: VbaScope;
  /** Host API for object model access */
  readonly hostApi: HostApi | null;
  /** Initialize a module scope */
  readonly initModule: (module: VbaModule) => void;
  /** Get module scope */
  readonly getModuleScope: (moduleName: string) => VbaScope | undefined;
  /** Enter a procedure */
  readonly enterProcedure: (moduleName: string, procedureName: string) => VbaScope;
  /** Exit the current procedure */
  readonly exitProcedure: () => VbaRuntimeValue;
  /** Get the current scope */
  readonly getCurrentScope: () => VbaScope;
  /** Create a local scope (for blocks like With) */
  readonly pushLocalScope: (scopeType?: ScopeType) => VbaScope;
  /** Pop a local scope */
  readonly popLocalScope: () => void;
  /** Push a With object onto the stack */
  readonly pushWithObject: (obj: VbaRuntimeValue) => void;
  /** Pop the With object from the stack */
  readonly popWithObject: () => void;
  /** Get the current With object */
  readonly getCurrentWithObject: () => VbaRuntimeValue;
  /** Check if inside a With block */
  readonly hasWithObject: () => boolean;
  /** Set the return value for the current function */
  readonly setReturnValue: (value: VbaRuntimeValue) => void;
  /** Get current module name */
  readonly getCurrentModule: () => string | null;
  /** Get current procedure name */
  readonly getCurrentProcedure: () => string | null;
  /** Exit flag setters */
  readonly setExitSub: () => void;
  readonly setExitFunction: () => void;
  readonly setExitFor: () => void;
  readonly setExitDo: () => void;
  readonly setExitProperty: () => void;
  /** Exit flag checkers */
  readonly shouldExitProcedure: () => boolean;
  readonly shouldExitFor: () => boolean;
  readonly shouldExitDo: () => boolean;
  /** Exit flag clearers */
  readonly clearExitFor: () => void;
  readonly clearExitDo: () => void;
  /** Resolve a global object from host API */
  readonly resolveGlobalObject: (name: string) => HostObject | undefined;
};

/**
 * Create a VBA execution context.
 */
export function createVbaExecutionContext(hostApi: HostApi | null = null): VbaExecutionContext {
  const globalScope = createVbaScope(null, "global");
  const moduleScopes = new Map<string, VbaScope>();
  const scopeStack: VbaScope[] = [];
  const withStack: VbaRuntimeValue[] = [];

  const ctxState = {
    currentModule: null as string | null,
    currentProcedure: null as string | null,
    returnValue: undefined as VbaRuntimeValue,
  };
  const exitFlags: ExitFlags = {
    exitSub: false,
    exitFunction: false,
    exitFor: false,
    exitDo: false,
    exitProperty: false,
  };

  function resetExitFlags(): void {
    exitFlags.exitSub = false;
    exitFlags.exitFunction = false;
    exitFlags.exitFor = false;
    exitFlags.exitDo = false;
    exitFlags.exitProperty = false;
  }

  const context: VbaExecutionContext = {
    globalScope,
    hostApi,

    initModule(module: VbaModule): void {
      const scope = createVbaScope(globalScope, "module");
      moduleScopes.set(module.name.toLowerCase(), scope);
    },

    getModuleScope(moduleName: string): VbaScope | undefined {
      return moduleScopes.get(moduleName.toLowerCase());
    },

    enterProcedure(moduleName: string, procedureName: string): VbaScope {
      ctxState.currentModule = moduleName;
      ctxState.currentProcedure = procedureName;
      resetExitFlags();
      ctxState.returnValue = undefined;

      const moduleScope = context.getModuleScope(moduleName);
      if (!moduleScope) {
        throw new VbaRuntimeError(`Module not found: ${moduleName}`, "invalidProcedureCall");
      }

      const procScope = createVbaScope(moduleScope, "procedure");
      scopeStack.push(procScope);
      return procScope;
    },

    exitProcedure(): VbaRuntimeValue {
      scopeStack.pop();
      const result = ctxState.returnValue;
      ctxState.returnValue = undefined;
      return result;
    },

    getCurrentScope(): VbaScope {
      if (scopeStack.length > 0) {
        return scopeStack[scopeStack.length - 1];
      }
      if (ctxState.currentModule) {
        return context.getModuleScope(ctxState.currentModule) ?? globalScope;
      }
      return globalScope;
    },

    pushLocalScope(scopeType: ScopeType = "local"): VbaScope {
      const parent = context.getCurrentScope();
      const scope = createVbaScope(parent, scopeType);
      scopeStack.push(scope);
      return scope;
    },

    popLocalScope(): void {
      if (scopeStack.length > 0) {
        scopeStack.pop();
      }
    },

    pushWithObject(obj: VbaRuntimeValue): void {
      withStack.push(obj);
    },

    popWithObject(): void {
      withStack.pop();
    },

    getCurrentWithObject(): VbaRuntimeValue {
      if (withStack.length === 0) {
        throw new VbaRuntimeError("Invalid use of Me", "objectRequired");
      }
      return withStack[withStack.length - 1];
    },

    hasWithObject(): boolean {
      return withStack.length > 0;
    },

    setReturnValue(value: VbaRuntimeValue): void {
      ctxState.returnValue = value;
    },

    getCurrentModule(): string | null {
      return ctxState.currentModule;
    },

    getCurrentProcedure(): string | null {
      return ctxState.currentProcedure;
    },

    setExitSub(): void {
      exitFlags.exitSub = true;
    },
    setExitFunction(): void {
      exitFlags.exitFunction = true;
    },
    setExitFor(): void {
      exitFlags.exitFor = true;
    },
    setExitDo(): void {
      exitFlags.exitDo = true;
    },
    setExitProperty(): void {
      exitFlags.exitProperty = true;
    },

    shouldExitProcedure(): boolean {
      return exitFlags.exitSub || exitFlags.exitFunction || exitFlags.exitProperty;
    },
    shouldExitFor(): boolean {
      return exitFlags.exitFor || context.shouldExitProcedure();
    },
    shouldExitDo(): boolean {
      return exitFlags.exitDo || context.shouldExitProcedure();
    },

    clearExitFor(): void {
      exitFlags.exitFor = false;
    },
    clearExitDo(): void {
      exitFlags.exitDo = false;
    },

    resolveGlobalObject(name: string): HostObject | undefined {
      return hostApi?.getGlobalObject(name);
    },
  };

  return context;
}

// =============================================================================
// Call Stack
// =============================================================================

/**
 * Call stack frame.
 */
export type CallFrame = {
  readonly moduleName: string;
  readonly procedureName: string;
  readonly lineNumber?: number;
};

/**
 * VBA call stack interface.
 */
export type VbaCallStack = {
  /** Push a frame onto the stack */
  readonly push: (frame: CallFrame) => void;
  /** Pop a frame from the stack */
  readonly pop: () => CallFrame | undefined;
  /** Get the current depth */
  readonly depth: () => number;
  /** Get the current frame */
  readonly current: () => CallFrame | undefined;
  /** Get the full stack trace */
  readonly getStackTrace: () => CallFrame[];
  /** Format stack trace as string */
  readonly formatStackTrace: () => string;
};

/**
 * Create a VBA call stack.
 */
export function createVbaCallStack(maxDepth = 1000): VbaCallStack {
  const frames: CallFrame[] = [];

  return {
    push(frame: CallFrame): void {
      if (frames.length >= maxDepth) {
        throw new VbaRuntimeError("Stack overflow", "overflow");
      }
      frames.push(frame);
    },

    pop(): CallFrame | undefined {
      return frames.pop();
    },

    depth(): number {
      return frames.length;
    },

    current(): CallFrame | undefined {
      return frames[frames.length - 1];
    },

    getStackTrace(): CallFrame[] {
      return [...frames];
    },

    formatStackTrace(): string {
      return frames
        .map((f) => {
          const line = f.lineNumber ? `:${f.lineNumber}` : "";
          return `  at ${f.moduleName}.${f.procedureName}${line}`;
        })
        .reverse()
        .join("\n");
    },
  };
}
