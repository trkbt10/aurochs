/**
 * @file Thumbnail sidebar for paginated viewers (PPTX, PDF).
 *
 * Renders SVG thumbnails with page numbers and active state.
 */

import { useEffect, useRef } from "react";

export type ThumbnailSidebarProps = {
  readonly svgs: readonly string[];
  readonly activeIndex: number;
  readonly onSelect: (index: number) => void;
  readonly labelPrefix: string;
};

export function ThumbnailSidebar({
  svgs,
  activeIndex,
  onSelect,
  labelPrefix,
}: ThumbnailSidebarProps): React.JSX.Element {
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="sidebar">
      {svgs.map((svg, i) => (
        <div
          key={i}
          ref={i === activeIndex ? activeRef : undefined}
          className={`thumbnail${i === activeIndex ? " active" : ""}`}
          title={`${labelPrefix} ${i + 1}`}
          onClick={() => onSelect(i)}
        >
          <div className="thumbnail-number">{i + 1}</div>
          <div className="thumbnail-svg" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      ))}
    </div>
  );
}
