  // ---------------------------
  // Utilities
  // ---------------------------
  const $ = (sel) => document.querySelector(sel);
  const logEl = $("#log");
  const statusPill = $("#statusPill");

  // Default geometry for the pop‑out viewer. These values are used when opening a new
  // viewer and can be modified via the geometry controls. They persist across
  // runs of the current session.
  let defaultPopWidth = 520;
  let defaultPopHeight = 520;
  let defaultPopLeft = 100;
  let defaultPopTop = 100;

  function log(msg, kind="info"){
    const t = new Date().toISOString().slice(11,19);
    const tag = kind === "bad" ? "[!]" : kind === "warn" ? "[~]" : "[i]";
    logEl.textContent = `${t} ${tag} ${msg}\n` + logEl.textContent;
  }

  function clamp01(x){ return Math.max(0, Math.min(1, x)); }

  function canonicalize(v){
    if (v === null) return null;
    if (typeof v !== "object") return v;
    if (Array.isArray(v)) return v.map(canonicalize);
    const keys = Object.keys(v).sort();
    const out = {};
    for (const k of keys){
      if (v[k] === undefined) continue;
      out[k] = canonicalize(v[k]);
    }
    return out;
  }

  // 64-bit FNV-1a (BigInt), deterministic in JS
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME  = 0x100000001b3n;
  const MASK64     = (1n << 64n) - 1n;
  const enc = new TextEncoder();

  function fnv1a64Hex(str){
    let h = FNV_OFFSET;
    const bytes = enc.encode(str);
    for (let i=0;i<bytes.length;i++){
      h ^= BigInt(bytes[i]);
      h = (h * FNV_PRIME) & MASK64;
    }
    let hex = h.toString(16);
    hex = hex.padStart(16, "0");
    return hex;
  }

  function makeId(ns, type, payloadObj){
    const canon = canonicalize(payloadObj);
    const s = JSON.stringify({type, ...canon});
    return `${ns}:0x${fnv1a64Hex(s)}`;
  }

  function deepClone(x){ return JSON.parse(JSON.stringify(x)); }

  function downloadText(filename, text){
    const blob = new Blob([text], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function downloadBlob(filename, blob){
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function safeJsonParse(text){
    try { return JSON.parse(text); }
    catch (e){ return {__error: String(e)}; }
  }
