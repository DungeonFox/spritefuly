  // ---------------------------
  // Renderer (flipbook compositing)
  // ---------------------------
  const previewCanvas = $("#previewCanvas");
  const pctx = previewCanvas.getContext("2d", { willReadFrequently: true });

  const images = new Map(); // assetId -> HTMLImageElement

  async function ensureAssetImage(assetId){
    const asset = getNode(assetId);
    if (!asset || asset.type !== "Asset") return null;
    if (images.has(assetId)) return images.get(assetId);

    if (!asset.src || typeof asset.src !== "string" || !asset.src.startsWith("data:image/")){
      // Can't load; keep placeholder
      return null;
    }

    const img = new Image();
    img.decoding = "async";
    const prom = new Promise((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Image load failed"));
    });
    img.src = asset.src;
    try{
      await prom;
      images.set(assetId, img);
      return img;
    } catch {
      return null;
    }
  }

  function computeOutputSize(template){
    const w = Math.max(1, (+template.tileW||1) * (+template.gridW||1));
    const h = Math.max(1, (+template.tileH||1) * (+template.gridH||1));
    return {w, h};
  }

  function buildRenderPlan(recipeId){
    if (registry.caches.plan.has(recipeId)) return registry.caches.plan.get(recipeId);

    const recipe = getNode(recipeId);
    if (!recipe || recipe.type !== "Recipe") return null;
    const tpl = getNode(recipe.template);
    if (!tpl || tpl.type !== "Template") return null;

    const frames = (tpl.frames || []).map(fid => ({ id: fid, node: getNode(fid) })).filter(x => x.node && x.node.type === "FrameSlot");
    const rectById = new Map();
    for (const rid of (tpl.rects || [])){
      const r = getNode(rid);
      if (r && r.type === "Rect") rectById.set(rid, r);
    }

    const layers = (recipe.layers || []).map(lid => ({ id: lid, node: getNode(lid) })).filter(x => x.node && x.node.type === "Layer");

    const outSize = computeOutputSize(tpl);

    const plan = { recipeId, tplId: recipe.template, outSize, frames, layers, rectById };
    registry.caches.plan.set(recipeId, plan);
    return plan;
  }

  async function composeFrameToCanvas(plan, frameIndex, targetCtx){
    const tpl = getNode(plan.tplId);
    const outW = plan.outSize.w, outH = plan.outSize.h;
    targetCtx.clearRect(0,0,outW,outH);

    // Debug background checker
    const cs = 8;
    for (let y=0;y<outH;y+=cs){
      for (let x=0;x<outW;x+=cs){
        targetCtx.fillStyle = ((x/cs + y/cs) % 2 === 0) ? "#0c1118" : "#0a0e14";
        targetCtx.fillRect(x,y,cs,cs);
      }
    }

    const f = plan.frames[frameIndex];
    if (!f) return;

    for (const L of plan.layers){
      const layer = L.node;
      if (!layer.visible) continue;

      const ovr = (layer.overrides && typeof layer.overrides === "object") ? layer.overrides : {};
      const ov = ovr[f.id] || {};
      const rectId = (ov.rect || layer.defaultRect || "");
      const rect = plan.rectById.get(rectId);
      if (!rect) continue;

      const assetId = layer.asset || rect.asset;
      const img = await ensureAssetImage(assetId);
      if (!img) {
        // draw placeholder
        targetCtx.save();
        targetCtx.globalAlpha = 0.8;
        targetCtx.fillStyle = "rgba(255,204,102,0.20)";
        targetCtx.strokeStyle = "rgba(255,204,102,0.55)";
        targetCtx.lineWidth = 2;
        const dx = (+rect.dx||0) + (+ov.dx||0);
        const dy = (+rect.dy||0) + (+ov.dy||0);
        const dw = (+rect.dw||+rect.sw||0);
        const dh = (+rect.dh||+rect.sh||0);
        targetCtx.fillRect(dx,dy,dw,dh);
        targetCtx.strokeRect(dx+1,dy+1,Math.max(0,dw-2),Math.max(0,dh-2));
        targetCtx.fillStyle = "rgba(255,204,102,0.85)";
        targetCtx.font = "12px ui-monospace";
        targetCtx.fillText("missing asset", dx+4, dy+14);
        targetCtx.restore();
        continue;
      }

      const layerOpacity = (layer.opacity !== undefined) ? clamp01(+layer.opacity) : 1.0;
      const ovOpacity = (ov.opacity !== undefined) ? clamp01(+ov.opacity) : 1.0;

      const sx = +rect.sx||0, sy = +rect.sy||0, sw = +rect.sw||0, sh = +rect.sh||0;
      const dx = (+rect.dx||0) + (+ov.dx||0);
      const dy = (+rect.dy||0) + (+ov.dy||0);
      const dw = (+rect.dw||sw||0);
      const dh = (+rect.dh||sh||0);

      targetCtx.save();
      targetCtx.globalAlpha = clamp01(layerOpacity * ovOpacity);
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      targetCtx.restore();
    }
  }

  // Playback loop
  let playing = false;
  let curFrame = 0;
  let nextAt = 0;

  function getFrameDurationMs(plan, idx){
    const f = plan.frames[idx]?.node;
    const d = f ? (+f.duration||100) : 100;
    return Math.max(1, d);
  }

  async function renderOnce(){
    const plan = registry.roots.recipe ? buildRenderPlan(registry.roots.recipe) : null;
    if (!plan){
      pctx.clearRect(0,0,previewCanvas.width, previewCanvas.height);
      $("#frameInfo").textContent = "(no plan)";
      $("#sizeInfo").textContent = "-";
      return;
    }
    const outW = plan.outSize.w, outH = plan.outSize.h;
    if (previewCanvas.width !== outW || previewCanvas.height !== outH){
      previewCanvas.width = outW; previewCanvas.height = outH;
    }
    await composeFrameToCanvas(plan, curFrame, pctx);

    const f = plan.frames[curFrame];
    const fname = f?.node?.name || `#${curFrame}`;
    $("#frameInfo").textContent = `${curFrame}/${Math.max(0,plan.frames.length-1)}  ${fname}  (${getFrameDurationMs(plan,curFrame)}ms)`;
    $("#sizeInfo").textContent = `${outW}×${outH}`;
    $("#playMini").textContent = playing ? "playing" : "stopped";
  }

  async function tick(){
    if (!playing){ return; }
    const plan = registry.roots.recipe ? buildRenderPlan(registry.roots.recipe) : null;
    if (!plan || plan.frames.length === 0){
      playing = false;
      $("#btnPlay").textContent = "Play";
      $("#playMini").textContent = "stopped";
      return;
    }
    const now = performance.now();
    if (now >= nextAt){
      await renderOnce();
      const dur = getFrameDurationMs(plan, curFrame);
      nextAt = now + dur;
      curFrame = (curFrame + 1) % plan.frames.length;
      // notify popout
      pushStateToPopout(false);
    }
    requestAnimationFrame(tick);
  }
