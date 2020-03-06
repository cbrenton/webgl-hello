'use strict';

import {createTextures} from 'twgl.js';

let lastFrameTime = 0;
const nFrames = 100;
let lastNTimes = new Array(nFrames);
let nTimeSum = 0;
let frameIndex = 0;
let curFrameRenderTime = 0;
window.yOffset = 500;

/**
 * Add the current render time to the circular buffer and return the current
 * average render time.
 */
export function logFrame(textContext) {
  // @TODO: woof, clean this up
  const time = performance.now();
  let toBeRemoved = lastNTimes[frameIndex];
  let isUnset = false;
  if (toBeRemoved === undefined) {
    toBeRemoved = 0;
    isUnset = true;
  }
  const diff = time - lastFrameTime;
  lastNTimes[frameIndex] = diff;
  nTimeSum -= toBeRemoved;
  nTimeSum += diff;
  frameIndex = (frameIndex + 1) % nFrames;
  curFrameRenderTime = nTimeSum / nFrames;
  lastFrameTime = time;
  const renderTime = nTimeSum / nFrames;
  if (!isUnset) {
    drawFPS(textContext, renderTime);
  }
}

function drawFPS(textContext, renderTime) {
  const fps = 1000.0 / renderTime;
  textContext.canvas.width = textContext.canvas.clientWidth;
  textContext.canvas.height = textContext.canvas.clientHeight;
  textContext.clearRect(
      0, 0, textContext.canvas.width, textContext.canvas.height);
  const yOffset = textContext.canvas.clientHeight - 10;
  textContext.fillText(
      `render time: ${renderTime.toFixed(2)} ms, fps: ${parseInt(fps)}`, 10,
      yOffset);
}