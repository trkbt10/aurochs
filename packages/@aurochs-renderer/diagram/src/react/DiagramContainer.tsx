/**
 * @file Diagram container component (format-agnostic)
 */

import type { ReactNode } from "react";
import { useDiagramContent } from "./useDiagramContent";
import type { ResourceEntry } from "../types";

export type DiagramContainerProps<TShape> = {
  readonly dataResourceId: string | undefined;
  readonly width: number;
  readonly height: number;
  readonly getResource: <TParsed>(resourceId: string) => ResourceEntry<TParsed> | undefined;
  readonly renderShape: (shape: TShape, index: number) => ReactNode;
  readonly placeholder?: ReactNode;
};

function DefaultPlaceholder({ width, height }: { readonly width: number; readonly height: number }) {
  return (
    <g data-diagram-placeholder="true">
      <rect x="0" y="0" width={width} height={height} fill="#f0f0f0" stroke="#cccccc" />
      <text
        x={width / 2}
        y={height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#999999"
      >
        [Diagram]
      </text>
    </g>
  );
}

/** Renders a diagram from a resource store or shows a placeholder. */
export function DiagramContainer<TShape>(props: DiagramContainerProps<TShape>) {
  const { dataResourceId, width, height, getResource, renderShape, placeholder } = props;

  const shapes = useDiagramContent<TShape>({ dataResourceId, getResource });

  if (shapes === undefined || shapes.length === 0) {
    return placeholder ?? <DefaultPlaceholder width={width} height={height} />;
  }

  return <g data-diagram-content="true">{shapes.map((s, i) => renderShape(s, i))}</g>;
}
