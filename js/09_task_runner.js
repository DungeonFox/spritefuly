  // ---------------------------
  // Task Runner
  // ---------------------------
  let runningTasks = false;

  // Holds deferred window geometry triggers that fire when specific animation frames are reached.
  // Each entry has optional criteria (frameIndex, frameId, frameName) and geometry properties (left, top, width, height),
  // plus an optional repeat flag. When a matching frame event is received from the viewer the geometry change
  // is applied via setWindowGeometry and one-shot triggers are removed.
  let frameTriggers = [];

  async function runTasks(){
    if (runningTasks){
      log("Tasker is already running.", "warn");
      return;
    }
    const taskIds = registry.roots.tasks || [];
    if (!taskIds.length){
      log("No tasks to run.", "warn");
      return;
    }
    runningTasks = true;
    log(`Starting ${taskIds.length} task(s)...`);
    // Clear any existing frame triggers at the start of a run. New triggers will be
    // collected as tasks are processed.
    frameTriggers = [];
    for (const tid of taskIds){
      const t = getNode(tid);
      if (!t || t.type !== "Task") continue;
      log(`Running task: ${t.name || tid}`);
      const cmds = Array.isArray(t.commands) ? t.commands : [];
      for (const cmd of cmds){
        if (!runningTasks) break;
        // Wait commands are handled locally; setWindowGeometryOnFrame commands are collected
        // as triggers; all other commands are forwarded to the viewer immediately.
        if (cmd.cmd === 'wait'){
          const dur = Math.max(0, cmd.duration || 0);
          await new Promise(res => setTimeout(res, dur));
        } else if (cmd.cmd === 'setWindowGeometryOnFrame'){
          // Collect a deferred geometry trigger. Accept matching criteria on frameIndex, frameId or frameName.
          const trig = {};
          if (cmd.hasOwnProperty('frameIndex')) trig.frameIndex = cmd.frameIndex;
          if (cmd.frameId) trig.frameId = cmd.frameId;
          if (cmd.frameName) trig.frameName = cmd.frameName;
          if (cmd.hasOwnProperty('left')) trig.left = cmd.left;
          if (cmd.hasOwnProperty('top')) trig.top = cmd.top;
          if (cmd.hasOwnProperty('width')) trig.width = cmd.width;
          if (cmd.hasOwnProperty('height')) trig.height = cmd.height;
          if (cmd.hasOwnProperty('duration')) trig.duration = cmd.duration;
          if (cmd.hasOwnProperty('ease')) trig.ease = cmd.ease;
          trig.repeat = !!cmd.repeat;
          frameTriggers.push(trig);
        } else {
          sendCommandToViewer(cmd);
        }
        // Small yield to allow UI updates
        await new Promise(res => setTimeout(res, 0));
      }
    }
    runningTasks = false;
    log("Tasker finished.");
  }
