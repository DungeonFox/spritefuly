  // Template scalar fields
  function bindTplScalar(idSel, key){
    $(idSel).onchange = () => {
      const tpl = getNode(registry.roots.template);
      if (!tpl || tpl.type !== "Template") return;
      tpl[key] = Math.max(1, +$(idSel).value || 1);
      setNode(registry.roots.template, tpl);
      clearCaches();
      refreshAllUI();
      renderOnce();
    };
  }
  bindTplScalar("#tplTileW","tileW");
  bindTplScalar("#tplTileH","tileH");
  bindTplScalar("#tplGridW","gridW");
  bindTplScalar("#tplGridH","gridH");

  // Recipe template selection
  $("#recipeTemplateSelect").onchange = () => {
    const rec = getNode(registry.roots.recipe);
    if (!rec || rec.type !== "Recipe") return;
    rec.template = $("#recipeTemplateSelect").value;
    setNode(registry.roots.recipe, rec);
    clearCaches();
    refreshAllUI();
    renderOnce();
  };
