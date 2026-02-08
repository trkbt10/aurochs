/**
 * @file Shader compilation and caching
 */

import { flatVertexShader, flatFragmentShader } from "./flat";
import { linearGradientVertexShader, linearGradientFragmentShader } from "./linear-gradient";
import { radialGradientVertexShader, radialGradientFragmentShader } from "./radial-gradient";
import { texturedVertexShader, texturedFragmentShader } from "./textured";

export type ShaderProgramName = "flat" | "linearGradient" | "radialGradient" | "textured";

type ShaderSources = {
  readonly vertex: string;
  readonly fragment: string;
};

const SHADER_SOURCES: Record<ShaderProgramName, ShaderSources> = {
  flat: { vertex: flatVertexShader, fragment: flatFragmentShader },
  linearGradient: { vertex: linearGradientVertexShader, fragment: linearGradientFragmentShader },
  radialGradient: { vertex: radialGradientVertexShader, fragment: radialGradientFragmentShader },
  textured: { vertex: texturedVertexShader, fragment: texturedFragmentShader },
};

/**
 * Compile a shader from source
 */
function compileShader(
  gl: WebGLRenderingContext,
  source: string,
  type: number
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error("Failed to create shader");
  }

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${info}`);
  }

  return shader;
}

/**
 * Create a shader program from vertex and fragment sources
 */
function createProgram(
  gl: WebGLRenderingContext,
  vertexSource: string,
  fragmentSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to create program");
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking failed: ${info}`);
  }

  // Clean up shaders (they're part of the program now)
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  return program;
}

/**
 * Shader program cache
 *
 * Lazily compiles and caches shader programs.
 */
export class ShaderCache {
  private gl: WebGLRenderingContext;
  private programs: Map<ShaderProgramName, WebGLProgram> = new Map();

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
  }

  /**
   * Get (or compile) a shader program by name
   */
  get(name: ShaderProgramName): WebGLProgram {
    let program = this.programs.get(name);
    if (!program) {
      const sources = SHADER_SOURCES[name];
      program = createProgram(this.gl, sources.vertex, sources.fragment);
      this.programs.set(name, program);
    }
    return program;
  }

  /**
   * Dispose all cached programs
   */
  dispose(): void {
    for (const program of this.programs.values()) {
      this.gl.deleteProgram(program);
    }
    this.programs.clear();
  }
}
