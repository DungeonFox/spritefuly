  // Layers: add/delete
  $("#btnAddLayer").onclick = () => {
    const rec = getNode(registry.roots.recipe);
    if (!rec || rec.type !== "Recipe") return;

    const tpl = rec.template ? getNode(rec.template) : null;
    const rectId = (tpl && tpl.type === "Template" && (tpl.rects||[]).length) ? tpl.rects[0] : "";
    const assetId = (registry.roots.assets||[])[0] || "";

    // Build layer name via concatenation to prevent template literal parsing errors
    const L = { type:"Layer", name:'Layer ' + ((rec.layers||[]).length + 1), visible:true, asset:assetId, defaultRect:rectId, opacity:1.0, overrides:{} };
    const lid = makeNewId("anim");
    setNode(lid, L);

    rec.layers = Array.isArray(rec.layers) ? rec.layers : [];
    rec.layers.push(lid);
    setNode(registry.roots.recipe, rec);

    selectedLayerId = lid;
    clearCaches();
    refreshAllUI();
    renderOnce();
  };

  $("#btnDelLayer").onclick = () => {
    const rec = getNode(registry.roots.recipe);
    if (!rec || rec.type !== "Recipe" || !selectedLayerId) return;
    rec.layers = (rec.layers||[]).filter(x => x !== selectedLayerId);
    setNode(registry.roots.recipe, rec);
    registry.nodes.delete(selectedLayerId);
    selectedLayerId = null;
    clearCaches();
    refreshAllUI();
    renderOnce();
  };
