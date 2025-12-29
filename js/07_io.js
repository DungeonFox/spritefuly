  // ---------------------------
  // IO: Load / Save
  // ---------------------------
  async function readFileText(file){
    return await file.text();
  }

  async function handleLoadTemplateFile(file){
    const txt = await readFileText(file);
    const j = safeJsonParse(txt);
    if (j.__error){ log(`template.json parse error: ${j.__error}`, "bad"); return; }
    mergeManifest(j);
    if (j.roots?.template) registry.roots.template = j.roots.template;
    clearCaches();
    refreshAllUI();
    renderOnce();
    log(`Loaded template manifest: ${file.name}`);
  }

  async function handleLoadRecipeFile(file){
    const txt = await readFileText(file);
    const j = safeJsonParse(txt);
    if (j.__error){ log(`animation.json parse error: ${j.__error}`, "bad"); return; }
    mergeManifest(j);
    if (j.roots?.recipe) registry.roots.recipe = j.roots.recipe;
    clearCaches();
    refreshAllUI();
    renderOnce();
    log(`Loaded recipe manifest: ${file.name}`);
  }

  async function handleLoadTaskerFile(file){
    const txt = await readFileText(file);
    const j = safeJsonParse(txt);
    if (j.__error){ log(`tasks.json parse error: ${j.__error}`, "bad"); return; }
    mergeManifest(j);
    if (Array.isArray(j.roots?.tasks)) registry.roots.tasks = Array.from(new Set([...registry.roots.tasks, ...j.roots.tasks]));
    clearCaches();
    refreshAllUI();
    renderOnce();
    log(`Loaded tasks manifest: ${file.name}`);
  }

  function saveTemplateJson(){
    const tplId = registry.roots.template;
    const tpl = tplId ? getNode(tplId) : null;
    if (!tpl || tpl.type !== "Template"){
      log("No Template root to save.", "bad");
      return;
    }
    // Include Template + its referenced rects and frames; plus any assets those rects reference.
    const nodes = {};
    const assets = new Set();

    nodes[tplId] = deepClone(tpl);
    for (const rid of (tpl.rects || [])){
      const r = getNode(rid);
      if (r && r.type === "Rect"){
        nodes[rid] = deepClone(r);
        if (r.asset) assets.add(r.asset);
      }
    }
    for (const fid of (tpl.frames || [])){
      const f = getNode(fid);
      if (f && f.type === "FrameSlot") nodes[fid] = deepClone(f);
    }
    for (const aid of assets){
      const a = getNode(aid);
      if (a && a.type === "Asset") nodes[aid] = deepClone(a);
    }

    const manifest = { manifestVersion: 1, nodes, roots: { template: tplId, assets: Array.from(assets) } };
    downloadText("template.json", JSON.stringify(manifest, null, 2));
    log("Saved template.json");
  }

  function saveRecipeJson(){
    const recId = registry.roots.recipe;
    const rec = recId ? getNode(recId) : null;
    if (!rec || rec.type !== "Recipe"){
      log("No Recipe root to save.", "bad");
      return;
    }
    const nodes = {};
    const assets = new Set();

    nodes[recId] = deepClone(rec);

    // Include layers + assets they reference; include template root only as an ID
    for (const lid of (rec.layers || [])){
      const L = getNode(lid);
      if (L && L.type === "Layer"){
        nodes[lid] = deepClone(L);
        if (L.asset) assets.add(L.asset);
      }
    }
    for (const aid of assets){
      const a = getNode(aid);
      if (a && a.type === "Asset") nodes[aid] = deepClone(a);
    }

    const manifest = { manifestVersion: 1, nodes, roots: { recipe: recId, assets: Array.from(assets) } };
    downloadText("animation.json", JSON.stringify(manifest, null, 2));
    log("Saved animation.json");
  }

  function saveTasksJson(){
    const taskIds = listNodesOfType("Task").map(x => x.id);
    if (taskIds.length === 0){
      log("No tasks to save.", "warn");
      return;
    }
    const nodes = {};
    for (const tid of taskIds){
      const t = getNode(tid);
      if (t && t.type === "Task") nodes[tid] = deepClone(t);
    }
    const manifest = { manifestVersion: 1, nodes, roots: { tasks: taskIds.slice() } };
    downloadText("tasks.json", JSON.stringify(manifest, null, 2));
    log("Saved tasks.json");
  }
