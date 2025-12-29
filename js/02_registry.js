  // ---------------------------
  // Hex-Graph Registry
  // ---------------------------
  const registry = {
    manifestVersion: 1,
    nodes: new Map(),      // id -> node
    roots: { template: null, recipe: null, assets: [], tasks: [] },
    caches: {
      resolve: new Map(),  // id -> resolved node (shallow)
      plan: new Map(),     // recipeId -> precomputed plan
      composed: new Map()  // key -> ImageData/Canvas (optional)
    }
  };

  function clearCaches(){
    registry.caches.resolve.clear();
    registry.caches.plan.clear();
    registry.caches.composed.clear();
  }

  function setNode(id, node){
    registry.nodes.set(id, node);
  }
  function getNode(id){
    return registry.nodes.get(id) || null;
  }

  function mergeManifest(m){
    if (!m || typeof m !== "object") return;
    if (m.manifestVersion !== 1){
      log(`Manifest version mismatch or missing; attempting best-effort merge.`, "warn");
    }
    const nodes = m.nodes || {};
    for (const [id, node] of Object.entries(nodes)){
      if (!node || typeof node !== "object" || !node.type) continue;
      setNode(id, node);
    }
    if (m.roots){
      if (m.roots.template) registry.roots.template = m.roots.template;
      if (m.roots.recipe) registry.roots.recipe = m.roots.recipe;
      if (Array.isArray(m.roots.assets)) registry.roots.assets = Array.from(new Set([...registry.roots.assets, ...m.roots.assets]));
      if (Array.isArray(m.roots.tasks)) registry.roots.tasks = Array.from(new Set([...registry.roots.tasks, ...m.roots.tasks]));
    }
    clearCaches();
    updateStatus();
  }

  function toManifestSnapshot(){
    const nodesObj = {};
    for (const [id, node] of registry.nodes.entries()) nodesObj[id] = node;
    return {
      manifestVersion: 1,
      nodes: nodesObj,
      roots: deepClone(registry.roots)
    };
  }

  function updateStatus(){
    statusPill.textContent = `registry: ${registry.nodes.size} nodes`;
    $("#tplRootMini").textContent = registry.roots.template ? registry.roots.template : "(no template root)";
    $("#recRootMini").textContent = registry.roots.recipe ? registry.roots.recipe : "(no recipe root)";
    $("#taskRootMini").textContent = (registry.roots.tasks && registry.roots.tasks.length) ? `${registry.roots.tasks.length} task(s)` : "(no tasks)";
    $("#mergedJson").value = JSON.stringify(toManifestSnapshot(), null, 2);
  }
