'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {degToRad} from './sceneHelpers.js';

export class DirectionalLight {
  constructor(gl, position, target, up, color) {
    this.position = position;
    this.target = target;
    this.lightDirection = new Vector3().copy(target).subtract(position);
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
    this.projMatrix = new Matrix4().projMatrix = new Matrix4().perspective(
        {fov: this.fov, aspect: this.aspect, near: this.near, far: this.far});
  }

  worldPosition() {
    return new Matrix4().copy(this.viewMatrix).transform(this.position);
  }
}