'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {degToRad} from '../util/sceneHelpers.js';

export class PointLight {
  constructor(gl, position, target, up, color) {
    this.position = position;
    this.target = target;
    this.up = up;
    this.color = color;

    this.fov = degToRad(90);
    this.near = 0.1;
    this.far = 1000.0;

    this.viewMatrix = new Matrix4().lookAt({
      eye: this.position,
      center: this.target,
      up: this.up,
    });

    this.aspect = 1.0;
    this.projMatrix = new Matrix4().perspective(
        {fov: this.fov, aspect: this.aspect, near: this.near, far: this.far});
  }

  getViewProjectionMatrix() {
    const lightVP = new Matrix4();
    // Convert from [-1, 1] to [0, 0]
    lightVP.translate(new Vector3([0.5, 0.5, 0.5]));
    lightVP.scale(new Vector3([0.5, 0.5, 0.5]));
    lightVP.multiplyRight(this.projMatrix);
    lightVP.multiplyRight(this.viewMatrix);
    return lightVP;
  }
}