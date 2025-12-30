  // ---------------------------
  // Utilities
  // ---------------------------
  const $ = (sel) => document.querySelector(sel);
  const $in = (root, sel) => root ? root.querySelector(sel) : null;
  const $$in = (root, sel) => root ? Array.from(root.querySelectorAll(sel)) : [];
  const $role = (root, role) => $in(root, `[data-role="${role}"]`);
  const statusPill = $("#statusPill");

  function toDataRole(id){
    if (!id || typeof id !== "string") return "";
    return id.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/_/g, "-").toLowerCase();
  }

  function escapeCardSelector(value){
    if (window.CSS && typeof window.CSS.escape === "function"){
      return window.CSS.escape(value);
    }
    return String(value).replace(/"/g, '\\"');
  }

  function getCardRoot(cardId){
    if (!cardId){
      return document.querySelector(".card-shell");
    }
    const selector = `.card-shell[data-card-id="${escapeCardSelector(cardId)}"]`;
    return document.querySelector(selector);
  }

  function getCardRootByElement(el){
    if (!el || typeof el.closest !== "function") return null;
    return el.closest(".card-shell");
  }

  function resolveCardRoot(cardRoot){
    return cardRoot || getCardRootByElement(document.activeElement) || getCardRoot();
  }

  function getCardIdFromRoot(cardRoot){
    return cardRoot?.dataset?.cardId || "";
  }

  // Default geometry for the pop‑out viewer. These values are used when opening a new
  // viewer and can be modified via the geometry controls. They persist across
  // runs of the current session.
  let defaultPopWidth = 520;
  let defaultPopHeight = 520;
  let defaultPopLeft = 100;
  let defaultPopTop = 100;

  function log(msg, kind="info", cardRoot){
    const root = resolveCardRoot(cardRoot);
    const logEl = root ? $role(root, "log") : null;
    if (!logEl) return;
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
