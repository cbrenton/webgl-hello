'use strict';

import * as util from 'util/scene-helpers.js';
import * as define_common from './shaders-common.js';

const shaders = {};

shaders.phong = {};
shaders.phong.vs = `#version 300 es
  ${define_common.phong.vert.inputs}

  ${define_common.phong.vert.outputs}

  ${define_common.phong.vert.phongVert}

  void main() {
    phongVert();
  }
`;
shaders.phong.fs = `#version 300 es
  precision mediump float;
  precision highp sampler2DShadow;

  ${define_common.phong.frag.inputs}

  out vec4 finalColor;

  ${define_common.phong.frag.phongFrag}

  void main() {
    finalColor = vec4(phongFrag(), 1.0);
  }
`;

shaders.texturedPhong = {};
shaders.texturedPhong.vs = `#version 300 es
  ${define_common.phong.vert.inputs}
  in vec2 a_texcoord;

  ${define_common.phong.vert.outputs}
  out vec2 v_texcoord;

  ${define_common.phong.vert.phongVert}

  void main() {
    phongVert();

    v_texcoord = a_texcoord;
  }
`;
shaders.texturedPhong.fs = `#version 300 es
  precision mediump float;
  precision highp sampler2DShadow;

  ${define_common.phong.frag.inputs}
  in vec2 v_texcoord;

  uniform sampler2D u_texture;

  out vec4 finalColor;

  ${define_common.phong.frag.phongFrag}

  void main() {
    vec3 result = phongFrag() * texture(u_texture, v_texcoord).xyz;
    finalColor = vec4(result, 1.0);
  }
`;

shaders.flatTexture = {};
shaders.flatTexture.vs = `#version 300 es
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
`;
shaders.flatTexture.fs = `#version 300 es
  precision mediump float;

  in vec2 v_texcoord;

  uniform vec3 u_matColor;
  uniform sampler2D u_texture;

  out vec4 finalColor;

  void main() {
    finalColor = texture(u_texture, v_texcoord) * vec4(u_matColor, 1);
  }
`;

shaders.hud = {};
shaders.hud.vs = `#version 300 es
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
  }
`;
shaders.hud.fs = `#version 300 es
  precision mediump float;

  in vec2 v_texcoord;

  uniform sampler2D u_texture;

  out vec4 finalColor;

  void main() {
    finalColor = texture(u_texture, v_texcoord);
  }
`;

shaders.simpleColor = {};
shaders.simpleColor.vs = `#version 300 es
  in vec4 a_position;

  uniform mat4 u_modelMatrix;
  uniform mat4 u_viewMatrix;
  uniform mat4 u_projectionMatrix;

  void main() {
    mat4 mvp = u_projectionMatrix * u_viewMatrix * u_modelMatrix;
    gl_Position = mvp * a_position;
  }
`;
shaders.simpleColor.fs = `#version 300 es
  precision mediump float;

  uniform vec3 u_diffuseColor;

  out vec4 outColor;

  void main() {
    outColor = vec4(u_diffuseColor, 1);
  }
`;

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