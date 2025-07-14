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

  const W = 512;
  const H = 512;
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

  const fbStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (fbStatus !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`incomplete framebuffer: ${fbStatus.toString(16)}`);
  }


  const triangle = createObject(gl, [ 2, 3 ],
    [
      -0.5, -0.5,     2.0, 0.0, 0.0,
       0.5, -0.5,     0.0, 1.0, 0.0,
       0.0,  0.5,     0.0, 0.0, 1.0,
    ],
    [ 0, 1, 2 ],
  ); //*/


  const plane = createObject(gl, [ 2, 2 ],
    [
      -1, -1,    0, 0,
       1, -1,    1, 0,
      -1,  1,    0, 1,
       1,  1,    1, 1,
    ],
    [ 0, 1, 3, 0, 3, 2 ],
  );

  const program = initShader(
    gl,
    `#version 300 es
    layout (location = 0) in vec2 a_pos;
    layout (location = 1) in vec3 a_color;

    out vec3 s_color;

    void main() {
      gl_Position = vec4(a_pos, 0, 1);
      s_color = a_color;
    }`,
    `#version 300 es
    precision highp float;
    out vec4 fragColor;
    in vec3 s_color;

    void main() {
      fragColor = vec4(s_color.rgb, 1);
    }`
  );


  const program2 = initShader(gl,
    `#version 300 es
    layout (location = 0) in vec2 a_pos;
    layout (location = 1) in vec2 a_uv;

    out vec2 s_uv;

    void main() {
      gl_Position = vec4(a_pos, -0.1, 1);
      s_uv = a_uv;
    }
    `,
    `#version 300 es
    precision highp float;
    out vec4 fragColor;
    uniform sampler2D tex;
    in vec2 s_uv;

    void main() {
      fragColor = texture(tex, s_uv);
    }
    `,
  );

  document.body.append(canvas);


  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0.0, 1.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);
  triangle.draw();

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program2);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  plane.draw();
}
