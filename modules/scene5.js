'use strict';

import { Vector3, Vector4, Matrix4 } from 'math.gl';
import { createCanvas, degToRad } from './sceneHelpers.js';
import { cubeData } from './geometry.js';
import * as twgl from 'twgl.js';

const sceneId = '5';

const vertShader = `#version 300 es
in vec4 a_position;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;
}
`;

const fragShader = `#version 300 es
precision mediump float;

uniform vec4 u_matColor;

out vec4 finalColor;

void main() {
  finalColor = vec4(1);
}
`;

const startTime = performance.now();

export default function render () {
  const canvas = createCanvas(sceneId);
  const gl = initGL(canvas);
  const programInfo = createShaders(gl, vertShader, fragShader);
  const shaderProgram = programInfo.program;
  const scene = createVertexData(gl, shaderProgram);
  draw(gl, programInfo, scene, performance.now());
}

function initGL (canvas) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    window.alert("Couldn't get WebGL context");
  }
  return gl;
}

function createShaders (gl, vs, fs) {
  const programInfo = twgl.createProgramInfo(gl, [vs, fs]);

  return programInfo;
}

function createVertexData (gl, program) {
  const positions = [1, 1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, 1, -1, -1, 1, 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, -1];
  // const normals = [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
  // const texcoords = [1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1];
  const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23];

  // @TODO: why is this block crucial?
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, 'a_position');
  // Tell the attribute how to get data out of vertexBuffer 
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(positionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  var cubeBufferInfo = twgl.primitives.createCubeBufferInfo(gl, 1);
  console.log(cubeBufferInfo);

  const scene = {
    cube: {
      bufferInfo: cubeBufferInfo,
    },
  };
  return scene;
}

function drawCube (gl, programInfo, scene, transform, viewMatrix, projMatrix) {
  const offset = 0;
  const count = 36;
  const color = new Vector4(0.2, 0.2, 0.2, 1.0);
  drawArbitraryTriangles(
    gl,
    programInfo,
    scene,
    transform,
    viewMatrix,
    projMatrix,
    offset,
    count,
    color);
}

function drawPlane (gl, programInfo, scene, transform, viewMatrix, projMatrix) {
  const offset = 12;
  const count = 6;
  const color = new Vector4(0.2, 0.2, 0.2, 1.0);
  drawArbitraryTriangles(
    gl,
    programInfo,
    scene,
    transform,
    viewMatrix,
    projMatrix,
    offset,
    count,
    color);
}

function drawArbitraryTriangles (gl, programInfo, scene, transform, viewMatrix, projMatrix, offset, count, color) {
  gl.bindVertexArray(scene.cube.VAO);

  const matrices = {
    u_modelMatrix: transform,
    u_viewMatrix: viewMatrix,
    u_projectionMatrix: projMatrix,
  };
  for (const name in matrices) {
    const location = gl.getUniformLocation(programInfo.program, name);
    gl.uniformMatrix4fv(location, false, matrices[name]);
  }

  twgl.setBuffersAndAttributes(gl, programInfo, scene.cube.bufferInfo);

  gl.useProgram(programInfo.program);
  twgl.drawBufferInfo(gl, scene.cube.bufferInfo);
}

function drawScene (gl, projMatrix, viewMatrix, textureMatrix, programInfo, scene, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);
  const zCenter = -4;

  // Draw cube
  const cubeTransform = new Matrix4().identity();
  cubeTransform.translate([0, 0, zCenter]);
  cubeTransform.rotateY(rotationRadians);

  drawCube(gl, programInfo, scene, cubeTransform, viewMatrix, projMatrix);

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
  // drawPlane(gl, programInfo, scene, planeTransform, viewMatrix, projMatrix);
}

function draw (gl, programInfo, scene, timestamp) {
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

  drawScene(gl, projMatrix, viewMatrix, null, programInfo, scene, timestamp);

  // gl.deleteProgram(program);
  requestAnimationFrame(function (timestamp) {
    draw(gl, programInfo, scene, timestamp);
  });
}
