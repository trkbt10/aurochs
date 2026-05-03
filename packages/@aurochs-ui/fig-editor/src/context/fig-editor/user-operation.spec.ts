/** @file Tests for fig editor operation permissions. */

import { allowsFigNodeMutationSource, allowsFigUserOperation, resolveFigUserOperationDomain } from "./user-operation";

describe("resolveFigUserOperationDomain", () => {
  it("allows only text-edit exit while text editing", () => {
    const domain = resolveFigUserOperationDomain({ kind: "text-edit", source: "text-edit" });

    expect(allowsFigUserOperation(domain, "exit-text-edit")).toBe(true);
    expect(allowsFigUserOperation(domain, "select-node")).toBe(false);
    expect(allowsFigUserOperation(domain, "edit-vector-path")).toBe(false);
    expect(allowsFigUserOperation(domain, "commit-create")).toBe(false);
    expect(allowsFigUserOperation(domain, "set-tool")).toBe(false);
    expect(allowsFigNodeMutationSource(domain, "text-edit")).toBe(true);
    expect(allowsFigNodeMutationSource(domain, "property-panel")).toBe(false);
  });

  it("allows path editing without creation or transform operations", () => {
    const domain = resolveFigUserOperationDomain({ kind: "path-edit", source: "tool" });

    expect(allowsFigUserOperation(domain, "resolve-path-target")).toBe(true);
    expect(allowsFigUserOperation(domain, "edit-vector-path")).toBe(true);
    expect(allowsFigUserOperation(domain, "start-resize")).toBe(false);
    expect(allowsFigUserOperation(domain, "commit-create")).toBe(false);
    expect(allowsFigUserOperation(domain, "set-tool")).toBe(true);
    expect(allowsFigUserOperation(domain, "delete-selection")).toBe(false);
    expect(allowsFigNodeMutationSource(domain, "path-edit")).toBe(true);
    expect(allowsFigNodeMutationSource(domain, "property-panel")).toBe(false);
  });

  it("allows selection operations only in select intent", () => {
    const domain = resolveFigUserOperationDomain({ kind: "select", source: "tool" });

    expect(allowsFigUserOperation(domain, "select-node")).toBe(true);
    expect(allowsFigUserOperation(domain, "start-move")).toBe(true);
    expect(allowsFigUserOperation(domain, "enter-text-edit")).toBe(true);
    expect(allowsFigUserOperation(domain, "edit-vector-path")).toBe(false);
    expect(allowsFigUserOperation(domain, "delete-selection")).toBe(true);
    expect(allowsFigUserOperation(domain, "group-selection")).toBe(true);
    expect(allowsFigNodeMutationSource(domain, "property-panel")).toBe(true);
    expect(allowsFigNodeMutationSource(domain, "text-edit")).toBe(false);
  });

  it("allows transform previews only for the matching active transform intent", () => {
    const resize = resolveFigUserOperationDomain({ kind: "resize", source: "drag" });
    const rotate = resolveFigUserOperationDomain({ kind: "rotate", source: "drag" });

    expect(allowsFigUserOperation(resize, "preview-resize")).toBe(true);
    expect(allowsFigUserOperation(resize, "preview-rotate")).toBe(false);
    expect(allowsFigUserOperation(rotate, "preview-rotate")).toBe(true);
    expect(allowsFigUserOperation(rotate, "preview-move")).toBe(false);
  });

  it("allows creation operations only for creation intents", () => {
    const domain = resolveFigUserOperationDomain({ kind: "create-rectangle", source: "tool" });

    expect(allowsFigUserOperation(domain, "start-create")).toBe(true);
    expect(allowsFigUserOperation(domain, "commit-create")).toBe(true);
    expect(allowsFigUserOperation(domain, "select-node")).toBe(false);
    expect(allowsFigUserOperation(domain, "set-tool")).toBe(true);
  });

  it("does not allow tool changes during an active create drag", () => {
    const domain = resolveFigUserOperationDomain({ kind: "create-drag", source: "drag" });

    expect(allowsFigUserOperation(domain, "commit-create")).toBe(true);
    expect(allowsFigUserOperation(domain, "set-tool")).toBe(false);
  });
});
