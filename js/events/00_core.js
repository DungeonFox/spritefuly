  // ---------------------------
  // Event Wiring
  // ---------------------------
  const currentViewerGeometry = {
    left: null,
    top: null,
    width: null,
    height: null
  };
  window.currentViewerGeometry = currentViewerGeometry;
  $("#btnRehash").onclick = () => recomputeIdsTopologically();
  $("#btnPopout").onclick = () => openPopout();
  $("#btnExportAtlas").onclick = () => exportAtlas();

  // Listen for frame events from the viewer and apply any queued geometry triggers.
  window.addEventListener("message", (ev) => {
    const m = ev.data;
    if (!m || typeof m !== "object") return;
    if (m.type === "viewerReady"){
      if (typeof window.markPopoutReady === "function"){
        window.markPopoutReady();
      }
      pushStateToPopout(true);
      return;
    }
    const fields = ["left", "top", "width", "height"];
    if (m.type === "windowGeometry"){
      const hasGeometryPayload = fields.every((field) => typeof m[field] === "number" && Number.isFinite(m[field]));
      if (!hasGeometryPayload){
        log("Received invalid viewer window geometry payload.", "warn");
        return;
      }
      if (!window.currentViewerGeometry){
        window.currentViewerGeometry = {};
      }
      for (const field of fields){
        window.currentViewerGeometry[field] = m[field];
      }
      return;
    }
    if (m.type === "frame"){
      const fIndex = m.frameIndex;
      const fId = m.frameId;
      const fName = m.frameName;
      // Iterate over triggers and dispatch matching geometry commands. Use a plain for loop
      // so that triggers can be removed during iteration.
      for (let i=0; i<frameTriggers.length; i++){
        const trig = frameTriggers[i];
        // Match on provided criteria. If a criterion is defined and does not match, skip.
        if (trig.hasOwnProperty('frameIndex') && trig.frameIndex !== fIndex) continue;
        if (trig.frameId && trig.frameId !== fId) continue;
        if (trig.frameName && trig.frameName !== fName) continue;
        // Build the geometry command, only including properties that are numbers.
        const cmd = { cmd: 'setWindowGeometry' };
        if (typeof trig.width === 'number') cmd.width = trig.width;
        if (typeof trig.height === 'number') cmd.height = trig.height;
        if (typeof trig.left === 'number') cmd.left = trig.left;
        if (typeof trig.top === 'number') cmd.top = trig.top;
        if (typeof trig.duration === 'number') cmd.duration = trig.duration;
        if (typeof trig.ease === 'string') cmd.ease = trig.ease;
        sendCommandToViewer(cmd);
        // Remove one-shot triggers; keep repeating triggers
        if (!trig.repeat){
          frameTriggers.splice(i, 1);
          i--;
        }
      }
    }
  });

  $("#fileTemplate").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (f) await handleLoadTemplateFile(f);
    e.target.value = "";
  };
  $("#fileRecipe").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (f) await handleLoadRecipeFile(f);
    e.target.value = "";
  };
  $("#fileTasker").onchange = async (e) => {
    const f = e.target.files?.[0];
    if (f) await handleLoadTaskerFile(f);
    e.target.value = "";
  };

  $("#btnSaveTemplate").onclick = () => saveTemplateJson();
  $("#btnSaveRecipe").onclick = () => saveRecipeJson();
  $("#btnSaveTasks").onclick = () => saveTasksJson();

  $("#btnCopyMerged").onclick = async () => {
    try{
      await navigator.clipboard.writeText($("#mergedJson").value);
      log("Copied merged manifest JSON to clipboard.");
    } catch {
      log("Clipboard copy failed (browser permissions).", "warn");
    }
  };

  $("#btnLoadMerged").onclick = () => {
    const j = safeJsonParse($("#mergedJson").value);
    if (j.__error){ log(`Merged JSON parse error: ${j.__error}`, "bad"); return; }
    registry.nodes = new Map();
    registry.roots = { template:null, recipe:null, assets:[], tasks:[] };
    mergeManifest(j);
    clearCaches();
    refreshAllUI();
    renderOnce();
    log("Loaded merged manifest JSON.");
  };
