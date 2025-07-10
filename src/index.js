import { initShader } from './shader.js';


function createObject(gl, format, vertices, indices) {
  const vbo = gl.createBuffer();
  const vao = gl.createVertexArray();
  const ebo = gl.createBuffer();

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  const stride = 4*format.reduce((acc, x) => acc+x, 0);
  console.log(stride);
  let offset = 0;
  format.forEach((size, idx) => {
    console.log(idx, size, stride, offset);
    gl.enableVertexAttribArray(idx);
    gl.vertexAttribPointer(idx, size, gl.FLOAT, false, 0, offset); 
    offset += 4*size;
  });

  // gl.bindVertexArray(0);

  return {vbo, vao, ebo};
}


window.onload = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const gl = canvas.getContext('webgl2');

  if (gl == null) {
    alert("Unable to initialize WebGL!");
    return;
  }


  const triangle = createObject(gl, [ 3, 2 ],
    [ -0.5, -0.5, 0.0,
       0.5, -0.5, 0.0,
       0.0,  0.5, 0.0,
    ],
    [ 0, 1, 2 ],
  ); //*/

  /*
  const vertices = [
    -0.5, -0.5, 0.0,   0, 0,
    0.5, -0.5, 0.0,    1, 0,
    0.0, 0.5, 0.0,     0.5, 1,
  ];
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  //*/


  const program = initShader(
    gl,
    `#version 300 es
    layout (location = 0) in vec4 a_pos;
    layout (location = 1) in vec4 a_uv;

    out vec4 s_uv;

    void main() {
      gl_Position = a_pos;
      s_uv = a_uv;
    }`,
    `#version 300 es
    precision mediump float;
    out vec4 fragColor;
    in vec4 s_uv;

    void main() {
      fragColor = vec4(1, 0, 0.5, 1);
    }`
  );

  document.body.append(canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.0, 0.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.bindVertexArray(triangle.vao);
  gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, 0);
  const err = gl.getError();
  console.log(err, gl.NO_ERROR);
  if (err !== gl.NO_ERROR) {
    console.log(err);
  }
  //*/

  /*
  gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_pos"));
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.vertexAttribPointer(gl.getAttribLocation(program, "a_pos"), 3, gl.FLOAT, false, 4*5, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  //*/
}
