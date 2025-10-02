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


export function initShader(gl, vsSource, fsSource, debug=false) {
  if (debug) {
    console.log(vsSource);
    console.log(fsSource);
  }
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


export function setUniforms(gl, program, conf) {
  const setUniform = (key, fn) => {
    const obj = conf[key] ?? {};
    for (let k of Object.keys(obj)) {
      fn(gl.getUniformLocation(program, k), obj[k]);
    }
  }

  setUniform("int", (loc, v) => gl.uniform1i(loc, v));
  let texIdx = 0;
  setUniform("texture", (loc, v) => {
    gl.activeTexture(gl.TEXTURE0 + texIdx);
    gl.bindTexture(gl.TEXTURE_2D, v);
    gl.uniform1i(loc, texIdx);
    texIdx += 1;
  });
  setUniform("float", (l, v) => gl.uniform1f(l, v));
}


export function unbindTextures(gl) {
  for (let i=0; i<15; i++) {
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}
