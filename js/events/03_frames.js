  // Add/delete FrameSlot
  $("#btnAddFrame").onclick = () => {
    const tpl = getNode(registry.roots.template);
    if (!tpl || tpl.type !== "Template") return;
    const idx = (tpl.frames||[]).length;
    // Build frame name via concatenation to avoid mismatched quotes in template literals
    const frame = { type:"FrameSlot", name:'f' + String(idx).padStart(3, '0'), duration:100 };
    const fid = makeNewId("tpl");
    setNode(fid, frame);
    tpl.frames = Array.isArray(tpl.frames) ? tpl.frames : [];
    tpl.frames.push(fid);
    setNode(registry.roots.template, tpl);
    selectedFrameId = fid;
    clearCaches();
    refreshAllUI();
    renderOnce();
  };
  $("#btnDelFrame").onclick = () => {
    const tpl = getNode(registry.roots.template);
    if (!tpl || tpl.type !== "Template" || !selectedFrameId) return;
    tpl.frames = (tpl.frames||[]).filter(x => x !== selectedFrameId);
    setNode(registry.roots.template, tpl);
    registry.nodes.delete(selectedFrameId);

    // Remove overrides keyed by that frame
    for (const {id, node} of listNodesOfType("Layer")){
      if (node.overrides && typeof node.overrides === "object"){
        delete node.overrides[selectedFrameId];
      }
      setNode(id, node);
    }

    selectedFrameId = null;
    clearCaches();
    refreshAllUI();
    renderOnce();
  };
