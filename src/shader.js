function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const err = `failed to compile ${type == gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader: ${gl.getShaderInfoLog(shader)}`;
    gl.deleteShader(shader);
    throw new Error(err);
  }
  return shader;
}


export function initShader(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`failed to link shader: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}
