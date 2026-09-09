/**
 * GLSL for the shared post-processing pipeline. Every pass runs on the same
 * fullscreen quad (`PlaneGeometry(2, 2)` + an orthographic camera), so the
 * vertex stage just forwards `uv` and passes clip-space positions through.
 *
 * All fragments are authored in GLSL ES 1.00 (Three's default for
 * `ShaderMaterial`) and write **display-ready, un-encoded** colour — the rest
 * of the library's shaders are tuned that way, so the composite deliberately
 * skips the sRGB/gamma encode.
 */

export const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Bright pass — soft-knee luminance threshold. `knee = threshold * softKnee`
 * so the cut-off eases in instead of popping.
 */
export const BRIGHT_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform float uThreshold;
uniform float uSoftKnee;
varying vec2 vUv;

void main() {
  vec3 rgb = texture2D(tDiffuse, vUv).rgb;
  float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  float knee = max(uThreshold * uSoftKnee, 1e-4);
  float w = smoothstep(uThreshold - knee, uThreshold + knee, luma);
  gl_FragColor = vec4(rgb * w, 1.0);
}
`;

/**
 * 13-tap dual-filter downsample (Jimenez / "Next Generation Post Processing").
 * The overlapping box taps kill the shimmering a naive 2×2 box produces when
 * the camera moves.
 */
export const DOWNSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
varying vec2 vUv;

void main() {
  vec2 t = uTexel;
  vec3 a = texture2D(tDiffuse, vUv + vec2(-2.0 * t.x,  2.0 * t.y)).rgb;
  vec3 b = texture2D(tDiffuse, vUv + vec2( 0.0,        2.0 * t.y)).rgb;
  vec3 c = texture2D(tDiffuse, vUv + vec2( 2.0 * t.x,  2.0 * t.y)).rgb;
  vec3 d = texture2D(tDiffuse, vUv + vec2(-2.0 * t.x,  0.0)).rgb;
  vec3 e = texture2D(tDiffuse, vUv).rgb;
  vec3 f = texture2D(tDiffuse, vUv + vec2( 2.0 * t.x,  0.0)).rgb;
  vec3 g = texture2D(tDiffuse, vUv + vec2(-2.0 * t.x, -2.0 * t.y)).rgb;
  vec3 h = texture2D(tDiffuse, vUv + vec2( 0.0,       -2.0 * t.y)).rgb;
  vec3 i = texture2D(tDiffuse, vUv + vec2( 2.0 * t.x, -2.0 * t.y)).rgb;
  vec3 j = texture2D(tDiffuse, vUv + vec2(-t.x,  t.y)).rgb;
  vec3 k = texture2D(tDiffuse, vUv + vec2( t.x,  t.y)).rgb;
  vec3 l = texture2D(tDiffuse, vUv + vec2(-t.x, -t.y)).rgb;
  vec3 m = texture2D(tDiffuse, vUv + vec2( t.x, -t.y)).rgb;

  vec3 result = e * 0.125;
  result += (a + c + g + i) * 0.03125;
  result += (b + d + f + h) * 0.0625;
  result += (j + k + l + m) * 0.125;
  gl_FragColor = vec4(result, 1.0);
}
`;

/**
 * 9-tap tent upsample. Rendered with additive blending straight onto the
 * next-larger mip so the chain accumulates on the way back up. `uRadius`
 * scales the tap offsets (wider halo without extra taps).
 */
export const UPSAMPLE_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uRadius;
varying vec2 vUv;

void main() {
  vec2 o = uTexel * uRadius;
  vec3 sum = texture2D(tDiffuse, vUv + vec2(-o.x,  o.y)).rgb;
  sum += texture2D(tDiffuse, vUv + vec2( 0.0,  o.y)).rgb * 2.0;
  sum += texture2D(tDiffuse, vUv + vec2( o.x,  o.y)).rgb;
  sum += texture2D(tDiffuse, vUv + vec2(-o.x,  0.0)).rgb * 2.0;
  sum += texture2D(tDiffuse, vUv).rgb * 4.0;
  sum += texture2D(tDiffuse, vUv + vec2( o.x,  0.0)).rgb * 2.0;
  sum += texture2D(tDiffuse, vUv + vec2(-o.x, -o.y)).rgb;
  sum += texture2D(tDiffuse, vUv + vec2( 0.0, -o.y)).rgb * 2.0;
  sum += texture2D(tDiffuse, vUv + vec2( o.x, -o.y)).rgb;
  gl_FragColor = vec4(sum * 0.0625, 1.0);
}
`;

/**
 * Anamorphic streak — horizontal-only: the centre tap plus 7 taps per side with
 * exponentially decaying weights.
 *
 * `uStride` is measured in **source** texels (`uTexel`), but the pipeline
 * derives it from the source/target size ratio so that the reach in *output*
 * texels — and therefore on screen — is the same whatever resolution the
 * bright buffer happens to run at (`resolutionScale`, `setQualityScale`).
 *
 * Run twice. Pass 1 covers ±7·s output texels around each pixel; pass 2 then
 * strides 14·s, i.e. exactly the full width of pass 1's kernel, so its taps
 * tile pass 1's coverage edge to edge — contiguous, no banding, no dashes.
 * Only the final pass applies `uTint`.
 */
export const STREAK_FRAGMENT = /* glsl */ `
uniform sampler2D tDiffuse;
uniform vec2 uTexel;
uniform float uStride;
uniform float uDecay;
uniform float uGain;
uniform vec3 uTint;
varying vec2 vUv;

void main() {
  vec3 sum = texture2D(tDiffuse, vUv).rgb;
  for (int i = 1; i < 8; i++) {
    float fi = float(i);
    float w = pow(uDecay, fi);
    float dx = uTexel.x * uStride * fi;
    sum += texture2D(tDiffuse, vUv + vec2(dx, 0.0)).rgb * w;
    sum += texture2D(tDiffuse, vUv - vec2(dx, 0.0)).rgb * w;
  }
  gl_FragColor = vec4(sum * uGain * uTint, 1.0);
}
`;

/**
 * Composite — chromatic aberration on the base sample, additive bloom +
 * streak, vignette, animated grain, exposure, soft-shoulder highlight roll-off. No sRGB
 * encode on purpose. Alpha keeps the glow visible over a transparent canvas
 * while staying a *valid premultiplied* pixel (see the tail of `main`).
 */
export const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D tBase;
uniform sampler2D tBloom;
uniform sampler2D tStreak;
uniform vec2 uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uStreakStrength;
uniform float uVignette;
uniform float uVignetteSoftness;
uniform float uChromatic;
uniform float uGrain;
varying vec2 vUv;

float luma(vec3 c) {
  return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

// The scene layers are already display-referred (the cinematic surface
// applies its own filmic curve), so a second ACES would lift the mids and
// wash the frame. Instead: linear up to a knee, then an exponential
// roll-off that saturates at white, so additive bloom / lights compress
// into film-like highlights instead of clipping.
vec3 softShoulder(vec3 x) {
  const float knee = 0.72;
  vec3 over = max(x - knee, 0.0);
  vec3 rolled = knee + (1.0 - knee) * (1.0 - exp(-over / (1.0 - knee)));
  return mix(x, rolled, step(vec3(knee), x));
}

void main() {
  vec2 uv = vUv;
  vec2 dir = uv - 0.5;
  float dist = length(dir);

  vec4 base = texture2D(tBase, uv);
  if (uChromatic > 0.0) {
    vec2 off = uChromatic * dir * dist;
    base.r = texture2D(tBase, uv + off).r;
    base.b = texture2D(tBase, uv - off).b;
  }

  vec3 glow = texture2D(tBloom, uv).rgb * uBloomStrength
            + texture2D(tStreak, uv).rgb * uStreakStrength;
  vec3 hdr = base.rgb + glow;

  if (uVignette > 0.0) {
    float inner = mix(0.35, 0.02, clamp(uVignetteSoftness, 0.0, 1.0));
    hdr *= 1.0 - uVignette * smoothstep(inner, 1.2, dist * 1.6);
  }

  if (uGrain > 0.0) {
    // Offset the hash per frame on both axes with two decorrelated
    // sequences: adding uTime to x and y alike scrolls the grain
    // diagonally instead of letting it scintillate in place.
    vec2 seed = uv * uResolution + vec2(fract(uTime * 0.618) * 97.0, fract(uTime * 0.372) * 61.0);
    float n = hash12(seed) - 0.5;
    // Do not let positive grain manufacture RGB (and therefore alpha below)
    // in otherwise empty transparent pixels. Opaque frames keep base.a=1,
    // while bloom-only halo pixels derive coverage from their own light.
    float grainCoverage = max(base.a, smoothstep(0.0, 0.04, luma(hdr)));
    hdr += n * uGrain * (1.0 - clamp(luma(hdr), 0.0, 1.0)) * grainCoverage;
  }

  vec3 color = softShoulder(max(hdr * uExposure, 0.0));
  // A hair of saturation back — the roll-off desaturates highlights.
  color = mix(vec3(luma(color)), color, 1.05);
  // The canvas is premultiplied (three's default) and the scene target already
  // holds premultiplied colour, so a pixel is only valid while every channel is
  // <= alpha. The additive glow can easily exceed the base alpha over a
  // transparent page, so raise alpha to cover the brightest channel instead of
  // multiplying the colour down (which would extinguish the halo), then clamp
  // the colour to it. Without this, toDataURL() un-premultiplies and clamps,
  // and haloes come back blown out to white.
  float alpha = clamp(max(base.a, max(max(color.r, color.g), color.b)), 0.0, 1.0);
  gl_FragColor = vec4(min(color, vec3(alpha)), alpha);
}
`;
