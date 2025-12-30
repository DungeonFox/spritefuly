  // ---------------------------
  // Boot
  // ---------------------------
  ensureDefaults();
  const cardRoots = Array.from(document.querySelectorAll(".card-shell"));

  (function initCardIdentity(){
    const fallbackId = (typeof getOrCreateCardId === "function") ? getOrCreateCardId() : "";
    cardRoots.forEach((root, index) => {
      let cardId = root.dataset.cardId;
      if (!cardId){
        if (index === 0 && fallbackId){
          cardId = fallbackId;
        } else if (fallbackId){
          cardId = `${fallbackId}-${index + 1}`;
        } else {
          cardId = `card-${index + 1}`;
        }
      }
      root.dataset.cardId = cardId;
      const title = $role(root, "card-title");
      if (title) title.textContent = `Sprite Editor Deck · ${cardId}`;
    });
  })();

  cardRoots.forEach((root) => {
    refreshAllUI(root);
    renderOnce(root);
  });

  // Initialise geometry controls with current defaults and set up apply handler
  function initViewerGeometry(root){
    const geometry = window.popoutGeometry;
    const elements = geometry ? geometry.getElements(root) : {
      width: $role(root, "popout-width"),
      height: $role(root, "popout-height"),
      left: $role(root, "popout-left"),
      top: $role(root, "popout-top")
    };
    const {width: wInput, height: hInput, left: xInput, top: yInput} = elements;
    if (wInput) wInput.value = defaultPopWidth;
    if (hInput) hInput.value = defaultPopHeight;
    if (xInput) xInput.value = defaultPopLeft;
    if (yInput) yInput.value = defaultPopTop;
    const applyBtn = $role(root, "popout-geometry-apply");
    if (applyBtn){
      applyBtn.onclick = () => {
        const current = geometry ? geometry.getElements(root) : elements;
        const readNumeric = (input) => {
          if (!input) return NaN;
          const raw = input.value;
          if (raw === "" || raw === null || raw === undefined) return NaN;
          const parsed = Number(raw);
          return Number.isFinite(parsed) ? parsed : NaN;
        };
        const wValue = readNumeric(current.width);
        const hValue = readNumeric(current.height);
        const xValue = readNumeric(current.left);
        const yValue = readNumeric(current.top);
        let w = Number.isFinite(wValue) ? Math.max(100, wValue) : defaultPopWidth;
        let h = Number.isFinite(hValue) ? Math.max(100, hValue) : defaultPopHeight;
        defaultPopWidth = w;
        defaultPopHeight = h;
        if (Number.isFinite(xValue)) defaultPopLeft = xValue;
        if (Number.isFinite(yValue)) defaultPopTop = yValue;
        // If a viewer window exists, send geometry updates.
        const popoutWin = (typeof window.getPopoutWindow === "function") ? window.getPopoutWindow(root) : null;
        if (popoutWin && !popoutWin.closed){
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
            sendCommandToViewer(cmd, root);
            log("Sent pop-out viewer geometry command.", "info", root);
          }
        }
      };
    }
  }

  cardRoots.forEach((root) => initViewerGeometry(root));

  if (typeof initCoreEvents === "function"){
    cardRoots.forEach((root) => initCoreEvents(root));
  }
  if (typeof initTemplateEvents === "function"){
    cardRoots.forEach((root) => initTemplateEvents(root));
  }
  if (typeof initRectEvents === "function"){
    cardRoots.forEach((root) => initRectEvents(root));
  }
  if (typeof initFrameEvents === "function"){
    cardRoots.forEach((root) => initFrameEvents(root));
  }
  if (typeof initAssetEvents === "function"){
    cardRoots.forEach((root) => initAssetEvents(root));
  }
  if (typeof initLayerEvents === "function"){
    cardRoots.forEach((root) => initLayerEvents(root));
  }
  if (typeof initTaskEvents === "function"){
    cardRoots.forEach((root) => initTaskEvents(root));
  }

  // Keep merged JSON updated (lightweight)
  setInterval(() => {
    cardRoots.forEach((root) => {
      const merged = $role(root, "merged-json");
      if (!merged) return;
      // If user is actively editing merged JSON, don't overwrite.
      const active = document.activeElement === merged;
      if (!active) merged.value = JSON.stringify(toManifestSnapshot(), null, 2);
    });
  }, 800);

  // Push initial viewer state if open
  setInterval(() => {
    cardRoots.forEach((root) => pushStateToPopout(false, root));
  }, 1200);

  // Toggle supplemental panels beside the card.
  (function initSupplementalPanels(){
    cardRoots.forEach((root) => {
      const toggles = root.querySelectorAll("[data-panel-toggle]");
      if (!toggles.length) return;
      toggles.forEach((toggle) => {
        const target = toggle.getAttribute("data-panel-toggle");
        const panel = root.querySelector(`[data-panel="${target}"]`);
        if (!panel) return;
        toggle.addEventListener("click", () => {
          const hidden = panel.classList.toggle("is-hidden");
          toggle.classList.toggle("is-active", !hidden);
          toggle.setAttribute("aria-pressed", hidden ? "false" : "true");
        });
      });
    });
  })();
