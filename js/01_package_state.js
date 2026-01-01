  // ---------------------------
  // Package Catalog + Selection
  // ---------------------------
  function buildStarterPackageManifest(){
    const asset = { type:"Asset", name:"(drop image here)", src:"" };
    const assetId = makeId("asset", asset.type, {name:asset.name, src:asset.src});

    const rect = { type:"Rect", name:"rect0", asset:assetId, sx:0, sy:0, sw:32, sh:32, dx:0, dy:0, dw:32, dh:32 };
    const rectId = makeId("tpl", rect.type, rect);

    const fs0 = { type:"FrameSlot", name:"f000", duration:100 };
    const fs1 = { type:"FrameSlot", name:"f001", duration:100 };
    const fs0Id = makeId("tpl", fs0.type, fs0);
    const fs1Id = makeId("tpl", fs1.type, fs1);

    const tpl = { type:"Template", tileW:32, tileH:32, gridW:4, gridH:4, rects:[rectId], frames:[fs0Id, fs1Id] };
    const tplId = makeId("tpl", tpl.type, tpl);

    const layer = { type:"Layer", name:"Layer 1", visible:true, asset:assetId, defaultRect:rectId, opacity:1.0, overrides:{} };
    const layerId = makeId("anim", layer.type, layer);

    const rec = { type:"Recipe", template:tplId, layers:[layerId] };
    const recId = makeId("anim", rec.type, rec);

    return {
      manifestVersion: 1,
      nodes: {
        [assetId]: asset,
        [rectId]: rect,
        [fs0Id]: fs0,
        [fs1Id]: fs1,
        [tplId]: tpl,
        [layerId]: layer,
        [recId]: rec
      },
      roots: {
        template: tplId,
        recipe: recId,
        assets: [assetId],
        tasks: []
      }
    };
  }

  const packageCatalog = [
    {
      id: "starter",
      name: "Starter Graph",
      buildManifest: buildStarterPackageManifest
    }
  ];

  let selectedPackageId = "";

  function getPackageCatalog(){
    return packageCatalog.slice();
  }

  function setSelectedPackageId(id){
    const normalized = id || "";
    selectedPackageId = packageCatalog.some((pkg) => pkg.id === normalized) ? normalized : "";
  }

  function getSelectedPackageId(){
    return selectedPackageId;
  }

  function getSelectedPackageManifest(){
    const pkg = packageCatalog.find((entry) => entry.id === selectedPackageId);
    if (!pkg) return null;
    if (typeof pkg.buildManifest === "function") return pkg.buildManifest();
    if (pkg.manifest) return deepClone(pkg.manifest);
    return null;
  }

  function initPackageSelect(selectEl){
    if (!selectEl) return;
    selectEl.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "(no package)";
    selectEl.appendChild(placeholder);
    packageCatalog.forEach((pkg) => {
      const opt = document.createElement("option");
      opt.value = pkg.id;
      opt.textContent = pkg.name;
      selectEl.appendChild(opt);
    });
    selectEl.value = selectedPackageId;
    selectEl.addEventListener("change", () => {
      setSelectedPackageId(selectEl.value);
    });
  }
