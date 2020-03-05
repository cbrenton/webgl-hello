'use strict';

import {Vector3, Matrix4} from 'math.gl';

import {degToRad} from 'util/scene-helpers.js';

export class Camera {
  constructor(gl, position, target, up, fovDegrees) {
    this.position = position;
    this.target = target;
    this.up = up;
    this.fov = degToRad(fovDegrees);
    this.aspect =
        parseFloat(gl.canvas.clientWidth) / parseFloat(gl.canvas.clientHeight);
    this.near = 0.1;
    this.far = 100.0;
    this.tag = 'camera';
  }

  get viewMatrix() {
    return new Matrix4().lookAt(
        {eye: this.position, center: this.target, up: this.up});
  }

  get projMatrix() {
    return new Matrix4().perspective(
        {fov: this.fov, aspect: this.aspect, near: this.near, far: this.far});
  }
}