/** @file Animation serializer tests */
import { getChild, getChildren, getTextContent } from "@aurochs/xml";
import type {
  Timing,
  ParallelTimeNode,
  SequenceTimeNode,
  ExclusiveTimeNode,
  AnimateBehavior,
  SetBehavior,
  AnimateEffectBehavior,
  AnimateMotionBehavior,
  AnimateColorBehavior,
  AnimateScaleBehavior,
  AnimateRotationBehavior,
  AudioBehavior,
  VideoBehavior,
  CommandBehavior,
  Condition,
  AnimationTarget,
  ShapeTarget,
  BuildEntry,
} from "@aurochs-office/pptx/domain/animation";
import { serializeTimeNode, serializeTiming } from "./animation";

// =============================================================================
// Helpers
// =============================================================================

function shapeTarget(shapeId = "1"): AnimationTarget {
  return { type: "shape", shapeId } as never;
}

function minParallel(overrides: Partial<ParallelTimeNode> = {}): ParallelTimeNode {
  return { type: "parallel", id: 1, children: [], ...overrides } as never;
}

function minSequence(overrides: Partial<SequenceTimeNode> = {}): SequenceTimeNode {
  return { type: "sequence", id: 1, children: [], ...overrides } as never;
}

function minExclusive(overrides: Partial<ExclusiveTimeNode> = {}): ExclusiveTimeNode {
  return { type: "exclusive", id: 1, children: [], ...overrides } as never;
}

function minAnimate(overrides: Partial<AnimateBehavior> = {}): AnimateBehavior {
  return { type: "animate", id: 1, target: shapeTarget(), attribute: "ppt_x", ...overrides } as never;
}

function minSet(overrides: Partial<SetBehavior> = {}): SetBehavior {
  return { type: "set", id: 1, target: shapeTarget(), attribute: "style.visibility", value: "visible", ...overrides } as never;
}

function minAnimateEffect(overrides: Partial<AnimateEffectBehavior> = {}): AnimateEffectBehavior {
  return { type: "animateEffect", id: 1, target: shapeTarget(), transition: "in", filter: "fade", ...overrides } as never;
}

function minAnimateMotion(overrides: Partial<AnimateMotionBehavior> = {}): AnimateMotionBehavior {
  return { type: "animateMotion", id: 1, target: shapeTarget(), ...overrides } as never;
}

function minAnimateColor(overrides: Partial<AnimateColorBehavior> = {}): AnimateColorBehavior {
  return { type: "animateColor", id: 1, target: shapeTarget(), attribute: "fillcolor", ...overrides } as never;
}

function minAnimateScale(overrides: Partial<AnimateScaleBehavior> = {}): AnimateScaleBehavior {
  return { type: "animateScale", id: 1, target: shapeTarget(), ...overrides } as never;
}

function minAnimateRotation(overrides: Partial<AnimateRotationBehavior> = {}): AnimateRotationBehavior {
  return { type: "animateRotation", id: 1, target: shapeTarget(), ...overrides } as never;
}

function minAudio(overrides: Partial<AudioBehavior> = {}): AudioBehavior {
  return { type: "audio", id: 1, target: shapeTarget(), ...overrides } as never;
}

function minVideo(overrides: Partial<VideoBehavior> = {}): VideoBehavior {
  return { type: "video", id: 1, target: shapeTarget(), ...overrides } as never;
}

function minCommand(overrides: Partial<CommandBehavior> = {}): CommandBehavior {
  return { type: "command", id: 1, target: shapeTarget(), commandType: "call", command: "togglePause", ...overrides } as never;
}

// =============================================================================
// serializeTiming
// =============================================================================

describe("serializeTiming", () => {
  it("returns null when no rootTimeNode and no buildList", () => {
    const result = serializeTiming({});
    expect(result).toBeNull();
  });

  it("returns p:timing with no children when buildList is empty array", () => {
    // buildList is truthy (non-null array) so it passes the first guard,
    // but the length check prevents p:bldLst from being added
    const result = serializeTiming({ buildList: [] });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("p:timing");
    expect(result!.children).toHaveLength(0);
  });

  it("returns p:timing with p:tnLst when rootTimeNode provided", () => {
    const timing: Timing = {
      rootTimeNode: minParallel(),
    };
    const result = serializeTiming(timing);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("p:timing");

    const tnLst = getChild(result!, "p:tnLst");
    expect(tnLst).toBeDefined();

    const par = getChild(tnLst!, "p:par");
    expect(par).toBeDefined();
  });

  it("returns p:timing with p:bldLst when buildList provided", () => {
    const timing: Timing = {
      buildList: [{ shapeId: "42" } as never],
    };
    const result = serializeTiming(timing);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("p:timing");

    const bldLst = getChild(result!, "p:bldLst");
    expect(bldLst).toBeDefined();

    const bldP = getChild(bldLst!, "p:bldP");
    expect(bldP).toBeDefined();
    expect(bldP!.attrs.spid).toBe("42");
  });

  it("returns p:timing with both p:tnLst and p:bldLst", () => {
    const timing: Timing = {
      rootTimeNode: minParallel(),
      buildList: [{ shapeId: "10" } as never],
    };
    const result = serializeTiming(timing);

    expect(result).not.toBeNull();
    expect(getChild(result!, "p:tnLst")).toBeDefined();
    expect(getChild(result!, "p:bldLst")).toBeDefined();
  });
});

// =============================================================================
// serializeTimeNode - all type variants
// =============================================================================

describe("serializeTimeNode", () => {
  describe("parallel node", () => {
    it("serializes to p:par with p:cTn", () => {
      const node = minParallel({ id: 5 });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:par");
      const cTn = getChild(el, "p:cTn");
      expect(cTn).toBeDefined();
      expect(cTn!.attrs.id).toBe("5");
    });
  });

  describe("sequence node", () => {
    it("serializes to p:seq with attrs (concurrent, nextAction, prevAction)", () => {
      const node = minSequence({
        id: 2,
        concurrent: true,
        nextAction: "seek",
        prevAction: "skip",
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:seq");
      expect(el.attrs.concurrent).toBe("1");
      expect(el.attrs.nextAc).toBe("seek");
      expect(el.attrs.prevAc).toBe("skip");
    });

    it("serializes concurrent=false to '0'", () => {
      const node = minSequence({ concurrent: false });
      const el = serializeTimeNode(node);
      expect(el.attrs.concurrent).toBe("0");
    });

    it("serializes prevCondLst and nextCondLst", () => {
      const node = minSequence({
        prevConditions: [{ delay: 0 }],
        nextConditions: [{ delay: 100 }],
      });
      const el = serializeTimeNode(node);

      const prevCondLst = getChild(el, "p:prevCondLst");
      expect(prevCondLst).toBeDefined();

      const nextCondLst = getChild(el, "p:nextCondLst");
      expect(nextCondLst).toBeDefined();
    });

    it("omits prevCondLst and nextCondLst when empty", () => {
      const node = minSequence();
      const el = serializeTimeNode(node);

      expect(getChild(el, "p:prevCondLst")).toBeUndefined();
      expect(getChild(el, "p:nextCondLst")).toBeUndefined();
    });
  });

  describe("exclusive node", () => {
    it("serializes to p:excl with p:cTn", () => {
      const node = minExclusive({ id: 3 });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:excl");
      const cTn = getChild(el, "p:cTn");
      expect(cTn).toBeDefined();
      expect(cTn!.attrs.id).toBe("3");
    });
  });

  describe("animate behavior", () => {
    it("serializes to p:anim with calcMode and valueType", () => {
      const node = minAnimate({
        calcMode: "linear",
        valueType: "number",
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:anim");
      expect(el.attrs.calcmode).toBe("linear");
      expect(el.attrs.valueType).toBe("number");

      const cBhvr = getChild(el, "p:cBhvr");
      expect(cBhvr).toBeDefined();
    });

    it("serializes keyframes in p:tavLst", () => {
      const node = minAnimate({
        keyframes: [
          { time: 0, value: "0" },
          { time: 100000, value: "1" },
        ],
      });
      const el = serializeTimeNode(node);

      const tavLst = getChild(el, "p:tavLst");
      expect(tavLst).toBeDefined();

      const tavs = getChildren(tavLst!, "p:tav");
      expect(tavs).toHaveLength(2);
      expect(tavs[0].attrs.tm).toBe("0");
      expect(tavs[1].attrs.tm).toBe("100000");
    });

    it("omits p:tavLst when no keyframes", () => {
      const node = minAnimate();
      const el = serializeTimeNode(node);
      expect(getChild(el, "p:tavLst")).toBeUndefined();
    });

    it("omits calcmode and valueType when not provided", () => {
      const node = minAnimate();
      const el = serializeTimeNode(node);
      expect(el.attrs.calcmode).toBeUndefined();
      expect(el.attrs.valueType).toBeUndefined();
    });
  });

  describe("set behavior", () => {
    it("serializes to p:set with p:to/p:strVal", () => {
      const node = minSet({ value: "visible" });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:set");

      const to = getChild(el, "p:to");
      expect(to).toBeDefined();

      const strVal = getChild(to!, "p:strVal");
      expect(strVal).toBeDefined();
      expect(strVal!.attrs.val).toBe("visible");
    });
  });

  describe("animateEffect behavior", () => {
    it("serializes to p:animEffect with transition and filter", () => {
      const node = minAnimateEffect({
        transition: "out",
        filter: "wipe(left)",
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:animEffect");
      expect(el.attrs.transition).toBe("out");
      expect(el.attrs.filter).toBe("wipe(left)");
    });
  });

  describe("animateMotion behavior", () => {
    it("serializes to p:animMotion with origin, path", () => {
      const node = minAnimateMotion({
        origin: "layout",
        path: "M 0 0 L 1 1 E",
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:animMotion");
      expect(el.attrs.origin).toBe("layout");
      expect(el.attrs.path).toBe("M 0 0 L 1 1 E");
    });

    it("serializes pathEditMode", () => {
      const node = minAnimateMotion({ pathEditMode: "relative" });
      const el = serializeTimeNode(node);
      expect(el.attrs.pathEditMode).toBe("relative");
    });

    it("serializes from, to, by, rotationCenter", () => {
      const node = minAnimateMotion({
        from: { x: 10, y: 20 },
        to: { x: 30, y: 40 },
        by: { x: 5, y: 6 },
        rotationCenter: { x: 50, y: 60 },
      });
      const el = serializeTimeNode(node);

      const from = getChild(el, "p:from");
      expect(from).toBeDefined();
      expect(from!.attrs.x).toBe("10");
      expect(from!.attrs.y).toBe("20");

      const to = getChild(el, "p:to");
      expect(to).toBeDefined();
      expect(to!.attrs.x).toBe("30");
      expect(to!.attrs.y).toBe("40");

      const by = getChild(el, "p:by");
      expect(by).toBeDefined();
      expect(by!.attrs.x).toBe("5");
      expect(by!.attrs.y).toBe("6");

      const rCtr = getChild(el, "p:rCtr");
      expect(rCtr).toBeDefined();
      expect(rCtr!.attrs.x).toBe("50");
      expect(rCtr!.attrs.y).toBe("60");
    });

    it("omits optional elements when not provided", () => {
      const node = minAnimateMotion();
      const el = serializeTimeNode(node);

      expect(el.attrs.origin).toBeUndefined();
      expect(el.attrs.path).toBeUndefined();
      expect(el.attrs.pathEditMode).toBeUndefined();
      expect(getChild(el, "p:from")).toBeUndefined();
      expect(getChild(el, "p:to")).toBeUndefined();
      expect(getChild(el, "p:by")).toBeUndefined();
      expect(getChild(el, "p:rCtr")).toBeUndefined();
    });
  });

  describe("animateColor behavior", () => {
    it("serializes to p:animClr with colorSpace and direction", () => {
      const node = minAnimateColor({
        colorSpace: "hsl",
        direction: "cw",
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:animClr");
      expect(el.attrs.clrSpc).toBe("hsl");
      expect(el.attrs.dir).toBe("cw");
    });

    it("serializes from, to, by as a:srgbClr", () => {
      const node = minAnimateColor({
        from: "FF0000",
        to: "00FF00",
        by: "0000FF",
      });
      const el = serializeTimeNode(node);

      const from = getChild(el, "p:from");
      expect(from).toBeDefined();
      const fromClr = getChild(from!, "a:srgbClr");
      expect(fromClr).toBeDefined();
      expect(fromClr!.attrs.val).toBe("FF0000");

      const to = getChild(el, "p:to");
      expect(to).toBeDefined();
      const toClr = getChild(to!, "a:srgbClr");
      expect(toClr!.attrs.val).toBe("00FF00");

      const by = getChild(el, "p:by");
      expect(by).toBeDefined();
      const byClr = getChild(by!, "a:srgbClr");
      expect(byClr!.attrs.val).toBe("0000FF");
    });

    it("omits optional attrs and color elements when not provided", () => {
      const node = minAnimateColor();
      const el = serializeTimeNode(node);

      expect(el.attrs.clrSpc).toBeUndefined();
      expect(el.attrs.dir).toBeUndefined();
      expect(getChild(el, "p:from")).toBeUndefined();
      expect(getChild(el, "p:to")).toBeUndefined();
      expect(getChild(el, "p:by")).toBeUndefined();
    });
  });

  describe("animateScale behavior", () => {
    it("serializes to p:animScale with from/to/by multiplied by 1000", () => {
      const node = minAnimateScale({
        fromX: 1.5,
        fromY: 2.0,
        toX: 3.0,
        toY: 4.0,
        byX: 0.5,
        byY: 0.25,
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:animScale");

      const from = getChild(el, "p:from");
      expect(from).toBeDefined();
      expect(from!.attrs.x).toBe("1500");
      expect(from!.attrs.y).toBe("2000");

      const to = getChild(el, "p:to");
      expect(to).toBeDefined();
      expect(to!.attrs.x).toBe("3000");
      expect(to!.attrs.y).toBe("4000");

      const by = getChild(el, "p:by");
      expect(by).toBeDefined();
      expect(by!.attrs.x).toBe("500");
      expect(by!.attrs.y).toBe("250");
    });

    it("omits from/to/by when not provided", () => {
      const node = minAnimateScale();
      const el = serializeTimeNode(node);

      expect(getChild(el, "p:from")).toBeUndefined();
      expect(getChild(el, "p:to")).toBeUndefined();
      expect(getChild(el, "p:by")).toBeUndefined();
    });

    it("requires both X and Y to serialize from", () => {
      // Only fromX set, fromY undefined => should not serialize p:from
      const node = minAnimateScale({ fromX: 1.0 });
      const el = serializeTimeNode(node);
      expect(getChild(el, "p:from")).toBeUndefined();
    });
  });

  describe("animateRotation behavior", () => {
    it("serializes to p:animRot with from/to/by multiplied by 60000", () => {
      const node = minAnimateRotation({
        from: 90,
        to: 180,
        by: 45,
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:animRot");
      expect(el.attrs.from).toBe(String(90 * 60000));
      expect(el.attrs.to).toBe(String(180 * 60000));
      expect(el.attrs.by).toBe(String(45 * 60000));
    });

    it("omits from/to/by when not provided", () => {
      const node = minAnimateRotation();
      const el = serializeTimeNode(node);

      expect(el.attrs.from).toBeUndefined();
      expect(el.attrs.to).toBeUndefined();
      expect(el.attrs.by).toBeUndefined();
    });
  });

  describe("audio node", () => {
    it("serializes to p:audio with cTn and target", () => {
      const node = minAudio({ id: 7 });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:audio");
      const cTn = getChild(el, "p:cTn");
      expect(cTn).toBeDefined();
      expect(cTn!.attrs.id).toBe("7");

      const tgtEl = getChild(el, "p:tgtEl");
      expect(tgtEl).toBeDefined();
    });
  });

  describe("video node", () => {
    it("serializes to p:video with fullScrn='1' when fullscreen=true", () => {
      const node = minVideo({ fullscreen: true });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:video");
      expect(el.attrs.fullScrn).toBe("1");
    });

    it("serializes fullScrn='0' when fullscreen=false", () => {
      const node = minVideo({ fullscreen: false });
      const el = serializeTimeNode(node);
      expect(el.attrs.fullScrn).toBe("0");
    });

    it("serializes fullScrn='0' when fullscreen=undefined", () => {
      const node = minVideo();
      const el = serializeTimeNode(node);
      expect(el.attrs.fullScrn).toBe("0");
    });
  });

  describe("command node", () => {
    it("serializes to p:cmd with type and cmd", () => {
      const node = minCommand({
        commandType: "event",
        command: "onstopaudio",
      });
      const el = serializeTimeNode(node);

      expect(el.name).toBe("p:cmd");
      expect(el.attrs.type).toBe("event");
      expect(el.attrs.cmd).toBe("onstopaudio");
    });
  });
});

// =============================================================================
// Common TimeNode properties
// =============================================================================

describe("common time node properties", () => {
  it("serializes duration as number", () => {
    const node = minParallel({ duration: 500 });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.dur).toBe("500");
  });

  it("serializes duration as 'indefinite'", () => {
    const node = minParallel({ duration: "indefinite" });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.dur).toBe("indefinite");
  });

  it("omits duration when not provided", () => {
    const node = minParallel();
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.dur).toBeUndefined();
  });

  it("serializes fill attribute", () => {
    const node = minParallel({ fill: "hold" });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.fill).toBe("hold");
  });

  it("serializes restart attribute", () => {
    const node = minParallel({ restart: "always" });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.restart).toBe("always");
  });

  it("serializes nodeType attribute", () => {
    const node = minParallel({ nodeType: "tmRoot" });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.nodeType).toBe("tmRoot");
  });

  it("serializes preset info with presetID and presetClass", () => {
    const node = minParallel({
      preset: { id: 10, class: "entrance" },
    });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.presetID).toBe("10");
    expect(cTn!.attrs.presetClass).toBe("entrance");
    expect(cTn!.attrs.presetSubtype).toBeUndefined();
  });

  it("serializes preset info with presetSubtype", () => {
    const node = minParallel({
      preset: { id: 2, class: "entrance", subtype: 4 },
    });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.presetSubtype).toBe("4");
  });

  it("serializes acceleration multiplied by 1000", () => {
    const node = minParallel({ acceleration: 50 });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.accel).toBe("50000");
  });

  it("serializes deceleration multiplied by 1000", () => {
    const node = minParallel({ deceleration: 25 });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.decel).toBe("25000");
  });

  it("serializes autoReverse true as '1'", () => {
    const node = minParallel({ autoReverse: true });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.autoRev).toBe("1");
  });

  it("serializes autoReverse false as '0'", () => {
    const node = minParallel({ autoReverse: false });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.autoRev).toBe("0");
  });

  it("serializes repeatCount as number", () => {
    const node = minParallel({ repeatCount: 3 });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.repeatCount).toBe("3");
  });

  it("serializes repeatCount as 'indefinite'", () => {
    const node = minParallel({ repeatCount: "indefinite" });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.repeatCount).toBe("indefinite");
  });

  it("serializes speed multiplied by 1000", () => {
    const node = minParallel({ speed: 2 });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(cTn!.attrs.spd).toBe("2000");
  });

  it("serializes startConditions as p:stCondLst", () => {
    const node = minParallel({
      startConditions: [{ delay: 0 }, { delay: 500 }],
    });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    const stCondLst = getChild(cTn!, "p:stCondLst");
    expect(stCondLst).toBeDefined();
    const conds = getChildren(stCondLst!, "p:cond");
    expect(conds).toHaveLength(2);
  });

  it("serializes endConditions as p:endCondLst", () => {
    const node = minParallel({
      endConditions: [{ delay: 1000 }],
    });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    const endCondLst = getChild(cTn!, "p:endCondLst");
    expect(endCondLst).toBeDefined();
    const conds = getChildren(endCondLst!, "p:cond");
    expect(conds).toHaveLength(1);
  });

  it("omits condition lists when empty", () => {
    const node = minParallel({ startConditions: [], endConditions: [] });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(getChild(cTn!, "p:stCondLst")).toBeUndefined();
    expect(getChild(cTn!, "p:endCondLst")).toBeUndefined();
  });

  it("serializes children as p:childTnLst", () => {
    const child1 = minParallel({ id: 10 });
    const child2 = minParallel({ id: 11 });
    const node = minParallel({ id: 1, children: [child1, child2] });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    const childTnLst = getChild(cTn!, "p:childTnLst");
    expect(childTnLst).toBeDefined();
    const pars = getChildren(childTnLst!, "p:par");
    expect(pars).toHaveLength(2);
  });

  it("omits p:childTnLst when children is empty", () => {
    const node = minParallel({ children: [] });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    expect(getChild(cTn!, "p:childTnLst")).toBeUndefined();
  });
});

// =============================================================================
// Conditions
// =============================================================================

describe("condition serialization", () => {
  function serializeConditionVia(cond: Condition) {
    const node = minParallel({ startConditions: [cond] });
    const el = serializeTimeNode(node);
    const cTn = getChild(el, "p:cTn");
    const stCondLst = getChild(cTn!, "p:stCondLst");
    return getChild(stCondLst!, "p:cond")!;
  }

  it("serializes delay as number", () => {
    const condEl = serializeConditionVia({ delay: 250 });
    expect(condEl.attrs.delay).toBe("250");
  });

  it("serializes delay as 'indefinite'", () => {
    const condEl = serializeConditionVia({ delay: "indefinite" });
    expect(condEl.attrs.delay).toBe("indefinite");
  });

  it("serializes event as evt attr", () => {
    const condEl = serializeConditionVia({ event: "onClick" });
    expect(condEl.attrs.evt).toBe("onClick");
  });

  it("serializes condition with target", () => {
    const condEl = serializeConditionVia({
      target: { type: "shape", shapeId: "5" } as never,
    });
    const tgtEl = getChild(condEl, "p:tgtEl");
    expect(tgtEl).toBeDefined();
    const spTgt = getChild(tgtEl!, "p:spTgt");
    expect(spTgt).toBeDefined();
    expect(spTgt!.attrs.spid).toBe("5");
  });

  it("serializes timeNodeRef as p:tn", () => {
    const condEl = serializeConditionVia({ timeNodeRef: 42 });
    const tn = getChild(condEl, "p:tn");
    expect(tn).toBeDefined();
    expect(tn!.attrs.val).toBe("42");
  });

  it("serializes runtimeNode as p:rtn", () => {
    const condEl = serializeConditionVia({ runtimeNode: "first" });
    const rtn = getChild(condEl, "p:rtn");
    expect(rtn).toBeDefined();
    expect(rtn!.attrs.val).toBe("first");
  });

  it("serializes condition with multiple fields", () => {
    const condEl = serializeConditionVia({
      delay: 0,
      event: "onBegin",
      timeNodeRef: 10,
      runtimeNode: "all",
    });
    expect(condEl.attrs.delay).toBe("0");
    expect(condEl.attrs.evt).toBe("onBegin");
    expect(getChild(condEl, "p:tn")).toBeDefined();
    expect(getChild(condEl, "p:rtn")).toBeDefined();
  });
});

// =============================================================================
// Targets
// =============================================================================

describe("target serialization", () => {
  function serializeTargetVia(target: AnimationTarget) {
    const node = minAnimate({ target });
    const el = serializeTimeNode(node);
    const cBhvr = getChild(el, "p:cBhvr");
    return getChild(cBhvr!, "p:tgtEl")!;
  }

  it("serializes shape target with paragraph text element", () => {
    const target: ShapeTarget = {
      type: "shape",
      shapeId: "3" as never,
      textElement: { type: "paragraph", start: 0, end: 5 },
    };
    const tgtEl = serializeTargetVia(target);
    const spTgt = getChild(tgtEl, "p:spTgt");
    expect(spTgt).toBeDefined();
    expect(spTgt!.attrs.spid).toBe("3");

    const txEl = getChild(spTgt!, "p:txEl");
    expect(txEl).toBeDefined();
    const pRg = getChild(txEl!, "p:pRg");
    expect(pRg).toBeDefined();
    expect(pRg!.attrs.st).toBe("0");
    expect(pRg!.attrs.end).toBe("5");
  });

  it("serializes shape target with character text element", () => {
    const target: ShapeTarget = {
      type: "shape",
      shapeId: "4" as never,
      textElement: { type: "character", start: 2, end: 8 },
    };
    const tgtEl = serializeTargetVia(target);
    const spTgt = getChild(tgtEl, "p:spTgt");
    const txEl = getChild(spTgt!, "p:txEl");
    const charRg = getChild(txEl!, "p:charRg");
    expect(charRg).toBeDefined();
    expect(charRg!.attrs.st).toBe("2");
    expect(charRg!.attrs.end).toBe("8");
  });

  it("serializes shape target with targetBackground", () => {
    const target: ShapeTarget = {
      type: "shape",
      shapeId: "6" as never,
      targetBackground: true,
    };
    const tgtEl = serializeTargetVia(target);
    const spTgt = getChild(tgtEl, "p:spTgt");
    const bg = getChild(spTgt!, "p:bg");
    expect(bg).toBeDefined();
  });

  it("does not serialize p:bg when targetBackground is false", () => {
    const target: ShapeTarget = {
      type: "shape",
      shapeId: "6" as never,
      targetBackground: false,
    };
    const tgtEl = serializeTargetVia(target);
    const spTgt = getChild(tgtEl, "p:spTgt");
    expect(getChild(spTgt!, "p:bg")).toBeUndefined();
  });

  it("serializes slide target", () => {
    const tgtEl = serializeTargetVia({ type: "slide" });
    const sldTgt = getChild(tgtEl, "p:sldTgt");
    expect(sldTgt).toBeDefined();
  });

  it("serializes sound target with r:embed and name", () => {
    const tgtEl = serializeTargetVia({
      type: "sound",
      resourceId: "rId5",
      name: "click.wav",
    });
    const sndTgt = getChild(tgtEl, "p:sndTgt");
    expect(sndTgt).toBeDefined();
    expect(sndTgt!.attrs["r:embed"]).toBe("rId5");
    expect(sndTgt!.attrs.name).toBe("click.wav");
  });

  it("serializes sound target with empty name when not provided", () => {
    const tgtEl = serializeTargetVia({
      type: "sound",
      resourceId: "rId6",
    });
    const sndTgt = getChild(tgtEl, "p:sndTgt");
    expect(sndTgt!.attrs.name).toBe("");
  });

  it("serializes ink target with spid", () => {
    const tgtEl = serializeTargetVia({
      type: "ink",
      shapeId: "99" as never,
    });
    const inkTgt = getChild(tgtEl, "p:inkTgt");
    expect(inkTgt).toBeDefined();
    expect(inkTgt!.attrs.spid).toBe("99");
  });
});

// =============================================================================
// Common behavior
// =============================================================================

describe("common behavior serialization", () => {
  it("serializes attribute as attrName attr and p:attrNameLst", () => {
    const node = minAnimate({ attribute: "ppt_x" });
    const el = serializeTimeNode(node);
    const cBhvr = getChild(el, "p:cBhvr");

    expect(cBhvr!.attrs.attrName).toBe("ppt_x");

    const attrNameLst = getChild(cBhvr!, "p:attrNameLst");
    expect(attrNameLst).toBeDefined();
    const attrName = getChild(attrNameLst!, "p:attrName");
    expect(attrName).toBeDefined();
    expect(getTextContent(attrName!)).toBe("ppt_x");
  });

  it("serializes additive attr", () => {
    const node = minAnimate({ additive: "sum" });
    const el = serializeTimeNode(node);
    const cBhvr = getChild(el, "p:cBhvr");
    expect(cBhvr!.attrs.additive).toBe("sum");
  });

  it("serializes accumulate attr", () => {
    const node = minAnimate({ accumulate: "always" });
    const el = serializeTimeNode(node);
    const cBhvr = getChild(el, "p:cBhvr");
    expect(cBhvr!.attrs.accumulate).toBe("always");
  });

  it("serializes transformType as xfrmType attr", () => {
    const node = minAnimate({ transformType: "pt" });
    const el = serializeTimeNode(node);
    const cBhvr = getChild(el, "p:cBhvr");
    expect(cBhvr!.attrs.xfrmType).toBe("pt");
  });

  it("omits optional behavior attrs when not provided", () => {
    const node = minAnimateMotion(); // no attribute, additive, accumulate, transformType
    const el = serializeTimeNode(node);
    const cBhvr = getChild(el, "p:cBhvr");
    expect(cBhvr!.attrs.attrName).toBeUndefined();
    expect(cBhvr!.attrs.additive).toBeUndefined();
    expect(cBhvr!.attrs.accumulate).toBeUndefined();
    expect(cBhvr!.attrs.xfrmType).toBeUndefined();
    expect(getChild(cBhvr!, "p:attrNameLst")).toBeUndefined();
  });
});

// =============================================================================
// BuildEntry
// =============================================================================

describe("build entry serialization", () => {
  it("serializes basic build entry with shapeId", () => {
    const timing: Timing = {
      buildList: [{ shapeId: "20" } as never],
    };
    const result = serializeTiming(timing)!;
    const bldLst = getChild(result, "p:bldLst");
    const bldP = getChild(bldLst!, "p:bldP");
    expect(bldP).toBeDefined();
    expect(bldP!.attrs.spid).toBe("20");
  });

  it("serializes build entry with all optional fields", () => {
    const entry: BuildEntry = {
      shapeId: "30" as never,
      groupId: 5,
      buildType: "paragraph",
      animateBackground: true,
      reverse: true,
      advanceAfter: 2000,
      uiExpand: false,
    };
    const timing: Timing = { buildList: [entry] };
    const result = serializeTiming(timing)!;
    const bldLst = getChild(result, "p:bldLst");
    const bldP = getChild(bldLst!, "p:bldP");

    expect(bldP!.attrs.spid).toBe("30");
    expect(bldP!.attrs.grpId).toBe("5");
    expect(bldP!.attrs.build).toBe("paragraph");
    expect(bldP!.attrs.animBg).toBe("1");
    expect(bldP!.attrs.rev).toBe("1");
    expect(bldP!.attrs.advAuto).toBe("2000");
    expect(bldP!.attrs.uiExpand).toBe("0");
  });

  it("serializes advanceAfter as 'indefinite'", () => {
    const entry: BuildEntry = {
      shapeId: "31" as never,
      advanceAfter: "indefinite",
    };
    const timing: Timing = { buildList: [entry] };
    const result = serializeTiming(timing)!;
    const bldLst = getChild(result, "p:bldLst");
    const bldP = getChild(bldLst!, "p:bldP");
    expect(bldP!.attrs.advAuto).toBe("indefinite");
  });

  it("serializes multiple build entries", () => {
    const timing: Timing = {
      buildList: [
        { shapeId: "1" } as never,
        { shapeId: "2" } as never,
        { shapeId: "3" } as never,
      ],
    };
    const result = serializeTiming(timing)!;
    const bldLst = getChild(result, "p:bldLst");
    const entries = getChildren(bldLst!, "p:bldP");
    expect(entries).toHaveLength(3);
    expect(entries[0].attrs.spid).toBe("1");
    expect(entries[1].attrs.spid).toBe("2");
    expect(entries[2].attrs.spid).toBe("3");
  });
});

// =============================================================================
// Keyframe
// =============================================================================

describe("keyframe serialization", () => {
  function getKeyframes(node: AnimateBehavior) {
    const el = serializeTimeNode(node);
    const tavLst = getChild(el, "p:tavLst");
    return getChildren(tavLst!, "p:tav");
  }

  it("serializes keyframe with time as number", () => {
    const node = minAnimate({
      keyframes: [{ time: 50000, value: "0.5" }],
    });
    const tavs = getKeyframes(node);
    expect(tavs[0].attrs.tm).toBe("50000");

    const val = getChild(tavs[0], "p:val");
    const strVal = getChild(val!, "p:strVal");
    expect(strVal!.attrs.val).toBe("0.5");
  });

  it("serializes keyframe with time as 'indefinite'", () => {
    const node = minAnimate({
      keyframes: [{ time: "indefinite", value: "1" }],
    });
    const tavs = getKeyframes(node);
    expect(tavs[0].attrs.tm).toBe("indefinite");
  });

  it("serializes keyframe with formula", () => {
    const node = minAnimate({
      keyframes: [{ time: 0, value: "0", formula: "#ppt_x*2" }],
    });
    const tavs = getKeyframes(node);
    expect(tavs[0].attrs.fmla).toBe("#ppt_x*2");
  });

  it("omits fmla when formula is not provided", () => {
    const node = minAnimate({
      keyframes: [{ time: 0, value: "0" }],
    });
    const tavs = getKeyframes(node);
    expect(tavs[0].attrs.fmla).toBeUndefined();
  });

  it("serializes numeric value via String()", () => {
    const node = minAnimate({
      keyframes: [{ time: 0, value: 42 }],
    });
    const tavs = getKeyframes(node);
    const val = getChild(tavs[0], "p:val");
    const strVal = getChild(val!, "p:strVal");
    expect(strVal!.attrs.val).toBe("42");
  });

  it("serializes boolean value via String()", () => {
    const node = minAnimate({
      keyframes: [{ time: 0, value: true }],
    });
    const tavs = getKeyframes(node);
    const val = getChild(tavs[0], "p:val");
    const strVal = getChild(val!, "p:strVal");
    expect(strVal!.attrs.val).toBe("true");
  });
});

// =============================================================================
// Edge cases: condition target within audio/video/command
// =============================================================================

describe("audio/video/command target integration", () => {
  it("audio node includes p:tgtEl with p:spTgt", () => {
    const node = minAudio({ target: { type: "shape", shapeId: "77" } as never });
    const el = serializeTimeNode(node);
    const tgtEl = getChild(el, "p:tgtEl");
    expect(tgtEl).toBeDefined();
    const spTgt = getChild(tgtEl!, "p:spTgt");
    expect(spTgt!.attrs.spid).toBe("77");
  });

  it("command node includes p:tgtEl with p:sldTgt for slide target", () => {
    const node = minCommand({ target: { type: "slide" } });
    const el = serializeTimeNode(node);
    const tgtEl = getChild(el, "p:tgtEl");
    expect(tgtEl).toBeDefined();
    expect(getChild(tgtEl!, "p:sldTgt")).toBeDefined();
  });
});
