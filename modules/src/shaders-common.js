'use strict';

const phong = {
  vert: {},
  frag: {},
};

phong.vert.inputs = `
in vec4 a_position;
in vec3 a_normal;

uniform mat4 u_modelMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform vec3 u_cameraPos;
uniform vec3 u_lightPos;
uniform mat4 u_depthVP;
`;

phong.vert.outputs = `
out vec3 v_normal;
out vec3 v_viewVec;
out vec4 v_shadowCoord;
out vec3 v_lightDir;
`;

phong.vert.phongVert = `
void phongVert() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));
  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPos = vec3(u_modelMatrix * a_position);
  v_lightDir = u_lightPos - surfaceWorldPos;
  v_viewVec = u_cameraPos - surfaceWorldPos;
  v_shadowCoord = u_depthVP * u_modelMatrix * a_position;
}
`;

phong.frag.inputs = `
in vec3 v_normal;
in vec3 v_viewVec;
in vec4 v_shadowCoord;
in vec3 v_lightDir;

uniform bool u_useSoftShadows;

uniform sampler2DShadow u_shadowMap;
uniform float u_shadowMapSize;
uniform float u_bias;

uniform vec3 u_lightColor;
uniform vec3 u_ambientColor;
uniform vec3 u_diffuseColor;
uniform vec3 u_specularColor;
uniform float u_shininess;
`;

phong.frag.phongFrag = `

float shadowFactor(
    sampler2DShadow shadowMap,
    float shadowMapSize,
    float bias,
    bool useSoftShadows) {
  vec4 shadowMapCoord = v_shadowCoord;
  shadowMapCoord.z -= bias;
  float visibility = textureProj(shadowMap, shadowMapCoord);

  if (useSoftShadows) {
    float count = 1.0;
    for (float y = -1.5; y <= 1.5; y += 1.0) {
      for (float x = -1.5; x <= 1.5; x += 1.0) {
        vec2 size = 1.0f / vec2(shadowMapSize);
        vec2 texOffset = vec2(x * size.x, y * size.y);
        vec4 tmpShadowCoord = v_shadowCoord;
        tmpShadowCoord.xy += texOffset;
        tmpShadowCoord.z -= bias;
        visibility += textureProj(shadowMap, tmpShadowCoord);
        count += 1.0;
      }
    }
    visibility /= count;
  }
  return visibility;
}

vec3 lightContrib(
    vec3 lightDir,
    vec3 lightColor,
    sampler2DShadow shadowMap,
    float shadowMapSize,
    float bias,
    bool useSoftShadows) {
  vec3 L = normalize(lightDir);
  vec3 N = normalize(v_normal);
  vec3 V = normalize(v_viewVec);
  vec3 R = -reflect(L, N);

  // Shadows
  float visibility = shadowFactor(
      shadowMap,
      shadowMapSize,
      bias,
      useSoftShadows);

  // Diffuse
  vec3 diffuse = u_lightColor * max(dot(L, N), 0.0) * u_diffuseColor;

  // Specular
  float specularStrength = 1.0;
  vec3 specular = u_lightColor * u_specularColor;
  specular *= specularStrength * pow(max(dot(R, V), 0.0), u_shininess);

  // Ambient
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * u_lightColor * u_ambientColor;

  return (diffuse + specular) * visibility + ambient;
}

vec3 phongFrag() {
  return lightContrib(
      v_lightDir,
      u_lightColor,
      u_shadowMap,
      u_shadowMapSize,
      u_bias,
      u_useSoftShadows);
}
`;

export {phong};
