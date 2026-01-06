const fs = require('fs');
const path = require('path');

function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function srgbToLinear(v) {
  v = v / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(rgb) {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1, hex2) {
  try {
    const l1 = luminance(hexToRgb(hex1));
    const l2 = luminance(hexToRgb(hex2));
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  } catch (e) {
    return null;
  }
}

function parseCssVariables(cssText) {
  const vars = {};
  // Match --name: value;
  const re = /--([a-z0-9-_]+)\s*:\s*([^;\n}]+)/gi;
  let m;
  while ((m = re.exec(cssText)) !== null) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function extractRootVariables(cssText) {
  const rootMatch = /:root\s*\{([\s\S]*?)\}/i.exec(cssText);
  if (rootMatch) return parseCssVariables(rootMatch[1]);
  return {};
}

function resolveVar(value, vars) {
  if (!value) return null;
  value = value.trim();
  const varMatch = /var\(--([a-z0-9-_]+)\)/i.exec(value);
  if (varMatch) {
    return resolveVar(vars[varMatch[1]] || value, vars);
  }
  // rgba(...) handle simple rgba(a)
  const rgbaMatch = /rgba?\(([^)]+)\)/i.exec(value);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map(s => s.trim());
    const r = parseFloat(parts[0]);
    const g = parseFloat(parts[1]);
    const b = parseFloat(parts[2]);
    // ignore alpha for contrast (approximate by blending with white/black would be complex)
    return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1);
  }
  // hex
  const hexMatch = /#([0-9a-f]{3,8})/i.exec(value);
  if (hexMatch) return hexMatch[0];
  return null;
}

function runAudit() {
  const cssPath = path.join(__dirname, '..', 'styles.css');
  if (!fs.existsSync(cssPath)) {
    console.error('styles.css not found at', cssPath);
    process.exit(1);
  }
  const css = fs.readFileSync(cssPath, 'utf8');
  const vars = extractRootVariables(css);
  // Also parse dark-theme overrides inside html[data-theme="dark"] block if present
  const darkBlockMatch = /html\[data-theme="dark"\]\s*\{([\s\S]*?)\}/i.exec(css);
  let darkVars = {};
  if (darkBlockMatch) {
    darkVars = parseCssVariables(darkBlockMatch[1]);
  }

  function v(name, mode='light') {
    if (mode === 'dark' && darkVars[name]) return resolveVar(darkVars[name], darkVars);
    return resolveVar(vars[name], vars);
  }

  const checks = [
    { id: 'text-bg-page', label: 'Texto principal / Página', fg: v('text-main') || '#1e293b', bg: v('bg-page') || '#f8f9fa' },
    { id: 'text-bg-card', label: 'Texto principal / Card', fg: v('text-main') || '#1e293b', bg: v('bg-card') || '#ffffff' },
    { id: 'btn-primary', label: 'Botão primário (texto branco / primary)', fg: '#ffffff', bg: v('primary') || '#1e3a8a' },
    { id: 'badge-order', label: 'Badge order (texto / fundo)', fg: v('primary') || '#1e3a8a', bg: v('primary-soft') || '#dbeafe' },
    // The following use the effective badge definitions (final overrides in styles.css)
    { id: 'badge-due', label: 'Badge due (texto / fundo) [effective]', fg: '#ffffff', bg: '#92400e' },
    { id: 'badge-overdue', label: 'Badge overdue (texto / fundo) [effective]', fg: '#ffffff', bg: v('negative-dark') || '#991b1b' },
    { id: 'badge-ok', label: 'Badge ok (texto / fundo)', fg: v('positive-dark') || v('positive') || '#16a34a', bg: v('positive-soft') || '#dcfce7' },
    { id: 'validation-error', label: 'Mensagem erro (texto / fundo branco)', fg: v('negative') || '#dc2626', bg: '#ffffff' },
    { id: 'validation-success', label: 'Mensagem sucesso (texto / fundo branco)', fg: v('positive-dark') || v('positive') || '#16a34a', bg: '#ffffff' }
  ];

  // Also add dark-mode checks
  const darkChecks = [
    { id: 'dark-text-bg-page', label: 'Texto principal / Página (dark)', fg: v('text-main','dark') || '#e6eef8', bg: v('bg-page','dark') || '#071327' },
    { id: 'dark-badge-ok', label: 'Badge ok (dark theme) [effective]', fg: '#ffffff', bg: '#047857' },
    { id: 'dark-validation-success', label: 'Mensagem sucesso (dark)', fg: v('validation-feedback-success','dark') || '#bbf7d0', bg: v('bg-card','dark') || '#071428' }
  ];

  console.log('| ID | Descrição | FG | BG | Contraste | PASS |');
  console.log('|---|---:|---:|---:|---:|---:|');

  checks.forEach(c => {
    const fg = c.fg || null;
    const bg = c.bg || null;
    const fgHex = fg && fg.startsWith('#') ? fg : (fg ? fg : null);
    const bgHex = bg && bg.startsWith('#') ? bg : (bg ? bg : null);
    let ratio = null;
    if (fgHex && bgHex) ratio = contrastRatio(fgHex, bgHex);
    const pass = ratio ? (ratio >= 4.5 ? 'YES' : (ratio >= 3 ? 'AA Large' : 'NO')) : 'N/A';
    console.log(`| ${c.id} | ${c.label} | ${fgHex||''} | ${bgHex||''} | ${ratio?ratio.toFixed(2):'N/A'} | ${pass} |`);
  });

  darkChecks.forEach(c => {
    const fg = c.fg || null;
    const bg = c.bg || null;
    const fgHex = fg && fg.startsWith('#') ? fg : (fg ? fg : null);
    const bgHex = bg && bg.startsWith('#') ? bg : (bg ? bg : null);
    let ratio = null;
    if (fgHex && bgHex) ratio = contrastRatio(fgHex, bgHex);
    const pass = ratio ? (ratio >= 4.5 ? 'YES' : (ratio >= 3 ? 'AA Large' : 'NO')) : 'N/A';
    console.log(`| ${c.id} | ${c.label} | ${fgHex||''} | ${bgHex||''} | ${ratio?ratio.toFixed(2):'N/A'} | ${pass} |`);
  });
}

runAudit();
