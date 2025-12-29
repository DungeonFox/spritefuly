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
        let w = parseInt(wInput.value);
        let h = parseInt(hInput.value);
        let x = parseInt(xInput.value);
        let y = parseInt(yInput.value);
        if (isNaN(w)) w = defaultPopWidth;
        if (isNaN(h)) h = defaultPopHeight;
        w = Math.max(100, w);
        h = Math.max(100, h);
        defaultPopWidth = w;
        defaultPopHeight = h;
        if (!isNaN(x)) defaultPopLeft = x;
        if (!isNaN(y)) defaultPopTop = y;
        // If a viewer window exists, resize and move it
        if (popWin && !popWin.closed){
          try{
            popWin.resizeTo(defaultPopWidth, defaultPopHeight);
            const newX = !isNaN(x) ? x : popWin.screenX;
            const newY = !isNaN(y) ? y : popWin.screenY;
            popWin.moveTo(newX, newY);
          } catch {}
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
