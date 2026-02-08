/**
 * @file Vector node builder
 */

import { BaseShapeBuilder } from "./base";
import type { VectorNodeData } from "./types";
import { SHAPE_NODE_TYPES, WINDING_RULE_VALUES, type WindingRule } from "../../constants";

export class VectorNodeBuilder extends BaseShapeBuilder<VectorNodeData> {
  private _windingRule: WindingRule;
  private _vectorNetworkBlob?: number;

  constructor(localID: number, parentID: number) {
    super(localID, parentID);
    this._name = "Vector";
    this._windingRule = "NONZERO";
    // Default fill
    this._fillColor = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
  }

  /**
   * Set winding rule for path filling
   */
  windingRule(rule: WindingRule): this {
    this._windingRule = rule;
    return this;
  }

  /**
   * Set vector network blob reference
   * (Used for complex vector data stored in blobs)
   */
  vectorNetworkBlob(blobIndex: number): this {
    this._vectorNetworkBlob = blobIndex;
    return this;
  }

  private buildVectorData(): VectorNodeData["vectorData"] {
    if (this._vectorNetworkBlob === undefined) {
      return undefined;
    }
    return {
      vectorNetworkBlob: this._vectorNetworkBlob,
      normalizedSize: { x: this._width, y: this._height },
    };
  }

  build(): VectorNodeData {
    return {
      ...this.buildBaseData(),
      nodeType: SHAPE_NODE_TYPES.VECTOR,
      vectorData: this.buildVectorData(),
      handleMirroring: { value: WINDING_RULE_VALUES[this._windingRule], name: this._windingRule },
    };
  }
}

/**
 * Create a new Vector node builder
 */
export function vectorNode(localID: number, parentID: number): VectorNodeBuilder {
  return new VectorNodeBuilder(localID, parentID);
}
