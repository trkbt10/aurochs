/**
 * @file Formula function preview page (similar to reference showcase)
 */

import { useMemo, type CSSProperties } from "react";
import { useParams } from "react-router-dom";
import { getFormulaFunction } from "@lib/xlsx/formula/functionRegistry";
import { createFormulaEvaluator } from "@lib/xlsx/formula/evaluator";
import type { FormulaFunctionSample } from "@lib/xlsx/formula/functionRegistry";
import { DEFAULT_ORIGIN, createFormulaSampleWorkbook } from "./sample-workbook";
import { deepEqual, formatValue, isNumericString } from "./format";

const sectionStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  border: "1px solid var(--border-subtle)",
  borderRadius: 12,
  background: "var(--bg-primary)",
};

const sectionTitleStyle: CSSProperties = { fontSize: 13, fontWeight: 700 };

const codeStyle: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  padding: "2px 6px",
  borderRadius: 6,
  border: "1px solid var(--border-subtle)",
  background: "var(--bg-secondary)",
};

const samplesGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 10,
};

function normalizeSampleOutput(output: FormulaFunctionSample["output"]): unknown {
  return output;
}

export function XlsxFormulaFunctionPage() {
  const { category, functionName } = useParams<{ category: string; functionName: string }>();

  const fn = useMemo(() => {
    if (!functionName) {
      return undefined;
    }
    return getFormulaFunction(functionName);
  }, [functionName]);

  const workbook = useMemo(() => createFormulaSampleWorkbook(), []);
  const evaluator = useMemo(() => createFormulaEvaluator(workbook), [workbook]);

  if (!category || !functionName) {
    return <div style={{ opacity: 0.75 }}>Invalid function URL</div>;
  }

  if (!fn) {
    return <div style={{ opacity: 0.75 }}>Function not found: {functionName}</div>;
  }

  const samples = fn.samples ?? [];

  const renderDescription = () => {
    if (!fn.description) {
      return null;
    }
    return (
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Description</div>
        <div style={{ fontSize: 12, lineHeight: 1.6 }}>
          <div>{fn.description.en}</div>
          <div lang="ja" style={{ opacity: 0.85 }}>
            {fn.description.ja}
          </div>
        </div>
      </div>
    );
  };

  const renderExamples = () => {
    if (!fn.examples || fn.examples.length === 0) {
      return null;
    }
    return (
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Examples</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {fn.examples.map((ex, idx) => (
            <div key={idx}>
              <span style={codeStyle}>{ex}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSamples = () => {
    if (samples.length === 0) {
      return null;
    }

    return (
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Live Samples</div>
        <div style={samplesGridStyle}>
          {samples.map((sample, index) => {
            const actual = evaluator.evaluateFormulaResult(0, DEFAULT_ORIGIN, sample.input);
            const expected = normalizeSampleOutput(sample.output);

            const actualFormatted = formatValue(actual);
            const expectedFormatted = formatValue(expected);

            let isMatch = deepEqual(actual, expected);
            if (!isMatch && isNumericString(actualFormatted) && isNumericString(expectedFormatted)) {
              const actualNum = Number(actualFormatted);
              const expectedNum = Number(expectedFormatted);
              const tolerance = Math.abs(expectedNum) * 0.0001;
              isMatch = Math.abs(actualNum - expectedNum) <= Math.max(tolerance, 1e-9);
            }

            return (
              <div key={index} style={{ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 12 }}>
                {sample.description && (
                  <div style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8, opacity: 0.9 }}>
                    <div>{sample.description.en}</div>
                    <div lang="ja" style={{ opacity: 0.85 }}>
                      {sample.description.ja}
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "6px 10px", fontSize: 12 }}>
                  <div style={{ opacity: 0.75 }}>Input</div>
                  <div style={codeStyle}>{sample.input}</div>

                  <div style={{ opacity: 0.75 }}>Expected</div>
                  <div style={codeStyle}>{expectedFormatted}</div>

                  <div style={{ opacity: 0.75 }}>Actual</div>
                  <div
                    style={{
                      ...codeStyle,
                      borderColor: isMatch ? "var(--border-subtle)" : "var(--danger, #ff4d4f)",
                    }}
                    data-is-match={isMatch}
                  >
                    {actualFormatted}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{fn.name}</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>{category}</div>
      </div>

      {renderDescription()}
      {renderExamples()}
      {renderSamples()}
    </div>
  );
}
