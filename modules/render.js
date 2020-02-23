'use strict';

import { Vector3, Matrix4 } from 'math.gl';

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
    gl.clearColor(0, 0, 0, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
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

    const z = -9.9;
    vertices = new Float32Array([
      0, 0.3, z,
      -0.3, -0.3, z,
      0.3, -0.3, z,
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
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const colorLoc = gl.getAttribLocation(program, 'a_color');
    // Tell the attribute how to get data out of colorBuffer
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

  function drawTriangle (gl, program, transform, viewMatrix) {
    var primitiveType = gl.TRIANGLES;
    var offset = 0;
    var count = 3;

    // Model matrix
    const modelMatrixLocation = gl.getUniformLocation(program, 'u_model_matrix');
    gl.uniformMatrix4fv(modelMatrixLocation, false, transform);

    // View matrix
    const viewMatrixLocation = gl.getUniformLocation(program, 'u_view_matrix');
    gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);

    // Projection matrix
    const left = -1;
    const right = 1;
    const bottom = left;
    const top = right;
    // Object and world space are RHS, but clip space is LHS.
    // This ortho matrix will convert RHS to LHS.
    // Confusing, but that's how it is.
    const near = 0.1;
    const far = 10;
    var projMatrix = new Matrix4().ortho({ left, right, bottom, top, near, far });
    const projMatrixLocation = gl.getUniformLocation(program, 'u_proj_matrix');
    gl.uniformMatrix4fv(projMatrixLocation, false, projMatrix);

    gl.drawArrays(primitiveType, offset, count);
  }

  function draw (gl, program) {
    var transform;

    const eye = new Vector3([0, 0, 0]);
    const center = new Vector3([eye.x, eye.y, eye.z - 1]);
    const up = new Vector3([0, 1, 0]);

    const viewMatrix = new Matrix4().lookAt({ eye, center, up });

    // Draw left triangle
    transform = new Matrix4().translate([-0.2, 0, 0]);
    drawTriangle(gl, program, transform, viewMatrix);

    // Draw right triangle (should be behind left tri)
    transform = new Matrix4().translate([0.2, 0, -0.1]);
    drawTriangle(gl, program, transform, viewMatrix);

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
};
