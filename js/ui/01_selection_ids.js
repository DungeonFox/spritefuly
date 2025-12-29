  // ---------------------------
  // UI Model Editing Helpers
  // ---------------------------
  let selectedRectId = null;
  let selectedFrameId = null;
  let selectedAssetId = null;
  let selectedLayerId = null;
  let selectedTaskId = null;

  function nsOf(id){
    const i = id.indexOf(":0x");
    return i > 0 ? id.slice(0, i) : "";
  }

  function makeNewId(ns){
    // Non-deterministic temporary ID (still hex‑y). Deterministic IDs can be enforced later.
    const r = Math.floor(Math.random()*1e16).toString(16).padStart(16,"0");
    return `${ns}:0x${r}`;
  }
