import { initShader } from './shader.js';
import { createObject } from './mesh.js';
import { createSim } from './fluidsim.js';



window.onload = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;


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
  document.body.append(canvas);

  const W = 10;
  const H = 6;
  const sim = createSim(gl, W, H);

  const sourceData = [ ...Array(H) ].map(() => [ ...Array(W) ].map(() => [ 0, 0, 0, 0 ]));
  const set = (x, y, v) => sourceData[y][x] = [ ...v, 0, 1 ];
  set(4, 2, [ 0, 1 ]);
  set(4, 3, [ 0, 1 ]);
  set(5, 2, [ 0, 1 ]);
  set(5, 3, [ 0, 1 ]);
  const source = gl.createTexture();
  console.log(sourceData);
  gl.bindTexture(gl.TEXTURE_2D, source);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, new Float32Array(sourceData.flat().flat()));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


  const plane = createObject(gl, [2, 2],
    [ -0.75, -0.75,   0, 0,
       0.75, -0.75,   1, 0,
      -0.75,  0.75,   0, 1,
       0.75,  0.75,   1, 1,
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

    void main() {
      vec2 v = texture(tex, s_uv).xy;
      float angle = 180.0 + 180.0*atan(v.y, v.x) / 3.141592;
      float r = length(v);

      frag = vec4(hsv2rgb(vec3(angle, 1.0, r)), 1.0);
    }`
  );



  let ms = 0;
  const render = (now) => {
    const dt = (now - ms)/1000;
    // console.log(`${Math.floor(1/dt)} fps`);
    ms = now;

    sim.stripDiv(source);
    for (let i=0; i<10; i++) {
      sim.swapBuffers();
      sim.stripDiv(sim.bg().field);
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindTexture(gl.TEXTURE_2D, sim.fg().field);
    // gl.bindTexture(gl.TEXTURE_2D, source);
    plane.draw();

    /*
    sim.step(source, dt);
    // sim.advect(sim.bg().field, source, 1/60);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.fg().field);
    plane.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);

    // requestAnimationFrame(render);
    //*/
  }

  // requestAnimationFrame(render);
  render(0);

  // gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  // gl.viewport(0, 0, W, H);
  // gl.clearColor(0.0, 1.0, 0.0, 1.0);
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // gl.useProgram(program);
  // triangle.draw();

  // gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  // gl.clearColor(0.0, 0.0, 1.0, 1.0);
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // gl.useProgram(program2);
  // gl.bindTexture(gl.TEXTURE_2D, tex);
  // plane.draw();
}
