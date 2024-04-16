/* Import libraries */
import * as dat from 'dat.gui';

/* Import shaders */
import vert from './shaders/vertex.vert';
import fragTop from './shaders/fragTop.frag';
import fragBottom from './shaders/fragBottom.frag';
import shaderToy from './shaders/shaderToy.frag';

/* Load Audio File */
const spell2 = new URL('./st7-8bm.mp3', import.meta.url);
let audio1 = new Audio();
audio1.loop = true;

const audioCtx = new AudioContext();
const analyzer = audioCtx.createAnalyser();
analyzer.fftSize = 1024;
const bufferLength = analyzer.frequencyBinCount;;
const dataArray = new Uint8Array(bufferLength)
let fileName = '';
audio1.addEventListener("canplaythrough", event => {
    const path = document.getElementById('upload__path');
    path.textContent = fileName;

    const audioSrc = audioCtx.createMediaElementSource(audio1);
    audioSrc.connect(analyzer);
    analyzer.connect(audioCtx.destination);
    audio1.play();
});

const file = document.getElementById('upload');
file.addEventListener('change', async function(e) {
    const path = document.getElementById('upload__path');
    const files = this.files;
    path.textContent = 'Uploading...';
    fileName = files[0].name;

    audio1.src = URL.createObjectURL(files[0]);
    audio1.load();
});

/* Dat Gui */
const gui = new dat.GUI({ autoPlace: false });
gui.domElement.id = 'gui';
const gui_container = document.getElementById('dat-gui-container');
gui_container.appendChild(gui.domElement);
const datGuiUniforms = { 
  conectivity: 1.0,
  speed: 1.0,
  color: [153, 178, 51],
  frequency: 10.0,
};
gui.add(datGuiUniforms, 'conectivity', 0.0, 5.0, 0.1);
gui.add(datGuiUniforms, 'speed', 0.1, 10.0, 0.1);
gui.add(datGuiUniforms, 'frequency', 0, 511.0, 1.0);
gui.addColor(datGuiUniforms, 'color');


/* Load WebGL2 */
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl2');


/* Configure canvas and gl viewport */
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);


/*  Create vertices of rectangle */
const position_cordinates = new Float32Array([
  -1.0, 1.0,
  -1.0, -1.0,
  1.0, 1.0,
  1.0, -1.0,
]);
const position_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
gl.bufferData(gl.ARRAY_BUFFER, position_cordinates, gl.STATIC_DRAW);


/* Turn shaders into program */
const vertex_shader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertex_shader, vert);
gl.compileShader(vertex_shader);
console.log('vertex shader info log: ', gl.getShaderInfoLog(vertex_shader));

const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragment_shader, `${fragTop} \n ${shaderToy} \n ${fragBottom}`);
gl.compileShader(fragment_shader);
console.log('fragment shader info log: ', gl.getShaderInfoLog(fragment_shader));

const program = gl.createProgram();
gl.attachShader(program, vertex_shader);
gl.attachShader(program, fragment_shader);
gl.linkProgram(program);
console.log('Program info log: ', gl.getProgramInfoLog(program));


/* Make vertex specification and store it into vertex array object */
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const position_location = gl.getAttribLocation(program, 'position');
gl.bindBuffer(gl.ARRAY_BUFFER, position_buffer);
gl.vertexAttribPointer(position_location, 2, gl.FLOAT, false, 0, 0);


/* Bind program, enable vertex attributes */
gl.useProgram(program);
gl.enableVertexAttribArray(position_location);

/* Initialize uniforms */
const iTime = gl.getUniformLocation(program, 'iTime');
gl.uniform1f(iTime, 0);
const iResolution = gl.getUniformLocation(program, 'iResolution');
gl.uniform3f(iResolution, canvas.width, canvas.height, canvas.width / canvas.height);
const iMouse = gl.getUniformLocation(program, 'iMouse'); 
gl.uniform4f(iMouse, 0, 0, 0, 0);
const iConectivity = gl.getUniformLocation(program, 'iConectivity');
gl.uniform1f(iConectivity, datGuiUniforms.conectivity);
const iColor = gl.getUniformLocation(program, 'iColor');
gl.uniform3f(iColor, datGuiUniforms.color[0]/255, datGuiUniforms.color[1]/255, datGuiUniforms.color[2]/255);
const iFrequency = gl.getUniformLocation(program, 'iFrequency');
gl.uniform1f(iFrequency, datGuiUniforms.frequency);

const iChannel0 = gl.getUniformLocation(program, 'iChannel0'); 
const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
const width = 512;
const height = 2;
const border = 0;
const pixels = new Uint8Array(Array(width*height).fill().flatMap((i) => [128, 128, 128, 128]));  // opaque blue
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
              width, height, border, gl.RGBA, gl.UNSIGNED_BYTE,
              pixels);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.uniform1i(iChannel0, 0);

/* Render loop */
function render(time) {
  analyzer.getByteFrequencyData(dataArray);
  // console.log(dataArray);

  gl.uniform1f(iTime, (time / 1000) * datGuiUniforms.speed);
  gl.uniform1f(iConectivity, datGuiUniforms.conectivity);
  gl.uniform3f(iColor, datGuiUniforms.color[0]/255, datGuiUniforms.color[1]/255, datGuiUniforms.color[2]/255);
  gl.uniform1f(iFrequency, datGuiUniforms.frequency);

  let pixels = new Uint8Array(Array(width*height).fill().flatMap((i) => [
    0,
    255,
    255,
    255,
  ]));
  
  pixels = new Uint8Array([
    ...dataArray,
    ...dataArray,
    ...dataArray,
    ...dataArray,
    ...dataArray,
    ...dataArray,
    ...dataArray,
    ...dataArray,
  ]);
   
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA,
    width, height, border, gl.RGBA,
    gl.UNSIGNED_BYTE, pixels
  );

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  window.requestAnimationFrame(render);
}
window.requestAnimationFrame(render);


/* Event handling */
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.uniform3f(iResolution, canvas.width, canvas.height, canvas.width / canvas.height);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
});

let isLeftMouseButtonPresed = false;
canvas.addEventListener('mouseup', (e) => {
  isLeftMouseButtonPresed = false;
})
canvas.addEventListener('mousedown', (e) => {
  isLeftMouseButtonPresed = true;
  gl.uniform4f(iMouse, e.offsetX, e.offsetY, 0, 0);
})
canvas.addEventListener('mousemove', (e) => {
  if (!isLeftMouseButtonPresed) { return false; }
  gl.uniform4f(iMouse, e.offsetX, e.offsetY, 0, 0);
})
