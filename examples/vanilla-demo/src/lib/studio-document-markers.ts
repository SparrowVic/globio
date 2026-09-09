import type { MarkerCardStyle } from '@/configurator/layer-fixtures';

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]!));

const colorPattern = /^(?:#[\da-f]{3,4}|#[\da-f]{6}|#[\da-f]{8}|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d.,%+\- /\s]+\))$/i;

/** Matches the CSS color values accepted by the editor, without CSS declarations or URLs. */
export const isStudioColor = (value: string): boolean => value === '' || colorPattern.test(value);

/** Shared HTML string keeps browser previews and JSON exports visually identical. */
export const buildMarkerCardHtml = (label: string, style: MarkerCardStyle, color: string): string => {
  const accent = isStudioColor(color) && color ? color : '#67e8f9';
  const text = escapeHtml(label);
  const base = 'pointer-events:none;user-select:none;font-family:ui-sans-serif,system-ui,sans-serif;white-space:nowrap;transform-origin:center bottom;';
  const element = (styles: string, content: string) => `<div style="${escapeHtml(base + styles)}">${content}</div>`;

  if (style === 'minimal') {
    return element('color:#ffffff;font-size:11px;font-weight:500;letter-spacing:0.03em;text-shadow:0 1px 4px rgba(0,0,0,0.7)', text);
  }
  if (style === 'pill') {
    return element(`color:#0a0d18;background:${accent};font-size:10.5px;font-weight:600;letter-spacing:0.04em;padding:3px 8px;border-radius:999px;box-shadow:0 0 12px ${accent}88,0 1px 3px rgba(0,0,0,0.4)`, text);
  }
  if (style === 'badge') {
    return element(`background:rgba(10,13,24,0.9);border:1px solid ${accent};padding:4px 10px;border-radius:6px;box-shadow:0 0 14px ${accent}55`,
      `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${escapeHtml(accent)};margin-right:6px;vertical-align:middle;box-shadow:0 0 6px ${escapeHtml(accent)}"></span><span style="color:#ffffff;font-size:10.5px;font-weight:500;letter-spacing:0.04em;vertical-align:middle">${text}</span>`);
  }
  return element(`background:rgba(10,13,24,0.92);border:1px solid ${accent}66;padding:6px 10px 7px;border-radius:8px;box-shadow:0 8px 24px -6px rgba(0,0,0,0.6),0 0 16px ${accent}33;position:relative`,
    `<div style="color:${escapeHtml(accent)};font-size:8.5px;font-weight:600;letter-spacing:0.18em;margin-bottom:2px">CITY</div><div style="color:#ffffff;font-size:12px;font-weight:600;letter-spacing:0.02em">${text}</div><span style="position:absolute;left:50%;bottom:-4px;transform:translateX(-50%) rotate(45deg);width:6px;height:6px;background:rgba(10,13,24,0.92);border-right:1px solid ${escapeHtml(accent)}66;border-bottom:1px solid ${escapeHtml(accent)}66"></span>`);
};
