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
uniform vec3 u_lightPos2;
uniform mat4 u_depthVP;
uniform mat4 u_depthVP2;
`;

phong.vert.outputs = `
out vec3 v_normal;
out vec3 v_viewVec;
out vec4 v_shadowCoord;
out vec4 v_shadowCoord2;
out vec3 v_lightToSurf;
out vec3 v_lightToSurf2;
`;

phong.vert.phongVert = `
void phongVert() {
  mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
  gl_Position = mvp * a_position;

  mat4 modelInverseTranspose = transpose(inverse(u_modelMatrix));
  v_normal = mat3(modelInverseTranspose) * a_normal;

  vec3 surfaceWorldPos = vec3(u_modelMatrix * a_position);
  v_lightToSurf = u_lightPos - surfaceWorldPos;
  v_lightToSurf2 = u_lightPos2 - surfaceWorldPos;
  v_viewVec = u_cameraPos - surfaceWorldPos;
  v_shadowCoord = u_depthVP * u_modelMatrix * a_position;
  v_shadowCoord2 = u_depthVP2 * u_modelMatrix * a_position;
}
`;

phong.frag.inputs = `
in vec3 v_normal;
in vec3 v_viewVec;
in vec4 v_shadowCoord;
in vec4 v_shadowCoord2;
in vec3 v_lightToSurf;
in vec3 v_lightToSurf2;

uniform bool u_useSoftShadows;
uniform bool u_useBlinnPhong;

uniform sampler2DShadow u_shadowMap;
uniform sampler2DShadow u_shadowMap2;
uniform float u_shadowMapSize;
uniform float u_bias;

uniform vec3 u_lightColor;
uniform vec3 u_lightColor2;
uniform vec3 u_lightAimDir;
uniform vec3 u_lightAimDir2;
uniform vec3 u_ambientColor;
uniform vec3 u_diffuseColor;
uniform vec3 u_specularColor;
uniform vec3 u_emissiveColor;
uniform float u_shininess;
`;

phong.frag.phongFrag = `
float getSpotFactor(vec3 lightAimDir, vec3 lightToSurf) {
  vec3 L = normalize(lightToSurf);
  vec3 D = normalize(lightAimDir);

  float cosineCutoff = cos(radians(60.0));
  float spotExponent = 5.0;

  float spotCosine = dot(D, -L);
  if (spotCosine >= cosineCutoff) {
    return pow(spotCosine, spotExponent);
  }
  return 0.0;
}

float shadowFactor(
    sampler2DShadow shadowMap,
    float shadowMapSize,
    vec4 shadowCoord,
    float bias,
    bool useSoftShadows) {
  vec4 shadowMapCoord = shadowCoord;
  shadowMapCoord.z -= bias;
  float visibility = textureProj(shadowMap, shadowMapCoord);

  if (useSoftShadows) {
    float count = 1.0;
    for (float y = -1.5; y <= 1.5; y += 1.0) {
      for (float x = -1.5; x <= 1.5; x += 1.0) {
        vec2 size = 1.0f / vec2(shadowMapSize);
        vec2 texOffset = vec2(x * size.x, y * size.y);
        vec4 tmpShadowCoord = shadowCoord;
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
    vec3 lightAimDir,
    vec3 lightToSurf,
    vec3 lightColor,
    sampler2DShadow shadowMap,
    float shadowMapSize,
    vec4 shadowCoord,
    float bias,
    bool useSoftShadows) {
  vec3 L = normalize(lightToSurf);
  vec3 N = normalize(v_normal);
  vec3 V = normalize(v_viewVec);

  // Shadows
  float visibility = shadowFactor(
      shadowMap,
      shadowMapSize,
      shadowCoord,
      bias,
      useSoftShadows);

  // Spotlight
  float spotFactor = getSpotFactor(lightAimDir, lightToSurf);
 
  // Diffuse
  vec3 diffuse = lightColor * max(dot(L, N), 0.0) * u_diffuseColor;

  // Specular
  float specularStrength = 1.0;
  vec3 specular = lightColor * u_specularColor;

  if (u_useBlinnPhong) {
    vec3 H = normalize(V + L);
    specular *= specularStrength * pow(max(dot(H, N), 0.0), u_shininess * 2.0);
  } else {
    vec3 R = -reflect(L, N);
    specular *= specularStrength * pow(max(dot(R, V), 0.0), u_shininess);
  }

  return (diffuse + specular) * visibility * spotFactor;
}

vec3 phongFrag() {
  float ambientStrength = 0.1;
  vec3 ambient = ambientStrength * u_lightColor * u_ambientColor;

  vec3 light1 = lightContrib(
      u_lightAimDir,
      v_lightToSurf,
      u_lightColor,
      u_shadowMap,
      u_shadowMapSize,
      v_shadowCoord,
      u_bias,
      u_useSoftShadows);

  vec3 light2 = lightContrib(
      u_lightAimDir2,
      v_lightToSurf2,
      u_lightColor2,
      u_shadowMap2,
      u_shadowMapSize,
      v_shadowCoord2,
      u_bias,
      u_useSoftShadows);

  return light1 + light2 + u_emissiveColor + ambient;
}
`;

export {phong};
