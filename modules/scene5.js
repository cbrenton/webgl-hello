'use strict';

import {Vector3, Matrix4} from 'math.gl';
import * as util from './sceneHelpers.js';
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

  v_surfToLight = u_lightPos - surfaceWorldPos;

  v_surfToCamera = u_cameraPos - surfaceWorldPos;
}
`,
  fs: `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec3 v_surfToLight;
in vec3 v_surfToCamera;

uniform vec4 u_matColor;

out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  vec3 surfToLightDir = normalize(v_surfToLight);
  vec3 surfToCameraDir = normalize(v_surfToCamera);
  vec3 halfVector = normalize(surfToLightDir + surfToCameraDir);

  vec3 lightColor = vec3(1, 1, 1);
  vec3 matColor = vec3(1, 0, 0);

  // Diffuse
  float diffuseIntensity = dot(normal, surfToLightDir);
  vec3 diffuse = lightColor * diffuseIntensity;

  // Specular
  float shininess = 50.0;
  float specularStrength = 1.0;
  vec3 specular = specularStrength * pow(max(dot(normal, halfVector), 0.0), shininess) * lightColor ;

  // Ambient
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * lightColor;

  vec3 result = (ambient + specular + diffuse) * matColor;
  finalColor = vec4(result, 1.0);
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

export default function render() {
  const gl = util.createGLCanvas(sceneId, true);
  const programInfos = {
    phong: util.createShaders(gl, phongShader),
    checkerboard: util.createShaders(gl, planeShader),
  };
  const scene = createScene(gl);
  scene.textures = createTextures(gl);
  draw(gl, programInfos, scene, performance.now());
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

function createScene(gl) {
  twgl.setAttributePrefix('a_');
  var sphereBufferInfo = twgl.primitives.createSphereBufferInfo(gl, 1, 12, 6);
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
    camera: {
      eye: new Vector3([0, 0, 10]),
    },
  };
  return scene;
}

function drawScene(gl, programInfos, scene, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);
  const zCenter = -4;

  // Set up viewport and clear color and depth buffers
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Draw sphere
  const sphereTransform =
      new Matrix4().translate([3, 0, zCenter]).rotateY(rotationRadians);
  const sphereUniforms = {
    u_modelMatrix: sphereTransform,
    u_viewMatrix: scene.camera.viewMatrix,
    u_projectionMatrix: scene.camera.projMatrix,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.sphere.bufferInfo, sphereUniforms);

  // Draw cube
  const cubeTransform =
      new Matrix4().translate([-3, 0, zCenter]).rotateY(rotationRadians);
  const cameraPos =
      new Matrix4().copy(scene.camera.viewMatrix).transform(scene.camera.eye);
  const cubeUniforms = {
    u_modelMatrix: cubeTransform,
    u_viewMatrix: scene.camera.viewMatrix,
    u_projectionMatrix: scene.camera.projMatrix,
    u_lightPos: new Vector3([0, 100, 100]),
    u_cameraPos: cameraPos,
  };
  util.drawBuffer(gl, programInfos.phong, scene.cube.bufferInfo, cubeUniforms);

  // Draw plane
  const planeTransform = new Matrix4().translate([0, -3, zCenter]).scale(20);
  const planeUniforms = {
    u_modelMatrix: planeTransform,
    u_viewMatrix: scene.camera.viewMatrix,
    u_projectionMatrix: scene.camera.projMatrix,
    u_texture: scene.textures.checkerboardTexture,
  };
  util.drawBuffer(
      gl, programInfos.checkerboard, scene.plane.bufferInfo, planeUniforms);
}

function draw(gl, programInfos, scene, timestamp) {
  const rotationSlider = document.getElementById(`rotationSlider${sceneId}`);
  const topDownCheckbox = document.getElementById(`topDownCheckbox${sceneId}`);
  const zoomSlider = document.getElementById(`zoomSlider${sceneId}`);

  let rotationDeg = 0;
  if (rotationSlider) {
    rotationDeg = rotationSlider.value / 36;
  }
  const sliderXTranslation = rotationDeg / 10;

  let useTopDown = false;
  if (topDownCheckbox) {
    useTopDown = topDownCheckbox.checked;
  }

  let cameraDistance = 10;
  if (zoomSlider) {
    cameraDistance = zoomSlider.max - zoomSlider.value;
  }

  var center, up;

  if (useTopDown) {
    // Top down camera
    scene.camera.eye = new Vector3([sliderXTranslation, 0, -4]);
    center = new Vector3([scene.camera.eye.x, 0, scene.camera.eye.z]);
    up = new Vector3([0, 0, -1]);
  } else {
    scene.camera.eye = new Vector3([sliderXTranslation, 0, cameraDistance]);
    center = new Vector3(
        [scene.camera.eye.x, scene.camera.eye.y, cameraDistance - 4]);
    up = new Vector3([0, 1, 0]);
  }

  scene.camera.viewMatrix =
      new Matrix4().lookAt({eye: scene.camera.eye, center, up});

  const fov = util.degToRad(45);
  const aspect =
      parseFloat(gl.canvas.clientWidth) / parseFloat(gl.canvas.clientHeight);
  scene.camera.projMatrix =
      new Matrix4().perspective({fov, aspect, near: 0.1, far: 100});
  scene.camera.projMatrix.translate(
      [0, -2, 0]);  // @TODO: why does this need to be negative?
  scene.camera.projMatrix.rotateX(Math.PI / 20);

  drawScene(gl, programInfos, scene, timestamp);

  requestAnimationFrame(function(timestamp) {
    draw(gl, programInfos, scene, timestamp);
  });
}
