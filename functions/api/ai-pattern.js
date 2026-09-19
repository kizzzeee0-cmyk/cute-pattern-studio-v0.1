const ALLOWED_PRESETS = [
  'pastel-checker','mini-checker','rounded-checker','gingham','wavy-checker','hand-checker','soft-plaid','airy-plaid','powder-gingham','fabric-checker','milk-checker','soft-gingham','handmade-plaid','textured-checker','sketch-plaid','marshmallow-check','picnic-check','windowpane-check','layered-check','micro-gingham','tri-color-check','diamond-check','diamond-gingham','flat-checker','flat-tri-check','pencil-check','pastel-crayon-check','checker-heart','checker-star','checker-dot',
  'polka','tiny-dot','irregular-dot','doodle-dot','ring-dot','bubble-dot','grid','hand-grid','stripe','diagonal-stripe','wavy-stripe','scribble-stripe','wave-lines','zigzag',
  'hearts','outline-hearts','stars','outline-stars','sparkles','kira-sparkle','bows','tiny-bows','puff-hearts','candy-stars',
  'flowers','daisy-dot','cloud','moonstar','smiley','raindrop','doodle','confetti','sticker-mix','sprinkles'
];

const COLOR_WORDS = {
  pink:'#F5B9D4', rose:'#E9A7C2', blush:'#F7CADB', red:'#EE8D9A', coral:'#F6B6A7', peach:'#F8C7AC', orange:'#F6C188', apricot:'#F3C692',
  yellow:'#F5D36C', lemon:'#F6DC8C', butter:'#F2D48F', cream:'#FFF7EA', beige:'#E8D7C1', brown:'#BEA184',
  mint:'#A9DDCF', sage:'#A8B4A3', green:'#A7D3A0', olive:'#A9B18A',
  blue:'#AFC3FF', sky:'#B7DAFF', cyan:'#BDECF2', aqua:'#B7E5EA', teal:'#9BCFC8',
  lavender:'#CDBCF4', lilac:'#D7C6F7', purple:'#C6AFE8', violet:'#B89BE3',
  white:'#FFFDFD', ivory:'#FFF8F1', gray:'#D6D6E0', grey:'#D6D6E0', black:'#655B78'
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok:false, error:'Invalid JSON body.' }, 400);
  }

  const prompt = String(body?.prompt || '').trim();
  const count = clampInt(body?.count, 1, 6, 4);
  const preferBackground = body?.preferBackground !== false;
  const colorContext = body?.colorContext && typeof body.colorContext === 'object' ? body.colorContext : {};

  if (!prompt) return json({ ok:false, error:'prompt is required.' }, 400);

  try {
    if (context.env.OPENAI_API_KEY) {
      const ai = await generateViaOpenAI({ prompt, count, preferBackground, colorContext, env: context.env });
      return json({ ok:true, source:'ai', schema_version:'1.0', ...ai });
    }
  } catch (error) {
    const fallback = buildFallbackSuggestions({ prompt, count, preferBackground, colorContext, note:`AI error: ${error.message}` });
    return json({ ok:true, source:'fallback', schema_version:'1.0', ...fallback });
  }

  const fallback = buildFallbackSuggestions({ prompt, count, preferBackground, colorContext, note:'No OPENAI_API_KEY configured.' });
  return json({ ok:true, source:'fallback', schema_version:'1.0', ...fallback });
}

async function generateViaOpenAI({ prompt, count, preferBackground, colorContext, env }) {
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const url = /chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';

  const system = `You are generating structured design suggestions for Cute Pattern Studio, a kawaii seamless pattern web app.
Return ONLY valid JSON with the exact top-level shape:
{
  "suggestions": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "tags": ["string"],
      "bg": { "transparent": false, "mode": "solid or linear", "colors": ["#RRGGBB", "#RRGGBB"], "gradientAngle": 135 },
      "layers": [
        {
          "enabled": true,
          "sourceType": "builtin",
          "presetId": "allowed id",
          "colors": ["#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB", "#RRGGBB"],
          "size": 72,
          "gap": 24,
          "jitter": 12,
          "rotation": 0,
          "stroke": 2,
          "opacity": 100,
          "detail": 45,
          "randomSize": false,
          "randomAngle": false,
          "randomPosition": false,
          "offsetX": 0,
          "offsetY": 0
        }
      ]
    }
  ]
}
Rules:
- Use only sourceType "builtin".
- Use only these presetIds: ${ALLOWED_PRESETS.join(', ')}.
- Generate exactly ${count} suggestions.
- Make suggestions cute, editable, and practical for a 2000x2000 profile background.
- Prefer 1 to 3 layers per suggestion.
- If the prompt mentions clean, neat, aligned, or minimal, set randomSize/randomAngle/randomPosition to false and keep jitter low.
- If the prompt mentions hand drawn, doodle, crayon, fabric, textured, cozy, use more texture-like presets and a little jitter.
- Use soft pastel palettes unless the prompt asks otherwise.
- Each suggestion should feel distinct but still faithful to the prompt.
- Respond with JSON only, no markdown.`;

  const user = {
    prompt,
    preferBackground,
    colorContext,
    count,
    target: 'Cute Pattern Studio v1.2',
    note: 'Create editable pattern engine settings rather than a raster image.'
  };

  const response = await fetch(url, {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'authorization':`Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.8,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(user) }
      ]
    })
  });

  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}`);
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || '{}';
  const parsed = safeJsonParse(raw);
  if (!parsed || !Array.isArray(parsed.suggestions)) throw new Error('Invalid JSON schema from model.');

  return { suggestions: parsed.suggestions.slice(0, count) };
}

function buildFallbackSuggestions({ prompt, count, preferBackground, colorContext, note }) {
  const lower = prompt.toLowerCase();
  const palette = buildPalette(lower, colorContext);
  const family = detectPrimaryFamily(lower);
  const overlays = detectOverlayPresets(lower);
  const clean = /(clean|neat|simple|minimal|aligned|uniform)/.test(lower);
  const hand = /(hand.?drawn|doodle|sketch|crayon|fabric|textured|cozy)/.test(lower);
  const y2k = /(y2k|kitsch|kitch|pop|groovy)/.test(lower);
  const dreamy = /(dreamy|soft|cute|kawaii|pastel|gentle|fluffy)/.test(lower);

  const baseCandidates = familyBasePresets(family, { hand, clean, y2k });
  const suggestions = [];

  for (let i = 0; i < count; i++) {
    const basePreset = baseCandidates[i % baseCandidates.length];
    const secondaryPreset = overlays[i % overlays.length];
    const colors = varyPalette(palette, i);
    const primaryLayer = makeLayer({
      presetId: basePreset,
      colors: [colors.bgA, colors.patternA, colors.patternB, colors.accent, colors.line],
      size: clampInt(72 + i * 4, 18, 220, 72),
      gap: family === 'dots' ? 24 + i * 3 : 12 + i * 2,
      jitter: clean ? 0 : hand ? 22 : 10 + i * 2,
      rotation: basePreset.includes('diamond') ? 0 : (y2k && i === 2 ? 8 : 0),
      stroke: family === 'checker' ? 2 : 3,
      opacity: 100,
      detail: hand ? 62 : 42,
      randomSize: !clean && !/(gingham|plaid|checker)/.test(basePreset),
      randomAngle: !clean && !/(gingham|plaid|checker)/.test(basePreset),
      randomPosition: !clean && !/(gingham|plaid|checker|dot)/.test(basePreset),
      offsetX: 0,
      offsetY: 0
    });

    const layers = [primaryLayer];

    if (secondaryPreset) {
      layers.push(makeLayer({
        presetId: secondaryPreset,
        colors: [colors.bgA, colors.patternA, colors.patternB, colors.accent, colors.line],
        size: family === 'dots' ? 42 : 38,
        gap: 42 + i * 6,
        jitter: clean ? 0 : 18,
        rotation: 0,
        stroke: secondaryPreset.includes('outline') ? 3 : 2,
        opacity: family === 'checker' ? 42 : 56,
        detail: 46,
        randomSize: !clean,
        randomAngle: !clean,
        randomPosition: !clean,
        offsetX: 0,
        offsetY: 0
      }));
    }

    if (y2k && i === count - 1) {
      layers.push(makeLayer({
        presetId: 'sparkles',
        colors: [colors.bgA, colors.patternA, colors.patternB, colors.accent, colors.line],
        size: 34,
        gap: 28,
        jitter: clean ? 0 : 12,
        rotation: 0,
        stroke: 2,
        opacity: 40,
        detail: 55,
        randomSize: !clean,
        randomAngle: !clean,
        randomPosition: !clean,
        offsetX: 0,
        offsetY: 0
      }));
    }

    const bg = {
      transparent: false,
      mode: preferBackground && i % 3 === 1 ? 'linear' : 'solid',
      colors: [colors.bgA, colors.bgB],
      gradientAngle: 135
    };

    suggestions.push({
      id: `fallback-${i + 1}`,
      title: suggestionTitle(basePreset, secondaryPreset, i + 1),
      summary: suggestionSummary(basePreset, secondaryPreset, { clean, hand, y2k, dreamy }),
      tags: buildTags(lower, family, secondaryPreset, { clean, hand, y2k, dreamy }),
      bg,
      layers
    });
  }

  return {
    note,
    suggestions
  };
}

function makeLayer(layer) {
  return {
    enabled: true,
    sourceType: 'builtin',
    presetId: ALLOWED_PRESETS.includes(layer.presetId) ? layer.presetId : 'pastel-checker',
    colors: normalizeColors(layer.colors || []),
    size: clampInt(layer.size, 12, 220, 72),
    gap: clampInt(layer.gap, 0, 140, 22),
    jitter: clampInt(layer.jitter, 0, 100, 10),
    rotation: clampInt(layer.rotation, -180, 180, 0),
    stroke: clampInt(layer.stroke, 0, 18, 3),
    opacity: clampInt(layer.opacity, 0, 100, 100),
    detail: clampInt(layer.detail, 0, 100, 45),
    randomSize: layer.randomSize !== false,
    randomAngle: layer.randomAngle !== false,
    randomPosition: layer.randomPosition !== false,
    offsetX: clampInt(layer.offsetX, -200, 200, 0),
    offsetY: clampInt(layer.offsetY, -200, 200, 0)
  };
}

function normalizeColors(colors) {
  const base = Array.isArray(colors) ? colors.slice(0, 5) : [];
  while (base.length < 4) base.push(base[base.length - 1] || '#FFFFFF');
  if (!base[4]) base[4] = base[3] || base[2] || base[1] || '#BCA7DD';
  return base.map(c => /^#[0-9A-F]{6}$/i.test(c) ? c.toUpperCase() : '#FFFFFF');
}

function detectPrimaryFamily(lower) {
  if (/(gingham|checker|checkerboard|check|plaid)/.test(lower)) return 'checker';
  if (/(polka|dot|dots)/.test(lower)) return 'dots';
  if (/(stripe|stripes|wave|wavy)/.test(lower)) return 'lines';
  if (/(confetti|sticker|sprinkles)/.test(lower)) return 'kitsch';
  if (/(heart|star|bow|ribbon|sparkle)/.test(lower)) return 'motif';
  return 'checker';
}

function detectOverlayPresets(lower) {
  const out = [];
  if (/(bow|ribbon)/.test(lower)) out.push('tiny-bows', 'bows');
  if (/heart/.test(lower)) out.push('hearts', 'outline-hearts');
  if (/star/.test(lower)) out.push('stars', 'outline-stars');
  if (/sparkle|twinkle|glitter/.test(lower)) out.push('sparkles', 'kira-sparkle');
  if (/flower|floral|daisy/.test(lower)) out.push('daisy-dot', 'flowers');
  if (/cloud/.test(lower)) out.push('cloud');
  if (/smile/.test(lower)) out.push('smiley');
  if (/doodle/.test(lower)) out.push('doodle');
  if (!out.length) out.push('tiny-bows', 'hearts', 'sparkles');
  return out;
}

function familyBasePresets(family, flags) {
  if (family === 'dots') return flags.clean ? ['tiny-dot','polka','ring-dot','bubble-dot'] : ['polka','tiny-dot','doodle-dot','bubble-dot'];
  if (family === 'lines') return ['grid','soft-plaid','wavy-checker','windowpane-check'].filter(Boolean);
  if (family === 'kitsch') return ['confetti','sticker-mix','sprinkles','doodle'];
  if (family === 'motif') return flags.clean ? ['flat-checker','pastel-checker','mini-checker','soft-gingham'] : ['checker-heart','checker-star','pastel-checker','soft-gingham'];
  const arr = [];
  if (flags.hand) arr.push('textured-checker','pencil-check','pastel-crayon-check','fabric-checker');
  if (flags.clean) arr.push('soft-gingham','mini-checker','flat-checker','windowpane-check');
  if (flags.y2k) arr.push('diamond-check','tri-color-check','wavy-checker','checker-star');
  arr.push('pastel-checker','gingham','soft-plaid','marshmallow-check');
  return [...new Set(arr)].slice(0, 8);
}

function suggestionTitle(basePreset, secondaryPreset, index) {
  const primary = niceName(basePreset);
  const secondary = secondaryPreset ? ` + ${niceName(secondaryPreset)}` : '';
  return `${index}. ${primary}${secondary}`;
}

function suggestionSummary(basePreset, secondaryPreset, flags) {
  const parts = [];
  if (flags.clean) parts.push('깔끔하게 정렬된 느낌');
  if (flags.hand) parts.push('손그림/텍스처 감성');
  if (flags.dreamy) parts.push('부드러운 파스텔 무드');
  if (flags.y2k) parts.push('살짝 키치한 포인트');
  parts.push(`${niceName(basePreset)} 중심 구성`);
  if (secondaryPreset) parts.push(`${niceName(secondaryPreset)} 포인트 레이어`);
  return parts.join(' · ');
}

function buildTags(lower, family, secondaryPreset, flags) {
  const tags = [family];
  if (secondaryPreset) tags.push(secondaryPreset.replace(/-/g, '_'));
  if (flags.clean) tags.push('clean');
  if (flags.hand) tags.push('textured');
  if (flags.y2k) tags.push('y2k');
  if (flags.dreamy) tags.push('pastel');
  if (/profile/.test(lower)) tags.push('profile_bg');
  return [...new Set(tags)].slice(0, 8);
}

function buildPalette(lower, colorContext = {}) {
  const found = [];
  for (const [word, hex] of Object.entries(COLOR_WORDS)) {
    if (new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(lower)) found.push(hex);
  }
  let base = found[0] || colorContext.base || '#F5B9D4';
  let sub = found[1] || colorContext.sub || hueShift(base, 18, 0.9, 1.03);
  let accent = found[2] || colorContext.accent || hueShift(base, 145, 0.78, 0.98);
  const bgA = mixHex(base, '#FFFFFF', 0.78);
  const bgB = mixHex(sub, '#FFFFFF', 0.84);
  const patternA = mixHex(base, '#FFFFFF', 0.18);
  const patternB = mixHex(sub, '#FFFFFF', 0.24);
  const line = colorContext.line || darken(mixHex(patternA, patternB, 0.55), 0.42);
  return { bgA, bgB, patternA, patternB, accent, line };
}

function varyPalette(palette, index) {
  const step = [0, 12, -12, 28, -20][index] || 0;
  return {
    bgA: hueShift(palette.bgA, step, 0.95, 1),
    bgB: hueShift(palette.bgB, step + 6, 0.96, 1),
    patternA: hueShift(palette.patternA, step, 1, 1),
    patternB: hueShift(palette.patternB, step + 8, 1, 1),
    accent: hueShift(palette.accent, step + 12, 1, 1),
    line: hueShift(palette.line, step, 1, 0.96)
  };
}

function niceName(id) {
  return id.replace(/-/g, ' ');
}

function safeJsonParse(text) {
  try { return JSON.parse(text); } catch {}
  try {
    const match = String(text).match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch { return null; }
}

function clampInt(v, min, max, fallback) {
  let n = Math.round(Number(v));
  if (Number.isNaN(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}

function mixHex(a, b, ratio = 0.5) {
  const ca = hexToRgb(a), cb = hexToRgb(b);
  return rgbToHex({
    r: ca.r * (1 - ratio) + cb.r * ratio,
    g: ca.g * (1 - ratio) + cb.g * ratio,
    b: ca.b * (1 - ratio) + cb.b * ratio
  });
}

function darken(hex, amount = 0.2) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.l = Math.max(0, hsl.l * (1 - amount));
  return rgbToHex(hslToRgb(hsl));
}

function hueShift(hex, deg = 0, satMul = 1, lightMul = 1) {
  const hsl = rgbToHsl(hexToRgb(hex));
  hsl.h = (hsl.h + deg + 360) % 360;
  hsl.s = Math.min(1, Math.max(0, hsl.s * satMul));
  hsl.l = Math.min(0.97, Math.max(0.05, hsl.l * lightMul));
  return rgbToHex(hslToRgb(hsl));
}

function hexToRgb(hex) {
  const v = String(hex).replace('#', '').trim();
  const full = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
