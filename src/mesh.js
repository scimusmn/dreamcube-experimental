export function createObject(gl, format, vertices, indices) {
  const vbo = gl.createBuffer();
  const vao = gl.createVertexArray();
  const ebo = gl.createBuffer();

  gl.bindVertexArray(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  const stride = 4*format.reduce((acc, x) => acc+x, 0);
  let offset = 0;
  format.forEach((size, idx) => {
    gl.enableVertexAttribArray(idx);
    gl.vertexAttribPointer(idx, size, gl.FLOAT, false, stride, offset); 
    offset += 4*size;
  });

  gl.bindVertexArray(null);

  return {vbo, vao, ebo, draw: () => {
    gl.bindVertexArray(vao);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    const err = gl.getError();
    if (err !== gl.NO_ERROR) {
      throw new Error(`drawing failed: ${err}`);
    }
    gl.bindVertexArray(null);
  }};
}
