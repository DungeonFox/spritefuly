  // ---------------------------
  // Task Runner
  // ---------------------------
  let runningTasks = false;

  // Holds deferred window geometry triggers that fire when specific animation frames are reached.
  // Each entry has optional criteria (frameIndex, frameId, frameName) and geometry properties (left, top, width, height),
  // plus an optional repeat flag. When a matching frame event is received from the viewer the geometry change
  // is applied via setWindowGeometry and one-shot triggers are removed.
  let frameTriggers = [];
  let latestWindowGeometry = null;
  let geometryFallbackWarned = false;

  function geometryTokenValues(){
    const values = {
      CLl: 0,
      CLt: 0,
      CLw: 0,
      CLh: 0
    };
    if (!latestWindowGeometry){
      if (!geometryFallbackWarned){
        log("Tasker: viewer window geometry unavailable; using 0 for CL* tokens.", "warn");
        geometryFallbackWarned = true;
      }
      return values;
    }
    const mappings = {
      CLl: "left",
      CLt: "top",
      CLw: "width",
      CLh: "height"
    };
    let missing = false;
    for (const [token, field] of Object.entries(mappings)){
      const v = latestWindowGeometry[field];
      if (typeof v === "number" && Number.isFinite(v)){
        values[token] = v;
      } else {
        missing = true;
      }
    }
    if (missing && !geometryFallbackWarned){
      log("Tasker: viewer window geometry incomplete; using 0 for missing CL* tokens.", "warn");
      geometryFallbackWarned = true;
    }
    return values;
  }

  function tokenizeGeometryExpression(expr){
    const tokens = [];
    const re = /\s*([+\-*/]|CL[ltwh]|\d*\.?\d+)\s*/gy;
    let match;
    while ((match = re.exec(expr)) !== null){
      const token = match[1];
      if (token === "+" || token === "-" || token === "*" || token === "/"){
        tokens.push({ type: "op", value: token });
      } else if (token.startsWith("CL")){
        tokens.push({ type: "var", value: token });
      } else {
        tokens.push({ type: "number", value: Number(token) });
      }
    }
    if (tokens.length === 0 || re.lastIndex !== expr.length){
      return null;
    }
    return tokens;
  }

  function evaluateGeometryExpression(expr){
    if (typeof expr !== "string") return null;
    const tokens = tokenizeGeometryExpression(expr);
    if (!tokens) return null;
    const values = geometryTokenValues();
    let idx = 0;

    function parseFactor(){
      const token = tokens[idx];
      if (!token) return null;
      if (token.type === "op" && (token.value === "+" || token.value === "-")){
        idx++;
        const value = parseFactor();
        if (value === null) return null;
        return token.value === "-" ? -value : value;
      }
      if (token.type === "number"){
        idx++;
        return token.value;
      }
      if (token.type === "var"){
        idx++;
        const v = values[token.value];
        return (typeof v === "number") ? v : null;
      }
      return null;
    }

    function parseTerm(){
      let left = parseFactor();
      if (left === null) return null;
      while (idx < tokens.length && tokens[idx].type === "op" && (tokens[idx].value === "*" || tokens[idx].value === "/")){
        const op = tokens[idx].value;
        idx++;
        const right = parseFactor();
        if (right === null) return null;
        left = op === "*" ? left * right : left / right;
      }
      return left;
    }

    function parseExpression(){
      let left = parseTerm();
      if (left === null) return null;
      while (idx < tokens.length && tokens[idx].type === "op" && (tokens[idx].value === "+" || tokens[idx].value === "-")){
        const op = tokens[idx].value;
        idx++;
        const right = parseTerm();
        if (right === null) return null;
        left = op === "+" ? left + right : left - right;
      }
      return left;
    }

    const result = parseExpression();
    if (result === null || idx !== tokens.length || Number.isNaN(result)) return null;
    return result;
  }

  function normalizeGeometryFields(source, target, contextLabel){
    const fields = ["left", "top", "width", "height"];
    for (const field of fields){
      if (!source.hasOwnProperty(field)) continue;
      const value = source[field];
      if (typeof value === "number"){
        target[field] = value;
        continue;
      }
      if (typeof value === "string"){
        const evaluated = evaluateGeometryExpression(value);
        if (typeof evaluated === "number" && Number.isFinite(evaluated)){
          target[field] = evaluated;
        } else {
          log(`Tasker: skipped ${contextLabel} ${field} value "${value}" (invalid expression).`, "warn");
        }
        continue;
      }
      if (value !== undefined){
        log(`Tasker: skipped ${contextLabel} ${field} value (non-number).`, "warn");
      }
    }
  }

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
          normalizeGeometryFields(cmd, trig, "trigger");
          if (cmd.hasOwnProperty('duration')) trig.duration = cmd.duration;
          if (cmd.hasOwnProperty('ease')) trig.ease = cmd.ease;
          trig.repeat = !!cmd.repeat;
          frameTriggers.push(trig);
        } else {
          if (cmd.cmd === "setWindowGeometry"){
            const normalized = { ...cmd };
            normalizeGeometryFields(cmd, normalized, "command");
            sendCommandToViewer(normalized);
          } else {
            sendCommandToViewer(cmd);
          }
        }
        // Small yield to allow UI updates
        await new Promise(res => setTimeout(res, 0));
      }
    }
    runningTasks = false;
    log("Tasker finished.");
  }
