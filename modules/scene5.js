'use strict';

import { Vector3, Vector4, Matrix4 } from 'math.gl';
import { createCanvas, degToRad } from './sceneHelpers.js';

const sceneId = '5';

const vertShaderSource = `#version 300 es
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec3 v_normal;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;
  // Transpose of inverted model matrix, used for normals
  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));
  v_normal = mat3(modelInverseTranspose) * a_normal;
}
`;

const fragShaderSource = `#version 300 es
precision mediump float;

uniform vec3 u_reverseLightDir;
uniform vec4 u_lightColor;
uniform vec4 u_matColor;

in vec3 v_normal;
out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  // compute the light intensity - normal . reverse light
  float intensity = dot(normal, u_reverseLightDir);
  vec4 color = u_lightColor;
  color.rgb *= intensity;
  finalColor = color;
}
`;

const startTime = performance.now();

export default function render () {
  const canvas = createCanvas(sceneId);
  const gl = initGL(canvas);
  const shaderProgram = createShaders(gl);
  createVertexData(gl, shaderProgram);
  draw(gl, shaderProgram, performance.now());
}

function initGL (canvas) {
  const gl = canvas.getContext('webgl2');
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

  const normals = new Float32Array([
    // Front face
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,
    0.0, 0.0, 1.0,

    // Back face
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,
    0.0, 0.0, -1.0,

    // Top face
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,
    0.0, 1.0, 0.0,

    // Bottom face
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,
    0.0, -1.0, 0.0,

    // Right face
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,
    1.0, 0.0, 0.0,

    // Left face
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
    -1.0, 0.0, 0.0,
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

  // Create and populate normal buffer
  var normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

  // Set attrib pointer for this buffer to the location of 'a_normal'
  const normalLoc = gl.getAttribLocation(program, 'a_normal');
  gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(normalLoc);

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
  const offset = 0;
  const count = 36;
  const color = new Vector4(0.2, 0.2, 0.2, 1.0);
  drawArbitraryTriangles(
    gl,
    program,
    transform,
    viewMatrix,
    projMatrix,
    offset,
    count,
    color);
}

function drawPlane (gl, program, transform, viewMatrix, projMatrix) {
  const offset = 12;
  const count = 6;
  const color = new Vector4(0.2, 0.2, 0.2, 1.0);
  drawArbitraryTriangles(
    gl,
    program,
    transform,
    viewMatrix,
    projMatrix,
    offset,
    count,
    color);
}

function drawArbitraryTriangles (gl, program, transform, viewMatrix, projMatrix, offset, count, color) {
  var primitiveType = gl.TRIANGLES;

  const matrices = {
    u_modelMatrix: transform,
    u_viewMatrix: viewMatrix,
    u_projectionMatrix: projMatrix,
  };
  for (const name in matrices) {
    const location = gl.getUniformLocation(program, name);
    gl.uniformMatrix4fv(location, false, matrices[name]);
  }

  const vecs = {
    u_lightColor: new Vector4([0.2, 1, 0.2, 1]),
    u_reverseLightDir: new Vector3([0.1, 0.7, 1]),
    u_matColor: new Vector4([0.1, 0.3, 1.0, 1]),
  };
  for (const name in vecs) {
    const location = gl.getUniformLocation(program, name);
    const vecLen = vecs[name].length;
    if (vecLen === 3) {
      gl.uniform3fv(location, vecs[name]);
    } else if (vecLen === 4) {
      gl.uniform4fv(location, vecs[name]);
    }
  }

  // offset needs to be multiplied by 2 since it's gl.UNSIGNED_SHORT
  gl.drawElements(primitiveType, count, gl.UNSIGNED_SHORT, offset * 2);
}

function drawScene (gl, projMatrix, viewMatrix, textureMatrix, program, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);
  const zCenter = -4;

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
  planeTransform.scale(20);
  // 1: offset in z dimension to match cube (so it doesn't fly off the screen when scaled)
  planeTransform.translate([0, -1, 0]);

  // then translate downwards from the origin so we can actually see this
  drawPlane(gl, program, planeTransform, viewMatrix, projMatrix);
}

function draw (gl, program, timestamp) {
  const topDownCheckbox = document.getElementById(`topDownCheckbox${sceneId}`);
  const zoomSlider = document.getElementById(`zoomSlider${sceneId}`);

  let useTopDown = false;
  if (topDownCheckbox) {
    useTopDown = topDownCheckbox.checked;
  }

  let cameraDistance = 10;
  if (zoomSlider) {
    cameraDistance = zoomSlider.value;
  }

  var eye, center, up;

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (useTopDown) {
    // Top down camera
    eye = new Vector3([0, cameraDistance, -4]);
    center = new Vector3([eye.x, 0, eye.z]);
    up = new Vector3([0, 0, -1]);
  } else {
    eye = new Vector3([0, 0, cameraDistance]);
    center = new Vector3([eye.x, eye.y, eye.z - 1]);
    up = new Vector3([0, 1, 0]);
  }

  const viewMatrix = new Matrix4().lookAt({ eye, center, up });

  const fov = degToRad(45);
  const aspect = gl.canvas.width / gl.canvas.height;
  const projMatrix = new Matrix4().perspective({ fov, aspect, near: 0.1, far: 100 });
  projMatrix.translate([0, -2, 0]); // @TODO: why does this need to be negative?
  projMatrix.rotateX(Math.PI / 20);

  drawScene(gl, projMatrix, viewMatrix, null, program, timestamp);

  // gl.deleteProgram(program);
  requestAnimationFrame(function (timestamp) {
    draw(gl, program, timestamp);
  });
}
