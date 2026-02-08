/**
 * @file Flat (solid color) shader
 */

export const flatVertexShader = `
  attribute vec2 a_position;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;

  void main() {
    vec3 transformed = u_transform * vec3(a_position, 1.0);
    // Convert from pixel space to clip space (-1 to 1)
    vec2 clipSpace = (transformed.xy / u_resolution) * 2.0 - 1.0;
    // Flip Y (screen space Y is down, clip space Y is up)
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  }
`;

export const flatFragmentShader = `
  precision mediump float;
  uniform vec4 u_color;

  void main() {
    gl_FragColor = u_color;
  }
`;
