'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {createCanvas} from '../util/sceneHelpers.js';

const sceneId = '2';
const description = `
<b>Scene 2:</b>
Two simple triangles with a perspective projection matrix.
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

export default function render() {
  const canvas = createCanvas(sceneId, description);
  const gl = initGL(canvas);
  const shaderProgram = createShaders(gl);
  createVertexData(gl, shaderProgram);
  draw(gl, shaderProgram);
}

function initGL(canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    window.alert('Couldn\'t get WebGL context');
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
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
  var vertices, colors, vertexBuffer, colorBuffer;

  const z = -2;
  vertices = new Float32Array([
    0,
    0.3,
    z,
    -0.3,
    -0.3,
    z,
    0.3,
    -0.3,
    z,
  ]);

  colors = new Float32Array([
    1,
    0,
    0,
    1,
    0,
    1,
    0,
    1,
    0,
    0,
    1,
    1,
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

function getShader(gl, type, shaderSource) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function drawTriangle(gl, program, transform, viewMatrix) {
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
  const fov = 45 * Math.PI / 180;
  var projMatrix =
      new Matrix4().perspective({fov, aspect: 1, near: 0.1, far: 10});
  const projMatrixLocation = gl.getUniformLocation(program, 'u_proj_matrix');
  gl.uniformMatrix4fv(projMatrixLocation, false, projMatrix);

  gl.drawArrays(primitiveType, offset, count);
}

function draw(gl, program) {
  var transform;

  const eye = new Vector3([0, 0, 0]);
  const center = new Vector3([eye.x, eye.y, eye.z - 1]);
  const up = new Vector3([0, 1, 0]);

  const viewMatrix = new Matrix4().lookAt({eye, center, up});

  // Draw left triangle
  transform = new Matrix4().translate([-0.2, 0, 0]);
  drawTriangle(gl, program, transform, viewMatrix);

  // Draw right triangle (should be behind left tri)
  transform = new Matrix4().translate([0.2, 0, -1]);
  drawTriangle(gl, program, transform, viewMatrix);

  gl.deleteProgram(program);
}
