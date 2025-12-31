  // ---------------------------
  // Boot
  // ---------------------------
  ensureDefaults();
  const IDEAL_CARD_WIDTH = 1000;
  const IDEAL_CARD_HEIGHT = 1400;
  const IDEAL_CARD_SCALE = 1.1;
  const MIN_CARD_ZOOM = 0.85;
  const MAX_CARD_ZOOM = 1.1;
  const cardRoots = Array.from(document.querySelectorAll(".card-shell"));
  const cardLayoutObservers = new WeakMap();
  const rootStyle = document.documentElement.style;

  function updateControlsPosition(card){
    if (!card) return;
    const controls = card.querySelector(".card-header__controls");
    if (!controls) return;
    const cardRect = card.getBoundingClientRect();
    const rect = controls.getBoundingClientRect();
    rootStyle.setProperty("--card-right", `${cardRect.right}px`);
    rootStyle.setProperty("--card-top", `${cardRect.top}px`);
    rootStyle.setProperty("--controls-right", `${rect.right}px`);
    rootStyle.setProperty("--controls-top", `${rect.top}px`);
    rootStyle.setProperty("--controls-height", `${rect.height}px`);
  }

  function getViewBoxDimensions(svg){
    if (svg && svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.width){
      return svg.viewBox.baseVal;
    }
    const raw = svg ? svg.getAttribute("viewBox") : "";
    const parts = raw ? raw.split(/[,\s]+/).map(Number) : [];
    if (parts.length >= 4 && parts.every((value) => Number.isFinite(value))){
      return {x: parts[0], y: parts[1], width: parts[2], height: parts[3]};
    }
    return null;
  }

  function getLayoutBounds(svg, viewBox){
    if (!svg) return viewBox;
    const regions = Array.from(svg.querySelectorAll("[data-region]"));
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    regions.forEach((region) => {
      const x = Number(region.getAttribute("x"));
      const y = Number(region.getAttribute("y"));
      const w = Number(region.getAttribute("width"));
      const h = Number(region.getAttribute("height"));
      if (![x, y, w, h].every((value) => Number.isFinite(value))) return;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)){
      return viewBox;
    }
    return {x: minX, y: minY, width: maxX - minX, height: maxY - minY};
  }

  function updateCardLayout(card){
    if (!card) return;
    const svg = card.querySelector(".card-layout");
    if (!svg) return;
    const viewBox = getViewBoxDimensions(svg);
    if (!viewBox || !viewBox.width || !viewBox.height) return;
    const baseWidth = viewBox.width || IDEAL_CARD_WIDTH;
    const baseHeight = viewBox.height || IDEAL_CARD_HEIGHT;
    const idealWidth = baseWidth * IDEAL_CARD_SCALE;
    const idealHeight = baseHeight * IDEAL_CARD_SCALE;
    const container = card.parentElement || card;
    const rect = container.getBoundingClientRect();
    const viewportWidth = rect.width || window.innerWidth || idealWidth;
    const viewportHeight = rect.height || window.innerHeight || idealHeight;
    const viewportScale = Math.min(
      viewportWidth / idealWidth,
      viewportHeight / idealHeight
    );
    const safeViewportScale = Number.isFinite(viewportScale) && viewportScale > 0 ? viewportScale : 1;
    const unclampedZoom = safeViewportScale;
    const clampedZoom = Math.min(Math.max(unclampedZoom, MIN_CARD_ZOOM), MAX_CARD_ZOOM);
    const cardWidth = idealWidth * clampedZoom;
    const cardHeight = idealHeight * clampedZoom;
    card.style.setProperty("--visual-grid-unit", clampedZoom);
    card.style.setProperty("--card-w", `${cardWidth}px`);
    card.style.setProperty("--card-h", `${cardHeight}px`);
    card.style.setProperty("--card-ideal-w", `${idealWidth}px`);
    card.style.setProperty("--card-ideal-h", `${idealHeight}px`);
    card.style.setProperty("--card-zoom", clampedZoom);
    const scaleX = clampedZoom * (idealWidth / viewBox.width);
    const scaleY = clampedZoom * (idealHeight / viewBox.height);
    const scale = Math.min(scaleX, scaleY);
    card.style.setProperty("--card-scale", scale);
    card.style.setProperty("--card-scale-x", scaleX);
    card.style.setProperty("--card-scale-y", scaleY);
    let headerInsetX = 0;
    let headerInsetY = 0;
    const regions = svg.querySelectorAll("[data-region]");
    regions.forEach((region) => {
      const name = region.dataset.region;
      if (!name) return;
      const x = Number(region.getAttribute("x")) || 0;
      const y = Number(region.getAttribute("y")) || 0;
      const w = Number(region.getAttribute("width")) || 0;
      const h = Number(region.getAttribute("height")) || 0;
      card.style.setProperty(`--${name}-x`, `${x * scaleX}px`);
      card.style.setProperty(`--${name}-y`, `${y * scaleY}px`);
      card.style.setProperty(`--${name}-w`, `${w * scaleX}px`);
      card.style.setProperty(`--${name}-h`, `${h * scaleY}px`);
      if (name === "section-gap" && h){
        card.style.setProperty("--section-gap", `${h * scaleY}px`);
      }
      if (name === "image" && h){
        card.style.setProperty("--image-h", `${h * scaleY}px`);
      }
      if (name === "header" && h){
        card.style.setProperty("--header-h", `${h * scaleY}px`);
        headerInsetX = x * scaleX;
        headerInsetY = y * scaleY;
      }
      if (name === "panels" && h){
        card.style.setProperty("--panels-h", `${h * scaleY}px`);
      }
      if (name === "footer"){
        card.style.setProperty("--footer-x", `${x * scaleX}px`);
        card.style.setProperty("--footer-y", `${y * scaleY}px`);
        card.style.setProperty("--footer-w", `${w * scaleX}px`);
        card.style.setProperty("--footer-h", `${h * scaleY}px`);
      }
    });
    card.style.setProperty("--card-content-offset-x", `${headerInsetX}px`);
    card.style.setProperty("--card-content-offset-y", `${headerInsetY}px`);
    const baseScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    card.style.setProperty("--card-padding", `${18 * baseScale}px`);
    card.style.setProperty("--header-pad-x", `${14 * baseScale}px`);
    card.style.setProperty("--header-pad-y", `${10 * baseScale}px`);
    card.style.setProperty("--image-pad", `${10 * baseScale}px`);
    card.style.setProperty("--image-gap", `${6 * baseScale}px`);
    updateControlsPosition(card);
  }

  function initCardLayout(root){
    const card = root.querySelector(".tcg-card");
    if (!card) return;
    updateCardLayout(card);
    if (!cardLayoutObservers.has(card)){
      const observer = new ResizeObserver(() => updateCardLayout(card));
      observer.observe(card);
      cardLayoutObservers.set(card, observer);
    }
  }

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

  cardRoots.forEach((root) => initCardLayout(root));

  const updateAllCardLayouts = () => {
    cardRoots.forEach((root) => {
      const card = root.querySelector(".tcg-card");
      if (!card) return;
      updateCardLayout(card);
    });
  };

  window.addEventListener("resize", updateAllCardLayouts);

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
      const merged = (typeof resolveRoleElement === "function") ? resolveRoleElement(root, "merged-json") : $role(root, "merged-json");
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
        const cardId = root.dataset.cardId || "";
        const panelScope = document.querySelector(".card-adjacent") || document;
        const panels = panelScope.querySelectorAll(`[data-panel="${target}"]`);
        let panel = null;
        if (cardId){
          panel = Array.from(panels).find((candidate) => candidate.dataset.cardId === cardId);
          if (!panel){
            panel = Array.from(panels).find((candidate) => !candidate.dataset.cardId);
            if (panel) panel.dataset.cardId = cardId;
          }
        } else {
          panel = panels[0];
        }
        if (!panel) return;
        toggle.addEventListener("click", () => {
          const hidden = panel.classList.toggle("is-hidden");
          toggle.classList.toggle("is-active", !hidden);
          toggle.setAttribute("aria-pressed", hidden ? "false" : "true");
        });
      });
    });
  })();
