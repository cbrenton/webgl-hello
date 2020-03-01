'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {degToRad} from './sceneHelpers.js';

export class Camera {
  constructor(gl, position, target, fovDegrees) {
    this.position = position;
    this.target = target;
    this.up = new Vector3([0, 1, 0]);
    this.fov = degToRad(fovDegrees);
    this.aspect =
        parseFloat(gl.canvas.clientWidth) / parseFloat(gl.canvas.clientHeight);
    this.near = 0.1;
    this.far = 100.0;

    this.viewMatrix = new Matrix4().lookAt(
        {eye: this.position, center: this.target, up: this.up});

    this.projMatrix = new Matrix4().perspective(
        {fov: this.fov, aspect: this.aspect, near: this.near, far: this.far});
  }

  worldPosition() {
    return new Matrix4().copy(this.viewMatrix).transform(this.position);
  }
}