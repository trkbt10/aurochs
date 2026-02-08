/**
 * @file Feature view component
 */

import type { ComponentType } from "react";
import type { FeatureRoute } from "../../types";

type Props = {
  readonly feature: FeatureRoute | undefined;
  readonly FeatureComponent: ComponentType | undefined;
};

const styles = {
  empty: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "300px",
    color: "#64748b",
    fontSize: "14px",
  },
  container: {
    minHeight: "100%",
  },
};

export function FeatureView({ feature, FeatureComponent }: Props) {
  if (!feature || !FeatureComponent) {
    return (
      <div style={styles.empty}>
        Select a feature from the sidebar
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <FeatureComponent />
    </div>
  );
}
