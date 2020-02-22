'use strict';

window.onload = function () {
  var gl,
    shaderProgram;

  gl = initGL();
  shaderProgram = createShaders(gl);
  createVertexData(gl, shaderProgram);
  draw(gl, shaderProgram);

  function initGL () {
    var canvas,
      gl;

    canvas = document.getElementById('c');
    gl = canvas.getContext('webgl');
    if (!gl) {
      window.alert("Couldn't get WebGL context");
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1, 1, 1, 1);
    return gl;
  }

  function createShaders (gl) {
    var vertexShader,
      fragmentShader,
      shaderProgram;

    vertexShader = getShader(gl, gl.VERTEX_SHADER, 'vertShader');
    fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, 'fragShader');
    shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    return shaderProgram;
  }

  function createVertexData (gl, program) {
    var vertices,
      colors,
      vertexBuffer,
      colorBuffer;
    var size = 2; // 2 components per iteration
    var type = gl.FLOAT; // the data is 32 bit floats
    var normalize = false; // don't normalize the data
    var stride = 0; // 0 =  move forward size * sizeof(type) each iteration to get the next element
    var offset = 0; // start at the beginning of the buffer

    vertices = new Float32Array([
      0, 0.3,
      -0.3, -0.3,
      0.3, -0.3,
    ]);

    colors = new Float32Array([
      1, 0, 0, 1,
      0, 1, 0, 1,
      0, 0, 1, 1,
    ]);

    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    // Tell the attribute how to get data out of positionBuffer
    gl.vertexAttribPointer(positionLoc, size, type, normalize, stride, offset);
    gl.enableVertexAttribArray(positionLoc);

    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const colorLoc = gl.getAttribLocation(program, 'a_color');
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  function getShader (gl, type, shaderId) {
    var shader,
      source;

    shader = gl.createShader(type);
    source = document.getElementById(shaderId).text;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  function draw (gl, program) {
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 3;

    gl.drawArrays(primitiveType, offset, count);

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
}
;
