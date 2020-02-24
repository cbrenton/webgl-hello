export function addDebugControls (id) {
  const el = document.getElementById(`c${id}`);
  const debugHtml = `
<div id="debug${id}">
    <input type="range" min="-360" max="360" value="0" step="5" class="slider" id="rotationSlider${id}" oninput="document.getElementById('rotationText${id}').innerHTML = this.value;">
    <span id="rotationText${id}">0</span>
      <input type="range" min="0" max="20" value="10" step="1" class="slider" id="zoomSlider${id}" oninput="document.getElementById('zoomText').innerHTML = this.value;">
      <span id="zoomText${id}">0</span>
      <input type="checkbox" id="topDownCheckbox${id}">
</div>
  `;
  el.insertAdjacentHTML('afterend', debugHtml);
}

export function degToRad (degrees) {
  return degrees * Math.PI / 180;
}
