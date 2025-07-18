import { initShader } from './shader.js';
import { createObject } from './mesh.js';
import { createSim } from './fluidsim.js';



window.onload = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;

  const canvas2 = document.createElement('canvas');
  canvas2.width = 512;
  canvas2.height = 512;


  const gl = canvas.getContext('webgl2');
  const ctx = canvas2.getContext('2d');

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
  document.body.append(canvas2);


  const W = 256;
  const H = 256;
  const sim = createSim(gl, W, H);

  const sourceData = [ ...Array(H) ].map(() => [ ...Array(W) ].map(() => [ 0, 0, 0, 0 ]));
  const set = (x, y, v) => sourceData[y][x] = [ ...v, 0, 1 ];
  for (let x=0; x<W; x++) {
    set(x,   0, [ 0, 0 ]);
    set(x, H-1, [ 0, 0 ]);
  }
  for (let y=0; y<H; y++) {
    set(0,   y, [ 0, 0 ]); 
    set(W-1, y, [ 0, 0 ]); 
  }

  const cy = Math.floor(H/2);
  set(1, cy, [ 8, 0 ]);
  set(1, cy+1, [ 8, 0 ]);
  set(2, cy, [ 8, 0 ]);
  set(2, cy+1, [ 8, 0 ]);

  set(H-1, cy+10, [ -8, 0 ]);
  set(H-1, cy+11, [ -8, 0 ]);
  set(H-2, cy+10, [ -8, 0 ]);
  set(H-2, cy+11, [ -8, 0 ]);



  const source = gl.createTexture();
  console.log(sourceData);
  gl.bindTexture(gl.TEXTURE_2D, source);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, new Float32Array(sourceData.flat().flat()));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


  const plane = createObject(gl, [2, 2],
    [ -1.0, -1.0,   0, 0,
       1.0, -1.0,   1, 0,
      -1.0,  1.0,   0, 1,
       1.0,  1.0,   1, 1,
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

      // frag = vec4(hsv2rgb(vec3(angle, 1.0, r)), 1.0);
      frag = vec4(0, r-1.0, r, 1);
    }`
  );



  let ms = null;
  const render = (now) => {
    const dt = ms ? (now - ms)/1000 : 1/60;
    // console.log(`${Math.floor(1/dt)} fps`);
    ms = now;

    /*
    sim.stripDiv(sim.bg().field, source);
    for (let i=0; i<100; i++) {
      sim.swapBuffers();
      sim.stripDiv(sim.bg().field, source);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fg().fb);
    const pixels = new Float32Array(W*H*4);
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.FLOAT, pixels);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const vectors = [ ...Array(W*H).keys() ].reduce(
      (acc, idx) => [ ...acc, [ pixels[4*idx], pixels[4*idx + 1] ] ],
      [],
    );


    ctx.lineWidth = 0.06;
    const scale = 64;
    ctx.setTransform(ctx.canvas.width/W, 0, 0, ctx.canvas.height/H, 0.5*ctx.canvas.width/W, 0.5*ctx.canvas.height/H);

    const drawVector = (x, y, vx, vy) => {
      if (vx == 0 && vy == 0) {
        return;
      }
      const [ tx, ty ] = [ x+vx, y+vy ];
      const angle = Math.atan2(vy, vx);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x+vx, y+vy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tx - 0.25*Math.cos(angle+1), ty - 0.25*Math.sin(angle+1));
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx - 0.25*Math.cos(angle-1), ty - 0.25*Math.sin(angle-1));
      ctx.stroke();
    }

    const drawField = (field) => field.forEach((v, idx) => {
      const x = idx % W;
      const y = Math.floor(idx / W);
      drawVector(x, y, v[0], v[1], 0.1);
      console.log(x, y, v);
    });

    // drawField(vectors);

    // gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    // gl.clearColor(0, 0, 1, 1);
    // gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

    // gl.useProgram(program);
    // gl.bindTexture(gl.TEXTURE_2D, sim.fg().field);
    // // gl.bindTexture(gl.TEXTURE_2D, source);
    // plane.draw();
    //*/

    
    sim.step(source, dt);
    // sim.advect(sim.bg().field, source, 1/60);

    console.log(Math.floor(1/dt));

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.useProgram(program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.fg().field);
    plane.draw();
    gl.bindTexture(gl.TEXTURE_2D, null);

    //*/
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);

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
