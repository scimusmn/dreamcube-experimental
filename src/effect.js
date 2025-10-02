import { initShader, setUniforms } from './shader.js';
import { createObject } from './mesh.js';


let gaussianProgram = null;
let plane_ = null;
const plane = (gl) => {
  if (plane_ === null) {
    plane_ = createObject(gl, [2, 2],
      [ -1.0, -1.0,   0, 1,
         1.0, -1.0,   1, 1,
        -1.0,  1.0,   0, 0,
         1.0,  1.0,   1, 0,
      ], [ 0, 1, 3, 0, 3, 2 ],
    );
  }
  return plane_;
}



export const makeConvolutionProgram = (gl, kernel) => {
  const k = Math.floor(Math.sqrt(kernel.length));
  const c = Math.floor(k/2);
  const k2 = k*k;
  const vs = `#version 300 es

  layout (location = 0) in vec2 a_pos;
  layout (location = 1) in vec2 a_uv;

  uniform float width;
  uniform float height;

  out vec2 kernel_pos[${k2}];

  out vec2 s_uv;

  void main() {
    gl_Position = vec4(a_pos, 0, 1);
    s_uv = a_uv;

    vec2 dx = vec2(1.0/width, 0);
    vec2 dy = vec2(0, 1.0/height);

    for (int i=0; i<${k}; i++) {
      for (int j=0; j<${k}; j++) {
        kernel_pos[(${k}*i) + j] = a_uv + float(i-${c})*dx + float(j-${c})*dy;
      }
    }
  }
  `;
  const fs = `#version 300 es
  precision mediump float;

  in vec2 kernel_pos[${k2}];
  const float kernel[${k2}] = float[](${kernel.map(k => k.toFixed(10)).join(', ')});
  uniform sampler2D tex;
  out vec4 frag;

  void main() {
    frag = vec4(0, 0, 0, 1);
    for (int i=0; i<${k2}; i++) {
      frag += vec4(kernel[i] * texture(tex, kernel_pos[i]).r, 0, 0, 0);
    }
  }
  `;

  return initShader(gl, vs, fs, true);
};



let blurProgram = null;
export const gaussianBlur = (gl, w, h, texture, k, sigma) => {
  if (blurProgram === null) {
    const c = Math.floor(k/2);
    const kernel = [ ...Array(k).keys() ].map(
      i => [ ...Array(k).keys() ].map(j => Math.exp(-((i-c)**2 + (j-c)**2)/(2*sigma*sigma)))
    ).flat();
    const A = kernel.reduce((acc, k) => acc+k, 0);
    blurProgram = makeConvolutionProgram(gl, kernel.map(k => k/A));
  }

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(blurProgram);
  setUniforms(gl, blurProgram, {
    texture: { tex: texture },
    float: { width: w, height: h },
  });

  plane(gl).draw();
};


let sobelXProgram = null;
export const sobelX = (gl, width, height, texture) => {
  if (sobelXProgram === null) {
    const kernel = [
      -1, 0, 1,
      -2, 0, 2,
      -1, 0, 1,
    ];
    sobelXProgram = makeConvolutionProgram(gl, kernel);
  }

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(sobelXProgram);
  setUniforms(gl, sobelXProgram, {
    texture: { tex: texture },
    float: { width: w, height: h },
  });

  plane(gl).draw();
};



let sobelYProgram = null;
export const sobelY = (gl, width, height, texture) => {
  if (sobelYProgram === null) {
    const kernel = [
      -1, -2, -1,
      0, 0, 0,
      1, 2, 1,
    ];
    sobelYProgram = makeConvolutionProgram(gl, kernel);
  }

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(sobelYProgram);
  setUniforms(gl, sobelYProgram, {
    texture: { tex: texture },
    float: { width: w, height: h },
  });

  plane(gl).draw();
};
