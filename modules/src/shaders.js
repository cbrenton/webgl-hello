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
  float z = texture(u_texture, v_texcoord).r;
  float grey = linearize(z);
  finalColor = vec4(grey, grey, grey, 1);
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

out vec4 outColor;

void main() {
  outColor = vec4(gl_FragCoord.z);
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