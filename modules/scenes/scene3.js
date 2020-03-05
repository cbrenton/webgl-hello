'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {createCanvas} from 'util/scene-helpers.js';

const sceneId = '3';
const description = `
<b>Scene 3:</b>
An unlit rotating cube.
`;

const vertShaderSource = `
attribute vec4 a_position;
attribute vec4 a_color;

uniform mat4 u_model_matrix;
uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;

varying vec4 varying_color;

void main() {
  // MVP matrix must be constructed in reverse
  gl_Position = u_proj_matrix * u_view_matrix * u_model_matrix * a_position;
  varying_color = a_color;
}
`;

const fragShaderSource = `
// fragment shaders don't have a default precision so we need to
// pick one. mediump is a good default. it means "medium precision"
precision mediump float;

varying vec4 varying_color;

void main() {
  // gl_FragColor is a special var that a frag shader is responsible
  // for setting
  gl_FragColor = varying_color;
}
`;

const startTime = performance.now();

export default function render() {
  const canvas = createCanvas(sceneId, description);
  const gl = initGL(canvas);
  const shaderProgram = createShaders(gl);
  createVertexData(gl, shaderProgram);
  draw(gl, shaderProgram, performance.now());
}

function initGL(canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    window.alert('Couldn\'t get WebGL context');
  }
  return gl;
}

function createShaders(gl) {
  var vertexShader, fragmentShader, shaderProgram;

  vertexShader = getShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
  shaderProgram = gl.createProgram();

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function createVertexData(gl, program) {
  var vertexBuffer, colorBuffer, indexBuffer;

  // Vertices will not be reused since we don't want interpolated colors
  const vertices = new Float32Array([
    // Front face
    -1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,

    // Back face
    -1.0,
    -1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,

    // Top face
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    -1.0,

    // Bottom face
    -1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    1.0,

    // Right face
    1.0,
    -1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    1.0,
    1.0,
    -1.0,
    1.0,

    // Left face
    -1.0,
    -1.0,
    -1.0,
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
    -1.0,
    1.0,
    -1.0,
  ]);

  const faceColors = [
    [1.0, 1.0, 1.0, 1.0],  // Front face: white
    [1.0, 0.0, 0.0, 1.0],  // Back face: red
    [0.0, 1.0, 0.0, 1.0],  // Top face: green
    [0.0, 0.0, 1.0, 1.0],  // Bottom face: blue
    [1.0, 1.0, 0.0, 1.0],  // Right face: yellow
    [1.0, 0.0, 1.0, 1.0],  // Left face: purple
  ];

  // Make per-vertex colors for each face
  var colorsArr = [];
  for (var j = 0; j < faceColors.length; ++j) {
    const c = faceColors[j];
    colorsArr = colorsArr.concat(c, c, c, c);
  }
  const colors = new Float32Array(colorsArr);

  const indices = new Uint16Array([
    0,  1,  2,  0,  2,  3,   // front
    4,  5,  6,  4,  6,  7,   // back
    8,  9,  10, 8,  10, 11,  // top
    12, 13, 14, 12, 14, 15,  // bottom
    16, 17, 18, 16, 18, 19,  // right
    20, 21, 22, 20, 22, 23,  // left
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

  // Set up index buffer
  indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}

function getShader(gl, type, shaderSource) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function drawCube(gl, program, transform, viewMatrix) {
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6 * 6;

  // Model matrix
  const modelMatrixLocation = gl.getUniformLocation(program, 'u_model_matrix');
  gl.uniformMatrix4fv(modelMatrixLocation, false, transform);

  // View matrix
  const viewMatrixLocation = gl.getUniformLocation(program, 'u_view_matrix');
  gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);

  // Projection matrix
  const fov = 45 * Math.PI / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var projMatrix = new Matrix4().perspective({fov, aspect, near: 0.1, far: 10});
  const projMatrixLocation = gl.getUniformLocation(program, 'u_proj_matrix');
  gl.uniformMatrix4fv(projMatrixLocation, false, projMatrix);

  gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset);
}

function draw(gl, program, timestamp) {
  var transform;
  const rotationPeriodMs = 8000;
  const elapsedMs = timestamp - startTime;
  const percentRotation = elapsedMs / rotationPeriodMs;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const eye = new Vector3([0, 0, 0]);
  const center = new Vector3([eye.x, eye.y, eye.z - 1]);
  const up = new Vector3([0, 1, 0]);

  const viewMatrix = new Matrix4().lookAt({eye, center, up});

  // Draw cube
  const radians = percentRotation * 2 * Math.PI;
  transform = new Matrix4();
  transform.translate([0, 0, -4]);
  transform.rotateY(radians);
  drawCube(gl, program, transform, viewMatrix);

  // gl.deleteProgram(program);
  requestAnimationFrame(function(timestamp) {
    draw(gl, program, timestamp);
  });
}
