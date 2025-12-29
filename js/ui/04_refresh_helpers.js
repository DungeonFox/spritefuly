  function refreshAllUI(){
    updateStatus();
    refreshTemplateUI();
    refreshRecipeUI();
    refreshTaskerUI();
    wireDynamicInputs(); // re-bind dynamic inputs
    pushStateToPopout(false);
  }

  function escapeHtml(s){
    s = String(s ?? "");
    return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"','&quot;');
  }

  function numBox(id, key, value){
    const v = (value !== undefined && value !== null) ? value : 0;
    return `<input data-k="${key}" data-id="${id}" type="number" step="1" value="${escapeHtml(v)}" style="width:70px" />`;
  }

  function selectBox(id, key, options, current){
    const opts = options.map(o => {
      const label = o === "" ? "(none)" : o;
      const sel = (o === current) ? "selected" : "";
      return `<option value="${escapeHtml(o)}" ${sel}>${escapeHtml(label)}</option>`;
    }).join("");
    return `<select data-k="${key}" data-id="${escapeHtml(id)}">${opts}</select>`;
  }

  function wireDynamicInputs(){
    // Node field changes: data-k + data-id
    document.querySelectorAll("[data-k][data-id]").forEach(el => {
      el.onchange = () => {
        const key = el.getAttribute("data-k");
        const id = el.getAttribute("data-id");
        const node = getNode(id);
        if (!node) return;

        if (el.type === "checkbox"){
          node[key] = el.checked;
        } else if (el.tagName === "SELECT"){
          node[key] = el.value;
        } else {
          // number vs text
          if (el.type === "number"){
            node[key] = (el.value === "") ? 0 : +el.value;
          } else {
            node[key] = el.value;
          }
        }
        setNode(id, node);
        clearCaches();
        refreshAllUI();
        renderOnce();
      };
    });

    // Override edit inputs
    document.querySelectorAll("[data-ov][data-l][data-f]").forEach(el => {
      el.onchange = () => {
        // doesn't apply until "Set" clicked
      };
    });

    // Override actions
    document.querySelectorAll("[data-ov-set]").forEach(btn => {
      btn.onclick = () => {
        const fid = btn.getAttribute("data-ov-set");
        const layer = getNode(selectedLayerId);
        if (!layer || layer.type !== "Layer") return;

        const getVal = (k) => {
          const el = document.querySelector(`[data-ov="${k}"][data-l="${selectedLayerId}"][data-f="${fid}"]`);
          return el ? el.value : "";
        };

        const rectSel = document.querySelector(`select[data-id="ov:${selectedLayerId}:${fid}"][data-k="rect"]`);
        const rect = rectSel ? rectSel.value : "";

        layer.overrides = (layer.overrides && typeof layer.overrides === "object") ? layer.overrides : {};
        layer.overrides[fid] = layer.overrides[fid] || {};
        const ov = layer.overrides[fid];

        if (rect) ov.rect = rect; else delete ov.rect;

        const dx = getVal("dx"); const dy = getVal("dy"); const op = getVal("opacity");
        if (dx !== "") ov.dx = +dx; else delete ov.dx;
        if (dy !== "") ov.dy = +dy; else delete ov.dy;
        if (op !== "") ov.opacity = clamp01(+op); else delete ov.opacity;

        // remove empty override
        if (Object.keys(ov).length === 0) delete layer.overrides[fid];

        setNode(selectedLayerId, layer);
        clearCaches();
        refreshAllUI();
        renderOnce();
      };
    });

    document.querySelectorAll("[data-ov-clear]").forEach(btn => {
      btn.onclick = () => {
        const fid = btn.getAttribute("data-ov-clear");
        const layer = getNode(selectedLayerId);
        if (!layer || layer.type !== "Layer") return;
        layer.overrides = (layer.overrides && typeof layer.overrides === "object") ? layer.overrides : {};
        delete layer.overrides[fid];
        setNode(selectedLayerId, layer);
        clearCaches();
        refreshAllUI();
        renderOnce();
      };
    });

    // Asset selection button
    document.querySelectorAll("[data-pick-asset]").forEach(btn => {
      btn.onclick = () => {
        selectedAssetId = btn.getAttribute("data-pick-asset");
        refreshAllUI();
      };
    });
  }
