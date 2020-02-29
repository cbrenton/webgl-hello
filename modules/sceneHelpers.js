import * as twgl from 'twgl.js';

/* ======== GL helper functions ======== */

export function createCanvas(id, isDebug) {
  isDebug = isDebug || false;
  const el = document.createElement('div');
  el.setAttribute('class', 'canvasContainer');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('id', `c${id}`);

  el.appendChild(canvas);
  document.body.appendChild(el);
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

export function createShaders(gl, shaders) {
  return twgl.createProgramInfo(gl, [shaders.vs, shaders.fs]);
}

export function drawBuffer(gl, programInfo, bufferInfo, uniforms) {
  gl.useProgram(programInfo.program);

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
