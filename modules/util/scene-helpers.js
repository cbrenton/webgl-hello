import * as twgl from 'twgl.js';

window.showHUD = false;

/* ======== GL helper functions ======== */

export function createCanvas(id, description, isDebug) {
  isDebug = isDebug || false;
  const container = document.createElement('div');
  container.setAttribute('class', 'canvasContainerContainer');

  const el = document.createElement('div');
  el.setAttribute('class', 'canvasContainer');

  const canvasesHolder = document.createElement('div');
  canvasesHolder.setAttribute('class', 'canvases');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('class', 'inner');
  canvas.setAttribute('id', `c${id}`);

  const textCanvas = document.createElement('canvas');
  textCanvas.setAttribute('class', 'overlay');
  textCanvas.setAttribute('id', `overlay${id}`);

  const label = document.createElement('span');
  label.innerHTML = description;
  label.setAttribute('class', 'inner');

  el.appendChild(canvasesHolder);
  canvasesHolder.appendChild(canvas);
  canvasesHolder.appendChild(textCanvas);
  canvasesHolder.appendChild(label);
  container.appendChild(el);
  document.body.appendChild(container);
  resizeCanvasToMatchDisplaySize(canvas);
  if (isDebug) {
    addDebugControls(id);
  }
  return canvas;
}

export function createGLCanvas(id, isDebug) {
  const canvas = createCanvas(id, isDebug);
  const gl = initGL(canvas, id);
  return gl;
}

export function getOverlayCanvas(id) {
  return document.getElementById(`overlay${id}`);
}

export function createShaders(gl, shaders) {
  return twgl.createProgramInfo(gl, [shaders.vs, shaders.fs]);
}

export function drawBuffer(
    gl, programInfo, bufferInfo, uniforms, globalUniforms) {
  gl.useProgram(programInfo.program);

  if (globalUniforms !== undefined) {
    twgl.setUniforms(programInfo, globalUniforms);
  }
  twgl.setUniforms(programInfo, uniforms);

  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);

  twgl.drawBufferInfo(gl, bufferInfo);
}

/* ======== Utility functions ======== */

export function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/* ======== Private functions ======== */

function initGL(canvas, id) {
  const gl = canvas.getContext('webgl2');
  if (!gl) {
    window.alert('Couldn\'t get WebGL context');
  }
  window[`gl${id}`] = gl;
  return gl;
}

function resizeCanvasToMatchDisplaySize(canvas) {
  // look up the size the canvas is displayed
  var desiredWidth = canvas.clientWidth;
  var desiredHeight = canvas.clientHeight;

  // if the number of pixels in the canvas doesn't match
  // update the canvas's content size.
  if (canvas.width != desiredWidth || canvas.height != desiredHeight) {
    canvas.width = desiredWidth;
    canvas.height = desiredHeight;
  }
}

function addDebugControls(id) {
  const el = document.getElementById(`c${id}`);
  const debugHtml = `
<div id="debug${id}">
    <input type="range" min="-360" max="360" value="0" step="5" class="slider" id="rotationSlider${
      id}" oninput="document.getElementById('rotationText${
      id}').innerHTML = this.value;">
    <span id="rotationText${id}">0</span>
      <input type="range" min="0" max="20" value="10" step="1" class="slider" id="zoomSlider${
      id}" oninput="document.getElementById('zoomText${
      id}').innerHTML = this.value;">
      <span id="zoomText${id}">0</span>
      <input type="checkbox" id="topDownCheckbox${id}">
</div>
  `;
  el.insertAdjacentHTML('afterend', debugHtml);
}
