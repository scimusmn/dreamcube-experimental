import { initShader } from './shader.js';
import { createObject } from './mesh.js';


const vertexShader = `#version 300 es
layout (location = 0) in vec2 a_pos;
layout (location = 1) in vec2 a_uv;
out vec2 s_uv;
void main() {
  gl_Position = vec4(a_pos, 0, 1);
  s_uv = a_uv;
}
`;



const advectShader = `#version 300 es
precision highp float;
in vec2 s_uv;
uniform sampler2D field;
uniform sampler2D source;
uniform float dx;
uniform float dy;
uniform float dt;
out vec4 frag;

void main() {
  vec2 n;
  vec4 v_source = texture(source, s_uv);
  if (v_source.a > 0.0) {
    frag = vec4(v_source.xy, 0, 1);
    return;
  }

  vec2 v = texture(field, s_uv).xy;
  if (length(v) == 0.0) {
    n = vec2(0, 0);
  } else {
    n = normalize(v);
  }
  vec2 a = texture(field, s_uv-vec2(dx*n.x, dy*n.y)).xy;
  frag = vec4(mix(v, 0.99*a, 20.0*dt), 0, 1);
}
`;


const stripDivShader = `#version 300 es
precision highp float;
in vec2 s_uv;
uniform sampler2D field;
uniform sampler2D source;
uniform float dx;
uniform float dy;
out vec4 frag;

void main() {
  vec4 vs = texture(source, s_uv);
  if (vs.a > 0.0) {
    frag = vec4(vs.xy, 0, 1);
    return;
  }
  vec2 v0 = texture(field, s_uv+vec2( dx, -dy)).xy;
  vec2 v1 = texture(field, s_uv+vec2(  0, -dy)).xy;
  vec2 v2 = texture(field, s_uv+vec2(-dx, -dy)).xy;

  vec2 v3 = texture(field, s_uv+vec2( dx,   0)).xy;
  vec2 v4 = texture(field, s_uv+vec2(  0,   0)).xy;
  vec2 v5 = texture(field, s_uv+vec2(-dx,   0)).xy;

  vec2 v6 = texture(field, s_uv+vec2( dx,  dy)).xy;
  vec2 v7 = texture(field, s_uv+vec2(  0,  dy)).xy;
  vec2 v8 = texture(field, s_uv+vec2(-dx,  dy)).xy;

  float x = 
    v0.x-v0.y - (2.0*v1.x) + v2.x+v2.y +
    (2.0*v3.x) - (4.0*v4.x) + (2.0*v5.x) +
    v6.x+v6.y - (2.0*v7.x) + v8.x-v8.y;

  float y = 
    -v0.x+v0.y + (2.0*v1.y) + v2.x+v2.y +
    (-2.0*v3.y) - (4.0*v4.y) - (2.0*v5.y) +
    v6.x+v6.y + (2.0*v7.y) - v8.x+v8.y;

  frag = vec4(v4 + 0.125*vec2(x, y), 0, 1);
}
`;



export const createShaders = (gl) => {
  const advectProgram = initShader(gl, vertexShader, advectShader);
  const stripDivProgram = initShader(gl, vertexShader, stripDivShader);
  return { advectProgram, stripDivProgram };
};


export const createFramebuffer = (gl, w, h) => {
  const field = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, field);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, field, 0);

  const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`incomplete framebuffer: ${fbStatus.toString(16)}`);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return { field, fb };
}


export const createSim = (gl, w, h) => {
  const { advectProgram, stripDivProgram } = createShaders(gl);
  const plane = createObject(gl, [2, 2],
    [ -1, -1,   0, 0,
       1, -1,   1, 0,
      -1,  1,   0, 1,
       1,  1,   1, 1,
    ], [ 0, 1, 3, 0, 3, 2 ],
  );


  const fbA = createFramebuffer(gl, w, h);
  const fbB = createFramebuffer(gl, w, h);

  let fgA = true;
  const swapBuffers = () => {
    if (fgA) {
      fgA = false;
    } else {
      fgA = true;
    }
  }

  const fg = () => fgA ? fbA : fbB;
  const bg = () => fgA ? fbB : fbA;

  const advect = (field, source, dt) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fg().fb);

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    gl.useProgram(advectProgram);
    gl.uniform1i(gl.getUniformLocation(advectProgram, 'field'), 0);
    gl.uniform1i(gl.getUniformLocation(advectProgram, 'source'), 1);
    gl.uniform1f(gl.getUniformLocation(advectProgram, 'dx'), 1/w);
    gl.uniform1f(gl.getUniformLocation(advectProgram, 'dy'), 1/h);
    gl.uniform1f(gl.getUniformLocation(advectProgram, 'dt'), dt);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, source);

    plane.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }


  const stripDiv = (field, source) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fg().fb);

    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    gl.useProgram(stripDivProgram);
    gl.uniform1i(gl.getUniformLocation(stripDivProgram, 'field'), 0);
    gl.uniform1i(gl.getUniformLocation(stripDivProgram, 'source'), 1);
    gl.uniform1f(gl.getUniformLocation(stripDivProgram, 'dx'), 1/w);
    gl.uniform1f(gl.getUniformLocation(stripDivProgram, 'dy'), 1/h);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, source);

    plane.draw();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  const step = (source, dt) => {
    swapBuffers();
    advect(bg().field, source, dt);
    for (let i=0; i<20; i++) {
      swapBuffers();
      stripDiv(bg().field, source);
    }
  }

  return { fg, bg, swapBuffers, advect, stripDiv, step };
}
