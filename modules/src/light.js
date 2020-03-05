'use strict';

import {Vector3, Matrix4} from 'math.gl';

import {degToRad} from 'util/scene-helpers.js';

export class PointLight {
  constructor(gl, position, target, color) {
    this.position = position;
    this.target = target;
    this.up = new Vector3([0, 1, 0]);
    // Use [0, 1, 0] as the up vector except when the light direction is
    // straight up or down
    if (position.x === target.x && position.z === target.z) {
      this.up = new Vector3([0, 0, 1]);
    }
    this.color = color;
    this.isPerspective = false;

    this.fov = degToRad(90);
    this.near = 0.1;
    this.far = 100.0;

    this.aspect = 1.0;
    this.tag = 'light';
  }

  get viewMatrix() {
    return new Matrix4().lookAt({
      eye: this.position,
      center: this.target,
      up: this.up,
    });
  }

  get projMatrix() {
    // @TODO: eventually break this out into a PointLight class and pass more
    // info into the shader (e.g. light type and far plane distance)
    if (this.isPerspective) {
      return new Matrix4().perspective(
          {fov: this.fov, aspect: this.aspect, near: this.near, far: this.far});
    } else {
      const orthoSize = 20;
      return new Matrix4().ortho({
        left: -orthoSize,
        right: orthoSize,
        bottom: -orthoSize,
        top: orthoSize,
        near: this.near,
        far: this.far,
      });
    }
  }

  getViewProjectionMatrix() {
    const lightVP = new Matrix4();
    // Convert from [-1, 1] to [0, 1]
    lightVP.translate(new Vector3([0.5, 0.5, 0.5]));
    lightVP.scale(new Vector3([0.5, 0.5, 0.5]));
    lightVP.multiplyRight(this.projMatrix);
    lightVP.multiplyRight(this.viewMatrix);
    return lightVP;
  }
}