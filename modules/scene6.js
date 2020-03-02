'use strict';

import {Vector3, Matrix4} from 'math.gl';
import * as util from './sceneHelpers.js';
import * as twgl from 'twgl.js';
import {parseObj} from './objParser.js';
import * as bunny from './bunny.obj.js';
import {Camera} from './camera.js';
import {PointLight} from './light.js';

const sceneId = '6';
const description = `
<b>Scene 6:</b>
A scene with .obj file loading, Phong lighting, texture mapping,
and soft shadows via shadow mapping.
`;
const startTime = performance.now();

window.useSoftShadows = true;

const shaders = {};
shaders.phongShader = {
  vs: `#version 300 es
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_cameraPos;
uniform vec3 u_lightPos;
uniform mat4 u_depthVP;

out vec3 v_normal;
out vec3 v_viewVec;
out vec4 v_shadowCoord;
out vec3 v_lightPos;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));
  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPos = vec3(u_modelMatrix * a_position);
  v_lightPos = u_lightPos;
  v_viewVec= u_cameraPos - surfaceWorldPos;
  v_shadowCoord = u_depthVP * u_modelMatrix * a_position;
}`,
  fs: `#version 300 es
precision mediump float;

in vec3 v_normal;
in vec3 v_viewVec;
in vec4 v_shadowCoord;
in vec3 v_lightPos;

uniform float u_shadowMapSize;
uniform float u_shininess;
uniform vec3 u_diffuseColor;
uniform vec3 u_specularColor;
uniform vec3 u_ambientColor;
uniform vec3 u_lightColor;
uniform sampler2D u_shadowMap;
uniform bool u_useSoftShadows;

out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  // Convert 3D world position to clip space (0 to 1)
  vec3 shadowCoord = v_shadowCoord.xyz / v_shadowCoord.w;

  float cameraDepth = shadowCoord.z;
  float shadowMapDepth = texture(u_shadowMap, shadowCoord.xy).r;

  float visibility = 0.0;
  float bias = 0.00002;

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

  vec3 L = normalize(v_lightPos);
  vec3 N = normal;
  vec3 V = normalize(v_viewVec);
  vec3 R = -reflect(L, N);

  // Diffuse
  vec3 diffuse = u_lightColor * dot(L, N) * u_diffuseColor;

  // Specular
  float specularStrength = 1.0;
  vec3 specular = vec3(0);
  if (dot(R, V) > 0.0) {
    specular = specularStrength * pow(dot(R, V), u_shininess) * u_lightColor * u_specularColor;
  }

  // Ambient
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * u_lightColor * u_ambientColor;

  vec3 result = (ambient + (specular + diffuse) * visibility);;
  finalColor = vec4(result, 1.0);
}`,
};

shaders.texturedPhongShader = {
  vs: `#version 300 es
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texcoord;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_cameraPos;
uniform vec3 u_lightPos;
uniform mat4 u_depthVP;

out vec2 v_texcoord;
out vec3 v_normal;
out vec3 v_viewVec;
out vec4 v_shadowCoord;
out vec3 v_lightPos;

void main() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));
  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPos = vec3(u_modelMatrix * a_position);
  v_lightPos = u_lightPos;
  v_viewVec= u_cameraPos - surfaceWorldPos;
  v_shadowCoord = u_depthVP * u_modelMatrix * a_position;
  v_texcoord = a_texcoord;
}`,
  fs: `#version 300 es
precision mediump float;

in vec2 v_texcoord;
in vec3 v_normal;
in vec3 v_viewVec;
in vec4 v_shadowCoord;
in vec3 v_lightPos;

uniform float u_shadowMapSize;
uniform float u_shininess;
uniform vec3 u_diffuseColor;
uniform vec3 u_specularColor;
uniform vec3 u_ambientColor;
uniform vec3 u_lightColor;
uniform sampler2D u_texture;
uniform sampler2D u_shadowMap;
uniform bool u_useSoftShadows;

out vec4 finalColor;

void main() {
  vec3 normal = normalize(v_normal);

  // Convert 3D world position to clip space (0 to 1)
  vec3 shadowCoord = v_shadowCoord.xyz / v_shadowCoord.w;

  float cameraDepth = shadowCoord.z;
  float shadowMapDepth = texture(u_shadowMap, shadowCoord.xy).r;

  float visibility = 0.0;
  float bias = 0.00002;

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

  vec3 L = normalize(v_lightPos);
  vec3 N = normal;
  vec3 V = normalize(v_viewVec);
  vec3 R = -reflect(L, N);

  // Diffuse
  vec3 diffuse = u_lightColor * dot(L, N) * u_diffuseColor;

  // Specular
  float specularStrength = 1.0;
  vec3 specular = vec3(0);
  if (dot(R, V) > 0.0) {
    specular = specularStrength * pow(dot(R, V), u_shininess) * u_lightColor * u_specularColor;
  }

  // Ambient
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * u_lightColor * u_ambientColor;

  vec3 texColor = texture(u_texture, v_texcoord).xyz;
  vec3 result = (ambient + (specular + diffuse) * visibility) * texColor;
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
  outColor = vec4(gl_FragCoord.z);
}
`,
};

export default function render() {
  const gl = util.createGLCanvas(sceneId, description);
  const programInfos = {
    phong: util.createShaders(gl, shaders.phongShader),
    texturedPhong: util.createShaders(gl, shaders.texturedPhongShader),
    checkerboard: util.createShaders(gl, shaders.planeShader),
    hud: util.createShaders(gl, shaders.hudShader),
  };
  const depthProgramInfos = {
    phong: util.createShaders(gl, shaders.simpleColorShader),
    texturedPhong: util.createShaders(gl, shaders.simpleColorShader),
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
  const position = new Vector3([30, 30, 20]);
  const target = new Vector3([0, 0, -2]);
  const up = new Vector3([0, 1, 0]);
  const color = new Vector3([1, 1, 1]);
  return new PointLight(gl, position, target, up, color);
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

function drawFrame(gl, programInfos, depthProgramInfos, scene, timestamp) {
  // Draw to texture
  gl.bindFramebuffer(gl.FRAMEBUFFER, scene.shadowMap.framebuffer);
  gl.viewport(0, 0, scene.shadowMap.bufferSize, scene.shadowMap.bufferSize);
  drawScene(
      gl, depthProgramInfos, scene, scene.light, new Matrix4(), timestamp);

  // Draw to canvas
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  drawScene(
      gl, programInfos, scene, scene.camera,
      scene.light.getViewProjectionMatrix(), timestamp);
  drawHUD(gl, programInfos, scene);

  requestAnimationFrame(function(timestamp) {
    drawFrame(gl, programInfos, depthProgramInfos, scene, timestamp);
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
    u_shadowMap: scene.shadowMap.texture,
    u_shadowMapSize: scene.shadowMap.bufferSize,
    u_useSoftShadows: window.useSoftShadows,
  }

  // Draw sphere
  const sphereUniforms = {
    u_modelMatrix: new Matrix4()
                       .copy(scene.sphere.transform)
                       .rotateY(rotationRadians)
                       .translate(new Vector3([0, 0, 4])),
    u_matColor: scene.sphere.material.color,
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
