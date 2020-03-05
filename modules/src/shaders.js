'use strict';

import * as util from '../util/sceneHelpers.js';

const shaders = {};

shaders.phong = {
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
precision highp sampler2DShadow;

in vec3 v_normal;
in vec3 v_viewVec;
in vec4 v_shadowCoord;
in vec3 v_lightPos;

uniform float u_shadowMapSize;
uniform float u_shininess;
uniform float u_bias;
uniform vec3 u_diffuseColor;
uniform vec3 u_specularColor;
uniform vec3 u_ambientColor;
uniform vec3 u_lightColor;
uniform sampler2DShadow u_shadowMap;
uniform bool u_useSoftShadows;

out vec4 finalColor;

void main() {
  vec3 L = normalize(v_lightPos);
  vec3 N = normalize(v_normal);
  vec3 V = normalize(v_viewVec);
  vec3 R = -reflect(L, N);

  vec4 shadowMapCoord = v_shadowCoord;
  shadowMapCoord.z -= u_bias;

  float visibility = textureProj(u_shadowMap, shadowMapCoord);

  // @TODO: clean this up
  if (u_useSoftShadows) {
    float count = 1.0;
    for (float y = -1.5; y <= 1.5; y += 1.0) {
      for (float x = -1.5; x <= 1.5; x += 1.0) {
        vec2 shadowMapSize = 1.0f / vec2(u_shadowMapSize);
        vec2 texOffset = vec2(x * shadowMapSize.x, y * shadowMapSize.y);
        vec4 tmpShadowCoord = v_shadowCoord;
        tmpShadowCoord.xy += texOffset;
        tmpShadowCoord.z -= u_bias;
        visibility += textureProj(u_shadowMap, tmpShadowCoord);
        count += 1.0;
      }
    }
    visibility /= count;
  }

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

  vec3 result = ((specular + diffuse) * visibility + ambient);
  finalColor = vec4(result, 1.0);
}`,
};

shaders.texturedPhong = {
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
precision highp sampler2DShadow;

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
uniform sampler2DShadow u_shadowMap;
uniform bool u_useSoftShadows;
uniform float u_bias;

out vec4 finalColor;

void main() {
  vec3 L = normalize(v_lightPos);
  vec3 N = normalize(v_normal);
  vec3 V = normalize(v_viewVec);
  vec3 R = -reflect(L, N);

  vec4 shadowMapCoord = v_shadowCoord;
  shadowMapCoord.z -= u_bias;

  float visibility = textureProj(u_shadowMap, shadowMapCoord);

  // @TODO: clean this up
  if (u_useSoftShadows) {
    float count = 1.0;
    for (float y = -1.5; y <= 1.5; y += 1.0) {
      for (float x = -1.5; x <= 1.5; x += 1.0) {
        vec2 shadowMapSize = 1.0f / vec2(u_shadowMapSize);
        vec2 texOffset = vec2(x * shadowMapSize.x, y * shadowMapSize.y);
        vec4 tmpShadowCoord = v_shadowCoord;
        tmpShadowCoord.xy += texOffset;
        tmpShadowCoord.z -= u_bias;
        visibility += textureProj(u_shadowMap, tmpShadowCoord);
        count += 1.0;
      }
    }
    visibility /= count;
  }

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
  vec3 result = ((specular + diffuse) * visibility + ambient) * texColor;
  finalColor = vec4(result, 1.0);
}`,
};

shaders.flatTexture = {
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

float linearize(float depth) {
  float near = 0.1;
  float far = 100.0;
  return (2.0 * near) / (far + near - depth * (far - near));
}

void main() {
  finalColor = texture(u_texture, v_texcoord);
}`,
};

shaders.simpleColor = {
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

uniform vec3 u_diffuseColor;

out vec4 outColor;

void main() {
  outColor = vec4(u_diffuseColor, 1);
}
`,
};

function loadShaders(gl, shaderList) {
  const result = {
    render: {},
    depth: {},
  };
  for (const shaderName of shaderList) {
    if (!(shaderName in shaders)) {
      throw `Exception: "${shaderName}" is not a valid shader`;
    }
    result.render[shaderName] = util.createShaders(gl, shaders[shaderName]);
    result.depth[shaderName] = util.createShaders(gl, shaders.simpleColor);
  }
  return result;
}

export {loadShaders};