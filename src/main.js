import "./styles.css";
import * as THREE from "three";

const canvas = document.querySelector("#wallpaper");
const title = document.querySelector(".wallpaper-title");
const settings = readSettings();

if (!settings.showTitle && title) {
  title.hidden = true;
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setClearColor(0x01030b, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = settings.exposure;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02040d, 0.015);

const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 140);
camera.position.set(0, 0, 8);
camera.lookAt(0, 0, -28);

const clock = new THREE.Clock();
const starfield = createStarfield(settings);
const dustfield = createDustfield(settings);
const backdrop = createBackdrop(settings);

scene.add(backdrop);
scene.add(dustfield);
scene.add(starfield);

let width = 1;
let height = 1;
let lastFrame = 0;
let renderedFrames = 0;

window.StarGaze = {
  settings,
  setDirection(direction) {
    settings.direction = direction === "forward" ? "forward" : "away";
    starfield.material.uniforms.uDirection.value = settings.direction === "forward" ? -1 : 1;
    dustfield.material.uniforms.uDirection.value = settings.direction === "forward" ? -1 : 1;
  },
};

window.addEventListener("resize", resize);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    clock.getDelta();
  }
});

resize();
requestAnimationFrame(animate);

function animate(timestamp = 0) {
  requestAnimationFrame(animate);
  if (!shouldRenderFrame(timestamp)) return;

  const delta = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime * settings.speed;
  const sway = settings.cameraSway;

  camera.position.x = Math.sin(time * 0.055) * 0.34 * sway;
  camera.position.y = Math.cos(time * 0.047) * 0.22 * sway;
  camera.lookAt(
    Math.sin(time * 0.038) * 2.0 * sway,
    Math.cos(time * 0.041) * 1.1 * sway,
    -32,
  );

  starfield.rotation.z = Math.sin(time * 0.026) * 0.018 * settings.drift;
  dustfield.rotation.z = -Math.sin(time * 0.021) * 0.012 * settings.drift;

  starfield.material.uniforms.uTime.value += delta * settings.speed;
  dustfield.material.uniforms.uTime.value += delta * settings.speed;
  backdrop.material.uniforms.uTime.value = time;

  renderer.render(scene, camera);
  renderedFrames += 1;
}

function shouldRenderFrame(timestamp) {
  if (settings.frameInterval <= 0) return true;
  if (renderedFrames < 3) {
    lastFrame = timestamp;
    return true;
  }
  if (timestamp - lastFrame < settings.frameInterval) return false;
  lastFrame = timestamp;
  return true;
}

function resize() {
  width = Math.max(1, window.innerWidth);
  height = Math.max(1, window.innerHeight);
  const pixelRatio = Math.min(settings.pixelRatio, 3);

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.fov = camera.aspect > 2.2 ? 54 : camera.aspect < 0.72 ? 66 : 58;
  camera.updateProjectionMatrix();

  starfield.material.uniforms.uAspect.value = camera.aspect;
  dustfield.material.uniforms.uAspect.value = camera.aspect;
  backdrop.scale.set(camera.aspect > 1 ? camera.aspect * 46 : 46, camera.aspect > 1 ? 46 : 46 / camera.aspect, 1);
}

function createStarfield(config) {
  const count = Math.round(config.starCount * config.density);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);
  const shapes = new Float32Array(count);
  const twinkles = new Float32Array(count);
  const flares = new Float32Array(count);
  const palette = config.palette;

  for (let i = 0; i < count; i += 1) {
    const depthBias = Math.random() ** 0.58;
    const spread = lerp(10, config.tunnelWidth, depthBias);
    const angle = Math.random() * Math.PI * 2;
    const radius = (0.12 + Math.random() ** 0.48) * spread;
    const x = Math.cos(angle) * radius * lerp(0.75, 1.34, Math.random());
    const y = Math.sin(angle) * radius * lerp(0.68, 1.22, Math.random());
    const color = samplePalette(palette, Math.random());
    const rare = Math.random() > 0.955;
    const bright = Math.random() > 0.82;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = 0;
    colors[i * 3] = color.r * (rare ? 1.8 : bright ? 1.42 : 1);
    colors[i * 3 + 1] = color.g * (rare ? 1.8 : bright ? 1.42 : 1);
    colors[i * 3 + 2] = color.b * (rare ? 1.8 : bright ? 1.42 : 1);
    sizes[i] = (rare ? lerp(13, 26, Math.random()) : lerp(1.2, 7.2, Math.random() ** 2.2)) * config.starScale;
    phases[i] = Math.random();
    speeds[i] = lerp(0.12, 0.82, Math.random() ** 1.35);
    shapes[i] = rare ? Math.floor(2 + Math.random() * 3) : Math.floor(Math.random() * 3);
    twinkles[i] = lerp(0.45, 2.8, Math.random()) * config.sparkle;
    flares[i] = rare ? lerp(0.9, 1.7, Math.random()) : lerp(0.2, 0.82, Math.random());
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));
  geometry.setAttribute("aShape", new THREE.BufferAttribute(shapes, 1));
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinkles, 1));
  geometry.setAttribute("aFlare", new THREE.BufferAttribute(flares, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: config.depth },
      uNear: { value: config.nearPlane },
      uDirection: { value: config.direction === "forward" ? -1 : 1 },
      uPixelRatio: { value: Math.min(config.pixelRatio, 3) },
      uAspect: { value: 1 },
      uStretch: { value: config.direction === "forward" ? 1.35 : 0.78 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aShape;
      attribute float aTwinkle;
      attribute float aFlare;

      uniform float uTime;
      uniform float uDepth;
      uniform float uNear;
      uniform float uDirection;
      uniform float uPixelRatio;
      uniform float uStretch;

      varying vec3 vColor;
      varying float vShape;
      varying float vTwinkle;
      varying float vFlare;
      varying float vDepthFade;
      varying float vMotion;

      void main() {
        float phase = fract(aPhase + uTime * aSpeed * 0.032 * uDirection);
        float distanceToCamera = mix(uNear, uDepth, phase);
        vec3 transformed = vec3(position.xy, -distanceToCamera);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);

        float perspective = 58.0 / max(1.0, -mvPosition.z);
        float pulse = 0.62 + 0.38 * sin(uTime * (1.5 + aTwinkle * 2.6) + aPhase * 63.0);
        float nearGlow = smoothstep(uDepth, uNear, distanceToCamera);
        float farFade = smoothstep(uDepth, uDepth * 0.52, distanceToCamera);
        float motionBoost = mix(0.78, uStretch, nearGlow);

        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * perspective * uPixelRatio * (0.78 + pulse * 0.52) * motionBoost;

        vColor = color;
        vShape = aShape;
        vTwinkle = pulse;
        vFlare = aFlare;
        vDepthFade = clamp(farFade * (0.38 + nearGlow * 0.92), 0.0, 1.0);
        vMotion = nearGlow;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vShape;
      varying float vTwinkle;
      varying float vFlare;
      varying float vDepthFade;
      varying float vMotion;

      float lineGlow(float d, float width) {
        return exp(-d * d / max(0.0001, width));
      }

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float r = length(uv);
        float core = exp(-r * r * 74.0);
        float halo = exp(-r * r * 12.0) * 0.46;

        float cross = lineGlow(abs(uv.x), 0.0018) * smoothstep(0.5, 0.04, abs(uv.y));
        cross += lineGlow(abs(uv.y), 0.0018) * smoothstep(0.5, 0.04, abs(uv.x));

        vec2 diagonal = vec2((uv.x + uv.y) * 0.7071, (uv.x - uv.y) * 0.7071);
        float diag = lineGlow(abs(diagonal.x), 0.0015) * smoothstep(0.45, 0.04, abs(diagonal.y));
        diag += lineGlow(abs(diagonal.y), 0.0015) * smoothstep(0.45, 0.04, abs(diagonal.x));

        float diamond = smoothstep(0.5, 0.04, abs(uv.x) + abs(uv.y));
        float roundStar = core + halo;
        float sparkle = core + halo * 0.85 + cross * vFlare + diag * vFlare * 0.44;
        float gem = core * 1.2 + diamond * 0.65 + cross * 0.38;
        float longFlare = core + halo + cross * 1.45 + diag * 0.34;

        float shapeA = mix(roundStar, sparkle, step(0.5, vShape));
        float shapeB = mix(gem, longFlare, step(3.5, vShape));
        float alpha = mix(shapeA, shapeB, step(2.5, vShape));
        alpha *= vDepthFade * (0.58 + vTwinkle * 0.68);
        alpha *= smoothstep(0.52, 0.48, r);

        vec3 color = vColor * (0.8 + vTwinkle * 0.72 + vMotion * 0.7);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function createDustfield(config) {
  const count = Math.round(config.dustCount * config.density);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const spread = config.tunnelWidth * lerp(0.5, 1.35, Math.random());
    positions[i * 3] = (Math.random() - 0.5) * spread * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 1.3;
    positions[i * 3 + 2] = 0;
    const color = samplePalette(config.palette, Math.random());
    colors[i * 3] = color.r * 0.42;
    colors[i * 3 + 1] = color.g * 0.5;
    colors[i * 3 + 2] = color.b * 0.72;
    sizes[i] = lerp(0.55, 1.8, Math.random()) * config.starScale;
    phases[i] = Math.random();
    speeds[i] = lerp(0.04, 0.28, Math.random());
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute("aSpeed", new THREE.BufferAttribute(speeds, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: config.depth * 0.92 },
      uNear: { value: config.nearPlane * 1.8 },
      uDirection: { value: config.direction === "forward" ? -1 : 1 },
      uPixelRatio: { value: Math.min(config.pixelRatio, 3) },
      uAspect: { value: 1 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;

      uniform float uTime;
      uniform float uDepth;
      uniform float uNear;
      uniform float uDirection;
      uniform float uPixelRatio;

      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        float phase = fract(aPhase + uTime * aSpeed * 0.018 * uDirection);
        float distanceToCamera = mix(uNear, uDepth, phase);
        vec3 transformed = vec3(position.xy, -distanceToCamera);
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        float perspective = 44.0 / max(1.0, -mvPosition.z);

        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * perspective * uPixelRatio;

        float nearGlow = smoothstep(uDepth, uNear, distanceToCamera);
        vColor = color;
        vAlpha = smoothstep(uDepth, uDepth * 0.35, distanceToCamera) * (0.16 + nearGlow * 0.24);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;

      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float glow = exp(-dot(uv, uv) * 18.0);
        gl_FragColor = vec4(vColor, glow * vAlpha);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function createBackdrop(config) {
  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(config.backgroundTop) },
      uMid: { value: new THREE.Color(config.backgroundMid) },
      uBottom: { value: new THREE.Color(config.backgroundBottom) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBottom;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec2 uv = vUv;
        float vertical = smoothstep(0.0, 1.0, uv.y);
        vec3 color = mix(uBottom, uTop, vertical);
        float milky = exp(-pow((uv.y - 0.23) * 3.2, 2.0)) * (0.22 + noise(uv * 5.0 + uTime * 0.01) * 0.13);
        float centerGlow = exp(-length((uv - vec2(0.48, 0.42)) * vec2(1.4, 2.2)) * 2.4) * 0.18;
        color += uMid * (milky + centerGlow);
        color += vec3(noise(uv * 180.0 + uTime * 0.02)) * 0.012;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.renderOrder = -10;
  return mesh;
}

function readSettings() {
  const params = new URLSearchParams(window.location.search);
  const qualityName = params.get("quality") || "cinematic";
  const qualityMap = {
    low: {
      starCount: 900,
      dustCount: 900,
      pixelRatio: 1,
      starScale: 0.82,
      sparkle: 0.75,
      exposure: 0.82,
      cameraSway: 0.25,
    },
    balanced: {
      starCount: 1700,
      dustCount: 1500,
      pixelRatio: 1.1,
      starScale: 0.92,
      sparkle: 0.9,
      exposure: 0.9,
      cameraSway: 0.5,
    },
    high: {
      starCount: 2800,
      dustCount: 2200,
      pixelRatio: 1.25,
      starScale: 1,
      sparkle: 1.05,
      exposure: 0.98,
      cameraSway: 0.7,
    },
    cinematic: {
      starCount: 4300,
      dustCount: 3200,
      pixelRatio: 1.35,
      starScale: 1.08,
      sparkle: 1.18,
      exposure: 1.08,
      cameraSway: 0.85,
    },
  };
  const selected = qualityMap[qualityName] || qualityMap.cinematic;
  const fps = clamp(Number(params.get("fps") ?? 60), 0, 240);
  const themeName = params.get("theme") || "stargaze";

  return {
    quality: qualityMap[qualityName] ? qualityName : "cinematic",
    direction: readDirection(params.get("direction") || params.get("zoom") || "away"),
    speed: clamp(Number(params.get("speed") ?? 1), 0.05, 4),
    density: clamp(Number(params.get("density") ?? 1), 0.25, 2.25),
    depth: clamp(Number(params.get("depth") ?? 78), 28, 140),
    nearPlane: clamp(Number(params.get("near") ?? 2.6), 1.2, 10),
    tunnelWidth: clamp(Number(params.get("tunnelWidth") ?? 54), 18, 100),
    drift: clamp(Number(params.get("drift") ?? 1), 0, 2),
    sparkle: clamp(Number(params.get("sparkle") ?? selected.sparkle), 0, 2.5),
    starScale: clamp(Number(params.get("starScale") ?? selected.starScale), 0.45, 2.4),
    starCount: selected.starCount,
    dustCount: selected.dustCount,
    cameraSway: clamp(Number(params.get("cameraSway") ?? selected.cameraSway), 0, 2),
    exposure: clamp(Number(params.get("exposure") ?? selected.exposure), 0.3, 2),
    pixelRatio: clamp(Number(params.get("pixelRatio") ?? selected.pixelRatio), 0.6, 3),
    frameInterval: fps > 0 ? 1000 / fps : 0,
    palette: readPalette(params.get("palette"), themeName),
    backgroundTop: params.get("backgroundTop") || "#01020a",
    backgroundMid: params.get("backgroundMid") || "#103d93",
    backgroundBottom: params.get("backgroundBottom") || "#020109",
    showTitle: readBoolean(params.get("title"), true),
  };
}

function readDirection(value) {
  const normalized = String(value).toLowerCase();
  return ["forward", "in", "toward", "towards"].includes(normalized) ? "forward" : "away";
}

function readPalette(rawPalette, themeName) {
  const themes = {
    stargaze: ["#ffffff", "#8fc7ff", "#2758ff", "#8c3dff", "#ff41df", "#ff4b32", "#ffd34f", "#59ff9a"],
    prism: ["#ffffff", "#58f7ff", "#3d6bff", "#9f50ff", "#ff55df", "#ff8a3d", "#fff06a"],
    frost: ["#ffffff", "#b8ecff", "#6db6ff", "#5a71ff", "#d8fbff"],
    jewel: ["#ffffff", "#2effbf", "#1e70ff", "#8838ff", "#ff36ce", "#ffbd45"],
    ember: ["#ffffff", "#69d6ff", "#3857ff", "#ff3e8a", "#ff5e22", "#ffd166"],
  };
  const parsed = parsePalette(rawPalette);
  const colors = parsed.length >= 2 ? parsed : themes[themeName] || themes.stargaze;
  return colors.map((color) => new THREE.Color(color));
}

function parsePalette(rawPalette) {
  if (!rawPalette) return [];
  return rawPalette
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith("#") ? value : `#${value}`))
    .filter((value) => /^#[0-9a-f]{6}$/i.test(value));
}

function samplePalette(palette, t) {
  if (palette.length === 1) return palette[0].clone();
  const scaled = clamp(t, 0, 0.9999) * (palette.length - 1);
  const index = Math.floor(scaled);
  return palette[index].clone().lerp(palette[index + 1], scaled - index);
}

function readBoolean(rawValue, fallback) {
  if (rawValue === null) return fallback;
  return ["1", "true", "yes", "on"].includes(String(rawValue).toLowerCase());
}

function clamp(value, min, max) {
  const number = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, number));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
