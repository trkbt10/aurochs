/**
 * @file Linear gradient shader
 */

export const linearGradientVertexShader = `
  attribute vec2 a_position;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;
  varying vec2 v_position;

  void main() {
    vec3 transformed = u_transform * vec3(a_position, 1.0);
    v_position = transformed.xy;
    vec2 clipSpace = (transformed.xy / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  }
`;

/**
 * Fragment shader supports up to 8 gradient stops.
 * Interpolates between stops based on projection onto gradient axis.
 */
export const linearGradientFragmentShader = `
  precision mediump float;

  uniform vec2 u_gradientStart;
  uniform vec2 u_gradientEnd;
  uniform vec4 u_stops[8];      // (position, r, g, b) - reusing vec4
  uniform vec4 u_stopAlphas[8]; // (a, 0, 0, 0) - alpha channel
  uniform int u_stopCount;
  uniform float u_opacity;
  uniform vec2 u_elementSize;

  varying vec2 v_position;

  void main() {
    // Normalize position to element-local coordinates (0..1)
    vec2 localPos = v_position / u_elementSize;

    // Project onto gradient axis
    vec2 gradDir = u_gradientEnd - u_gradientStart;
    float gradLen = length(gradDir);
    if (gradLen < 0.001) {
      gl_FragColor = vec4(u_stops[0].yzw, u_stopAlphas[0].x) * u_opacity;
      return;
    }

    vec2 gradNorm = gradDir / gradLen;
    float t = dot(localPos - u_gradientStart, gradNorm) / gradLen;
    t = clamp(t, 0.0, 1.0);

    // Find surrounding stops and interpolate
    vec3 color = u_stops[0].yzw;
    float alpha = u_stopAlphas[0].x;

    for (int i = 1; i < 8; i++) {
      if (i >= u_stopCount) break;
      float prevPos = u_stops[i - 1].x;
      float currPos = u_stops[i].x;
      if (t >= prevPos && t <= currPos) {
        float frac = (t - prevPos) / max(currPos - prevPos, 0.001);
        color = mix(u_stops[i - 1].yzw, u_stops[i].yzw, frac);
        alpha = mix(u_stopAlphas[i - 1].x, u_stopAlphas[i].x, frac);
        break;
      }
      if (t > currPos) {
        color = u_stops[i].yzw;
        alpha = u_stopAlphas[i].x;
      }
    }

    gl_FragColor = vec4(color, alpha) * u_opacity;
  }
`;
