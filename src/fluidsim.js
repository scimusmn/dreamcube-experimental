import { initShader } from './shader.js';


const vertexShader = `
#version 300 es
layout (location = 0) in vec2 a_pos;
layout (location = 1) in vec2 a_uv;
out vec2 s_uv;
void main() {
  gl_Position = vec4(a_pos, 0, 1);
  s_uv = a_uv;
}
`;



const advectShader = `
#version 300 es
precision highp float
in vec2 s_uv;
uniform sampler2D field;
uniform sampler2D source;
out vec4 frag;

void main() {
  vec2 n;
  vec2 v_source = texture(source, s_uv).xy;
  if (length(v_source) > 0) {
    frag = vec4(v_source, 0, 1);
    return;
  }

  vec2 v = texture(field, s_uv).xy;
  if (length(v) == 0) {
    n = vec2(0, 0);
  } else {
    n = normalize(v);
  }
  vec2 a = texture(field, s_uv-n);
  frag = vec4(mix(v, a, 0.8), 0, 1);
}
`;


const stripDivShader = `
#version 300 es
precision highp float
in vec2 s_uv;
uniform sampler2D field;
out vec4 frag;

void main() {
  vec2 v0 = texture(field, s_uv+vec2(-1, -1));
  vec2 v1 = texture(field, s_uv+vec2(0, -1));
  vec2 v2 = texture(field, s_uv+vec2(1, -1));

  vec2 v3 = texture(field, s_uv+vec2(-1, 0));
  vec2 v4 = texture(field, s_uv+vec2(0, 0));
  vec2 v5 = texture(field, s_uv+vec2(1, 0));

  vec2 v6 = texture(field, s_uv+vec2(-1, 1));
  vec2 v7 = texture(field, s_uv+vec2(0, 1));
  vec2 v8 = texture(field, s_uv+vec2(1, 1));

  float x = 
    v0.x-v0.y - (2*v1.x) + v2.x+v2.y +
    (2*v3.x) - (4*v4.x) + (2*v5.x) +
    v6.x+v6.y + (2*v7.x) + v8.x-v8.y;

  float y = 
    -v0.x+v0.y + (2*v1.y) + v2.x+v2.y +
    (-2*v3.y) - (4*v4.y) - (2*v5.y) +
    v6.x+v6.y + (2*v7.y) - v8.x+v8.y;

  frag = vec4(mix(v0, vec2(x, y), 0.125), 0, 1);
}
`;



export createShaders = (gl) => {
  const advectProgram = initShader(gl, vertexShader, advectShader);
  const stripDivProgram = initShader(gl, vertexShader, stripDivShader);
};


export createFramebuffer(gl, w, h) {
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

  return { field, fb };
}


export createSim(gl, w, h) => {
  const [ advectProgram, stripDivProgram ] = createShaders(gl);
  const plane = createObject(gl, [2, 2],
    [ -1, -1,   0, 0,
       1, -1,   1, 0,
      -1,  1,   0, 1,
       1,  1,   1, 1,
    ], [ 0, 1, 3, 0, 3, 2 ],
  );


  const fbA = createFramebuffer(gl, w, h);
  const fbB = createFramebuffer(gl, w, h);

  let fg = fbA;
  let bg = fbB;
  const swapBuffer = () => {
    if (fg === fbA) {
      fg = fbB;
      bg = fbA;
    } else {
      fg = fbA;
      bg = fbB;
    }
  }

  const step = (source) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fg.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(1,1,1,1);
    gl.clear(COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT);
    gl.useProgram(advectProgram);
    gl.uniform1i(gl.getUniformLocation(advectProgram, "field"), bg.field);
    gl.uniform1i(gl.getUniformLocation(advectProgram, "source"), source);
    plane.draw();
    swapBuffer();

    gl.useProgram(stripDivProgram);
    for (let i=0; i<10; i++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER(fg.fb);
      gl.uniform1i(gl.getUniformLocation(advectProgram, "field"), bg.field);
      gl.clear(COLOR_BUFFER_BIT | DEPTH_BUFFER_BIT);
      plane.draw();
      swapBuffer();
    }

    return fg.field;
  }

  return { fg, bg, step };
}
