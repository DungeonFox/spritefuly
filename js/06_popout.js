  // ---------------------------
  // Pop-out Viewer
  // ---------------------------
  let popWin = null;
  let popoutReady = false;
  const pendingViewerCommands = [];

  function markPopoutReady(){
    popoutReady = true;
    flushPendingViewerCommands();
  }

  function flushPendingViewerCommands(){
    if (!popWin || popWin.closed) return;
    if (!pendingViewerCommands.length) return;
    const queue = pendingViewerCommands.splice(0, pendingViewerCommands.length);
    for (const cmd of queue){
      try{
        popWin.postMessage({type:"command", command: cmd}, "*");
      } catch {
        /* ignore failed sends */
      }
    }
  }

  function getPopoutGeometryElements(root=document){
    return {
      width: root.getElementById("popoutWidth"),
      height: root.getElementById("popoutHeight"),
      left: root.getElementById("popoutLeft"),
      top: root.getElementById("popoutTop")
    };
  }

  function readPopoutGeometryFields(root=document){
    const {width, height, left, top} = getPopoutGeometryElements(root);
    return {
      width: width ? width.value : "",
      height: height ? height.value : "",
      left: left ? left.value : "",
      top: top ? top.value : ""
    };
  }

  function updatePopoutGeometryFields(values={}, root=document){
    const {width, height, left, top} = getPopoutGeometryElements(root);
    if (width && values.width !== undefined) width.value = values.width;
    if (height && values.height !== undefined) height.value = values.height;
    if (left && values.left !== undefined) left.value = values.left;
    if (top && values.top !== undefined) top.value = values.top;
    return readPopoutGeometryFields(root);
  }

  window.popoutGeometry = {
    getElements: getPopoutGeometryElements,
    read: readPopoutGeometryFields,
    update: updatePopoutGeometryFields
  };

  function openPopout(){
    try{
      // Determine desired geometry from UI inputs or fall back to defaults.
      const wInput = document.getElementById("popoutWidth");
      const hInput = document.getElementById("popoutHeight");
      const xInput = document.getElementById("popoutLeft");
      const yInput = document.getElementById("popoutTop");

      let w = wInput && wInput.value ? parseInt(wInput.value) : defaultPopWidth;
      let h = hInput && hInput.value ? parseInt(hInput.value) : defaultPopHeight;
      let x = xInput && xInput.value !== "" ? parseInt(xInput.value) : NaN;
      let y = yInput && yInput.value !== "" ? parseInt(yInput.value) : NaN;

      // Clamp minimal values
      w = isNaN(w) ? defaultPopWidth : Math.max(100, w);
      h = isNaN(h) ? defaultPopHeight : Math.max(100, h);

      const feat = [];
      feat.push(`width=${w}`);
      feat.push(`height=${h}`);
      if (!isNaN(x)) feat.push(`left=${x}`);
      if (!isNaN(y)) feat.push(`top=${y}`);
      const features = feat.join(",");

      // Open viewer.html in a separate window. (Relative to index.html.)
      const viewerUrl = new URL("viewer.html", window.location.href).toString();
      popWin = window.open(viewerUrl, "hexFlipbookViewer", features);

      if (!popWin){
        log("Pop‑out blocked by browser.", "bad");
        return;
      }

      popoutReady = false;
      pendingViewerCommands.length = 0;

      try{
        popWin.mainWindow = window;
        popWin.popoutGeometry = window.popoutGeometry;
      } catch {}

      // Update defaults so subsequent opens reuse last values
      defaultPopWidth = w;
      defaultPopHeight = h;
      if (!isNaN(x)) defaultPopLeft = x;
      if (!isNaN(y)) defaultPopTop = y;

      log("Pop‑out viewer opened.");

      // The viewer will ping us with {type:'viewerReady'} when it is ready; we also
      // send a fallback state push after a short delay.
      setTimeout(() => pushStateToPopout(true), 250);
    } catch (e){
      log(`Pop‑out failed: ${String(e)}`, "bad");
    }
  }

  function snapshotForViewer(){
    const plan = registry.roots.recipe ? buildRenderPlan(registry.roots.recipe) : null;
    if (!plan) return null;

    const tpl = getNode(plan.tplId);
    const outSize = plan.outSize;

    const rects = {};
    for (const rid of (tpl.rects || [])){
      const r = getNode(rid);
      if (r && r.type === "Rect") rects[rid] = deepClone(r);
    }

    const assets = {};
    for (const {id, node} of listNodesOfType("Asset")){
      assets[id] = { name: node.name||"", src: node.src||"" };
    }

    const frames = plan.frames.map(f => ({
      id: f.id,
      name: f.node?.name || "",
      duration: Math.max(1, +f.node?.duration || 100)
    }));

    const layers = plan.layers.map(L => {
      const n = L.node;
      return {
        id: L.id,
        name: n.name||"",
        visible: !!n.visible,
        asset: n.asset||"",
        defaultRect: n.defaultRect||"",
        opacity: (n.opacity!==undefined)? clamp01(+n.opacity) : 1.0,
        overrides: deepClone(n.overrides || {})
      };
    });

    return {
      outW: outSize.w,
      outH: outSize.h,
      frames,
      layers,
      rects,
      assets
    };
  }

  function pushStateToPopout(reset=false){
    if (!popWin || popWin.closed) return;
    const state = snapshotForViewer();
    if (!state) return;
    try{
      popWin.postMessage({type:"state", state, reset}, "*");
    } catch {}
  }

  // Send command message to viewer
  function sendCommandToViewer(cmd){
    if (!popWin || popWin.closed) return false;
    try{
      if (!popoutReady){
        pendingViewerCommands.push(cmd);
        return true;
      }
      popWin.postMessage({type:"command", command: cmd}, "*");
      return true;
    } catch {
      return false;
    }
  }

  window.markPopoutReady = markPopoutReady;
