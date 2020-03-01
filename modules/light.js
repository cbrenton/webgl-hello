'use strict';

import {Vector3, Matrix4} from 'math.gl';
import {degToRad} from './sceneHelpers.js';

export class Light {
  constructor(gl, position, color) {
    this.position = position;
    this.color = color;
  }
}