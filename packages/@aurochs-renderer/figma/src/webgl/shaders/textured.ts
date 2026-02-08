/**
 * @file Textured (image) shader
 */

export const texturedVertexShader = `
  attribute vec2 a_position;
  uniform mat3 u_transform;
  uniform vec2 u_resolution;
  varying vec2 v_texCoord;

  void main() {
    vec3 transformed = u_transform * vec3(a_position, 1.0);
    vec2 clipSpace = (transformed.xy / u_resolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
    // UV coordinates from position (normalized to 0..1)
    v_texCoord = a_position;
  }
`;

export const texturedFragmentShader = `
  precision mediump float;

  uniform sampler2D u_texture;
  uniform float u_opacity;
  uniform vec2 u_texScale;
  uniform vec2 u_texOffset;

  varying vec2 v_texCoord;

  void main() {
    vec2 uv = v_texCoord * u_texScale + u_texOffset;
    vec4 texColor = texture2D(u_texture, uv);
    gl_FragColor = texColor * u_opacity;
  }
`;
