'use strict';

import {Vector3, Matrix4} from 'math.gl';
import * as util from './sceneHelpers.js';
import * as twgl from 'twgl.js';
import {Camera} from './camera.js';
import {DirectionalLight} from './light.js';

const sceneId = '5';
const startTime = performance.now();

window.useSoftShadows = true;

const shaders = {};
shaders.phongShader = {
  vs: `#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_reverseLightDir;
uniform vec3 u_cameraPos;
uniform mat4 u_depthMVP; // @TODO: this name isn't accurate

out vec2 v_texcoord;
out vec3 v_normal;
out vec3 v_surfToLight;
out vec3 v_surfToCamera;
out vec4 v_shadowCoord;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));
  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPos = vec3(u_modelMatrix * a_position);
  vec3 cameraWorldPos = mat3(u_modelMatrix) * u_cameraPos;

  v_surfToLight = u_reverseLightDir;
  v_surfToCamera = cameraWorldPos - surfaceWorldPos;

  vec4 fragPos = u_modelMatrix * a_position;
  v_shadowCoord = u_depthMVP * fragPos;

  v_texcoord = a_texcoord;
}`,
  fs: `#version 300 es
precision mediump float;

in vec2 v_texcoord;
in vec3 v_normal;
in vec3 v_surfToLight;
in vec3 v_surfToCamera;
in vec4 v_shadowCoord;

uniform float u_shadowMapSize;
uniform vec3 u_matColor;
uniform vec3 u_lightColor;
uniform sampler2D u_texture;
uniform sampler2D u_shadowMap;
uniform bool u_useSoftShadows;

out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  // Convert 3D world position to clip space(0 to 1)
  vec3 shadowCoord = v_shadowCoord.xyz / v_shadowCoord.w;

  float cameraDepth = shadowCoord.z;
  float shadowMapDepth = texture(u_shadowMap, shadowCoord.xy).r;

  float visibility = 0.0;
  float bias = 0.00001;

  if (cameraDepth - shadowMapDepth < bias) {
    visibility += 1.0;
  }

  if (u_useSoftShadows) {
    float count = 1.0;
    for (float y = -1.5; y <= 1.5; y += 1.0) {
      for (float x = -1.5; x <= 1.5; x += 1.0) {
        vec2 shadowMapSize = 1.0f / vec2(u_shadowMapSize);
        vec2 texOffset = vec2(x * shadowMapSize.x, y * shadowMapSize.y);
        float tmpShadowDepth = texture(u_shadowMap, shadowCoord.xy + texOffset).r;
        if (cameraDepth - tmpShadowDepth < bias) {
          visibility += 1.0;
        }
        count += 1.0;
      }
    }
    visibility /= count;
  }

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

  vec3 texColor = texture(u_texture, v_texcoord).xyz;
  vec3 result = (ambient + (specular + diffuse) * visibility) * u_matColor * texColor;
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

shaders.hudShader = {
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

float linearize(float depth) {
  float near = 0.1;
  float far = 100.0;
  return (2.0 * near) / (far + near - depth * (far - near));
}

void main() {
  float z = texture(u_texture, v_texcoord).r;
  float grey = linearize(z);
  finalColor = vec4(grey, grey, grey, 1);
}`,
};

shaders.simpleColorShader = {
  vs: `#version 300 es
in vec4 a_position;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;
}
`,
  fs: `#version 300 es
precision mediump float;

out vec4 outColor;

void main() {
  //outColor = vec4(1);
  outColor = vec4(gl_FragCoord.z);
}
`,
};

export default function render() {
  const gl = util.createGLCanvas(sceneId);
  const programInfos = {
    phong: util.createShaders(gl, shaders.phongShader),
    checkerboard: util.createShaders(gl, shaders.planeShader),
    hud: util.createShaders(gl, shaders.hudShader),
  };
  const depthProgramInfos = {
    phong: util.createShaders(gl, shaders.simpleColorShader),
    checkerboard: util.createShaders(gl, shaders.simpleColorShader),
    hud: util.createShaders(gl, shaders.simpleColorShader),
  }

  const scene = createScene(gl);
  drawFrame(gl, programInfos, depthProgramInfos, scene, performance.now());
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
      transform: new Matrix4().translate([3, 0, -6]),
    },
    plane: {
      bufferInfo: planeBufferInfo,
      color: new Vector3([0.3, 0.3, 0.3]),
      transform: new Matrix4().translate([0, -3, -4]).scale(20),
    },
    cube: {
      bufferInfo: cubeBufferInfo,
      color: new Vector3([0.2, 0.8, 0.2]),
      transform: new Matrix4().translate([-3, 0, -2]),
    },
    debugWindow: {
      bufferInfo: debugWindowBufferInfo,
    },
  };

  scene.camera = setupCamera(gl);
  scene.light = setupLight(gl);
  scene.textures = createTextures(gl);
  scene.shadowMap = setupShadowMap(gl);
  scene.hud = setupHUD(scene);

  return scene;
}

function setupShadowMap(gl) {
  const size = 1024;
  const depthFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);

  // Create depth buffer for renderbuffer
  const depthTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT32F, size, size, 0,
      gl.DEPTH_COMPONENT, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

  return {
    framebuffer: depthFramebuffer,
    texture: depthTexture,
    bufferSize: size,
  };
}

function setupCamera(gl) {
  const position = new Vector3([0, 2, 10]);
  const target = new Vector3([0, 0, -4]);
  const up = new Vector3([0, 0, -1]);
  const fovDegrees = 45;
  return new Camera(gl, position, target, up, fovDegrees);
}

function setupLight(gl) {
  const position = new Vector3([100, 100, 100]);
  const target = new Vector3([0, 0, -4]);
  const up = new Vector3([0, 0, -1]);
  const color = new Vector3([1, 1, 1]);
  return new DirectionalLight(gl, position, target, up, color);
}

function setupHUD(scene) {
  return {
    viewMatrix: new Matrix4(),
    projMatrix: new Matrix4().ortho(
        {left: -1, right: 1, bottom: -1, top: 1, near: 0.1, far: 10}),
    texture: scene.shadowMap.texture,
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

  gl.bindTexture(gl.TEXTURE_2D, null);

  return textures;
}

function drawFrame(gl, programInfos, depthProgramInfos, scene, timestamp) {
  // Draw to texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, scene.shadowMap.framebuffer);
  gl.viewport(0, 0, scene.shadowMap.bufferSize, scene.shadowMap.bufferSize);
  drawScene(
      gl, depthProgramInfos, scene, scene.light, new Matrix4(), timestamp);

  // Draw to canvas
  const lightMVP = new Matrix4();
  // Convert from [-1, 1] to [0, 0]
  lightMVP.translate(new Vector3([0.5, 0.5, 0.5]));
  lightMVP.scale(new Vector3([0.5, 0.5, 0.5]));
  lightMVP.multiplyRight(scene.light.projMatrix);
  lightMVP.multiplyRight(scene.light.viewMatrix);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  drawScene(gl, programInfos, scene, scene.camera, lightMVP, timestamp);
  drawHUD(gl, programInfos, scene);

  requestAnimationFrame(function(timestamp) {
    drawFrame(gl, programInfos, depthProgramInfos, scene, timestamp);
  });
}

function drawScene(gl, programInfos, scene, renderCamera, lightMVP, timestamp) {
  const elapsedMs = timestamp - startTime;
  const msPerRotation = 8000;
  const rotationRadians = 2 * Math.PI * (elapsedMs / msPerRotation);

  gl.clearColor(0, 0, 0, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const globalUniforms = {
    u_reverseLightDir: new Vector3().copy(scene.light.lightDirection).scale(-1),
    u_lightColor: scene.light.color,
    u_cameraPos: renderCamera.worldPosition(),
    u_depthMVP: lightMVP,
    u_shadowMap: scene.shadowMap.texture,
    u_texture: scene.textures.checkerboardTexture,
    u_shadowMapSize: scene.shadowMap.bufferSize,
    u_useSoftShadows: window.useSoftShadows,
  }

  // Draw sphere
  const sphereUniforms = {
    u_modelMatrix:
        new Matrix4().copy(scene.sphere.transform).rotateY(rotationRadians),
    u_viewMatrix: renderCamera.viewMatrix,
    u_projectionMatrix: renderCamera.projMatrix,
    u_matColor: scene.sphere.color,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.sphere.bufferInfo, sphereUniforms,
      globalUniforms);

  // Draw cube
  const cubeUniforms = {
    u_modelMatrix:
        new Matrix4().copy(scene.cube.transform).rotateY(rotationRadians),
    u_viewMatrix: renderCamera.viewMatrix,
    u_projectionMatrix: renderCamera.projMatrix,
    u_matColor: scene.cube.color,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.cube.bufferInfo, cubeUniforms,
      globalUniforms);

  // Draw plane
  const planeUniforms = {
    u_modelMatrix: scene.plane.transform,
    u_viewMatrix: renderCamera.viewMatrix,
    u_projectionMatrix: renderCamera.projMatrix,
    u_matColor: scene.plane.color,
  };
  util.drawBuffer(
      gl, programInfos.phong, scene.plane.bufferInfo, planeUniforms,
      globalUniforms);
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
