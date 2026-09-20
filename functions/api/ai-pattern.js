const ALLOWED_PRESETS = [
  'pastel-checker','mini-checker','rounded-checker','gingham','wavy-checker','hand-checker','soft-plaid','airy-plaid','powder-gingham','fabric-checker','milk-checker','soft-gingham','handmade-plaid','textured-checker','sketch-plaid','marshmallow-check','picnic-check','windowpane-check','layered-check','micro-gingham','tri-color-check','diamond-check','diamond-gingham','flat-checker','flat-tri-check','no-gap-checker','soft-no-gap-check','soft-overlap-check','airy-overlap-check','no-gap-tri-check','torn-checker','pencil-check','pastel-crayon-check','checker-heart','checker-star','checker-dot',
  'polka','tiny-dot','irregular-dot','doodle-dot','ring-dot','bubble-dot','grid','hand-grid','stripe','diagonal-stripe','wavy-stripe','scribble-stripe','wave-lines','zigzag',
  'hearts','outline-hearts','stars','outline-stars','sparkles','kira-sparkle','bows','tiny-bows','puff-hearts','candy-stars',
  'flowers','daisy-dot','cloud','moonstar','smiley','raindrop','doodle','confetti','sticker-mix','sprinkles',
  'sunburst-bg','soft-sunburst-bg','glossy-sun-bg','sparkle-glow-bg'
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
  const negativePrompt = String(body?.negativePrompt || '').trim();
  const excludePatterns = normalizeExcludePatterns(body?.excludePatterns);
  const count = clampInt(body?.count, 1, 6, 4);
  const preferBackground = body?.preferBackground !== false;
  const colorContext = body?.colorContext && typeof body.colorContext === 'object' ? body.colorContext : {};

  if (!prompt) return json({ ok:false, error:'prompt is required.' }, 400);

  if (!context.env.OPENAI_API_KEY) {
    const diagnostic = {
      code: 'missing_api_key',
      http_status: null,
      message: 'OPENAI_API_KEY is not configured in Cloudflare Variables and Secrets.'
    };
    const fallback = buildFallbackSuggestions({ prompt, negativePrompt, excludePatterns, count, preferBackground, colorContext, note:diagnostic.message });
    return json({ ok:true, source:'fallback', schema_version:'1.1', diagnostic, ...fallback });
  }

  try {
    const ai = await generateViaOpenAI({ prompt, negativePrompt, excludePatterns, count, preferBackground, colorContext, env: context.env });
    return json({ ok:true, source:'ai', schema_version:'1.1', diagnostic:{ code:'ok', http_status:200, message:'OpenAI request succeeded.' }, ...ai });
  } catch (error) {
    const diagnostic = classifyOpenAIError(error);
    const fallback = buildFallbackSuggestions({ prompt, negativePrompt, excludePatterns, count, preferBackground, colorContext, note:diagnostic.message });
    return json({ ok:true, source:'fallback', schema_version:'1.1', diagnostic, ...fallback });
  }
}

async function generateViaOpenAI({ prompt, negativePrompt, excludePatterns, count, preferBackground, colorContext, env }) {
  const base = (env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const url = /chat\/completions$/.test(base) ? base : `${base}/chat/completions`;
  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const excludedText = excludePatterns.length ? excludePatterns.join(', ') : '(none)';

  const system = `You are generating structured design suggestions for Cute Pattern Studio v1.5.1, a kawaii seamless pattern web app.
Return ONLY valid JSON with the exact top-level shape:
{
  "suggestions": [
    {
      "id": "string",
      "title": "string",
      "summary": "string",
      "tags": ["string"],
      "bg": { "transparent": false, "mode": "solid or linear", "colors": ["#RRGGBB", "#RRGGBB"], "gradientAngle": 135, "gradientStops": [{"color":"#RRGGBB","pos":0},{"color":"#RRGGBB","pos":100}] },
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
- IMPORTANT: Never include excluded elements. Excluded elements: ${excludedText}.
- If negativePrompt requests excluding checker/gingham/plaid, do not use any checker/plaid-like preset.
- If the prompt mentions clean, neat, aligned, or minimal, set randomSize/randomAngle/randomPosition to false and keep jitter low.
- If the prompt mentions hand drawn, doodle, crayon, fabric, textured, cozy, use more texture-like presets and a little jitter.
- If the prompt mentions halftone, prefer dot-like presets instead of checker.
- If the prompt mentions clouds or doodle, provide suggestions without forced checker unless checker is explicitly requested.
- Use soft pastel palettes unless the prompt asks otherwise.
- Each suggestion should feel distinct but still faithful to the prompt.
- Respond with JSON only, no markdown.`;

  const user = {
    prompt,
    negativePrompt,
    excludePatterns,
    preferBackground,
    colorContext,
    count,
    target: 'Cute Pattern Studio v1.5.1',
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

  if (!response.ok) {
    let errorBody = '';
    try { errorBody = await response.text(); } catch {}
    const error = new Error(`OpenAI HTTP ${response.status}`);
    error.status = response.status;
    error.body = errorBody;
    error.model = model;
    throw error;
  }
  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content || '{}';
  const parsed = safeJsonParse(raw);
  if (!parsed || !Array.isArray(parsed.suggestions)) throw new Error('Invalid JSON schema from model.');

  return { suggestions: parsed.suggestions.slice(0, count), exclusions: excludePatterns };
}

function classifyOpenAIError(error) {
  const status = Number(error?.status) || null;
  const body = String(error?.body || '');
  const message = String(error?.message || 'OpenAI request failed.');
  const combined = `${message} ${body}`.toLowerCase();

  if (status === 401) {
    return {
      code: 'auth_failed',
      http_status: 401,
      message: 'OpenAI 인증 실패(401): API 키가 잘못되었거나 만료/비활성 상태일 수 있습니다.'
    };
  }

  if (status === 429) {
    return {
      code: 'rate_limit',
      http_status: 429,
      message: 'OpenAI 사용 한도/요청 제한(429): 크레딧, 결제 상태 또는 요청 한도를 확인하세요.'
    };
  }

  if (status === 404 || ((status === 400 || status === 403) && /model|does not exist|not found|access/.test(combined))) {
    return {
      code: 'model_error',
      http_status: status,
      message: `OpenAI 모델 오류${status ? `(${status})` : ''}: OPENAI_MODEL 값 또는 해당 모델 접근 권한을 확인하세요.`
    };
  }

  if (/model/.test(combined) && /(invalid|unsupported|not found|does not exist|access)/.test(combined)) {
    return {
      code: 'model_error',
      http_status: status,
      message: 'OpenAI 모델 오류: OPENAI_MODEL 값 또는 모델 접근 권한을 확인하세요.'
    };
  }

  return {
    code: 'api_error',
    http_status: status,
    message: `OpenAI API 오류${status ? `(${status})` : ''}: ${message}`
  };
}

function buildFallbackSuggestions({ prompt, negativePrompt, excludePatterns, count, preferBackground, colorContext, note }) {
  const promptLower = String(prompt || '').toLowerCase();
  const allLower = `${prompt} ${negativePrompt}`.toLowerCase();
  const exclusions = buildExclusionMap(excludePatterns, allLower);
  const palette = buildPalette(promptLower, colorContext);
  let family = detectPrimaryFamily(promptLower);
  const clean = /(clean|neat|simple|minimal|aligned|uniform)/.test(promptLower);
  const hand = /(hand.?drawn|doodle|sketch|crayon|fabric|textured|cozy)/.test(promptLower);
  const y2k = /(y2k|kitsch|kitch|pop|groovy)/.test(promptLower);
  const dreamy = /(dreamy|soft|cute|kawaii|pastel|gentle|fluffy)/.test(promptLower);

  family = resolveAllowedFamily(family, exclusions, promptLower);
  let baseCandidates = familyBasePresets(family, { hand, clean, y2k, dreamy });
  baseCandidates = filterExcludedPresets(baseCandidates, exclusions);
  if (!baseCandidates.length) baseCandidates = filterExcludedPresets(['polka','doodle','cloud','sparkles','confetti'], exclusions);
  if (!baseCandidates.length) baseCandidates = ['polka'];

  let overlays = detectOverlayPresets(promptLower, exclusions);
  overlays = filterExcludedPresets(overlays, exclusions);

  const suggestions = [];

  for (let i = 0; i < count; i++) {
    const basePreset = baseCandidates[i % baseCandidates.length] || baseCandidates[0];
    const secondaryPreset = overlays[i % Math.max(1, overlays.length)] || null;
    const colors = varyPalette(palette, i);

    const primaryLayer = makeLayer({
      presetId: basePreset,
      colors: [colors.bgA, colors.patternA, colors.patternB, colors.accent, colors.line],
      size: clampInt(baseSizeForFamily(family) + i * 4, 18, 220, 72),
      gap: clampInt(baseGapForFamily(family) + i * 3, 0, 140, 22),
      jitter: clean ? 0 : hand ? 20 : 8 + i * 2,
      rotation: /diamond/.test(basePreset) ? 0 : (y2k && i === 2 ? 8 : 0),
      stroke: family === 'checker' ? 2 : family === 'dots' ? 3 : 2,
      opacity: 100,
      detail: hand ? 62 : 42,
      randomSize: !clean && !isStructuredPreset(basePreset),
      randomAngle: !clean && !isStructuredPreset(basePreset),
      randomPosition: !clean && !isStructuredPreset(basePreset),
      offsetX: 0,
      offsetY: 0
    });

    const layers = [primaryLayer];

    if (secondaryPreset && !sameFamilyPreset(basePreset, secondaryPreset)) {
      layers.push(makeLayer({
        presetId: secondaryPreset,
        colors: [colors.bgA, colors.patternA, colors.patternB, colors.accent, colors.line],
        size: family === 'dots' ? 34 : family === 'cloud' ? 50 : 38,
        gap: 40 + i * 6,
        jitter: clean ? 0 : 15,
        rotation: 0,
        stroke: /outline/.test(secondaryPreset) ? 3 : 2,
        opacity: family === 'checker' ? 42 : 52,
        detail: 46,
        randomSize: !clean,
        randomAngle: !clean,
        randomPosition: !clean,
        offsetX: 0,
        offsetY: 0
      }));
    }

    if (y2k && i === count - 1 && !isPresetExcluded('sparkles', exclusions)) {
      layers.push(makeLayer({
        presetId: 'sparkles',
        colors: [colors.bgA, colors.patternA, colors.patternB, colors.accent, colors.line],
        size: 30,
        gap: 28,
        jitter: clean ? 0 : 10,
        rotation: 0,
        stroke: 2,
        opacity: 34,
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
      title: suggestionTitle(basePreset, secondaryPreset, indexLabelFamily(family, i + 1)),
      summary: suggestionSummary(basePreset, secondaryPreset, { clean, hand, y2k, dreamy, family, exclusions }),
      tags: buildTags(promptLower, family, secondaryPreset, { clean, hand, y2k, dreamy, exclusions }),
      bg,
      layers
    });
  }

  return {
    note,
    exclusions: exclusions.raw,
    suggestions
  };
}

function makeLayer(layer) {
  return {
    enabled: true,
    sourceType: 'builtin',
    presetId: ALLOWED_PRESETS.includes(layer.presetId) ? layer.presetId : 'polka',
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

function normalizeExcludePatterns(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(v => String(v || '').trim().toLowerCase()).filter(Boolean))];
}

function buildExclusionMap(excludePatterns, lower) {
  const set = new Set(normalizeExcludePatterns(excludePatterns));
  const addIf = (name, re) => { if (re.test(lower)) set.add(name); };
  addIf('checker', /(?:without|no|exclude|except)\s+(?:checker|check|gingham|plaid)|체크\s*제외|깅엄\s*제외/);
  addIf('dots', /(?:without|no|exclude|except)\s+(?:dot|dots|polka|halftone)|도트\s*제외|땡땡이\s*제외/);
  addIf('hearts', /(?:without|no|exclude|except)\s+hearts?|하트\s*제외/);
  addIf('stars', /(?:without|no|exclude|except)\s+stars?|별\s*제외/);
  addIf('bows', /(?:without|no|exclude|except)\s+(?:bows?|ribbons?)|리본\s*제외/);
  addIf('clouds', /(?:without|no|exclude|except)\s+clouds?|구름\s*제외/);
  addIf('doodle', /(?:without|no|exclude|except)\s+doodle|낙서\s*제외/);
  return {
    raw: [...set],
    checker: set.has('checker') || set.has('gingham') || set.has('plaid'),
    dots: set.has('dots') || set.has('halftone') || set.has('polka'),
    hearts: set.has('hearts') || set.has('heart'),
    stars: set.has('stars') || set.has('star'),
    bows: set.has('bows') || set.has('bow') || set.has('ribbon') || set.has('ribbons'),
    clouds: set.has('clouds') || set.has('cloud'),
    doodle: set.has('doodle')
  };
}

function detectPrimaryFamily(lower) {
  if (/(sunburst|sunshine|sun ray|sun rays|radial ray|radial rays|glossy|glow|shiny|light burst|빛|햇살|광택)/.test(lower)) return 'light';
  if (/(halftone|polka|dot|dots)/.test(lower)) return 'dots';
  if (/cloud/.test(lower)) return 'cloud';
  if (/doodle/.test(lower)) return 'doodle';
  if (/(heart|star|bow|ribbon|sparkle|flower|floral|daisy|smile)/.test(lower)) return 'motif';
  if (/(gingham|checker|checkerboard|check|plaid)/.test(lower)) return 'checker';
  if (/(stripe|stripes|wave|wavy|grid|zigzag)/.test(lower)) return 'lines';
  if (/(confetti|sticker|sprinkles)/.test(lower)) return 'kitsch';
  if (/(cute|kawaii|pastel|dreamy|soft)/.test(lower)) return 'dots';
  return 'dots';
}

function resolveAllowedFamily(family, exclusions, lower) {
  const order = [family, 'light', 'dots', 'doodle', 'cloud', 'motif', 'lines', 'kitsch', 'checker'];
  for (const candidate of order) {
    if (!candidate) continue;
    if (candidate === 'checker' && exclusions.checker) continue;
    if (candidate === 'dots' && exclusions.dots) continue;
    if (candidate === 'cloud' && exclusions.clouds) continue;
    if (candidate === 'doodle' && exclusions.doodle) continue;
    if (candidate === 'motif' && exclusions.hearts && exclusions.stars && exclusions.bows) continue;
    return candidate;
  }
  return 'dots';
}

function detectOverlayPresets(lower, exclusions) {
  const out = [];
  if (/(bow|ribbon)/.test(lower) && !exclusions.bows) out.push('tiny-bows', 'bows');
  if (/heart/.test(lower) && !exclusions.hearts) out.push('hearts', 'outline-hearts');
  if (/star/.test(lower) && !exclusions.stars) out.push('stars', 'outline-stars');
  if (/sparkle|twinkle|glitter/.test(lower) && !exclusions.stars) out.push('sparkles', 'kira-sparkle');
  if (/flower|floral|daisy/.test(lower) && !exclusions.dots) out.push('flowers', 'daisy-dot');
  if (/cloud/.test(lower) && !exclusions.clouds) out.push('cloud');
  if (/smile/.test(lower)) out.push('smiley');
  if (/doodle/.test(lower) && !exclusions.doodle) out.push('doodle');
  return [...new Set(out)];
}

function familyBasePresets(family, flags) {
  if (family === 'light') return ['sunburst-bg','soft-sunburst-bg','glossy-sun-bg','sparkle-glow-bg'];
  if (family === 'dots') return flags.clean ? ['tiny-dot','polka','ring-dot','bubble-dot'] : ['polka','tiny-dot','doodle-dot','bubble-dot'];
  if (family === 'lines') return ['grid','hand-grid','stripe','diagonal-stripe','wavy-stripe','wave-lines','zigzag'];
  if (family === 'kitsch') return ['confetti','sticker-mix','sprinkles','sparkles'];
  if (family === 'cloud') return ['cloud','doodle','sparkles','smiley'];
  if (family === 'doodle') return ['doodle','sprinkles','confetti','sticker-mix'];
  if (family === 'motif') return flags.clean ? ['hearts','stars','bows','sparkles'] : ['hearts','stars','bows','flowers','sparkles'];
  const arr = [];
  if (flags.hand) arr.push('textured-checker','pencil-check','pastel-crayon-check','fabric-checker','torn-checker');
  if (flags.clean) arr.push('soft-gingham','mini-checker','flat-checker','no-gap-checker','soft-no-gap-check','soft-overlap-check','airy-overlap-check','windowpane-check');
  if (flags.y2k) arr.push('diamond-check','tri-color-check','no-gap-tri-check','soft-overlap-check','wavy-checker','checker-star');
  arr.push('pastel-checker','gingham','soft-plaid','marshmallow-check','no-gap-checker');
  return [...new Set(arr)].slice(0, 8);
}

function filterExcludedPresets(list, exclusions) {
  return list.filter(id => !isPresetExcluded(id, exclusions));
}

function isPresetExcluded(id, exclusions) {
  const s = String(id).toLowerCase();
  if (exclusions.checker && /(check|checker|gingham|plaid)/.test(s)) return true;
  if (exclusions.dots && /(dot|polka|bubble-dot|ring-dot|daisy-dot|checker-dot)/.test(s)) return true;
  if (exclusions.hearts && /(heart|hearts|puff-hearts|checker-heart)/.test(s)) return true;
  if (exclusions.stars && /(stars|star|moonstar|candy-stars|checker-star|sparkle|kira-sparkle)/.test(s)) return true;
  if (exclusions.bows && /(bows|bow|ribbon)/.test(s)) return true;
  if (exclusions.clouds && /cloud/.test(s)) return true;
  if (exclusions.doodle && /doodle/.test(s)) return true;
  return false;
}

function baseSizeForFamily(family) {
  return ({ checker:72, dots:44, lines:70, motif:46, cloud:64, doodle:52, kitsch:42 })[family] || 60;
}

function baseGapForFamily(family) {
  return ({ checker:12, dots:24, lines:12, motif:36, cloud:28, doodle:26, kitsch:20 })[family] || 18;
}

function isStructuredPreset(id) {
  return /(gingham|plaid|checker|grid|stripe|zigzag|wave-lines|diagonal-stripe|wavy-stripe)/.test(id);
}

function sameFamilyPreset(a, b) {
  if (!a || !b) return false;
  const toFam = id => /(checker|gingham|plaid)/.test(id) ? 'checker' : /(dot|polka|bubble|ring)/.test(id) ? 'dots' : /(heart|bow|star|flower|cloud|smiley|sparkle|doodle)/.test(id) ? 'motif' : 'other';
  return toFam(a) === toFam(b);
}

function indexLabelFamily(family, n) {
  const label = ({ checker:'Check', dots:'Dot', lines:'Line', motif:'Motif', cloud:'Cloud', doodle:'Doodle', kitsch:'Kitsch', light:'Light' })[family] || 'Pattern';
  return `${n}. ${label}`;
}

function suggestionTitle(basePreset, secondaryPreset, prefix) {
  const primary = niceName(basePreset);
  const secondary = secondaryPreset ? ` + ${niceName(secondaryPreset)}` : '';
  return `${prefix} · ${primary}${secondary}`;
}

function suggestionSummary(basePreset, secondaryPreset, flags) {
  const parts = [];
  if (flags.clean) parts.push('깔끔하게 정렬된 느낌');
  if (flags.hand) parts.push('손그림/텍스처 감성');
  if (flags.dreamy) parts.push('부드러운 파스텔 무드');
  if (flags.y2k) parts.push('살짝 키치한 포인트');
  if (flags.exclusions?.checker) parts.push('체크 제외');
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
  if (flags.exclusions?.checker) tags.push('no_checker');
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
