import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * LuminaScene — a fully procedural React Three Fiber atmosphere for the
 * landing page. Every visual is generated in code (simplex-noise GLSL,
 * BufferGeometry, ShaderMaterial); there are no binary assets (no .glb/.gltf,
 * no textures, no HDR environments). The scene is rendered behind page content
 * with pointer-events disabled so it never intercepts clicks.
 */

interface LuminaSceneProps {
  /** Active MUI palette mode — tunes opacity/brightness for legibility. */
  readonly mode: "light" | "dark";
  /** Primary brand color (hex). */
  readonly colorA: string;
  /** Secondary/info brand color (hex). */
  readonly colorB: string;
  /** Accent color (hex) used for the iridescent rim. */
  readonly colorC: string;
}

// Shared pointer target, normalized to [-1, 1]. Read every frame for parallax.
const pointer = { x: 0, y: 0 };
// Shared scroll progress, normalized to [0, 1] over the full document height.
const scroll = { progress: 0 };

// ---------------------------------------------------------------------------
// GLSL building blocks
// ---------------------------------------------------------------------------

// Ashima / Stefan Gustavson 3D simplex noise — public domain.
const SIMPLEX_3D = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
     i.z+vec4(0.0,i1.z,i2.z,1.0))
   + i.y+vec4(0.0,i1.y,i2.y,1.0))
   + i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const ORB_VERT = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
varying float vDisp;
varying vec3 vNormalW;
varying vec3 vView;
${SIMPLEX_3D}
void main(){
  vec3 dir = normalize(position);
  float n1 = snoise(dir * uFreq + uTime * 0.22);
  float n2 = snoise(dir * uFreq * 2.1 - uTime * 0.16) * 0.5;
  float disp = (n1 + n2) * uAmp;
  vec3 pos = position + normal * disp;
  vDisp = disp;
  vec4 wp = modelMatrix * vec4(pos, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const ORB_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform float uOpacity;
varying float vDisp;
varying vec3 vNormalW;
varying vec3 vView;
void main(){
  float fres = pow(1.0 - max(dot(vNormalW, vView), 0.0), 2.3);
  float t = clamp(vDisp * 1.7 + 0.5, 0.0, 1.0);
  vec3 base = mix(uColorA, uColorB, t);
  vec3 col = mix(base, uColorC, fres * 0.75);
  col += fres * 0.65 * uColorC;
  col *= 0.82 + 0.4 * smoothstep(0.0, 1.0, t);
  gl_FragColor = vec4(col, uOpacity);
}
`;

const HALO_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vView;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vView = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const HALO_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec3 vNormalW;
varying vec3 vView;
void main(){
  float rim = pow(1.0 - max(dot(vNormalW, vView), 0.0), 3.0);
  gl_FragColor = vec4(uColor, rim * uIntensity);
}
`;

const PARTICLE_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPix;
attribute float aScale;
attribute float aPhase;
attribute float aMix;
varying float vMix;
varying float vTwinkle;
void main(){
  vMix = aMix;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float tw = 0.55 + 0.45 * sin(uTime * 1.4 + aPhase * 6.2831);
  vTwinkle = tw;
  gl_PointSize = uSize * aScale * tw * (18.0 / -mv.z) * uPix;
  gl_Position = projectionMatrix * mv;
}
`;

const PARTICLE_FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform float uOpacity;
varying float vMix;
varying float vTwinkle;
void main(){
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float a = pow(smoothstep(0.5, 0.0, d), 1.5);
  vec3 col = mix(uColorA, uColorB, vMix);
  gl_FragColor = vec4(col, a * uOpacity * vTwinkle);
}
`;

// ---------------------------------------------------------------------------
// Scene pieces
// ---------------------------------------------------------------------------

interface CoreProps {
  readonly colorA: string;
  readonly colorB: string;
  readonly colorC: string;
  readonly mode: "light" | "dark";
  readonly speed: number;
  readonly detail: number;
}

const OrbCore: React.FC<CoreProps> = ({
  colorA,
  colorB,
  colorC,
  mode,
  speed,
  detail,
}) => {
  const coreRef = useRef<THREE.ShaderMaterial>(null);
  const haloRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const coreUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: 0.32 },
      uFreq: { value: 1.5 },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uColorC: { value: new THREE.Color(colorC) },
      uOpacity: { value: mode === "dark" ? 0.96 : 0.9 },
    }),
    // colors/opacity are mutated in the effect below to avoid re-allocating.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const haloUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(colorC) },
      uIntensity: { value: mode === "dark" ? 1.05 : 0.55 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    coreUniforms.uColorA.value.set(colorA);
    coreUniforms.uColorB.value.set(colorB);
    coreUniforms.uColorC.value.set(colorC);
    coreUniforms.uOpacity.value = mode === "dark" ? 0.96 : 0.9;
    haloUniforms.uColor.value.set(colorC);
    haloUniforms.uIntensity.value = mode === "dark" ? 1.05 : 0.55;
  }, [colorA, colorB, colorC, mode, coreUniforms, haloUniforms]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    if (coreRef.current) coreRef.current.uniforms.uTime.value += d * speed;
    if (groupRef.current && speed > 0) {
      groupRef.current.rotation.y += d * 0.12;
      groupRef.current.rotation.x += d * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Iridescent noise-displaced core */}
      <mesh>
        <icosahedronGeometry args={[1.4, detail]} />
        <shaderMaterial
          ref={coreRef}
          uniforms={coreUniforms}
          vertexShader={ORB_VERT}
          fragmentShader={ORB_FRAG}
          transparent
        />
      </mesh>
      {/* Additive fresnel halo (fake bloom, back faces) */}
      <mesh scale={1.32}>
        <icosahedronGeometry args={[1.4, Math.max(8, detail - 6)]} />
        <shaderMaterial
          ref={haloRef}
          uniforms={haloUniforms}
          vertexShader={HALO_VERT}
          fragmentShader={HALO_FRAG}
          transparent
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

interface ParticlesProps {
  readonly count: number;
  readonly colorA: string;
  readonly colorB: string;
  readonly mode: "light" | "dark";
  readonly speed: number;
  readonly pixelRatio: number;
}

const ParticleField: React.FC<ParticlesProps> = ({
  count,
  colorA,
  colorB,
  mode,
  speed,
  pixelRatio,
}) => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const { positions, scales, phases, mixes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    const mixes = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      // Random direction on a unit sphere, pushed into a thick cloud shell.
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 2.6 + Math.pow(Math.random(), 0.6) * 5.4;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi) * 0.72; // flatten vertically
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      scales[i] = 0.4 + Math.random() * 1.5;
      phases[i] = Math.random();
      mixes[i] = Math.random();
    }
    return { positions, scales, phases, mixes };
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 2.4 },
      uPix: { value: pixelRatio },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uOpacity: { value: mode === "dark" ? 0.9 : 0.5 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    uniforms.uColorA.value.set(colorA);
    uniforms.uColorB.value.set(colorB);
    uniforms.uOpacity.value = mode === "dark" ? 0.9 : 0.5;
    uniforms.uPix.value = pixelRatio;
  }, [colorA, colorB, mode, pixelRatio, uniforms]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.05);
    if (matRef.current) matRef.current.uniforms.uTime.value += d * speed;
    if (groupRef.current && speed > 0) {
      groupRef.current.rotation.y -= d * 0.025;
      // Drift the starfield down as the user scrolls — like flying upward.
      const ty = scroll.progress * -1.8;
      groupRef.current.position.y += (ty - groupRef.current.position.y) * 0.04;
      groupRef.current.rotation.z = scroll.progress * 0.25;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aScale" args={[scales, 1]} />
          <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
          <bufferAttribute attach="attributes-aMix" args={[mixes, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={PARTICLE_VERT}
          fragmentShader={PARTICLE_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
};

interface OrbitProps {
  readonly colorA: string;
  readonly colorB: string;
  readonly colorC: string;
  readonly mode: "light" | "dark";
  readonly speed: number;
}

const OrbitingNodes: React.FC<OrbitProps> = ({
  colorA,
  colorB,
  colorC,
  mode,
  speed,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const nodes = useMemo(() => {
    const palette = [colorA, colorB, colorC];
    return new Array(6).fill(0).map((_, i) => {
      const angle = (i / 6) * Math.PI * 2;
      return {
        angle,
        radius: 2.45,
        y: Math.sin(angle * 1.5) * 0.35,
        color: palette[i % palette.length],
        size: 0.05 + (i % 3) * 0.018,
      };
    });
  }, [colorA, colorB, colorC]);

  useFrame((_, delta) => {
    if (groupRef.current && speed > 0)
      groupRef.current.rotation.y += Math.min(delta, 0.05) * 0.3 * speed;
  });

  const ringOpacity = mode === "dark" ? 0.3 : 0.18;

  return (
    <group ref={groupRef} rotation={[0.5, 0, 0.18]}>
      {/* Two faint orbital rings */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.45, 0.006, 8, 160]} />
        <meshBasicMaterial
          color={colorB}
          transparent
          opacity={ringOpacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.5, 0.4]}>
        <torusGeometry args={[3.1, 0.004, 8, 160]} />
        <meshBasicMaterial
          color={colorA}
          transparent
          opacity={ringOpacity * 0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Glowing knowledge nodes riding the inner ring */}
      {nodes.map((node, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(node.angle) * node.radius,
            node.y,
            Math.sin(node.angle) * node.radius,
          ]}
        >
          <icosahedronGeometry args={[node.size, 1]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={mode === "dark" ? 0.95 : 0.8}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

interface RigProps {
  readonly children: React.ReactNode;
  readonly offsetX: number;
  readonly baseY: number;
  readonly baseScale: number;
  readonly parallax: boolean;
  readonly animate: boolean;
}

/**
 * Lerps the whole scene toward the pointer (parallax tilt) and reacts to
 * scroll progress (rotate, rise, and recede as the page scrolls).
 */
const ParallaxRig: React.FC<RigProps> = ({
  children,
  offsetX,
  baseY,
  baseScale,
  parallax,
  animate,
}) => {
  const ref = useRef<THREE.Group>(null);
  const scaleRef = useRef(baseScale);
  useFrame(() => {
    if (!ref.current) return;
    const p = animate ? scroll.progress : 0;
    const rotTargetY = (parallax ? pointer.x * 0.35 : 0) + p * Math.PI * 0.55;
    const rotTargetX = (parallax ? -pointer.y * 0.22 : 0) + p * 0.3;
    ref.current.rotation.y += (rotTargetY - ref.current.rotation.y) * 0.05;
    ref.current.rotation.x += (rotTargetX - ref.current.rotation.x) * 0.05;
    const posTargetY = baseY + p * 0.9;
    ref.current.position.y += (posTargetY - ref.current.position.y) * 0.05;
    const targetScale = baseScale * (1 - p * 0.18);
    scaleRef.current += (targetScale - scaleRef.current) * 0.05;
    ref.current.scale.setScalar(scaleRef.current);
  });
  return (
    <group ref={ref} position={[offsetX, baseY, 0]} scale={baseScale}>
      {children}
    </group>
  );
};

// ---------------------------------------------------------------------------
// WebGL feature detection (functional, no class error boundary needed)
// ---------------------------------------------------------------------------

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return (
      !!window.WebGLRenderingContext &&
      (!!canvas.getContext("webgl") ||
        !!canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

// Watches real frame rate and steps the render resolution down (up to twice,
// floor 0.75x) if a device can't keep up — keeps the scene smooth everywhere.
const AdaptiveQuality: React.FC<{ initialDpr: number }> = ({ initialDpr }) => {
  const setDpr = useThree((s) => s.setDpr);
  const samples = useRef<number[]>([]);
  const currentDpr = useRef(initialDpr);
  const steps = useRef(0);
  useFrame((_, delta) => {
    if (steps.current >= 2 || currentDpr.current <= 0.75) return;
    samples.current.push(delta);
    if (samples.current.length < 90) return; // ~1.5s of frames
    const avg =
      samples.current.reduce((a, b) => a + b, 0) / samples.current.length;
    samples.current.length = 0;
    if (avg > 0 && 1 / avg < 40) {
      steps.current += 1;
      currentDpr.current = Math.max(0.75, currentDpr.current * 0.8);
      setDpr(currentDpr.current);
    }
  });
  return null;
};

const LuminaScene: React.FC<LuminaSceneProps> = ({
  mode,
  colorA,
  colorB,
  colorC,
}) => {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [finePointer, setFinePointer] = useState(true);
  const [lowPower, setLowPower] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280,
  );

  useEffect(() => {
    setSupported(hasWebGL());
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fp = window.matchMedia("(pointer: fine)");
    setReduced(rm.matches);
    setFinePointer(fp.matches);
    setWidth(window.innerWidth);

    // Detect low-power devices (few CPU cores / little RAM) to lighten the scene.
    const cores = navigator.hardwareConcurrency || 8;
    const memory = (navigator as { deviceMemory?: number }).deviceMemory || 8;
    setLowPower(cores <= 4 || memory <= 4);

    // Pause rendering while the tab is hidden to save battery / GPU.
    const onVisibility = (): void => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    const onRm = (e: MediaQueryListEvent): void => setReduced(e.matches);
    const onFp = (e: MediaQueryListEvent): void => setFinePointer(e.matches);
    rm.addEventListener("change", onRm);
    fp.addEventListener("change", onFp);

    // Track viewport width (debounced via rAF) for responsive scene tiers.
    let resizeRaf = 0;
    const onResize = (): void => {
      window.cancelAnimationFrame(resizeRaf);
      resizeRaf = window.requestAnimationFrame(() =>
        setWidth(window.innerWidth),
      );
    };
    window.addEventListener("resize", onResize, { passive: true });

    const onMove = (e: PointerEvent): void => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const onScroll = (): void => {
      // Read from the actual scrolling element — on mobile this is often
      // document.body (not documentElement), where the documentElement-based
      // math collapses to 0 and the scene never reacts.
      const el = document.scrollingElement || document.documentElement;
      const top = el.scrollTop || window.scrollY || window.pageYOffset || 0;
      const max = el.scrollHeight - el.clientHeight;
      scroll.progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
    };
    // Capture phase so scroll on any nested container is also picked up.
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    onScroll();

    // Defer mounting the canvas so the hero text paints first.
    const idle = window.requestAnimationFrame(() => setReady(true));

    return () => {
      rm.removeEventListener("change", onRm);
      fp.removeEventListener("change", onFp);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.cancelAnimationFrame(idle);
      window.cancelAnimationFrame(resizeRaf);
    };
  }, []);

  if (!ready || !supported) return null;

  const tier: "mobile" | "tablet" | "desktop" =
    width < 600 ? "mobile" : width < 960 ? "tablet" : "desktop";
  const layout = {
    mobile: { offsetX: 0, baseY: -1.15, scale: 0.58, count: 2400, detail: 20 },
    tablet: { offsetX: 0.9, baseY: 0.2, scale: 0.82, count: 4200, detail: 32 },
    desktop: { offsetX: 1.7, baseY: 0, scale: 1, count: 6200, detail: 48 },
  }[tier];
  const maxDprByTier = { mobile: 1.25, tablet: 1.5, desktop: 1.75 }[tier];

  // Lighten the scene on low-power devices: fewer particles, lower geometry
  // detail, and a 1x render cap so it stays smooth.
  const count = lowPower ? Math.min(layout.count, 1400) : layout.count;
  const detail = lowPower ? Math.min(layout.detail, 16) : layout.detail;
  const maxDpr = lowPower ? 1 : maxDprByTier;

  const speed = reduced ? 0 : 1;
  const animate = !reduced;
  const parallaxEnabled = finePointer && tier !== "mobile" && !lowPower;
  const pixelRatio = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio : 1,
    maxDpr,
  );

  return (
    <Canvas
      frameloop={hidden ? "never" : "always"}
      dpr={[1, maxDpr]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{
        antialias: !lowPower,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    >
      <AdaptiveQuality initialDpr={pixelRatio} />
      {/* Particle dust fills the whole viewport, independent of parallax. */}
      <ParticleField
        count={count}
        colorA={colorA}
        colorB={colorB}
        mode={mode}
        speed={speed}
        pixelRatio={pixelRatio}
      />
      <ParallaxRig
        offsetX={layout.offsetX}
        baseY={layout.baseY}
        baseScale={layout.scale}
        parallax={parallaxEnabled}
        animate={animate}
      >
        <OrbCore
          colorA={colorA}
          colorB={colorB}
          colorC={colorC}
          mode={mode}
          speed={speed}
          detail={detail}
        />
        <OrbitingNodes
          colorA={colorA}
          colorB={colorB}
          colorC={colorC}
          mode={mode}
          speed={speed}
        />
      </ParallaxRig>
    </Canvas>
  );
};

export default LuminaScene;
