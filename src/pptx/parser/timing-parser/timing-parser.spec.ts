/**
 * @file Tests for ECMA-376 compliant timing/animation parsing
 * @see ECMA-376 Part 1, Section 19.5
 */

import { parseTiming } from "./index";
import {
  mapChartBuildType,
  mapChartOnlyBuildType,
  mapChartBuildStep,
  mapChartSubelementType,
  mapCommandType,
  mapDgmBuildType,
  mapDgmOnlyBuildType,
  mapDgmBuildStep,
  mapOleChartBuildType,
  mapParaBuildType,
} from "./mapping";
import { parseBuildChartElement, parseBuildDgmElement } from "./graphic-build";
import type { XmlElement } from "../../../xml/index";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to create a mock XmlElement for testing.
 */
function el(
  name: string,
  attrs: Record<string, string> = {},
  children: (XmlElement | string)[] = []
): XmlElement {
  return {
    type: "element",
    name,
    attrs,
    children: children.map(c => typeof c === "string" ? { type: "text" as const, value: c } : c)
  };
}

// =============================================================================
// Main Parser Tests
// =============================================================================

describe("parseTiming - ECMA-376 compliance", () => {
  describe("p:timing element (ECMA-376 19.5.87)", () => {
    it("returns undefined for undefined input", () => {
      const result = parseTiming(undefined);
      expect(result).toBeUndefined();
    });

    it("returns undefined for empty timing element", () => {
      const timing = el("p:timing");
      const result = parseTiming(timing);
      expect(result).toBeUndefined();
    });

    it("parses timing with root parallel time node", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", dur: "indefinite", nodeType: "tmRoot" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result).toBeDefined();
      expect(result?.rootTimeNode).toBeDefined();
      expect(result?.rootTimeNode?.type).toBe("parallel");
    });

    it("parses timing with build list", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" })
          ])
        ]),
        el("p:bldLst", {}, [
          el("p:bldP", { spid: "3", grpId: "0", build: "p" })
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.buildList).toBeDefined();
      expect(result?.buildList?.length).toBe(1);
      expect(result?.buildList?.[0].shapeId).toBe("3");
      expect(result?.buildList?.[0].buildType).toBe("paragraph");
    });
  });
});

// =============================================================================
// Time Node Tests
// =============================================================================

describe("Time Node Parsing - ECMA-376 compliance", () => {
  describe("p:par (parallel) element (ECMA-376 19.5.53)", () => {
    it("parses parallel time node with children", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:par", {}, [
                  el("p:cTn", { id: "2", dur: "1000" })
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.type).toBe("parallel");
      if (result?.rootTimeNode?.type === "parallel") {
        expect(result.rootTimeNode.children.length).toBe(1);
        expect(result.rootTimeNode.children[0].type).toBe("parallel");
      }
    });
  });

  describe("p:seq (sequence) element (ECMA-376 19.5.65)", () => {
    it("parses sequence time node", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:seq", { concurrent: "1", nextAc: "seek" }, [
                  el("p:cTn", { id: "2", nodeType: "mainSeq" })
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const seq = result.rootTimeNode.children[0];
        expect(seq.type).toBe("sequence");
        if (seq.type === "sequence") {
          expect(seq.concurrent).toBe(true);
          expect(seq.nextAction).toBe("seek");
          expect(seq.nodeType).toBe("mainSeq");
        }
      }
    });

    it("parses next condition list", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:seq", {}, [
                  el("p:cTn", { id: "2" }),
                  el("p:nextCondLst", {}, [
                    el("p:cond", { evt: "onNext", delay: "0" }, [
                      el("p:tgtEl", {}, [
                        el("p:sldTgt")
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const seq = result.rootTimeNode.children[0];
        if (seq.type === "sequence") {
          expect(seq.nextConditions?.length).toBe(1);
          expect(seq.nextConditions?.[0].event).toBe("onNext");
          expect(seq.nextConditions?.[0].delay).toBe(0);
        }
      }
    });

    it("parses previous condition list", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:seq", {}, [
                  el("p:cTn", { id: "2" }),
                  el("p:prevCondLst", {}, [
                    el("p:cond", { evt: "onPrev", delay: "0" }, [
                      el("p:tgtEl", {}, [
                        el("p:sldTgt")
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const seq = result.rootTimeNode.children[0];
        if (seq.type === "sequence") {
          expect(seq.prevConditions?.length).toBe(1);
          expect(seq.prevConditions?.[0].event).toBe("onPrev");
          expect(seq.prevConditions?.[0].delay).toBe(0);
        }
      }
    });

    it("parses sub time node list", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:subTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const subNode = result.rootTimeNode.subTimeNodes?.[0];
        expect(subNode?.type).toBe("set");
        if (subNode?.type === "set") {
          expect(subNode.target.type).toBe("shape");
        }
      }
    });
  });

  describe("p:cTn (common time node) (ECMA-376 19.5.33)", () => {
    it("parses duration in milliseconds", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", dur: "500" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.duration).toBe(500);
    });

    it("parses indefinite duration", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", dur: "indefinite" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.duration).toBe("indefinite");
    });

    it("parses fill behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", fill: "hold" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.fill).toBe("hold");
    });

    it("parses restart behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", restart: "never" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.restart).toBe("never");
    });

    it("parses time node type", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", nodeType: "withGroup" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.nodeType).toBe("withGroup");
    });

    it("parses sync behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", syncBehavior: "locked" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.syncBehavior).toBe("locked");
    });

    it("parses master relation", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", masterRel: "lastClick" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.masterRelation).toBe("lastClick");
    });

    it("parses preset info", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", presetID: "1", presetClass: "entr", presetSubtype: "0" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.preset).toEqual({
        id: 1,
        class: "entrance",
        subtype: 0
      });
    });

    it("parses acceleration and deceleration (0-100000)", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", accel: "50000", decel: "25000" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.acceleration).toBe(50);
      expect(result?.rootTimeNode?.deceleration).toBe(25);
    });

    it("parses autoReverse", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", autoRev: "1" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.autoReverse).toBe(true);
    });

    it("parses repeatCount", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1", repeatCount: "3000" })
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.repeatCount).toBe(3);
    });

    it("parses iterate interval with tmAbs", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:iterate", { type: "lt", backwards: "1" }, [
                el("p:tmAbs", { val: "10000" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.iterate?.type).toBe("letter");
      expect(result?.rootTimeNode?.iterate?.backwards).toBe(true);
      expect(result?.rootTimeNode?.iterate?.interval).toEqual({ type: "absolute", value: 10000 });
    });

    it("parses iterate interval with tmPct", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:iterate", { type: "wd" }, [
                el("p:tmPct", { val: "10%" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.iterate?.type).toBe("word");
      expect(result?.rootTimeNode?.iterate?.interval).toEqual({ type: "percentage", value: 10 });
    });
  });
});

// =============================================================================
// Behavior Tests
// =============================================================================

describe("Behavior Parsing - ECMA-376 compliance", () => {
  describe("p:anim (animate) element (ECMA-376 19.5.1)", () => {
    it("parses animate behavior with target", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:anim", { calcmode: "lin", valueType: "num" }, [
                  el("p:cBhvr", { additive: "base", accumulate: "always", override: "childStyle", xfrmType: "pt" }, [
                    el("p:cTn", { id: "2", dur: "1000" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ]),
                    el("p:attrNameLst", {}, [
                      el("p:attrName", {}, ["style.opacity"])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const anim = result.rootTimeNode.children[0];
        expect(anim.type).toBe("animate");
        if (anim.type === "animate") {
          expect(anim.target.type).toBe("shape");
          if (anim.target.type === "shape") {
            expect(anim.target.shapeId).toBe("3");
          }
          expect(anim.attribute).toBe("style.opacity");
          expect(anim.calcMode).toBe("linear");
          expect(anim.valueType).toBe("number");
          expect(anim.additive).toBe("base");
          expect(anim.accumulate).toBe("always");
          expect(anim.override).toBe("childStyle");
          expect(anim.transformType).toBe("pt");
        }
      }
    });

    it("parses animate behavior with from/to/by", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:anim", { from: "0", to: "1", by: "0.1" }, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const anim = result.rootTimeNode.children[0];
        if (anim.type === "animate") {
          expect(anim.from).toBe("0");
          expect(anim.to).toBe("1");
          expect(anim.by).toBe("0.1");
        }
      }
    });
  });

  describe("p:set (set) element (ECMA-376 19.5.66)", () => {
    it("parses set behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2", dur: "1" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ]),
                    el("p:attrNameLst", {}, [
                      el("p:attrName", {}, ["style.visibility"])
                    ])
                  ]),
                  el("p:to", {}, [
                    el("p:strVal", { val: "visible" })
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        expect(set.type).toBe("set");
        if (set.type === "set") {
          expect(set.attribute).toBe("style.visibility");
          expect(set.value).toBe("visible");
        }
      }
    });
  });

  describe("p:animEffect element (ECMA-376 19.5.3)", () => {
    it("parses animate effect behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animEffect", { transition: "in", filter: "fade" }, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2", dur: "500" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const effect = result.rootTimeNode.children[0];
        expect(effect.type).toBe("animateEffect");
        if (effect.type === "animateEffect") {
          expect(effect.transition).toBe("in");
          expect(effect.filter).toBe("fade");
        }
      }
    });

    it("parses animate effect progress", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animEffect", { transition: "in" }, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ]),
                  el("p:progress", {}, [
                    el("p:fltVal", { val: "0.5" })
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const effect = result.rootTimeNode.children[0];
        if (effect.type === "animateEffect") {
          expect(effect.progress).toBe(0.5);
        }
      }
    });
  });

  describe("p:animMotion element (ECMA-376 19.5.4)", () => {
    it("parses animate motion behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animMotion", { path: "M 0 0 L 1 1", origin: "layout", pathEditMode: "relative" }, [
                el("p:cBhvr", {}, [
                  el("p:cTn", { id: "2", dur: "2000" }),
                  el("p:tgtEl", {}, [
                    el("p:spTgt", { spid: "3" })
                  ])
                ]),
                el("p:rCtr", { x: "56.7%", y: "83.4%" })
              ])
            ])
          ])
        ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const motion = result.rootTimeNode.children[0];
        expect(motion.type).toBe("animateMotion");
        if (motion.type === "animateMotion") {
          expect(motion.path).toBe("M 0 0 L 1 1");
          expect(motion.origin).toBe("layout");
          expect(motion.pathEditMode).toBe("relative");
          expect(motion.rotationCenter?.x).toBeCloseTo(56.7, 1);
          expect(motion.rotationCenter?.y).toBeCloseTo(83.4, 1);
        }
      }
    });
  });
});

// =============================================================================
// Keyframe Tests
// =============================================================================

describe("Keyframe Parsing - ECMA-376 compliance", () => {
  describe("p:tavLst (time animate value list) (ECMA-376 19.5.79)", () => {
    it("parses keyframes with string values", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:anim", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ]),
                  el("p:tavLst", {}, [
                    el("p:tav", { tm: "0" }, [
                      el("p:val", {}, [
                        el("p:strVal", { val: "start" })
                      ])
                    ]),
                    el("p:tav", { tm: "100000" }, [
                      el("p:val", {}, [
                        el("p:strVal", { val: "end" })
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const anim = result.rootTimeNode.children[0];
        if (anim.type === "animate") {
          expect(anim.keyframes?.length).toBe(2);
          expect(anim.keyframes?.[0].time).toBe(0);
          expect(anim.keyframes?.[0].value).toBe("start");
          expect(anim.keyframes?.[1].time).toBe(100);
          expect(anim.keyframes?.[1].value).toBe("end");
        }
      }
    });

    it("parses keyframes with numeric values", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:anim", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ]),
                  el("p:tavLst", {}, [
                    el("p:tav", { tm: "0" }, [
                      el("p:val", {}, [
                        el("p:fltVal", { val: "0.0" })
                      ])
                    ]),
                    el("p:tav", { tm: "50000" }, [
                      el("p:val", {}, [
                        el("p:fltVal", { val: "0.5" })
                      ])
                    ]),
                    el("p:tav", { tm: "100000" }, [
                      el("p:val", {}, [
                        el("p:fltVal", { val: "1.0" })
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const anim = result.rootTimeNode.children[0];
        if (anim.type === "animate") {
          expect(anim.keyframes?.length).toBe(3);
          expect(anim.keyframes?.[0].time).toBe(0);
          expect(anim.keyframes?.[0].value).toBe(0.0);
          expect(anim.keyframes?.[1].time).toBe(50);
          expect(anim.keyframes?.[1].value).toBe(0.5);
          expect(anim.keyframes?.[2].time).toBe(100);
          expect(anim.keyframes?.[2].value).toBe(1.0);
        }
      }
    });

    it("parses keyframes with color values", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:anim", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ]),
                  el("p:tavLst", {}, [
                    el("p:tav", { tm: "0" }, [
                      el("p:val", {}, [
                        el("p:clrVal", {}, [
                          el("a:srgbClr", { val: "FF0000" })
                        ])
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const anim = result.rootTimeNode.children[0];
        if (anim.type === "animate") {
          expect(anim.keyframes?.length).toBe(1);
          expect(anim.keyframes?.[0].time).toBe(0);
          expect(anim.keyframes?.[0].value).toBe("FF0000");
        }
      }
    });

  it("parses keyframes with formula", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:anim", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ]),
                  el("p:tavLst", {}, [
                    el("p:tav", { tm: "0", fmla: "#ppt_x" }, [
                      el("p:val", {}, [
                        el("p:strVal", { val: "0" })
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const anim = result.rootTimeNode.children[0];
        if (anim.type === "animate") {
          expect(anim.keyframes?.[0].formula).toBe("#ppt_x");
        }
      }
    });
  });

  it("skips keyframes with indefinite time", () => {
    const timing = el("p:timing", {}, [
      el("p:tnLst", {}, [
        el("p:par", {}, [
          el("p:cTn", { id: "1" }, [
            el("p:childTnLst", {}, [
              el("p:anim", { calcmode: "lin", valueType: "num" }, [
                el("p:cBhvr", {}, [
                  el("p:cTn", { id: "2" }),
                  el("p:tgtEl", {}, [
                    el("p:spTgt", { spid: "5" })
                  ])
                ]),
                el("p:tavLst", {}, [
                  el("p:tav", { tm: "indefinite" }, [el("p:val", {}, [el("p:intVal", { val: "0" })])]),
                  el("p:tav", { tm: "100000" }, [el("p:val", {}, [el("p:intVal", { val: "1" })])])
                ])
              ])
            ])
          ])
        ])
      ])
    ]);
    const result = parseTiming(timing);
    if (result?.rootTimeNode?.type === "parallel") {
      const anim = result.rootTimeNode.children[0];
      if (anim.type === "animate") {
        expect(anim.keyframes?.length).toBe(1);
        expect(anim.keyframes?.[0].time).toBe(100);
      }
    }
  });
});

// =============================================================================
// Target Tests
// =============================================================================

describe("Target Parsing - ECMA-376 compliance", () => {
  describe("p:spTgt (shape target) (ECMA-376 19.5.70)", () => {
    it("parses simple shape target", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set") {
          expect(set.target.type).toBe("shape");
          if (set.target.type === "shape") {
            expect(set.target.shapeId).toBe("5");
          }
        }
      }
    });

    it("parses shape target with paragraph range", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" }, [
                        el("p:txEl", {}, [
                          el("p:pRg", { st: "0", end: "2" })
                        ])
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "shape") {
          expect(set.target.textElement?.type).toBe("paragraph");
          if (set.target.textElement?.type === "paragraph") {
            expect(set.target.textElement.start).toBe(0);
            expect(set.target.textElement.end).toBe(2);
          }
        }
      }
    });

    it("parses shape target with sub-shape id", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" }, [
                        el("p:subSp", { spid: "_x0000_s70664" })
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "shape") {
          expect(set.target.subShapeId).toBe("_x0000_s70664");
        }
      }
    });

    it("parses shape target with character range", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" }, [
                        el("p:txEl", {}, [
                          el("p:charRg", { st: "5", end: "10" })
                        ])
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "shape") {
          expect(set.target.textElement?.type).toBe("character");
          if (set.target.textElement?.type === "character") {
            expect(set.target.textElement.start).toBe(5);
            expect(set.target.textElement.end).toBe(10);
          }
        }
      }
    });

    it("parses shape target with background flag", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" }, [
                        el("p:bg")
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "shape") {
          expect(set.target.targetBackground).toBe(true);
        }
      }
    });

    it("parses shape target with graphic element", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" }, [
                        el("p:graphicEl", {}, [
                          el("a:dgm", { id: "{87C2C707-C3F4-4E81-A967-A8B8AE13E575}" })
                        ])
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "shape") {
          expect(set.target.graphicElement?.type).toBe("diagram");
          expect(set.target.graphicElement?.id).toBe("{87C2C707-C3F4-4E81-A967-A8B8AE13E575}");
        }
      }
    });

    it("parses shape target with embedded chart element", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" }, [
                        el("p:oleChartEl", { type: "gridLegend", lvl: "1" })
                      ])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "shape") {
          expect(set.target.oleChartElement?.type).toBe("gridLegend");
          expect(set.target.oleChartElement?.level).toBe(1);
        }
      }
    });
  });

  describe("p:sldTgt (slide target)", () => {
    it("parses slide target", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:sldTgt")
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set") {
          expect(set.target.type).toBe("slide");
        }
      }
    });
  });

  describe("p:sndTgt (sound target)", () => {
    it("parses sound target", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:set", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:sndTgt", { "r:embed": "rId1", name: "click.wav" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const set = result.rootTimeNode.children[0];
        if (set.type === "set" && set.target.type === "sound") {
          expect(set.target.resourceId).toBe("rId1");
          expect(set.target.name).toBe("click.wav");
        }
      }
    });
  });

  describe("p:inkTgt (ink target)", () => {
    it("parses ink target", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animEffect", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:inkTgt", { spid: "_x0000_s2057" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const effect = result.rootTimeNode.children[0];
        if (effect.type === "animateEffect" && effect.target.type === "ink") {
          expect(effect.target.shapeId).toBe("_x0000_s2057");
        }
      }
    });
  });
});

// =============================================================================
// Condition Tests
// =============================================================================

describe("Condition Parsing - ECMA-376 compliance", () => {
  describe("p:cond (condition) (ECMA-376 19.5.25)", () => {
    it("parses start condition with delay", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:stCondLst", {}, [
                el("p:cond", { delay: "500" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.startConditions?.length).toBe(1);
      expect(result?.rootTimeNode?.startConditions?.[0].delay).toBe(500);
    });

    it("parses indefinite delay", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:stCondLst", {}, [
                el("p:cond", { delay: "indefinite" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.startConditions?.[0].delay).toBe("indefinite");
    });

    it("parses condition with event", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:stCondLst", {}, [
                el("p:cond", { evt: "onClick", delay: "0" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.startConditions?.[0].event).toBe("onClick");
    });

    it("parses end condition", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:endCondLst", {}, [
                el("p:cond", { evt: "onEnd" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.endConditions?.length).toBe(1);
      expect(result?.rootTimeNode?.endConditions?.[0].event).toBe("onEnd");
    });

    it("parses endSync condition with runtime node", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:endSync", { evt: "end", delay: "0" }, [
                el("p:rtn", { val: "all" })
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.rootTimeNode?.endSync?.event).toBe("end");
      expect(result?.rootTimeNode?.endSync?.delay).toBe(0);
      expect(result?.rootTimeNode?.endSync?.runtimeNode).toBe("all");
    });
  });
});

// =============================================================================
// Build List Tests
// =============================================================================

describe("Build List Parsing - ECMA-376 compliance", () => {
  describe("p:bldP (build paragraph) (ECMA-376 19.5.12)", () => {
    it("parses build paragraph with all attributes", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" })
          ])
        ]),
        el("p:bldLst", {}, [
          el("p:bldP", { spid: "5", grpId: "0", build: "p", animBg: "1", rev: "1", advAuto: "5000" })
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.buildList?.length).toBe(1);
      const entry = result?.buildList?.[0];
      expect(entry?.shapeId).toBe("5");
      expect(entry?.groupId).toBe(0);
      expect(entry?.buildType).toBe("paragraph");
      expect(entry?.advanceAfter).toBe(5000);
      expect(entry?.animateBackground).toBe(true);
      expect(entry?.reverse).toBe(true);
    });

    it("parses build paragraph template effects", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [el("p:cTn", { id: "1" })])
        ]),
        el("p:bldLst", {}, [
          el("p:bldP", { spid: "5", build: "p" }, [
            el("p:tmplLst", {}, [
              el("p:tmpl", { lvl: "1" }, [
                el("p:tnLst", {}, [
                  el("p:par", {}, [el("p:cTn", { id: "10" })])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      const entry = result?.buildList?.[0];
      expect(entry?.templateEffects?.length).toBe(1);
      expect(entry?.templateEffects?.[0].level).toBe(1);
      expect(entry?.templateEffects?.[0].timeNodes[0].type).toBe("parallel");
    });

    it("parses different build types", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [el("p:cTn", { id: "1" })])
        ]),
        el("p:bldLst", {}, [
          el("p:bldP", { spid: "1", build: "allAtOnce" }),
          el("p:bldP", { spid: "2", build: "p" }),
          el("p:bldP", { spid: "3", build: "cust" }),
          el("p:bldP", { spid: "4", build: "whole" })
        ])
      ]);
      const result = parseTiming(timing);
      expect(result?.buildList?.[0].buildType).toBe("allAtOnce");
      expect(result?.buildList?.[1].buildType).toBe("paragraph");
      expect(result?.buildList?.[2].buildType).toBe("custom");
      expect(result?.buildList?.[3].buildType).toBe("whole");
    });

    it("parses build graphic with bldAsOne", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [el("p:cTn", { id: "1" })])
        ]),
        el("p:bldLst", {}, [
          el("p:bldGraphic", { spid: "4", grpId: "0", uiExpand: "1" }, [
            el("p:bldAsOne")
          ])
        ])
      ]);
      const result = parseTiming(timing);
      const entry = result?.buildList?.[0];
      expect(entry?.shapeId).toBe("4");
      expect(entry?.groupId).toBe(0);
      expect(entry?.uiExpand).toBe(true);
      expect(entry?.graphicBuild?.type).toBe("asOne");
    });

    it("parses build graphic with bldSub chart/diagram", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [el("p:cTn", { id: "1" })])
        ]),
        el("p:bldLst", {}, [
          el("p:bldGraphic", { spid: "7", grpId: "2" }, [
            el("p:bldSub", {}, [
              el("a:bldChart", { bld: "category", animBg: "1" }),
              el("a:bldDgm", { bld: "breadthByLvl" })
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      const entry = result?.buildList?.[0];
      expect(entry?.shapeId).toBe("7");
      expect(entry?.groupId).toBe(2);
      expect(entry?.graphicBuild?.type).toBe("sub");
      if (entry?.graphicBuild?.type === "sub") {
        expect(entry.graphicBuild.chartBuild?.build).toBe("category");
        expect(entry.graphicBuild.chartBuild?.animateBackground).toBe(true);
        expect(entry.graphicBuild.diagramBuild?.build).toBe("breadthByLvl");
      }
    });

    it("parses build embedded chart", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [el("p:cTn", { id: "1" })])
        ]),
        el("p:bldLst", {}, [
          el("p:bldOleChart", { spid: "1025", grpId: "0", bld: "series", animBg: "0" })
        ])
      ]);
      const result = parseTiming(timing);
      const entry = result?.buildList?.[0];
      expect(entry?.shapeId).toBe("1025");
      expect(entry?.groupId).toBe(0);
      expect(entry?.oleChartBuild?.build).toBe("series");
      expect(entry?.oleChartBuild?.animateBackground).toBe(false);
    });
  });
});

// =============================================================================
// Build Type Mapping Tests
// =============================================================================

describe("Build Type Mapping - ECMA-376 compliance", () => {
  it("maps chart-only build types", () => {
    expect(mapChartOnlyBuildType("category")).toBe("category");
    expect(mapChartOnlyBuildType("categoryEl")).toBe("categoryEl");
    expect(mapChartOnlyBuildType("series")).toBe("series");
    expect(mapChartOnlyBuildType("seriesEl")).toBe("seriesEl");
    expect(mapChartOnlyBuildType("p")).toBeUndefined();
  });

  it("maps chart build types (build + chart-only)", () => {
    expect(mapChartBuildType("allAtOnce")).toBe("allAtOnce");
    expect(mapChartBuildType("p")).toBe("paragraph");
    expect(mapChartBuildType("wd")).toBe("word");
    expect(mapChartBuildType("char")).toBe("character");
    expect(mapChartBuildType("series")).toBe("series");
    expect(mapChartBuildType("unknown")).toBeUndefined();
  });

  it("maps chart subelement types", () => {
    expect(mapChartSubelementType("category")).toBe("category");
    expect(mapChartSubelementType("gridLegend")).toBe("gridLegend");
    expect(mapChartSubelementType("ptInCategory")).toBe("ptInCategory");
    expect(mapChartSubelementType("ptInSeries")).toBe("ptInSeries");
    expect(mapChartSubelementType("series")).toBe("series");
    expect(mapChartSubelementType("categoryEl")).toBeUndefined();
  });

  it("maps command types", () => {
    expect(mapCommandType("call")).toBe("call");
    expect(mapCommandType("evt")).toBe("event");
    expect(mapCommandType("verb")).toBe("verb");
    expect(mapCommandType("event")).toBeUndefined();
  });

  it("maps paragraph build types", () => {
    expect(mapParaBuildType("allAtOnce")).toBe("allAtOnce");
    expect(mapParaBuildType("p")).toBe("paragraph");
    expect(mapParaBuildType("cust")).toBe("custom");
    expect(mapParaBuildType("whole")).toBe("whole");
    expect(mapParaBuildType("wd")).toBeUndefined();
  });

  it("maps diagram-only build types", () => {
    expect(mapDgmOnlyBuildType("whole")).toBe("whole");
    expect(mapDgmOnlyBuildType("depthByNode")).toBe("depthByNode");
    expect(mapDgmOnlyBuildType("cw")).toBe("cw");
    expect(mapDgmOnlyBuildType("cust")).toBe("cust");
    expect(mapDgmOnlyBuildType("lvlOne")).toBeUndefined();
  });

  it("maps diagram build types (build + diagram-only)", () => {
    expect(mapDgmBuildType("allAtOnce")).toBe("allAtOnce");
    expect(mapDgmBuildType("breadthByNode")).toBe("breadthByNode");
    expect(mapDgmBuildType("ccwOut")).toBe("ccwOut");
    expect(mapDgmBuildType("whole")).toBe("whole");
    expect(mapDgmBuildType("unknown")).toBeUndefined();
  });

  it("maps embedded chart build types", () => {
    expect(mapOleChartBuildType("allAtOnce")).toBe("allAtOnce");
    expect(mapOleChartBuildType("category")).toBe("category");
    expect(mapOleChartBuildType("seriesEl")).toBe("seriesEl");
    expect(mapOleChartBuildType("p")).toBeUndefined();
  });

  it("maps chart build steps", () => {
    expect(mapChartBuildStep("allPts")).toBe("allPts");
    expect(mapChartBuildStep("category")).toBe("category");
    expect(mapChartBuildStep("gridLegend")).toBe("gridLegend");
    expect(mapChartBuildStep("ptInCategory")).toBe("ptInCategory");
    expect(mapChartBuildStep("ptInSeries")).toBe("ptInSeries");
    expect(mapChartBuildStep("series")).toBe("series");
    expect(mapChartBuildStep("unknown")).toBeUndefined();
  });

  it("maps diagram build steps", () => {
    expect(mapDgmBuildStep("bg")).toBe("bg");
    expect(mapDgmBuildStep("sp")).toBe("sp");
    expect(mapDgmBuildStep("unknown")).toBeUndefined();
  });
});

// =============================================================================
// Build Graphic Element Tests
// =============================================================================

describe("Build Graphic Elements - ECMA-376 compliance", () => {
  it("parses a:bldChart attributes", () => {
    const bldChart = el("a:bldChart", { bld: "category", animBg: "1" });
    const result = parseBuildChartElement(bldChart);
    expect(result?.build).toBe("category");
    expect(result?.animateBackground).toBe(true);
  });

  it("parses a:bldDgm attributes", () => {
    const bldDgm = el("a:bldDgm", { bld: "whole" });
    const result = parseBuildDgmElement(bldDgm);
    expect(result?.build).toBe("whole");
  });
});

// =============================================================================
// Additional Behavior Tests
// =============================================================================

describe("Additional Behavior Parsing - ECMA-376 compliance", () => {
  describe("p:excl (exclusive) element (ECMA-376 19.5.29)", () => {
    it("parses exclusive time node", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:excl", {}, [
                  el("p:cTn", { id: "2", dur: "1000" }, [
                    el("p:childTnLst", {}, [
                      el("p:par", {}, [el("p:cTn", { id: "3" })])
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const excl = result.rootTimeNode.children[0];
        expect(excl.type).toBe("exclusive");
        if (excl.type === "exclusive") {
          expect(excl.children.length).toBe(1);
        }
      }
    });
  });

  describe("p:animRot (animate rotation) element (ECMA-376 19.5.5)", () => {
    it("parses animate rotation behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animRot", { by: "21600000" }, [ // 360 degrees
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2", dur: "1000" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const rot = result.rootTimeNode.children[0];
        expect(rot.type).toBe("animateRotation");
        if (rot.type === "animateRotation") {
          expect(rot.by).toBe(360);
        }
      }
    });

    it("parses from/to rotation values", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animRot", { from: "0", to: "5400000" }, [ // 0 to 90 degrees
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [el("p:spTgt", { spid: "3" })])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const rot = result.rootTimeNode.children[0];
        if (rot.type === "animateRotation") {
          expect(rot.from).toBe(0);
          expect(rot.to).toBe(90);
        }
      }
    });
  });

  describe("p:animScale (animate scale) element (ECMA-376 19.5.6)", () => {
    it("parses animate scale behavior with to values", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animScale", {}, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2", dur: "500" }),
                    el("p:tgtEl", {}, [el("p:spTgt", { spid: "3" })])
                  ]),
                  el("p:to", { x: "150000", y: "150000" }) // 150%
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const scale = result.rootTimeNode.children[0];
        expect(scale.type).toBe("animateScale");
        if (scale.type === "animateScale") {
          expect(scale.toX).toBe(150);
          expect(scale.toY).toBe(150);
        }
      }
    });
  });

  describe("p:animClr (animate color) element (ECMA-376 19.5.2)", () => {
    it("parses animate color behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:animClr", { clrSpc: "rgb", dir: "cw" }, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2", dur: "1000" }),
                    el("p:tgtEl", {}, [el("p:spTgt", { spid: "3" })]),
                    el("p:attrNameLst", {}, [
                      el("p:attrName", {}, ["fillcolor"])
                    ])
                  ]),
                  el("p:to", {}, [
                    el("a:srgbClr", { val: "FF0000" })
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const clr = result.rootTimeNode.children[0];
        expect(clr.type).toBe("animateColor");
        if (clr.type === "animateColor") {
          expect(clr.colorSpace).toBe("rgb");
          expect(clr.direction).toBe("cw");
          expect(clr.to).toBe("FF0000");
          expect(clr.attribute).toBe("fillcolor");
        }
      }
    });
  });

  describe("p:audio element (ECMA-376 19.5.7)", () => {
    it("parses audio behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:audio", { isNarration: "1" }, [
                  el("p:cMediaNode", {}, [
                    el("p:cTn", { id: "2", dur: "5000" }),
                    el("p:tgtEl", {}, [
                      el("p:sndTgt", { "r:embed": "rId1", name: "audio.mp3" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const audio = result.rootTimeNode.children[0];
        expect(audio.type).toBe("audio");
        if (audio.type === "audio") {
          expect(audio.isNarration).toBe(true);
          expect(audio.target.type).toBe("sound");
          if (audio.target.type === "sound") {
            expect(audio.target.resourceId).toBe("rId1");
          }
        }
      }
    });
  });

  describe("p:video element (ECMA-376 19.5.93)", () => {
    it("parses video behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:video", { fullScrn: "1" }, [
                  el("p:cMediaNode", {}, [
                    el("p:cTn", { id: "2", dur: "10000" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "5" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const video = result.rootTimeNode.children[0];
        expect(video.type).toBe("video");
        if (video.type === "video") {
          expect(video.fullscreen).toBe(true);
        }
      }
    });
  });

  describe("p:cmd (command) element (ECMA-376 19.5.17)", () => {
    it("parses command behavior", () => {
      const timing = el("p:timing", {}, [
        el("p:tnLst", {}, [
          el("p:par", {}, [
            el("p:cTn", { id: "1" }, [
              el("p:childTnLst", {}, [
                el("p:cmd", { type: "evt", cmd: "togglePause" }, [
                  el("p:cBhvr", {}, [
                    el("p:cTn", { id: "2" }),
                    el("p:tgtEl", {}, [
                      el("p:spTgt", { spid: "3" })
                    ])
                  ])
                ])
              ])
            ])
          ])
        ])
      ]);
      const result = parseTiming(timing);
      if (result?.rootTimeNode?.type === "parallel") {
        const cmd = result.rootTimeNode.children[0];
        expect(cmd.type).toBe("command");
        if (cmd.type === "command") {
          expect(cmd.commandType).toBe("event");
          expect(cmd.command).toBe("togglePause");
        }
      }
    });
  });
});
