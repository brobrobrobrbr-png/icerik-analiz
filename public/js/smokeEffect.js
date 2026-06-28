/**
 * Duman/Sis Arka Plan Efekti (WebGL2 Shader)
 *
 * Orijinal kaynak: React component olarak yazılmış bir WebGL2 fragment
 * shader animasyonu. Bu dosya, aynı shader mantığını React/TSX olmadan,
 * vanilla JavaScript ile çalıştırır — proje React kullanmadığı için
 * gerekli.
 *
 * Tasarım notu: Renk, projenin --accent CSS değişkeninden okunur,
 * böylece tema rengiyle otomatik uyumlu kalır.
 *
 * Bağımsız bir modüldür, mevcut app.js mantığına dokunmaz.
 */

(function () {
  const canvas = document.createElement("canvas");
  canvas.id = "smokeCanvas";
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    zIndex: "0",
    pointerEvents: "none",
  });
  document.body.insertBefore(canvas, document.body.firstChild);

  const gl = canvas.getContext("webgl2");
  if (!gl) {
    console.warn("[Smoke Effect] WebGL2 desteklenmiyor, efekt atlanıyor.");
    return;
  }

  const VERTEX_SRC = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

  const FRAGMENT_SRC = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  vec3 col=vec3(1);
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  col.r-=fbm(uv+vec2(0,T*.015)+n);
  col.g-=fbm(uv*1.003+vec2(0,T*.015)+n+.003);
  col.b-=fbm(uv*1.006+vec2(0,T*.015)+n+.006);

  col=mix(col, u_color, dot(col,vec3(.21,.71,.07)));
  col=mix(vec3(.08),col,min(time*.1,1.));
  col=clamp(col,.08,1.);
  O=vec4(col,1);
}`;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("[Smoke Effect] Shader derleme hatası:", gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("[Smoke Effect] Program link hatası:", gl.getProgramInfoLog(program));
    return;
  }

  gl.useProgram(program);

  const vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  const positionLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

  const resolutionLoc = gl.getUniformLocation(program, "resolution");
  const timeLoc = gl.getUniformLocation(program, "time");
  const colorLoc = gl.getUniformLocation(program, "u_color");

  function hexToRgb(hex) {
    const clean = hex.trim().replace("#", "");
    const r = parseInt(clean.slice(0, 2), 16) / 255;
    const g = parseInt(clean.slice(2, 4), 16) / 255;
    const b = parseInt(clean.slice(4, 6), 16) / 255;
    return [r, g, b];
  }

  function getThemeColor() {
    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#ffb020";
    return hexToRgb(accent);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  window.addEventListener("resize", resize);
  resize();

  function render(now) {
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
    gl.uniform1f(timeLoc, now * 1e-3);
    gl.uniform3fv(colorLoc, getThemeColor());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
