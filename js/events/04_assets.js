  // Assets: add empty asset
  $("#btnAddAsset").onclick = () => {
    const a = { type:"Asset", name:"asset.png", src:"" };
    const aid = makeNewId("asset");
    setNode(aid, a);
    registry.roots.assets = Array.isArray(registry.roots.assets) ? registry.roots.assets : [];
    registry.roots.assets.push(aid);
    selectedAssetId = aid;
    images.delete(aid);
    clearCaches();
    refreshAllUI();
    renderOnce();
  };

  // Assets: load image files
  $("#fileAsset").onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    for (const f of files){
      const dataUrl = await fileToDataUrl(f);
      const a = { type:"Asset", name:f.name, src:dataUrl };
      const aid = makeNewId("asset");
      setNode(aid, a);
      registry.roots.assets = Array.isArray(registry.roots.assets) ? registry.roots.assets : [];
      registry.roots.assets.push(aid);
      selectedAssetId = aid;
      images.delete(aid);
          // Log asset loading using simple string concatenation to avoid template literal syntax errors
          log('Loaded asset image: ' + f.name);
    }
    clearCaches();
    refreshAllUI();
    renderOnce();
    e.target.value = "";
  };

  async function fileToDataUrl(file){
    return await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = () => reject(new Error("File read failed"));
      fr.readAsDataURL(file);
    });
  }
