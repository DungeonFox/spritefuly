  // ---------------------------
  // Boot
  // ---------------------------
  ensureDefaults();
  refreshAllUI();
  renderOnce();

  // Initialise geometry controls with current defaults and set up apply handler
  (function initViewerGeometry(){
    const wInput = document.getElementById("viewWidth");
    const hInput = document.getElementById("viewHeight");
    const xInput = document.getElementById("viewLeft");
    const yInput = document.getElementById("viewTop");
    if (wInput) wInput.value = defaultPopWidth;
    if (hInput) hInput.value = defaultPopHeight;
    if (xInput) xInput.value = defaultPopLeft;
    if (yInput) yInput.value = defaultPopTop;
    const applyBtn = document.getElementById("btnApplyViewGeometry");
    if (applyBtn){
      applyBtn.onclick = () => {
        const wValue = Number(wInput.value);
        const hValue = Number(hInput.value);
        const xValue = Number(xInput.value);
        const yValue = Number(yInput.value);
        let w = Number.isFinite(wValue) ? Math.max(100, wValue) : defaultPopWidth;
        let h = Number.isFinite(hValue) ? Math.max(100, hValue) : defaultPopHeight;
        defaultPopWidth = w;
        defaultPopHeight = h;
        if (Number.isFinite(xValue)) defaultPopLeft = xValue;
        if (Number.isFinite(yValue)) defaultPopTop = yValue;
        // If a viewer window exists, send geometry updates.
        if (popWin && !popWin.closed){
          const cmd = { cmd: "setWindowGeometry" };
          let hasField = false;
          if (Number.isFinite(wValue)){
            cmd.width = Math.max(100, wValue);
            hasField = true;
          }
          if (Number.isFinite(hValue)){
            cmd.height = Math.max(100, hValue);
            hasField = true;
          }
          if (Number.isFinite(xValue)){
            cmd.left = xValue;
            hasField = true;
          }
          if (Number.isFinite(yValue)){
            cmd.top = yValue;
            hasField = true;
          }
          if (hasField){
            sendCommandToViewer(cmd);
            log("Sent pop-out viewer geometry command.");
          }
        }
      };
    }
  })();

  // Keep merged JSON updated (lightweight)
  setInterval(() => {
    // If user is actively editing merged JSON, don't overwrite.
    const active = document.activeElement === $("#mergedJson");
    if (!active) $("#mergedJson").value = JSON.stringify(toManifestSnapshot(), null, 2);
  }, 800);

  // Push initial viewer state if open
  setInterval(() => pushStateToPopout(false), 1200);
