  // Tasks: add/delete/update/run
  $("#btnAddTask").onclick = () => {
    // Create a new Task node with a default name. Use a properly closed template literal for the name.
    // Build task name using concatenation to avoid nested template literal issues
    const t = { type:"Task", name: 'Task ' + ((registry.roots.tasks||[]).length + 1), commands: [] };
    const tid = makeNewId("tsk");
    setNode(tid, t);
    registry.roots.tasks = Array.isArray(registry.roots.tasks) ? registry.roots.tasks : [];
    registry.roots.tasks.push(tid);
    selectedTaskId = tid;
    clearCaches();
    refreshAllUI();
    renderOnce();
  };

  $("#btnDelTask").onclick = () => {
    if (!selectedTaskId) return;
    registry.roots.tasks = (registry.roots.tasks||[]).filter(x => x !== selectedTaskId);
    registry.nodes.delete(selectedTaskId);
    selectedTaskId = null;
    clearCaches();
    refreshAllUI();
    renderOnce();
  };

  function updateSelectedTaskFromEditor(){
    if (!selectedTaskId) return true;
    const t = getNode(selectedTaskId);
    if (!t || t.type !== "Task") return true;
    const nameVal = $("#taskNameInput").value.trim();
    const cmdsText = $("#taskCommandsInput").value;
    let cmds = [];
    if (cmdsText.trim() !== ""){
      try{
        const arr = JSON.parse(cmdsText);
        if (Array.isArray(arr)) cmds = arr;
        else throw new Error("Commands must be an array");
      } catch(e){
        log(`Commands JSON parse error: ${e.message}`, "bad");
        return false;
      }
    }
    t.name = nameVal;
    t.commands = cmds;
    t.commands.forEach((cmd, index) => {
      if (cmd && typeof cmd === "object") {
        log(`Command ${index} types: left=${typeof cmd.left}, top=${typeof cmd.top}`);
      }
    });
    setNode(selectedTaskId, t);
    clearCaches();
    refreshAllUI();
    log(`Updated task: ${t.name || selectedTaskId}`);
    return true;
  }

  $("#btnUpdateTask").onclick = () => {
    updateSelectedTaskFromEditor();
  };

  $("#btnRunTasks").onclick = () => {
    const ok = updateSelectedTaskFromEditor();
    if (ok) runTasks();
  };

  $("#btnPlay").onclick = async () => {
    playing = !playing;
    setPlayButtonState(playing);
    if (playing){
      nextAt = performance.now();
      await renderOnce();
      pushStateToPopout(true);
      requestAnimationFrame(tick);
    } else {
      await renderOnce();
    }
  };

  $("#btnStep").onclick = async () => {
    const plan = registry.roots.recipe ? buildRenderPlan(registry.roots.recipe) : null;
    if (!plan || plan.frames.length === 0) return;
    curFrame = (curFrame + 1) % plan.frames.length;
    await renderOnce();
    pushStateToPopout(true);
  };

  $("#btnReset").onclick = async () => {
    curFrame = 0;
    await renderOnce();
    pushStateToPopout(true);
  };
