/**
 * @file Radial gradient shader
 */

export const radialGradientVertexShader = `
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

export const radialGradientFragmentShader = `
  precision mediump float;

  uniform vec2 u_center;
  uniform float u_radius;
  uniform vec4 u_stops[8];
  uniform vec4 u_stopAlphas[8];
  uniform int u_stopCount;
  uniform float u_opacity;
  uniform vec2 u_elementSize;

  varying vec2 v_position;

  void main() {
    vec2 localPos = v_position / u_elementSize;
    float dist = length(localPos - u_center);
    float t = clamp(dist / max(u_radius, 0.001), 0.0, 1.0);

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
