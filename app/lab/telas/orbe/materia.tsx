"use client";

import { useEffect, useRef } from "react";

import { corDoSinal, useOrbe, type EstadoDoOrbe, type Parametros } from "./motor";

/*
 * DIREÇÃO 2 · MATÉRIA VIVA. Uma esfera física de plasma íris: a superfície se
 * agita com a energia do estado, como um organismo. WebGL próprio (um shader
 * de raymarching), sem three.js.
 *  - lendo: uma faixa de luz corre pela superfície;
 *  - auditando: a matéria se contrai e os achados afloram como pontos quentes;
 *  - respondendo: ondas saem do centro, no ritmo da fala;
 *  - concluído/aguardando/erro: a cor da matéria muda.
 * Sem WebGL, cai num degradê parado.
 */
const VERT = `attribute vec2 a; varying vec2 v; void main(){ v = a; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `precision highp float;
varying vec2 v;
uniform float uT, uEn, uAb, uVar, uMar, uFala;
uniform vec3 uSinal;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;
vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
i=mod289(i);vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));}
float fbm(vec3 p){return snoise(p)*.6+snoise(p*2.1+3.1)*.28+snoise(p*4.3+7.7)*.12;}
float raio(){return .74+.08*(uAb-.5);}
float sdf(vec3 p){
  float n=fbm(p*1.5+vec3(0.,uT*(.12+.5*uEn),uT*.07));
  float onda=uFala*.035*sin(length(p.xy)*16.-uT*8.);
  return length(p)-raio()-n*(.035+.12*uEn)-onda;
}
vec3 normal(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(sdf(p+e.xyy)-sdf(p-e.xyy),sdf(p+e.yxy)-sdf(p-e.yxy),sdf(p+e.yyx)-sdf(p-e.yyx)));}
void main(){
  vec3 ro=vec3(0.,0.,2.4); vec3 rd=normalize(vec3(v*.62,-1.6));
  float t=0.; bool hit=false; vec3 p;
  for(int i=0;i<56;i++){p=ro+rd*t;float d=sdf(p);if(d<.0015){hit=true;break;}t+=d*.85;if(t>4.)break;}
  vec3 escuro=vec3(.03,.035,.06);
  float r=length(v);
  float halo=exp(-max(0.,r-.62)*7.)*(.35+.4*uEn);
  if(!hit){ gl_FragColor=vec4(uSinal*halo, halo*.9); return; }
  vec3 n=normal(p); vec3 l=normalize(vec3(-.5,.7,.6));
  float dif=max(dot(n,l),0.); float fres=pow(1.-max(dot(n,-rd),0.),2.4);
  float dentro=fbm(p*3.+uT*.2)*.5+.5;
  vec3 cor=mix(escuro, uSinal*.55, dif*.8+dentro*.25);
  cor+=uSinal*fres*1.1;
  cor+=vec3(1.)*pow(max(dot(reflect(-l,n),-rd),0.),24.)*.35;
  float faixa=exp(-pow((p.y-(sin(uT*1.6)*.7))*9.,2.))*uVar; cor+=mix(uSinal,vec3(1.),.4)*faixa*.9;
  vec3 q=normalize(p);
  vec3 achados[3]; achados[0]=normalize(vec3(.4,.5,.8)); achados[1]=normalize(vec3(-.6,-.1,.8)); achados[2]=normalize(vec3(.1,-.7,.7));
  for(int i=0;i<3;i++){ float k=smoothstep(.955,.985,dot(q,achados[i]))*clamp(uMar*3.-float(i),0.,1.); cor=mix(cor, i==0? vec3(1.,.49,.43): vec3(.94,.71,.36), k); }
  gl_FragColor=vec4(cor,1.);
}`;

type Gl = { gl: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> };

function montar(cv: HTMLCanvasElement): Gl | null {
  const gl = cv.getContext("webgl", { premultipliedAlpha: false, alpha: true, antialias: true });
  if (!gl) return null;
  const sh = (tipo: number, src: string) => {
    const s = gl.createShader(tipo)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const pr = gl.createProgram()!;
  gl.attachShader(pr, vs);
  gl.attachShader(pr, fs);
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const a = gl.getAttribLocation(pr, "a");
  gl.enableVertexAttribArray(a);
  gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const u: Gl["u"] = {};
  for (const nome of ["uT", "uEn", "uAb", "uVar", "uMar", "uFala", "uSinal"]) u[nome] = gl.getUniformLocation(pr, nome);
  return { gl, u };
}

export function OrbeMateria({ estado, tam, reduzir }: { estado: EstadoDoOrbe; tam: number; reduzir: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const g = useRef<Gl | null>(null);
  const falhou = useRef(false);

  useEffect(() => {
    const el = cv.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = Math.round(tam * dpr);
    el.height = Math.round(tam * dpr);
    g.current = montar(el);
    falhou.current = !g.current;
    return () => {
      g.current?.gl.getExtension("WEBGL_lose_context")?.loseContext();
      g.current = null;
    };
  }, [tam]);

  useOrbe(
    estado,
    (p: Parametros, t) => {
      const ctx = g.current;
      if (!ctx) return;
      const { gl, u } = ctx;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const s = corDoSinal(p);
      gl.uniform1f(u.uT, t);
      gl.uniform1f(u.uEn, p.energia);
      gl.uniform1f(u.uAb, p.abertura);
      gl.uniform1f(u.uVar, p.varredura);
      gl.uniform1f(u.uMar, p.marcas);
      gl.uniform1f(u.uFala, p.fala);
      gl.uniform3f(u.uSinal, s[0] / 255, s[1] / 255, s[2] / 255);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    reduzir,
  );

  return (
    <canvas
      ref={cv}
      style={{ width: tam, height: tam, display: "block", borderRadius: "50%", background: falhou.current ? "radial-gradient(circle at 35% 30%, #d4d5ff, #7c80f5 45%, #14152a 75%)" : undefined }}
      aria-hidden
    />
  );
}
