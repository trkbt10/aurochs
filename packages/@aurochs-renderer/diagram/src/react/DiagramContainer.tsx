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
};

/** Renders a diagram from a resource store. Throws if shapes are not available. */
export function DiagramContainer<TShape>(props: DiagramContainerProps<TShape>) {
  const { dataResourceId, getResource, renderShape } = props;

  const shapes = useDiagramContent<TShape>({ dataResourceId, getResource });

  if (shapes === undefined || shapes.length === 0) {
    throw new Error(
      `DiagramContainer: no shapes available (dataResourceId=${dataResourceId ?? "undefined"}, shapes=${shapes === undefined ? "undefined" : "empty"})`,
    );
  }

  return <g data-diagram-content="true">{shapes.map((s, i) => renderShape(s, i))}</g>;
}
