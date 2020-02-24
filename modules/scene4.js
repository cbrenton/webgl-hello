'use strict';

import { Vector3, Vector4, Matrix4 } from 'math.gl';
import { createCanvas, degToRad } from './sceneHelpers.js';

const sceneId = '4';

const vertShaderSource = `
attribute vec4 a_position;

uniform mat4 u_model_matrix;
uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;

void main() {
  // MVP matrix must be constructed in reverse
  gl_Position = u_proj_matrix * u_view_matrix * u_model_matrix * a_position;
}
`;

const fragShaderSource = `
// fragment shaders don't have a default precision so we need to
// pick one. mediump is a good default. it means "medium precision"
precision mediump float;

uniform vec4 u_color;

void main() {
  // gl_FragColor is a special var that a frag shader is responsible
  // for setting
  gl_FragColor = u_color;
}
`;

export default function render () {
  const canvas = createCanvas(sceneId, true);
  const gl = initGL(canvas);
  const shaderProgram = createShaders(gl);
  createVertexData(gl, shaderProgram);
  draw(gl, shaderProgram, performance.now());
}

function initGL (canvas) {
  const gl = canvas.getContext('webgl');
  if (!gl) {
    window.alert("Couldn't get WebGL context");
  }
  return gl;
}

function createShaders (gl) {
  var vertexShader,
    fragmentShader,
    shaderProgram;

  vertexShader = getShader(gl, gl.VERTEX_SHADER, vertShaderSource);
  fragmentShader = getShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
  shaderProgram = gl.createProgram();

  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  gl.useProgram(shaderProgram);

  return shaderProgram;
}

function createVertexData (gl, program) {
  var vertexBuffer,
    indexBuffer;

  // Vertices will not be reused since we don't want interpolated colors
  const vertices = new Float32Array([
    // Front face
    -1.0, -1.0, 1.0,
    1.0, -1.0, 1.0,
    1.0, 1.0, 1.0,
    -1.0, 1.0, 1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0, 1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, -1.0, -1.0,

    // Top face
    -1.0, 1.0, -1.0,
    -1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
    1.0, -1.0, -1.0,
    1.0, -1.0, 1.0,
    -1.0, -1.0, 1.0,

    // Right face
    1.0, -1.0, -1.0,
    1.0, 1.0, -1.0,
    1.0, 1.0, 1.0,
    1.0, -1.0, 1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0, 1.0,
    -1.0, 1.0, 1.0,
    -1.0, 1.0, -1.0,
  ]);

  const indices = new Uint16Array([
    0, 1, 2, 0, 2, 3, // front
    4, 5, 6, 4, 6, 7, // back
    8, 9, 10, 8, 10, 11, // top
    12, 13, 14, 12, 14, 15, // bottom
    16, 17, 18, 16, 18, 19, // right
    20, 21, 22, 20, 22, 23, // left
  ]);

  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  // Tell the attribute how to get data out of positionBuffer
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Set up index buffer
  indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
}

function getShader (gl, type, shaderSource) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function drawCube (gl, program, transform, viewMatrix, projMatrix) {
  var primitiveType = gl.TRIANGLES;
  var offset = 0;
  var count = 6 * 6;

  const color = new Vector4(0.8, 0.6, 0.0, 1.0);
  const colorLoc = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLoc, color);

  // Model matrix
  const modelMatrixLocation = gl.getUniformLocation(program, 'u_model_matrix');
  gl.uniformMatrix4fv(modelMatrixLocation, false, transform);

  // View matrix
  const viewMatrixLocation = gl.getUniformLocation(program, 'u_view_matrix');
  gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);

  // Projection matrix
  const projMatrixLocation = gl.getUniformLocation(program, 'u_proj_matrix');
  gl.uniformMatrix4fv(projMatrixLocation, false, projMatrix);

  gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset);
}

function drawPlane (gl, program, transform, viewMatrix, projMatrix) {
  var primitiveType = gl.TRIANGLES;
  var offset = 12;
  var count = 6;

  const color = new Vector4(0.6, 0.6, 0.6, 1.0);
  const colorLoc = gl.getUniformLocation(program, 'u_color');
  gl.uniform4fv(colorLoc, color);

  // Model matrix
  const modelMatrixLocation = gl.getUniformLocation(program, 'u_model_matrix');
  gl.uniformMatrix4fv(modelMatrixLocation, false, transform);

  // View matrix
  const viewMatrixLocation = gl.getUniformLocation(program, 'u_view_matrix');
  gl.uniformMatrix4fv(viewMatrixLocation, false, viewMatrix);

  // Projection matrix
  const projMatrixLocation = gl.getUniformLocation(program, 'u_proj_matrix');
  gl.uniformMatrix4fv(projMatrixLocation, false, projMatrix);

  // offset needs to be multiplied by 2 since it's gl.UNSIGNED_SHORT
  gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset * 2);
}

function draw (gl, program, timestamp) {
  const rotationSlider = document.getElementById(`rotationSlider${sceneId}`);
  const topDownCheckbox = document.getElementById(`topDownCheckbox${sceneId}`);
  const zoomSlider = document.getElementById(`zoomSlider${sceneId}`);

  let rotationDeg = 0;
  if (rotationSlider) {
    rotationDeg = rotationSlider.value;
  }

  let useTopDown = false;
  if (topDownCheckbox) {
    useTopDown = topDownCheckbox.checked;
  }

  let cameraDistance = 10;
  if (zoomSlider) {
    cameraDistance = zoomSlider.value;
  }

  const rotationRadians = degToRad(rotationDeg);

  var eye, center, up;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const zCenter = -4;

  if (useTopDown) {
    // Top down camera
    eye = new Vector3([0, cameraDistance, zCenter]);
    center = new Vector3([eye.x, 0, eye.z]);
    up = new Vector3([0, 0, -1]);
  } else {
    eye = new Vector3([0, 2, cameraDistance]);
    center = new Vector3([eye.x, eye.y, eye.z - 1]);
    up = new Vector3([0, 1, 0]);
  }

  const viewMatrix = new Matrix4().lookAt({ eye, center, up });

  const fov = degToRad(45);
  const aspect = gl.canvas.width / gl.canvas.height;
  const projMatrix = new Matrix4().perspective({ fov, aspect, near: 0.1, far: 100 });

  // Draw cube
  const cubeTransform = new Matrix4().identity();
  cubeTransform.translate([0, 0, zCenter]);
  cubeTransform.rotateY(rotationRadians);

  drawCube(gl, program, cubeTransform, viewMatrix, projMatrix);

  // Draw plane
  const planeTransform = new Matrix4().identity();
  // transforms are applied backwards
  // 3: then translate down and backwards to be centered underneath the cube
  planeTransform.translate([0, -3, zCenter]);
  // 2: scale to make it more like a plane
  planeTransform.scale(10);
  // 1: offset in z dimension to match cube (so it doesn't fly off the screen when scaled)
  planeTransform.translate([0, -1, 0]);

  // then translate downwards from the origin so we can actually see this
  drawPlane(gl, program, planeTransform, viewMatrix, projMatrix);

  // gl.deleteProgram(program);
  requestAnimationFrame(function (timestamp) {
    draw(gl, program, timestamp);
  });
}
