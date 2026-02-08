/**
 * @file WebGL framebuffer object (FBO) management
 *
 * Used for off-screen rendering (effects, blur, shadow compositing).
 */

/**
 * A managed WebGL framebuffer with attached color texture
 */
export type Framebuffer = {
  readonly fbo: WebGLFramebuffer;
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;
};

/**
 * Create a framebuffer with an attached RGBA color texture
 *
 * @param gl - WebGL context
 * @param width - Framebuffer width in pixels
 * @param height - Framebuffer height in pixels
 * @returns Framebuffer object
 */
export function createFramebuffer(
  gl: WebGLRenderingContext,
  width: number,
  height: number
): Framebuffer {
  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error("Failed to create framebuffer");

  const texture = gl.createTexture();
  if (!texture) {
    gl.deleteFramebuffer(fbo);
    throw new Error("Failed to create framebuffer texture");
  }

  // Setup texture
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Attach texture to framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  // Verify completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    throw new Error(`Framebuffer incomplete: ${status}`);
  }

  // Restore default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { fbo, texture, width, height };
}

/**
 * Create a framebuffer with an attached RGBA color texture and stencil renderbuffer.
 * Needed for off-screen rendering that uses stencil operations (e.g., layer blur with clipping).
 */
export function createFramebufferWithStencil(
  gl: WebGLRenderingContext,
  width: number,
  height: number
): Framebuffer {
  const fbo = gl.createFramebuffer();
  if (!fbo) throw new Error("Failed to create framebuffer");

  const texture = gl.createTexture();
  if (!texture) {
    gl.deleteFramebuffer(fbo);
    throw new Error("Failed to create framebuffer texture");
  }

  // Setup color texture
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  // Setup stencil renderbuffer
  const stencilRB = gl.createRenderbuffer();
  if (!stencilRB) {
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    throw new Error("Failed to create stencil renderbuffer");
  }
  gl.bindRenderbuffer(gl.RENDERBUFFER, stencilRB);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.STENCIL_INDEX8, width, height);

  // Attach to framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.STENCIL_ATTACHMENT, gl.RENDERBUFFER, stencilRB);

  // Verify completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteFramebuffer(fbo);
    gl.deleteTexture(texture);
    gl.deleteRenderbuffer(stencilRB);
    throw new Error(`Framebuffer with stencil incomplete: ${status}`);
  }

  // Restore default framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);

  return { fbo, texture, width, height };
}

/**
 * Delete a framebuffer and its texture
 */
export function deleteFramebuffer(
  gl: WebGLRenderingContext,
  fb: Framebuffer
): void {
  gl.deleteFramebuffer(fb.fbo);
  gl.deleteTexture(fb.texture);
}

/**
 * Bind a framebuffer for rendering
 */
export function bindFramebuffer(
  gl: WebGLRenderingContext,
  fb: Framebuffer | null
): void {
  if (fb) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb.fbo);
    gl.viewport(0, 0, fb.width, fb.height);
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}
