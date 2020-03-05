'use strict';

import {Vector3, Matrix4} from 'math.gl';
import * as twgl from 'twgl.js';

import * as bunny from 'models/bunny.obj.js';
import {Camera} from 'src/camera.js';
import {PointLight} from 'src/light.js';
import {loadShaders} from 'src/shaders.js';
import {parseObj} from 'util/obj-parser.js';
import * as util from 'util/scene-helpers.js';

const sceneId = '6';
const description = `
<b>Scene 6:</b>
A scene with .obj file loading, Phong lighting, texture mapping,
and soft shadows via shadow mapping.
`;
const startTime = performance.now();

window.useSoftShadows = true;
window.shadowMapBias = 0.002;

export default function render() {
  const gl = util.createGLCanvas(sceneId, description);
  const shaderList = [
    'phong',
    'texturedPhong',
    'hud',
  ];
  const programInfos = loadShaders(gl, shaderList);

  const scene = createScene(gl);
  drawFrame(gl, programInfos, scene, performance.now());
}

function createScene(gl) {
  twgl.setAttributePrefix('a_');
  const sphereBufferInfo =
      twgl.primitives.createSphereBufferInfo(gl, 1, 24, 12);
  const planeBufferInfo = twgl.primitives.createPlaneBufferInfo(gl, 2, 2);
  const cubeBufferInfo = twgl.primitives.createCubeBufferInfo(gl, 2);
  const bunnyBufferInfo =
      twgl.createBufferInfoFromArrays(gl, parseObj(bunny.objString));
  const debugWindowBufferInfo =
      twgl.primitives.createPlaneBufferInfo(gl, 0.9, 0.9);

  const scene = {};

  scene.camera = setupCamera(gl);
  scene.light = setupLight(gl);
  scene.textures = createTextures(gl);
  scene.shadowMap = setupShadowMap(gl);
  scene.hud = setupHUD(scene);

  scene.sphere = {
    bufferInfo: sphereBufferInfo,
    transform: new Matrix4().translate([0, 3, 0]),
    material: {
      color: {
        diffuse: new Vector3([0.8, 0.2, 0.2]),
        specular: new Vector3([1.0, 1.0, 1.0]),
        ambient: new Vector3([0.6, 0.6, 0.6]),
      },
      shininess: 32.0,
      texture: scene.textures.blankTexture,
    }
  };
  scene.plane = {
    bufferInfo: planeBufferInfo,
    transform: new Matrix4().translate([0, -1, -4]).scale(20),
    material: {
      color: {
        diffuse: new Vector3([0.6, 0.6, 0.6]),
        specular: new Vector3([0.0, 0.0, 0.0]),
        ambient: new Vector3([0.6, 0.6, 0.6]),
      },
      shininess: 1.0,
      texture: scene.textures.checkerboardTexture,
    }
  };
  scene.cube = {
    bufferInfo: cubeBufferInfo,
    transform: new Matrix4().translate([-3, 0, -4]),
    material: {
      color: {
        diffuse: new Vector3([0.2, 0.8, 0.2]),
        specular: new Vector3([0.2, 0.8, 0.2]),
        ambient: new Vector3([0.6, 0.6, 0.6]),
      },
      shininess: 16.0,
      texture: scene.textures.blankTexture,
    }
  };
  const bunnyYOffset = -1 + 0.340252;  // bunny obj lowest y value is -0.340252
  scene.bunny = {
    bufferInfo: bunnyBufferInfo,
    transform: new Matrix4().translate(new Vector3([1, bunnyYOffset, -1])),
    material: {
      color: {
        diffuse: new Vector3([0.8, 0.8, 0.8]),
        specular: new Vector3([0.8, 0.8, 0.8]),
        ambient: new Vector3([0.8, 0.8, 0.8]),
      },
      shininess: 16.0,
      texture: scene.textures.blankTexture,
    }
  };

  scene.debugWindow = {
    bufferInfo: debugWindowBufferInfo,
  };

  return scene;
}

function setupCamera(gl) {
  const position = new Vector3([0, 2, 10]);
  const target = new Vector3([0, 0, -4]);
  const up = new Vector3([0, 0, -1]);
  const fovDegrees = 45;
  return new Camera(gl, position, target, up, fovDegrees);
}

function setupLight(gl) {
  const position = new Vector3([30, 20, -10]);
  const target = new Vector3([0, 0, 0]);
  const color = new Vector3([1, 1, 1]);
  return new PointLight(gl, position, target, color);
}

function setupHUD(scene) {
  return {
    viewMatrix: new Matrix4(),
    projMatrix: new Matrix4().ortho(
        {left: -1, right: 1, bottom: -1, top: 1, near: 0.1, far: 10}),
    texture: scene.shadowMap.textures.color,
    transform:
        new Matrix4().translate([0.5, 0.5, 0]).rotateX(util.degToRad(-90)),
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

  const blankTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, blankTexture);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, 4, 4, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE,
      new Uint8Array([
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
        0xFF,
      ]));
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  textures.blankTexture = blankTexture;

  gl.bindTexture(gl.TEXTURE_2D, null);

  return textures;
}

function setupShadowMap(gl) {
  const size = 2048;
  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);

  // Color texture for framebuffer
  const renderedTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderedTexture);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, renderedTexture, 0);

  // Create depth buffer for framebuffer
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, size, size, 0,
      gl.DEPTH_COMPONENT, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(
      gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return {
    framebuffer: depthFramebuffer,
    textures: {depth: depthTexture, color: renderedTexture},
    bufferSize: size,
  };
}

function drawFrame(gl, programInfos, scene, timestamp) {
  // Draw to texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, scene.shadowMap.framebuffer);
  gl.viewport(0, 0, scene.shadowMap.bufferSize, scene.shadowMap.bufferSize);
  drawScene(
      gl, programInfos.depth, scene, scene.light, new Matrix4(), timestamp);

  // Draw to canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  drawScene(
      gl, programInfos.render, scene, scene.camera,
      scene.light.getViewProjectionMatrix(), timestamp);
  drawHUD(gl, programInfos.render, scene);

  requestAnimationFrame(function(timestamp) {
    drawFrame(gl, programInfos, scene, timestamp);
  });
}

function drawScene(gl, programInfos, scene, renderCamera, lightVP, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);

  gl.clearColor(0.58, 0.78, 0.85, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const globalUniforms = {
    u_lightColor: scene.light.color,
    u_lightPos: scene.light.position,
    u_cameraPos: renderCamera.position,
    u_viewMatrix: renderCamera.viewMatrix,
    u_projectionMatrix: renderCamera.projMatrix,
    u_depthVP: lightVP,
    u_shadowMap: scene.shadowMap.textures.depth,
    u_shadowMapSize: scene.shadowMap.bufferSize,
    u_useSoftShadows: window.useSoftShadows,
    u_bias: window.shadowMapBias,
  }

  // Draw sphere
  const sphereUniforms = {
    u_modelMatrix: new Matrix4()
                       .copy(scene.sphere.transform)
                       .rotateY(rotationRadians)
                       .translate(new Vector3([0, 0, 4])),
    u_diffuseColor: scene.sphere.material.color.diffuse,
    u_specularColor: scene.sphere.material.color.specular,
    u_ambientColor: scene.sphere.material.color.ambient,
    u_shininess: scene.sphere.material.shininess,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.sphere.bufferInfo, sphereUniforms,
      globalUniforms);

  // Draw cube
  const cubeUniforms = {
    u_modelMatrix: scene.cube.transform,
    u_diffuseColor: scene.cube.material.color.diffuse,
    u_specularColor: scene.cube.material.color.specular,
    u_ambientColor: scene.cube.material.color.ambient,
    u_shininess: scene.cube.material.shininess,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.cube.bufferInfo, cubeUniforms,
      globalUniforms);

  // Draw bunny
  const bunnyUniforms = {
    u_modelMatrix:
        new Matrix4().copy(scene.bunny.transform).rotateY(-rotationRadians),
    u_diffuseColor: scene.bunny.material.color.diffuse,
    u_specularColor: scene.bunny.material.color.specular,
    u_ambientColor: scene.bunny.material.color.ambient,
    u_texture: scene.bunny.material.texture,
    u_shininess: scene.bunny.material.shininess,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.bunny.bufferInfo, bunnyUniforms,
      globalUniforms);

  // Draw plane
  const planeUniforms = {
    u_modelMatrix: scene.plane.transform,
    u_diffuseColor: scene.plane.material.color.diffuse,
    u_specularColor: scene.plane.material.color.specular,
    u_ambientColor: scene.plane.material.color.ambient,
    u_texture: scene.plane.material.texture,
    u_shininess: scene.plane.material.shininess,
  };
  util.drawBuffer(
      gl, programInfos.texturedPhong, scene.plane.bufferInfo, planeUniforms,
      globalUniforms);
}

function drawHUD(gl, programInfos, scene) {
  if (!window.showHUD) {
    return;
  }
  gl.disable(gl.CULL_FACE);
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
