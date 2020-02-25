'use strict';

import { Vector3, Vector4, Matrix4 } from 'math.gl';
import { createCanvas, degToRad } from './sceneHelpers.js';
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
  twgl.setAttributePrefix('a_');
  var cubeBufferInfo = twgl.primitives.createCubeBufferInfo(gl, 1);
  var planeBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 2, 2);

  const scene = {
    cube: {
      bufferInfo: cubeBufferInfo,
    },
    plane: {
      bufferInfo: planeBufferInfo,
    },
  };
  return scene;
}

function drawSomething (gl, programInfo, bufferInfo, transform, viewMatrix, projMatrix) {
  const matrices = {
    u_modelMatrix: transform,
    u_viewMatrix: viewMatrix,
    u_projectionMatrix: projMatrix,
  };
  for (const name in matrices) {
    const location = gl.getUniformLocation(programInfo.program, name);
    gl.uniformMatrix4fv(location, false, matrices[name]);
  }

  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

  gl.useProgram(programInfo.program);
  twgl.drawBufferInfo(gl, bufferInfo);
}

function drawScene (gl, projMatrix, viewMatrix, textureMatrix, programInfo, scene, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);
  const zCenter = -4;

  // Draw cube
  const cubeTransform = new Matrix4();
  cubeTransform.translate([0, 0, zCenter]);
  cubeTransform.rotateY(rotationRadians);

  drawSomething(gl, programInfo, scene.cube.bufferInfo, cubeTransform, viewMatrix, projMatrix);

  // Draw plane
  const planeTransform = new Matrix4();
  planeTransform.translate([0, -3, zCenter]);
  planeTransform.scale(20);
  drawSomething(gl, programInfo, scene.plane.bufferInfo, planeTransform, viewMatrix, projMatrix);
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

  requestAnimationFrame(function (timestamp) {
    draw(gl, programInfo, scene, timestamp);
  });
}