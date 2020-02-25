'use strict';

import { Vector3, Matrix4 } from 'math.gl';
import { createCanvas, degToRad } from './sceneHelpers.js';
import * as twgl from 'twgl.js';

const sceneId = '5';

const phongShader = {
  vs: `#version 300 es
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_lightPos;

out vec3 v_normal;
out vec3 v_reverseLightDir;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));

  gl_Position = mvp * a_position;

  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPosition = (u_modelMatrix * a_position).xyz;

  v_reverseLightDir = u_lightPos - surfaceWorldPosition;
}
`,
  fs: `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec3 v_reverseLightDir;

uniform vec4 u_matColor;

out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  vec3 surfaceToLightDirection = normalize(v_reverseLightDir);

  float intensity = dot(normal, surfaceToLightDirection);

  vec4 diffuse = vec4(1.0, 0.1, 0.1, 1);

  diffuse.rgb *= intensity;

  finalColor = diffuse;
}
`,
};

const planeShader = {
  vs: `#version 300 es
in vec4 a_position;
in vec2 a_texcoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

out vec2 v_texcoord;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;
  v_texcoord = a_texcoord;
}
`,
  fs: `#version 300 es
precision mediump float;

in vec2 v_texcoord;

uniform vec4 u_matColor;
uniform sampler2D u_texture;

out vec4 finalColor;

void main() {
  finalColor = vec4(v_texcoord, 1, 1);
  vec4 colorMult = vec4(0.6, 0.6, 0.6, 1);
  finalColor = texture(u_texture, v_texcoord) * colorMult;
}
`,
};

const startTime = performance.now();

export default function render () {
  const canvas = createCanvas(sceneId, true);
  const gl = initGL(canvas);
  const programInfos = {
    phong: createShaders(gl, phongShader),
    checkerboard: createShaders(gl, planeShader),
  };
  const scene = createScene(gl);
  scene.textures = createTextures(gl);
  draw(gl, programInfos, scene, performance.now());
}

function initGL (canvas) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    window.alert("Couldn't get WebGL context");
  }
  return gl;
}

function createShaders (gl, shaders) {
  return twgl.createProgramInfo(gl, [shaders.vs, shaders.fs]);
}

function createTextures (gl) {
  const textures = {};

  const checkerboardTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.LUMINANCE,
    8,
    8,
    0,
    gl.LUMINANCE,
    gl.UNSIGNED_BYTE,
    new Uint8Array([
      0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
      0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
      0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
      0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
      0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
      0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
      0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
      0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
    ]));
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  textures.checkerboardTexture = checkerboardTexture;

  return textures;
}

function createScene (gl) {
  twgl.setAttributePrefix('a_');
  var sphereBufferInfo = twgl.primitives.createSphereBufferInfo(
    gl,
    1,
    12,
    6);
  var planeBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 2, 2);
  var cubeBufferInfo = twgl.primitives.createCubeBufferInfo(gl, 2);

  const scene = {
    sphere: {
      bufferInfo: sphereBufferInfo,
    },
    plane: {
      bufferInfo: planeBufferInfo,
    },
    cube: {
      bufferInfo: cubeBufferInfo,
    },
  };
  return scene;
}

function drawSomething (gl, programInfo, bufferInfo, uniforms) {
  gl.useProgram(programInfo.program);

  twgl.setUniforms(programInfo, uniforms);

  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

  twgl.drawBufferInfo(gl, bufferInfo);
}

function drawScene (gl, projMatrix, viewMatrix, programInfos, scene, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);
  const zCenter = -4;

  // Draw sphere
  const sphereTransform = new Matrix4().translate([3, 0, zCenter]).rotateY(rotationRadians);
  const sphereUniforms = {
    u_modelMatrix: sphereTransform,
    u_viewMatrix: viewMatrix,
    u_projectionMatrix: projMatrix,
  };
  drawSomething(gl, programInfos.phong, scene.sphere.bufferInfo, sphereUniforms);

  // Draw cube
  const cubeTransform = new Matrix4().translate([-3, 0, zCenter]).rotateY(rotationRadians);
  const cubeUniforms = {
    u_modelMatrix: cubeTransform,
    u_viewMatrix: viewMatrix,
    u_projectionMatrix: projMatrix,
    u_lightPos: new Vector3([-10, 10, 100]),
  };
  drawSomething(gl, programInfos.phong, scene.cube.bufferInfo, cubeUniforms);

  // Draw plane
  const planeTransform = new Matrix4().translate([0, -3, zCenter]).scale(20);
  const planeUniforms = {
    u_modelMatrix: planeTransform,
    u_viewMatrix: viewMatrix,
    u_projectionMatrix: projMatrix,
    u_texture: scene.textures.checkerboardTexture,
  };
  drawSomething(gl, programInfos.checkerboard, scene.plane.bufferInfo, planeUniforms);
}

function draw (gl, programInfos, scene, timestamp) {
  const rotationSlider = document.getElementById(`rotationSlider${sceneId}`);
  const topDownCheckbox = document.getElementById(`topDownCheckbox${sceneId}`);
  const zoomSlider = document.getElementById(`zoomSlider${sceneId}`);

  let rotationDeg = 0;
  if (rotationSlider) {
    rotationDeg = rotationSlider.value;
  }
  const sliderRotationRadians = degToRad(rotationDeg);

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
    center = new Vector3([eye.x, eye.y, -4]);
    up = new Vector3([0, 1, 0]);
  }

  const viewMatrix = new Matrix4().lookAt({ eye, center, up });
  viewMatrix.rotateY(sliderRotationRadians);

  const fov = degToRad(45);
  const aspect = gl.canvas.width / gl.canvas.height;
  const projMatrix = new Matrix4().perspective({ fov, aspect, near: 0.1, far: 100 });
  projMatrix.translate([0, -2, 0]); // @TODO: why does this need to be negative?
  projMatrix.rotateX(Math.PI / 20);

  drawScene(gl, projMatrix, viewMatrix, programInfos, scene, timestamp);

  requestAnimationFrame(function (timestamp) {
    draw(gl, programInfos, scene, timestamp);
  });
}
