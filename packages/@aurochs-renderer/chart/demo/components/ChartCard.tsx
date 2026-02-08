/**
 * @file Individual chart display card
 */

import { useMemo } from "react";
import type { ChartCatalogItem } from "../fixtures";
import { renderChart } from "../../src/render-chart";
import type { ChartRenderContext, FillResolver, ResolvedFill } from "../../src/types";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";

type Props = {
  readonly item: ChartCatalogItem;
  readonly isSelected: boolean;
  readonly onClick: () => void;
};

const styles = {
  card: {
    background: "#fff",
    borderRadius: "12px",
    overflow: "hidden",
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  cardSelected: {
    transform: "scale(1.02)",
    boxShadow: "0 8px 24px rgba(99, 102, 241, 0.3)",
  },
  preview: {
    padding: "20px",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "250px",
  },
  info: {
    padding: "12px 16px",
    background: "#f8fafc",
    borderTop: "1px solid #e2e8f0",
  },
  title: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1e293b",
    marginBottom: "4px",
  },
  description: {
    fontSize: "12px",
    color: "#64748b",
  },
  category: {
    display: "inline-block",
    marginTop: "8px",
    padding: "2px 8px",
    fontSize: "11px",
    borderRadius: "4px",
    background: "#e0e7ff",
    color: "#4338ca",
  },
  error: {
    color: "#ef4444",
    fontSize: "12px",
    padding: "20px",
  },
};

const CHART_COLORS = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"];

function createDemoChartContext(): ChartRenderContext {
  return {
    getSeriesColor: (index: number) => CHART_COLORS[index % CHART_COLORS.length] ?? "#4472C4",
    getAxisColor: () => "#333333",
    getGridlineColor: () => "#DDDDDD",
    getTextStyle: () => ({
      fontFamily: "Calibri, sans-serif",
      fontSize: 10,
      fontWeight: "normal",
      color: "#333333",
    }),
    warnings: {
      add: () => {},
      getAll: () => [],
      clear: () => {},
      isEmpty: () => true,
    },
  };
}

function createDemoFillResolver(): FillResolver {
  return {
    resolve: (fill: BaseFill): ResolvedFill => {
      if (!fill) {
        return { type: "none" };
      }
      if (fill.type === "solidFill") {
        const color = fill.color;
        if (color?.spec.type === "srgb") {
          return {
            type: "solid",
            color: { hex: color.spec.value, alpha: 1 },
          };
        }
      }
      return { type: "unresolved" };
    },
  };
}

export function ChartCard({ item, isSelected, onClick }: Props) {
  const { svg, error } = useMemo(() => {
    try {
      const ctx = createDemoChartContext();
      const fillResolver = createDemoFillResolver();

      const svgOutput = renderChart({
        chart: item.chart,
        width: 340,
        height: 210,
        ctx,
        fillResolver,
      });

      return { svg: svgOutput, error: null };
    } catch (e) {
      return {
        svg: null,
        error: e instanceof Error ? e.message : "Unknown error",
      };
    }
  }, [item.chart]);

  const cardStyle = {
    ...styles.card,
    ...(isSelected ? styles.cardSelected : {}),
  };

  return (
    <div style={cardStyle} onClick={onClick}>
      <div style={styles.preview}>
        {error ? <div style={styles.error}>{error}</div> : <div dangerouslySetInnerHTML={{ __html: svg ?? "" }} />}
      </div>
      <div style={styles.info}>
        <div style={styles.title}>{item.name}</div>
        <div style={styles.description}>{item.description}</div>
        <span style={styles.category}>{item.category}</span>
      </div>
    </div>
  );
}
