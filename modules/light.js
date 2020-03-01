'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {degToRad} from './sceneHelpers.js';

export class DirectionalLight {
  constructor(gl, lightDirection, color) {
    this.lightDirection = lightDirection;
    this.color = color;
  }
}