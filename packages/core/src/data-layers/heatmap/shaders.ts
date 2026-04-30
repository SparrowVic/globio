/**
 * GLSL shader source for the heatmap layer's `ShaderMaterial`.
 *
 * **Vertex shader** turns each sphere vertex into an equirectangular UV
 * (`atan2(z, -x) / 360 + 0.5`, `0.5 - lat/180`), samples the density
 * texture, and pushes the vertex outward by `shaped(d) * maxHeight`.
 * It also derives an analytical surface normal from a 4-tap density
 * gradient — without that, the displaced mesh would render as a flat
 * colour decal because `MeshBasicMaterial`-style shading has no light.
 *
 * Both shaders compute UV from the **interpolated 3D direction**, not
 * from a `vUv` attribute. Linear `vUv` interpolation breaks at the
 * antimeridian seam (neighbouring vertices land at u≈0 and u≈1, the
 * lerp passes through u=0.5 = Greenwich), and the fragment ends up
 * sampling density at the wrong meridian. Direction is continuous in
 * 3D and `atan2(z, -x)` handles the wrap automatically.
 *
 * Intensity is applied as a gamma curve `pow(d, 1/intensity)` rather
 * than a linear multiply. Linear with `clamp(0, 1)` would clip the
 * entire dome crown to 1.0 (sharp flat plateau) any time intensity
 * exceeded 1; gamma boosts mid-tones while keeping the peak at 1.0,
 * so big-population countries still show a visible gradient.
 */
export const VERTEX_SHADER = /* glsl */ `
uniform sampler2D uDensity;
uniform vec2 uTextureSize;
uniform float uMaxHeight;
uniform float uZoomHeightScale;
uniform float uIntensity;
uniform float uThreshold;
uniform float uZoomThresholdBoost;
uniform int uCurve;
uniform int uDispCurve;

varying vec3 vDir;
varying vec3 vNormal;
varying float vShaped;
varying float vRadialFacing;

float curveFn(float v, int curveCode) {
  if (curveCode == 0) return v;
  if (curveCode == 1) return v * v * (3.0 - 2.0 * v);
  if (curveCode == 2) return v * v * v;
  return sqrt(v);
}

vec2 dirToUv(vec3 dir) {
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float theta = degrees(atan(dir.z, -dir.x));
  return vec2(theta / 360.0, (90.0 - lat) / 180.0);
}

float applyIntensity(float d, float intensity) {
  if (intensity <= 0.0) return 0.0;
  if (abs(intensity - 1.0) < 1e-4) return clamp(d, 0.0, 1.0);
  return clamp(pow(clamp(d, 0.0, 1.0), 1.0 / intensity), 0.0, 1.0);
}

float displacementAtUv(vec2 uv) {
  float d = texture2D(uDensity, uv).r;
  float t = applyIntensity(d, uIntensity);
  float threshold = clamp(uThreshold + uZoomThresholdBoost, 0.0, 0.95);
  float gated = max(0.0, (t - threshold) / max(1e-4, 1.0 - threshold));
  return curveFn(gated, uDispCurve);
}

void main() {
  vec3 dir = normalize(position);
  vDir = dir;
  vec2 uv = dirToUv(dir);

  float shaped = displacementAtUv(uv);
  vShaped = shaped;

  // Analytical surface normal — sample displacement at four neighbours,
  // build tangent-space gradients, derive normal as (radial - gradient).
  // Without this the displaced surface is unlit and looks like a flat
  // colour decal rather than 3D terrain.
  float maxHeight = uMaxHeight * uZoomHeightScale;
  if (maxHeight > 0.0) {
    vec2 dx = vec2(1.0 / uTextureSize.x, 0.0);
    vec2 dy = vec2(0.0, 1.0 / uTextureSize.y);
    float hL = displacementAtUv(uv - dx);
    float hR = displacementAtUv(uv + dx);
    float hU = displacementAtUv(uv - dy);
    float hD = displacementAtUv(uv + dy);
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), dir));
    vec3 north = normalize(cross(dir, east));
    float slopeE = (hR - hL) * maxHeight * 0.5;
    float slopeN = (hU - hD) * maxHeight * 0.5;
    float texelArc = 6.2831853 / uTextureSize.x;
    vec3 grad = east * (slopeE / max(texelArc, 1e-4)) + north * (slopeN / max(texelArc, 1e-4));
    vNormal = normalize(dir - grad);
  } else {
    vNormal = dir;
  }

  vec3 displaced = position + dir * (shaped * maxHeight);
  vNormal = normalize((modelMatrix * vec4(vNormal, 0.0)).xyz);
  vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
  vec3 worldRadial = normalize((modelMatrix * vec4(dir, 0.0)).xyz);
  vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
  vRadialFacing = max(0.0, dot(worldRadial, viewDir));
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

/**
 * Fragment shader. Re-derives UV from the interpolated 3D direction
 * (same reason as the vertex), picks a colour from the 1D palette
 * texture indexed by the gated/curved density value, then blends in
 * the optional grid + contour overlays. `uBlendMode` toggles between
 * the default vivid alpha overlay (deck.gl style) and additive (glow)
 * blending.
 */
export const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uDensity;
uniform sampler2D uPalette;
uniform float uIntensity;
uniform float uThreshold;
uniform float uZoomThresholdBoost;
uniform float uOpacity;
uniform float uZoomOpacityScale;
uniform float uShading;
uniform vec3 uLightDir;
uniform float uRimFade;
uniform int uGridEnabled;
uniform vec3 uGridColor;
uniform float uGridStepDeg;
uniform float uGridWidthDeg;
uniform float uGridOpacity;
uniform float uGridMajorStepDeg;
uniform float uGridMajorOpacity;
uniform float uGridDensityFade;
uniform float uGridZoomScale;
uniform int uContourEnabled;
uniform vec3 uContourColor;
uniform float uContourInterval;
uniform float uContourWidth;
uniform float uContourOpacity;
uniform float uContourMajorInterval;
uniform float uContourMajorOpacity;
uniform float uContourDensityFade;
uniform float uContourZoomScale;
uniform int uCurve;
uniform int uBlendMode;

varying vec3 vDir;
varying vec3 vNormal;
varying float vShaped;
varying float vRadialFacing;

float curveFn(float v, int curveCode) {
  if (curveCode == 0) return v;
  if (curveCode == 1) return v * v * (3.0 - 2.0 * v);
  if (curveCode == 2) return v * v * v;
  return sqrt(v);
}

vec2 dirToUv(vec3 dir) {
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float theta = degrees(atan(dir.z, -dir.x));
  return vec2(theta / 360.0, (90.0 - lat) / 180.0);
}

float gridLine(float coord, float stepDeg, float widthDeg) {
  float stepSafe = max(stepDeg, 0.001);
  float d = abs(fract(coord / stepSafe + 0.5) - 0.5) * stepSafe;
  float aa = max(fwidth(coord), 0.015);
  return 1.0 - smoothstep(widthDeg, widthDeg + aa, d);
}

float gridMask(vec3 dir, float shaped) {
  if (uGridEnabled == 0) return 0.0;
  float lat = degrees(asin(clamp(dir.y, -1.0, 1.0)));
  float lng = degrees(atan(dir.z, -dir.x));
  float minor = max(
    gridLine(lat, uGridStepDeg, uGridWidthDeg),
    gridLine(lng, uGridStepDeg, uGridWidthDeg)
  );
  float major = max(
    gridLine(lat, uGridMajorStepDeg, uGridWidthDeg * 1.45),
    gridLine(lng, uGridMajorStepDeg, uGridWidthDeg * 1.45)
  );
  float densityGate = mix(
    0.28,
    1.0,
    smoothstep(0.0, max(0.001, uGridDensityFade), shaped)
  );
  return max(minor * uGridOpacity, major * uGridMajorOpacity) * densityGate * uGridZoomScale;
}

float contourLine(float value, float interval, float width) {
  float safeInterval = max(interval, 0.001);
  float d = abs(fract(value / safeInterval + 0.5) - 0.5) * safeInterval;
  float aa = max(fwidth(value), 0.0015);
  return 1.0 - smoothstep(width, width + aa, d);
}

float contourMask(float shaped) {
  if (uContourEnabled == 0) return 0.0;
  if (shaped <= uContourDensityFade) return 0.0;
  float densityGate = smoothstep(uContourDensityFade, min(1.0, uContourDensityFade + 0.12), shaped);
  float minor = contourLine(shaped, uContourInterval, uContourWidth);
  float major = contourLine(shaped, uContourMajorInterval, uContourWidth * 1.5);
  return max(minor * uContourOpacity, major * uContourMajorOpacity) * densityGate * uContourZoomScale;
}

void main() {
  vec3 dir = normalize(vDir);
  vec2 uv = dirToUv(dir);

  float d = texture2D(uDensity, uv).r;
  float t;
  if (uIntensity <= 0.0) {
    t = 0.0;
  } else if (abs(uIntensity - 1.0) < 1e-4) {
    t = clamp(d, 0.0, 1.0);
  } else {
    t = clamp(pow(clamp(d, 0.0, 1.0), 1.0 / uIntensity), 0.0, 1.0);
  }
  float threshold = clamp(uThreshold + uZoomThresholdBoost, 0.0, 0.95);
  float gated = max(0.0, (t - threshold) / max(1e-4, 1.0 - threshold));
  float shaped = curveFn(clamp(gated, 0.0, 1.0), uCurve);
  float rim = uRimFade <= 0.0 ? 1.0 : smoothstep(0.0, uRimFade, vRadialFacing);
  if (rim <= 0.001) discard;

  vec4 col = texture2D(uPalette, vec2(shaped, 0.5));

  vec3 normal = normalize(vNormal);
  float lambert = max(0.0, dot(normal, normalize(uLightDir)));
  lambert = mix(1.0, mix(0.45, 1.0, lambert), uShading);

  vec3 shaded = col.rgb * lambert;
  float grid = clamp(gridMask(dir, shaped) * rim, 0.0, 0.85);
  float contour = clamp(contourMask(shaped) * rim, 0.0, 0.9);
  if (shaped <= 0.001 && grid <= 0.001 && contour <= 0.001) discard;
  shaded = mix(shaded, uGridColor, min(0.85, grid * 1.05));
  shaded = mix(shaded, uContourColor, contour);

  float alpha = col.a * shaped * uOpacity * uZoomOpacityScale * rim;
  alpha = max(alpha, grid * 0.82);
  alpha = max(alpha, contour * 0.9);
  if (uBlendMode == 1) {
    gl_FragColor = vec4(shaded * shaped, alpha);
  } else {
    gl_FragColor = vec4(shaded, alpha);
  }
}
`;
