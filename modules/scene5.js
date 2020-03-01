'use strict';

import {Vector3, Matrix4} from 'math.gl';
import * as util from './sceneHelpers.js';
import * as twgl from 'twgl.js';
import {Camera} from './camera.js';

const sceneId = '5';

window.showHUD = true;

const shaders = {};
shaders.phongShader = {
  vs: `#version 300 es
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_lightPos;
uniform vec3 u_cameraPos;

out vec3 v_normal;
out vec3 v_surfToLight;
out vec3 v_surfToCamera;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));

  gl_Position = mvp * a_position;

  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPos = (u_modelMatrix * a_position).xyz;
  vec3 cameraWorldPos = mat3(u_modelMatrix) * u_cameraPos;

  v_surfToLight = u_lightPos - surfaceWorldPos;

  v_surfToCamera = cameraWorldPos - surfaceWorldPos;
}`,
  fs: `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec3 v_surfToLight;
in vec3 v_surfToCamera;

uniform vec3 u_matColor;
uniform vec3 u_lightColor;

out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  vec3 surfToLightDir = normalize(v_surfToLight);
  vec3 surfToCameraDir = normalize(v_surfToCamera);
  vec3 halfVector = normalize(surfToLightDir + surfToCameraDir);

  // Diffuse
  float diffuseIntensity = dot(normal, surfToLightDir);
  vec3 diffuse = u_lightColor * diffuseIntensity;

  // Specular
  float shininess = 32.0;
  float specularStrength = 1.0;
  vec3 specular = specularStrength * pow(max(dot(normal, halfVector), 0.0), shininess) * u_lightColor;

  // Ambient
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * u_lightColor;

  vec3 result = (ambient + specular + diffuse) * u_matColor;
  finalColor = vec4(result, 1.0);
}`,
};

shaders.planeShader = {
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
}`,
  fs: `#version 300 es
precision mediump float;

in vec2 v_texcoord;

uniform vec3 u_matColor;
uniform sampler2D u_texture;

out vec4 finalColor;

void main() {
  finalColor = texture(u_texture, v_texcoord) * vec4(u_matColor, 1);
}`,
};

shaders.hud = {
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

  gl_Position.z = 0.0;

  v_texcoord = a_texcoord;
}`,
  fs: `#version 300 es
precision mediump float;

in vec2 v_texcoord;

uniform sampler2D u_texture;

out vec4 finalColor;

void main() {
  finalColor = texture(u_texture, v_texcoord);
}`
};

const startTime = performance.now();

export default function render() {
  const gl = util.createGLCanvas(sceneId, true);
  const programInfos = {
    phong: util.createShaders(gl, shaders.phongShader),
    checkerboard: util.createShaders(gl, shaders.planeShader),
    hud: util.createShaders(gl, shaders.hud),
  };
  const scene = createScene(gl);
  drawFrame(gl, programInfos, scene, performance.now());
}

function createScene(gl) {
  twgl.setAttributePrefix('a_');
  const sphereBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 1, 12, 6);
  const planeBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 2, 2);
  const cubeBufferInfo = twgl.primitives.createCubeBufferInfo(gl, 2);
  const debugWindowBufferInfo =
      twgl.primitives.createPlaneBufferInfo(gl, 0.9, 0.9);

  const scene = {
    sphere: {
      bufferInfo: sphereBufferInfo,
      color: new Vector3([0.8, 0.2, 0.2]),
      transform: new Matrix4().translate([3, 0, -4]),
    },
    plane: {
      bufferInfo: planeBufferInfo,
      color: new Vector3([0.3, 0.3, 0.3]),
      transform: new Matrix4().translate([0, -3, -4]).scale(20),
    },
    cube: {
      bufferInfo: cubeBufferInfo,
      color: new Vector3([0.2, 0.8, 0.2]),
      transform: new Matrix4().translate([-3, 0, -4]),
    },
    debugWindow: {
      bufferInfo: debugWindowBufferInfo,
    },
  };

  scene.camera = setupCamera(gl);
  scene.light = setupLight(gl);
  scene.textures = createTextures(gl);
  scene.hud = setupHUD(scene);

  return scene;
}

function setupCamera(gl) {
  const position = new Vector3([0, 2, 10]);
  const target = new Vector3([0, 0, -4]);
  const fovDegrees = 45;
  return new Camera(gl, position, target, fovDegrees);
}

function setupLight() {
  return {
    position: new Vector3([0, 100, 100]),
    color: new Vector3([1, 1, 1]),
  };
}

function setupHUD(scene) {
  return {
    viewMatrix: new Matrix4(),
    projMatrix: new Matrix4().ortho(
        {left: -1, right: 1, bottom: -1, top: 1, near: 0.1, far: 10}),
    texture: scene.textures.checkerboardTexture,
    transform:
        new Matrix4().translate([0.5, 0.5, 0]).rotateX(util.degToRad(90)),
  };
}

function createTextures(gl) {
  const textures = {};

  const checkerboardTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, checkerboardTexture);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, 8, 8, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE,
      new Uint8Array([
        0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xCC, 0xFF, 0xCC,
        0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC,
        0xFF, 0xCC, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xFF,
        0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xCC, 0xFF, 0xCC, 0xFF,
        0xCC, 0xFF, 0xCC, 0xFF, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
        0xCC, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF, 0xCC, 0xFF,
      ]));
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  textures.checkerboardTexture = checkerboardTexture;

  return textures;
}

function drawFrame(gl, programInfos, scene, timestamp) {
  drawScene(gl, programInfos, scene, timestamp);

  requestAnimationFrame(function(timestamp) {
    drawFrame(gl, programInfos, scene, timestamp);
  });
}

function drawScene(gl, programInfos, scene, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);

  // Set up viewport and clear color and depth buffers
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw sphere
  const sphereUniforms = {
    u_modelMatrix:
        new Matrix4().copy(scene.sphere.transform).rotateY(rotationRadians),
    u_viewMatrix: scene.camera.viewMatrix,
    u_projectionMatrix: scene.camera.projMatrix,
    u_matColor: scene.sphere.color,
    u_lightPos: scene.light.position,
    u_lightColor: scene.light.color,
    u_cameraPos: scene.camera.worldPosition(),
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.sphere.bufferInfo, sphereUniforms);

  // Draw cube
  const cubeUniforms = {
    u_modelMatrix:
        new Matrix4().copy(scene.cube.transform).rotateY(rotationRadians),
    u_viewMatrix: scene.camera.viewMatrix,
    u_projectionMatrix: scene.camera.projMatrix,
    u_matColor: scene.cube.color,
    u_lightPos: scene.light.position,
    u_lightColor: scene.light.color,
    u_cameraPos: scene.camera.worldPosition(),
  };
  util.drawBuffer(gl, programInfos.phong, scene.cube.bufferInfo, cubeUniforms);

  // Draw plane
  const planeUniforms = {
    u_modelMatrix: scene.plane.transform,
    u_viewMatrix: scene.camera.viewMatrix,
    u_projectionMatrix: scene.camera.projMatrix,
    u_texture: scene.textures.checkerboardTexture,
    u_matColor: scene.plane.color,
  };
  util.drawBuffer(
      gl, programInfos.checkerboard, scene.plane.bufferInfo, planeUniforms);

  drawHUD(gl, programInfos, scene);
}

function drawHUD(gl, programInfos, scene) {
  if (!window.showHUD) {
    return;
  }
  // Draw texture debug window
  const hudUniforms = {
    u_modelMatrix: scene.hud.transform,
    u_viewMatrix: scene.hud.viewMatrix,
    u_projectionMatrix: scene.hud.projMatrix,
    u_texture: scene.hud.texture,
  };
  util.drawBuffer(
      gl, programInfos.hud, scene.debugWindow.bufferInfo, hudUniforms);
}
