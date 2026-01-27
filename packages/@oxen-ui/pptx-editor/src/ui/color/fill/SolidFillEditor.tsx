/**
 * @file SolidFillEditor component
 *
 * Editor for solid color fill.
 */

import { useCallback } from "react";
import type { SolidFill } from "@oxen/ooxml/domain/fill";
import { HexColorEditor } from "../components";
import { createDefaultColor, getHexFromColor } from "./fill-utils";

export type SolidFillEditorProps = {
  readonly value: SolidFill;
  readonly onChange: (fill: SolidFill) => void;
};

/**
 * Editor for solid color fill values.
 */
export function SolidFillEditor({ value, onChange }: SolidFillEditorProps) {
  const hex = getHexFromColor(value.color);

  const handleChange = useCallback(
    (newHex: string) => {
      onChange({ ...value, color: createDefaultColor(newHex) });
    },
    [value, onChange]
  );

  return <HexColorEditor value={hex} onChange={handleChange} />;
}
