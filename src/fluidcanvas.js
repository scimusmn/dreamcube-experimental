import { initShader } from './shader.js';
import { createObject } from './mesh.js';
import { createSim } from './fluidsim.js';


export const createFluidCanvas = (width, height) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext('webgl2');

  if (gl == null) {
    alert("Unable to initialize WebGL!");
    return;
  }

  const importExtension = (name) => {
    if (!gl.getExtension(name)) {
      throw new Error(`failed to load extension ${name}`);
    }
  };

  importExtension("EXT_color_buffer_float");
  // importExtension("OES_texture_float");
  importExtension("OES_texture_float_linear");

  const W = 512;
  const H = W * canvas.height/canvas.width;
  const sim = createSim(gl, W, H);

  const sourceData = [ ...Array(H) ].map(() => [ ...Array(W) ].map(() => [ 0, 0, 0, 0 ]));
  const set = (x, y, v) => sourceData[y][x] = [ ...v, 0, 1 ];
  for (let x=0; x<W; x++) {
    set(x,   0, [ 0,  0.1 ]);
    set(x, H-1, [ 0, -0.1 ]);
  }
  for (let y=0; y<H; y++) {
    set(0,   y, [  0.1, 0 ]); 
    set(W-1, y, [ -0.1, 0 ]); 
  }

  const addStream = (x, y, dx, dy, v) => {
    for (let X=x; X<x+dx; X++) {
      for (let Y=y; Y<y+dy; Y++) {
        set(X, Y, v);
      }
    }
  }

  const cx = Math.floor(W/2);
  const cy = Math.floor(H/2);
  const v = 2;
  const g = 100;
  addStream(1,   cy+g, 2, 2, [  v, -v ]);
  addStream(W-3, cy-g, 2, 2, [ -v,  v ]);
  addStream(cx-g,   1, 2, 2, [  v,  v ]);
  addStream(cx+g, H-3, 2, 2, [ -v, -v ]);


  const source = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, source);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, new Float32Array(sourceData.flat().flat()));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


  const plane = createObject(gl, [2, 2],
    [ -1.0, -1.0,   0, 1,
       1.0, -1.0,   1, 1,
      -1.0,  1.0,   0, 0,
       1.0,  1.0,   1, 0,
    ], [ 0, 1, 3, 0, 3, 2 ],
  );

  const program = initShader(gl,
    `#version 300 es
    layout (location = 0) in vec2 a_pos;
    layout (location = 1) in vec2 a_uv;
    out vec2 s_uv;
    void main() {
      gl_Position = vec4(a_pos, 0, 1);
      s_uv = a_uv;
    }`,
    `#version 300 es
    precision highp float;
    in vec2 s_uv;
    uniform sampler2D tex;
    out vec4 frag;

    vec3 hsv2rgb(vec3 hsv) {
      float c = hsv.y*hsv.z;

      float m = hsv.z - c;
      vec3 M = vec3(m, m, m);
      float h = hsv.x/60.0;
      float x = c * float(1 - abs((int(h) % 2) - 1));
      
      if (h < 1.0) {
        return M + vec3(c, x, 0);
      } else if (h < 2.0) {
        return M + vec3(x, c, 0);
      } else if (h < 3.0) {
        return M + vec3(0, c, x);
      } else if (h < 4.0) {
        return M + vec3(0, x, c);
      } else if (h < 5.0) {
        return M + vec3(x, 0, c);
      } else {
        return M + vec3(c, 0, x);
      }
    }

    const vec3 c = vec3(0.05, 0.1, 0.15);

    void main() {
      vec2 v = texture(tex, s_uv).xy;
      float angle = 180.0 + 180.0*atan(v.y, v.x) / 3.141592;
      float r = length(v);

      // frag = vec4(hsv2rgb(vec3(angle, 1.0, r)), 1.0);
      frag = vec4(c.r, c.g+clamp(r-1.0, 0.0, 1.0), c.b+r, 1);
    }`
  );


  const texelData = new Float32Array(W*H*4);
  const readSimVelocity = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.bg().fb);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, texelData);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return texelData;
  };

  const readSimPoint = (x, y) => {
    const idx = (Math.floor(H*y)*W + Math.floor(W*x))*4;
    if (idx < 0 || idx > H*W*4) {
      return [ 0, 0 ];
    } else {
      return [ texelData[idx], texelData[idx+1] ];
    }
  }


  let ms = null;
  const render = (now) => {
    const dt = ms ? (now - ms)/1000 : 1/60;
    ms = now;
   
    sim.step(source, dt);
    readSimVelocity();

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.fg().texture);
    plane.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  return [ canvas, render, readSimPoint ]
}
