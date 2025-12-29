  // ---------------------------
  // Boot
  // ---------------------------
  ensureDefaults();
  refreshAllUI();
  renderOnce();

  // Initialise geometry controls with current defaults and set up apply handler
  (function initViewerGeometry(){
    const geometry = window.popoutGeometry;
    const elements = geometry ? geometry.getElements() : {
      width: document.getElementById("popoutWidth"),
      height: document.getElementById("popoutHeight"),
      left: document.getElementById("popoutLeft"),
      top: document.getElementById("popoutTop")
    };
    const {width: wInput, height: hInput, left: xInput, top: yInput} = elements;
    if (wInput) wInput.value = defaultPopWidth;
    if (hInput) hInput.value = defaultPopHeight;
    if (xInput) xInput.value = defaultPopLeft;
    if (yInput) yInput.value = defaultPopTop;
    const applyBtn = document.getElementById("popoutGeometryApply");
    if (applyBtn){
      applyBtn.onclick = () => {
        const current = geometry ? geometry.getElements() : elements;
        const wValue = Number(current.width?.value);
        const hValue = Number(current.height?.value);
        const xValue = Number(current.left?.value);
        const yValue = Number(current.top?.value);
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
