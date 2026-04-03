const PALETTE = [
  "#f28f3b",
  "#ff9f1c",
  "#e05d44",
  "#ef476f",
  "#ff6b8a",
  "#9d4edd",
  "#6c5ce7",
  "#4d96ff",
  "#38bdf8",
  "#2f9c95",
  "#14b8a6",
  "#56ab2f",
  "#84cc16",
  "#edc951",
  "#ffd166",
  "#f7b267",
  "#d8c1a2",
  "#fbf7f1",
  "#8d6e63",
  "#5f4b3c",
];

const FACE_LABELS = {
  top: "Top",
  north: "North",
  east: "East",
  south: "South",
  west: "West",
};

const FACE_SHADE = {
  top: 12,
  north: -8,
  east: -2,
  south: -14,
  west: -18,
};

const FACE_DIRECTIONS = ["top", "north", "east", "south", "west"];
const ROTATION_STEP = Math.PI / 2;
const SCENE_CENTER_X = 500;
const SCENE_CENTER_Y = 400;
const HISTORY_LIMIT = 120;
const DEFAULT_FACE_COLOR = "#d8c1a2";
const SPIN_SPEED_SLIDER = {
  min: 0,
  max: 100,
  defaultValue: 48,
  minDegreesPerSecond: 12,
  maxDegreesPerSecond: 1080,
};

const COLOR_SCHEMES = [
  { id: "selected", label: "Current" },
  { id: "sunset", label: "Sunset" },
  { id: "ocean", label: "Ocean" },
  { id: "forest", label: "Forest" },
  { id: "candy", label: "Candy" },
  { id: "ember", label: "Ember" },
  { id: "prism", label: "Prism" },
];

const SPIN_MODES = [
  { id: "clockwise", label: "Clockwise" },
  { id: "counterclockwise", label: "Counter" },
  { id: "swing", label: "Swing" },
];

const SHAPE_DEFINITIONS = [
  {
    id: "pyramid",
    label: "Pyramid",
    description: "A centered stepped peak with strong symmetry and a clean silhouette.",
    generate: generatePyramidShape,
  },
  {
    id: "ring",
    label: "Ring",
    description: "A hollow circular ridge that looks great with fast spin and bold color bands.",
    generate: generateRingShape,
  },
  {
    id: "dome",
    label: "Dome",
    description: "A rounded mound for softer, sculptural forms and smooth painted shading.",
    generate: generateDomeShape,
  },
  {
    id: "cross",
    label: "Cross",
    description: "A thick plus-shaped structure with a stronger center mass.",
    generate: generateCrossShape,
  },
  {
    id: "stairs",
    label: "Stairs",
    description: "A stepped diagonal ramp that feels architectural from one side and hypnotic in motion.",
    generate: generateStairsShape,
  },
  {
    id: "diamond",
    label: "Diamond",
    description: "A faceted manhattan-distance peak with a crisp geometric footprint.",
    generate: generateDiamondShape,
  },
  {
    id: "spiral",
    label: "Spiral",
    description: "A swirling height pattern built for trippy motion and layered recoloring.",
    generate: generateSpiralShape,
  },
  {
    id: "temple",
    label: "Temple",
    description: "A stacked terrace form with broad tiers and a dramatic central plateau.",
    generate: generateTempleShape,
  },
];

const state = {
  gridSize: 8,
  maxHeight: 6,
  tool: "raise",
  symmetry: "none",
  viewAngle: 0,
  viewFlipped: false,
  selectedShape: SHAPE_DEFINITIONS[0].id,
  selectedColor: PALETTE[0],
  selectedScheme: "selected",
  spinMode: "clockwise",
  spinSpeed: sliderValueToSpinSpeed(SPIN_SPEED_SLIDER.defaultValue),
  hoveredFace: null,
  selectedFace: null,
  paintSummary: "",
  dragActive: false,
  dragVisited: new Set(),
  heights: makeGrid(8, 0),
  faceColors: {},
};

const history = createHistoryManager(HISTORY_LIMIT);
const spinController = createSpinController();

const dom = {
  gridEditor: document.querySelector("#grid-editor"),
  palette: document.querySelector("#palette"),
  customColor: document.querySelector("#custom-color"),
  customColorValue: document.querySelector("#custom-color-value"),
  paintStatus: document.querySelector("#paint-status"),
  sceneStatus: document.querySelector("#scene-status"),
  scene: document.querySelector("#scene"),
  toolPicker: document.querySelector("#tool-picker"),
  symmetryPicker: document.querySelector("#symmetry-picker"),
  shapeSelect: document.querySelector("#shape-select"),
  shapeDescription: document.querySelector("#shape-description"),
  schemePicker: document.querySelector("#scheme-picker"),
  spinModePicker: document.querySelector("#spin-mode-picker"),
  gridSize: document.querySelector("#grid-size"),
  gridSizeValue: document.querySelector("#grid-size-value"),
  maxHeight: document.querySelector("#max-height"),
  maxHeightValue: document.querySelector("#max-height-value"),
  spinSpeed: document.querySelector("#spin-speed"),
  spinSpeedValue: document.querySelector("#spin-speed-value"),
  viewLabel: document.querySelector("#view-label"),
  rotateLeft: document.querySelector("#rotate-left"),
  rotateRight: document.querySelector("#rotate-right"),
  flipView: document.querySelector("#flip-view"),
  spinToggle: document.querySelector("#spin-toggle"),
  applyShape: document.querySelector("#apply-shape"),
  randomShape: document.querySelector("#random-shape"),
  applyScheme: document.querySelector("#apply-scheme"),
  clearGrid: document.querySelector("#clear-grid"),
  undoAction: document.querySelector("#undo-action"),
  redoAction: document.querySelector("#redo-action"),
};

bindEvents();
render();

function bindEvents() {
  dom.toolPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tool]");
    if (!button) {
      return;
    }

    state.tool = button.dataset.tool;
    renderToolButtons();
  });

  dom.symmetryPicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-symmetry]");
    if (!button) {
      return;
    }

    state.symmetry = button.dataset.symmetry;
    renderSymmetryButtons();
  });

  dom.shapeSelect.addEventListener("change", (event) => {
    state.selectedShape = event.target.value;
    renderShapeControls();
  });

  dom.schemePicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scheme]");
    if (!button) {
      return;
    }

    state.selectedScheme = button.dataset.scheme;
    renderSchemeButtons();
  });

  dom.spinModePicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-spin-mode]");
    if (!button) {
      return;
    }

    state.spinMode = button.dataset.spinMode;
    resetSpinMotion();
    renderSpinModeButtons();
    renderPreviewControls();
  });

  bindGroupedControl(dom.gridSize, {
    sessionId: "grid-size",
    label: "Resize Grid",
    onInput: (value) => {
      resizeGrid(Number(value));
      render();
    },
  });

  bindGroupedControl(dom.maxHeight, {
    sessionId: "max-height",
    label: "Adjust Max Height",
    onInput: (value) => {
      setMaxHeight(Number(value));
      render();
    },
  });

  bindGroupedControl(dom.customColor, {
    sessionId: "selected-color",
    label: "Change Paint Color",
    onInput: (value) => {
      setSelectedColor(value);
      renderPalette();
      renderGridControls();
      renderHistoryControls();
      updateStatusCards();
    },
  });

  dom.spinSpeed.addEventListener("input", (event) => {
    setSpinSpeed(sliderValueToSpinSpeed(Number(event.target.value)));
    renderPreviewControls();
  });

  dom.rotateLeft.addEventListener("click", () => rotatePreview(-1));
  dom.rotateRight.addEventListener("click", () => rotatePreview(1));

  dom.flipView.addEventListener("click", () => {
    state.viewFlipped = !state.viewFlipped;
    clearHoveredFace();
    renderScene();
    renderPreviewControls();
    updateStatusCards();
  });

  dom.spinToggle.addEventListener("click", () => {
    setSpinRunning(!spinController.running);
  });

  dom.applyShape.addEventListener("click", () => {
    const shapeDefinition = getShapeDefinition(state.selectedShape);
    if (!shapeDefinition) {
      return;
    }

    performDesignAction(`Apply ${shapeDefinition.label}`, () => {
      applyShapeDefinition(shapeDefinition.id);
    });
  });

  dom.randomShape.addEventListener("click", () => {
    const randomShapeId = getRandomShapeId();
    state.selectedShape = randomShapeId;

    const shapeDefinition = getShapeDefinition(randomShapeId);
    performDesignAction(`Apply ${shapeDefinition.label}`, () => {
      applyShapeDefinition(randomShapeId);
    });
  });

  dom.undoAction.addEventListener("click", () => {
    undoHistory();
  });

  dom.redoAction.addEventListener("click", () => {
    redoHistory();
  });

  dom.applyScheme.addEventListener("click", () => {
    performDesignAction("Apply Color Scheme", () => {
      applySchemeToShape(state.selectedScheme);
    });
  });

  dom.clearGrid.addEventListener("click", () => {
    performDesignAction("Clear Shape", clearShape);
  });

  dom.gridEditor.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest(".grid-cell");
    if (!cell) {
      return;
    }

    finalizeAllHistorySessions();
    state.dragActive = true;
    state.dragVisited = new Set();
    startHistorySession("grid-drag", getSculptHistoryLabel());

    if (applyToolAt(Number(cell.dataset.x), Number(cell.dataset.y))) {
      renderEditableDesign();
    }
  });

  dom.gridEditor.addEventListener("pointerover", (event) => {
    if (!state.dragActive) {
      return;
    }

    const cell = event.target.closest(".grid-cell");
    if (!cell) {
      return;
    }

    const key = `${cell.dataset.x},${cell.dataset.y}`;
    if (state.dragVisited.has(key)) {
      return;
    }

    if (applyToolAt(Number(cell.dataset.x), Number(cell.dataset.y))) {
      renderEditableDesign();
    }
  });

  const finalizeGridDrag = () => {
    if (!state.dragActive && !history.sessions.has("grid-drag")) {
      return;
    }

    state.dragActive = false;
    state.dragVisited = new Set();
    finalizeHistorySession("grid-drag");
    renderHistoryControls();
  };

  document.addEventListener("pointerup", finalizeGridDrag);
  document.addEventListener("pointercancel", finalizeGridDrag);

  dom.scene.addEventListener("click", (event) => {
    const face = event.target.closest(".iso-face");
    if (!face) {
      return;
    }

    performDesignAction(
      "Paint Face",
      () => {
        paintFace(
          Number(face.dataset.x),
          Number(face.dataset.y),
          Number(face.dataset.z),
          face.dataset.face
        );
      },
      { renderMode: "scene" }
    );
  });

  dom.scene.addEventListener("pointermove", (event) => {
    const face = event.target.closest(".iso-face");
    if (!face) {
      if (state.hoveredFace !== null) {
        state.hoveredFace = null;
        updateStatusCards();
      }
      return;
    }

    state.hoveredFace = {
      x: Number(face.dataset.x),
      y: Number(face.dataset.y),
      z: Number(face.dataset.z),
      face: face.dataset.face,
    };
    updateStatusCards();
  });

  dom.scene.addEventListener("pointerleave", () => {
    state.hoveredFace = null;
    updateStatusCards();
  });

  document.addEventListener("keydown", handleHistoryShortcuts);
}

function bindGroupedControl(control, config) {
  control.addEventListener("input", (event) => {
    startHistorySession(config.sessionId, config.label);
    config.onInput(event.target.value);
  });

  const finalize = () => {
    finalizeHistorySession(config.sessionId, config.label);
  };

  control.addEventListener("change", finalize);
  control.addEventListener("blur", finalize);
}

function render() {
  renderToolButtons();
  renderSymmetryButtons();
  renderShapeControls();
  renderSchemeButtons();
  renderSpinModeButtons();
  renderPalette();
  renderGridControls();
  renderPreviewControls();
  renderHistoryControls();
  renderGridEditor();
  renderScene();
  updateStatusCards();
}

function renderEditableDesign() {
  renderGridEditor();
  renderScene();
  renderHistoryControls();
  updateStatusCards();
}

function renderToolButtons() {
  dom.toolPicker.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === state.tool);
  });
}

function renderSymmetryButtons() {
  dom.symmetryPicker.querySelectorAll("[data-symmetry]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.symmetry === state.symmetry);
  });
}

function renderShapeControls() {
  dom.shapeSelect.innerHTML = SHAPE_DEFINITIONS.map(
    (shape) => `<option value="${shape.id}">${shape.label}</option>`
  ).join("");
  dom.shapeSelect.value = state.selectedShape;
  dom.shapeDescription.textContent = getShapeDefinition(state.selectedShape)?.description ?? "";
}

function renderSchemeButtons() {
  dom.schemePicker.innerHTML = "";

  COLOR_SCHEMES.forEach((scheme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button option-button--small";
    button.dataset.scheme = scheme.id;
    button.textContent = scheme.label;
    button.classList.toggle("is-active", scheme.id === state.selectedScheme);
    dom.schemePicker.appendChild(button);
  });
}

function renderSpinModeButtons() {
  dom.spinModePicker.innerHTML = "";

  SPIN_MODES.forEach((mode) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button option-button--small";
    button.dataset.spinMode = mode.id;
    button.textContent = mode.label;
    button.classList.toggle("is-active", mode.id === state.spinMode);
    dom.spinModePicker.appendChild(button);
  });
}

function renderGridControls() {
  dom.gridSize.value = String(state.gridSize);
  dom.gridSizeValue.textContent = `${state.gridSize} x ${state.gridSize}`;
  dom.maxHeight.value = String(state.maxHeight);
  dom.maxHeightValue.textContent = `${state.maxHeight} levels`;
  dom.customColor.value = state.selectedColor;
  dom.customColorValue.textContent = state.selectedColor.toLowerCase();
}

function renderPreviewControls() {
  dom.viewLabel.textContent = getViewLabel();
  dom.flipView.textContent = state.viewFlipped ? "Flip Upright" : "Flip Upside Down";
  dom.flipView.classList.toggle("is-active", state.viewFlipped);
  dom.spinSpeed.value = String(spinSpeedToSliderValue(state.spinSpeed));
  dom.spinSpeedValue.textContent = formatSpinSpeed(state.spinSpeed);
  dom.spinToggle.textContent = spinController.running ? "Stop Spin" : "Start Spin";
  dom.spinToggle.classList.toggle("is-active", spinController.running);
}

function renderHistoryControls() {
  const undoLabel =
    history.past.length > 0 ? history.past[history.past.length - 1].label : null;
  const redoLabel =
    history.future.length > 0 ? history.future[history.future.length - 1].label : null;

  dom.undoAction.disabled = history.past.length === 0;
  dom.redoAction.disabled = history.future.length === 0;
  dom.undoAction.title = undoLabel
    ? `Undo ${undoLabel} (Cmd/Ctrl+Z)`
    : "Nothing to undo";
  dom.redoAction.title = redoLabel
    ? `Redo ${redoLabel} (Shift+Cmd/Ctrl+Z)`
    : "Nothing to redo";
}

function renderPalette() {
  dom.palette.innerHTML = "";

  PALETTE.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "swatch";
    button.setAttribute("aria-label", `Select ${color}`);
    button.title = color;
    button.style.background = color;
    if (normalizeHex(color) === normalizeHex(state.selectedColor)) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => {
      performDesignAction(
        "Change Paint Color",
        () => {
          setSelectedColor(color);
        },
        { renderMode: "color" }
      );
    });

    dom.palette.appendChild(button);
  });
}

function renderGridEditor() {
  const cellSize = Math.max(22, Math.min(58, Math.floor(520 / state.gridSize)));
  const fontSize = Math.max(0.68, Math.min(1, cellSize / 52));

  dom.gridEditor.style.setProperty("--cell-size", `${cellSize}px`);
  dom.gridEditor.style.setProperty("--cell-font-size", `${fontSize}rem`);
  dom.gridEditor.style.gridTemplateColumns = `repeat(${state.gridSize}, ${cellSize}px)`;
  dom.gridEditor.innerHTML = "";

  state.heights.forEach((row, y) => {
    row.forEach((height, x) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "grid-cell";
      button.dataset.x = String(x);
      button.dataset.y = String(y);
      button.title = `Column ${x + 1}, row ${y + 1}, height ${height}`;
      button.style.background = getCellColor(height);
      button.innerHTML = `<span class="grid-cell-label">${height}</span>`;
      dom.gridEditor.appendChild(button);
    });
  });
}

function renderScene() {
  const sceneData = buildSceneData();
  const floorMarkup = sceneData.floorTiles
    .map((tile) => `<polygon class="iso-ground" points="${tile.points}"></polygon>`)
    .join("");
  const outlineMarkup = sceneData.outlines
    .map((outline) => `<polygon class="iso-outline" points="${outline.points}"></polygon>`)
    .join("");
  const faceMarkup = sceneData.faces
    .map((face) => {
      const selected =
        state.selectedFace &&
        state.selectedFace.x === face.x &&
        state.selectedFace.y === face.y &&
        state.selectedFace.z === face.z &&
        state.selectedFace.face === face.face;

      return `
        <polygon
          class="iso-face${selected ? " is-selected" : ""}"
          points="${face.points}"
          fill="${face.fill}"
          data-x="${face.x}"
          data-y="${face.y}"
          data-z="${face.z}"
          data-face="${face.face}"
        ></polygon>
      `;
    })
    .join("");

  const emptyMarkup = sceneData.faces.length
    ? ""
    : `<text class="scene-empty" x="${SCENE_CENTER_X}" y="${SCENE_CENTER_Y - 10}">Build on the grid to generate paintable surfaces.</text>`;

  dom.scene.innerHTML = `${floorMarkup}${faceMarkup}${outlineMarkup}${emptyMarkup}`;
}

function updateStatusCards() {
  const hoverText = state.hoveredFace
    ? `${FACE_LABELS[state.hoveredFace.face]} face on cube (${state.hoveredFace.x + 1}, ${state.hoveredFace.y + 1}, ${state.hoveredFace.z + 1}) currently shows ${getStoredFaceColor(
        state.hoveredFace.x,
        state.hoveredFace.y,
        state.hoveredFace.z,
        state.hoveredFace.face
      )}.`
    : "Hover a face to inspect it.";

  const selectedText = state.selectedFace
    ? `${FACE_LABELS[state.selectedFace.face]} face painted ${getStoredFaceColor(
        state.selectedFace.x,
        state.selectedFace.y,
        state.selectedFace.z,
        state.selectedFace.face
      )} on cube (${state.selectedFace.x + 1}, ${state.selectedFace.y + 1}, ${state.selectedFace.z + 1}).`
    : state.paintSummary || "No face selected yet. Build something and click a surface to paint it.";

  dom.sceneStatus.textContent = hoverText;
  dom.paintStatus.textContent = `${selectedText} Current color: ${state.selectedColor.toLowerCase()}.`;
}

function performDesignAction(label, mutate, options = {}) {
  finalizeAllHistorySessions();
  const before = captureDesignSnapshot();
  mutate();
  pushHistorySnapshot(before, label);

  if (options.renderMode === "scene") {
    renderGridControls();
    renderHistoryControls();
    renderScene();
    updateStatusCards();
    return;
  }

  if (options.renderMode === "color") {
    renderPalette();
    renderGridControls();
    renderHistoryControls();
    updateStatusCards();
    return;
  }

  render();
}

function createHistoryManager(limit) {
  return {
    limit,
    past: [],
    future: [],
    sessions: new Map(),
  };
}

function createSpinController() {
  return {
    running: false,
    frameId: null,
    lastTimestamp: null,
    elapsed: 0,
    anchorAngle: 0,
  };
}

function startHistorySession(id, label) {
  if (history.sessions.has(id)) {
    return;
  }

  history.sessions.set(id, {
    before: captureDesignSnapshot(),
    label,
  });
}

function finalizeHistorySession(id, labelOverride) {
  const session = history.sessions.get(id);
  if (!session) {
    return false;
  }

  history.sessions.delete(id);
  return pushHistorySnapshot(session.before, labelOverride ?? session.label);
}

function finalizeAllHistorySessions() {
  if (history.sessions.size === 0) {
    return;
  }

  if (history.sessions.has("grid-drag")) {
    state.dragActive = false;
    state.dragVisited = new Set();
  }

  Array.from(history.sessions.keys()).forEach((id) => {
    finalizeHistorySession(id);
  });
}

function pushHistorySnapshot(beforeSnapshot, label) {
  const afterSnapshot = captureDesignSnapshot();
  if (designSnapshotsEqual(beforeSnapshot, afterSnapshot)) {
    renderHistoryControls();
    return false;
  }

  history.past.push({ snapshot: beforeSnapshot, label });
  if (history.past.length > history.limit) {
    history.past.shift();
  }

  history.future = [];
  renderHistoryControls();
  return true;
}

function undoHistory() {
  finalizeAllHistorySessions();
  if (history.past.length === 0) {
    return false;
  }

  const currentSnapshot = captureDesignSnapshot();
  const entry = history.past.pop();
  history.future.push({ snapshot: currentSnapshot, label: entry.label });
  restoreDesignSnapshot(entry.snapshot, `Undid ${entry.label}.`);
  return true;
}

function redoHistory() {
  finalizeAllHistorySessions();
  if (history.future.length === 0) {
    return false;
  }

  const currentSnapshot = captureDesignSnapshot();
  const entry = history.future.pop();
  history.past.push({ snapshot: currentSnapshot, label: entry.label });
  restoreDesignSnapshot(entry.snapshot, `Redid ${entry.label}.`);
  return true;
}

function captureDesignSnapshot() {
  return {
    gridSize: state.gridSize,
    maxHeight: state.maxHeight,
    selectedColor: normalizeHex(state.selectedColor),
    heights: state.heights.map((row) => row.slice()),
    faceColors: cloneFaceColors(state.faceColors),
  };
}

function restoreDesignSnapshot(snapshot, message) {
  state.gridSize = snapshot.gridSize;
  state.maxHeight = snapshot.maxHeight;
  state.selectedColor = normalizeHex(snapshot.selectedColor);
  state.heights = snapshot.heights.map((row) => row.slice());
  state.faceColors = cloneFaceColors(snapshot.faceColors);
  state.selectedFace = null;
  state.paintSummary = message;
  state.dragActive = false;
  state.dragVisited = new Set();
  clearHoveredFace();
  render();
}

function cloneFaceColors(faceColors) {
  const clone = {};

  Object.entries(faceColors).forEach(([key, faces]) => {
    clone[key] = {};
    FACE_DIRECTIONS.forEach((face) => {
      if (faces[face]) {
        clone[key][face] = faces[face];
      }
    });
  });

  return clone;
}

function designSnapshotsEqual(first, second) {
  if (
    first.gridSize !== second.gridSize ||
    first.maxHeight !== second.maxHeight ||
    first.selectedColor !== second.selectedColor
  ) {
    return false;
  }

  if (first.heights.length !== second.heights.length) {
    return false;
  }

  for (let y = 0; y < first.heights.length; y += 1) {
    if (first.heights[y].length !== second.heights[y].length) {
      return false;
    }

    for (let x = 0; x < first.heights[y].length; x += 1) {
      if (first.heights[y][x] !== second.heights[y][x]) {
        return false;
      }
    }
  }

  const firstKeys = Object.keys(first.faceColors).sort();
  const secondKeys = Object.keys(second.faceColors).sort();
  if (firstKeys.length !== secondKeys.length) {
    return false;
  }

  for (let index = 0; index < firstKeys.length; index += 1) {
    const key = firstKeys[index];
    if (key !== secondKeys[index]) {
      return false;
    }

    for (const face of FACE_DIRECTIONS) {
      if ((first.faceColors[key]?.[face] ?? null) !== (second.faceColors[key]?.[face] ?? null)) {
        return false;
      }
    }
  }

  return true;
}

function handleHistoryShortcuts(event) {
  if (event.defaultPrevented || event.altKey) {
    return;
  }

  const usesModifier = event.metaKey || event.ctrlKey;
  if (!usesModifier) {
    return;
  }

  const key = event.key.toLowerCase();
  if (key !== "z") {
    return;
  }

  event.preventDefault();

  if (event.shiftKey) {
    redoHistory();
    return;
  }

  undoHistory();
}

function resizeGrid(newSize) {
  if (newSize === state.gridSize) {
    return false;
  }

  const nextGrid = makeGrid(newSize, 0);
  const limit = Math.min(state.gridSize, newSize);

  for (let y = 0; y < limit; y += 1) {
    for (let x = 0; x < limit; x += 1) {
      nextGrid[y][x] = Math.min(state.heights[y][x], state.maxHeight);
    }
  }

  state.gridSize = newSize;
  state.heights = nextGrid;
  state.selectedFace = null;
  state.paintSummary = `Grid resized to ${newSize} x ${newSize}.`;
  pruneFaceColors();
  return true;
}

function setMaxHeight(newHeight) {
  if (newHeight === state.maxHeight) {
    return false;
  }

  state.maxHeight = newHeight;
  state.paintSummary = `Maximum stack height set to ${state.maxHeight} levels.`;
  clampHeights();
  return true;
}

function clampHeights() {
  state.heights = state.heights.map((row) => row.map((height) => Math.min(height, state.maxHeight)));
  pruneFaceColors();
}

function clearShape() {
  state.heights = makeGrid(state.gridSize, 0);
  state.faceColors = {};
  state.selectedFace = null;
  state.paintSummary = "Shape cleared. Build a new form and paint it however you like.";
}

function applyShapeDefinition(shapeId) {
  const definition = getShapeDefinition(shapeId);
  if (!definition) {
    return false;
  }

  state.heights = definition.generate();
  state.faceColors = {};
  state.selectedFace = null;
  state.paintSummary = `${definition.label} generated.`;
  return true;
}

function setSelectedColor(color) {
  const normalized = normalizeHex(color);
  if (normalized === state.selectedColor) {
    return false;
  }

  state.selectedColor = normalized;
  state.paintSummary = `Current paint color set to ${normalized}.`;
  return true;
}

function getShapeDefinition(shapeId) {
  return SHAPE_DEFINITIONS.find((shape) => shape.id === shapeId) ?? SHAPE_DEFINITIONS[0];
}

function getRandomShapeId() {
  const options = SHAPE_DEFINITIONS.filter((shape) => shape.id !== state.selectedShape);
  const pool = options.length > 0 ? options : SHAPE_DEFINITIONS;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex].id;
}

function createShapeContext() {
  const size = state.gridSize;
  const maxHeight = state.maxHeight;
  const center = (size - 1) / 2;
  const radius = Math.max(1, center);

  return {
    size,
    maxHeight,
    center,
    radius,
  };
}

function buildShapeGrid(generator) {
  const context = createShapeContext();
  const grid = makeGrid(context.size, 0);

  for (let y = 0; y < context.size; y += 1) {
    for (let x = 0; x < context.size; x += 1) {
      const dx = x - context.center;
      const dy = y - context.center;
      const radial = Math.sqrt(dx * dx + dy * dy);
      const chebyshev = Math.max(Math.abs(dx), Math.abs(dy));
      const manhattan = Math.abs(dx) + Math.abs(dy);
      const diagonalProgress = context.size > 1 ? (x + y) / (2 * (context.size - 1)) : 0;
      const angleNormalized =
        ((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);

      grid[y][x] = clampGeneratedHeight(
        generator({
          ...context,
          x,
          y,
          dx,
          dy,
          radial,
          chebyshev,
          manhattan,
          diagonalProgress,
          angleNormalized,
          normalizedRadius: radial / (context.radius + 0.35),
        })
      );
    }
  }

  return grid;
}

function clampGeneratedHeight(height) {
  return Math.max(0, Math.min(state.maxHeight, Math.round(height)));
}

function toShapeHeight(maxHeight, intensity, curve = 1) {
  const clamped = Math.max(0, Math.min(1, intensity));
  return Math.pow(clamped, curve) * maxHeight;
}

function generatePyramidShape() {
  return buildShapeGrid((cell) =>
    toShapeHeight(cell.maxHeight, 1 - cell.chebyshev / (cell.radius + 0.6))
  );
}

function generateRingShape() {
  return buildShapeGrid((cell) => {
    const targetRadius = cell.radius * 0.63;
    const bandWidth = Math.max(0.95, cell.radius * 0.22);
    const ringIntensity = 1 - Math.abs(cell.radial - targetRadius) / bandWidth;
    return toShapeHeight(cell.maxHeight, ringIntensity, 1.15);
  });
}

function generateDomeShape() {
  return buildShapeGrid((cell) => {
    const normalized = cell.radial / (cell.radius + 0.35);
    return toShapeHeight(cell.maxHeight, Math.sqrt(Math.max(0, 1 - normalized * normalized)));
  });
}

function generateCrossShape() {
  return buildShapeGrid((cell) => {
    const armWidth = Math.max(0.9, cell.radius * 0.24);
    if (Math.abs(cell.dx) > armWidth && Math.abs(cell.dy) > armWidth) {
      return 0;
    }

    const reach = Math.max(Math.abs(cell.dx), Math.abs(cell.dy));
    const armFalloff = 1 - reach / (cell.radius + 0.5);
    const coreBoost =
      Math.abs(cell.dx) <= armWidth && Math.abs(cell.dy) <= armWidth ? 0.25 : 0;

    return toShapeHeight(cell.maxHeight, Math.min(1, 0.42 + armFalloff * 0.58 + coreBoost));
  });
}

function generateStairsShape() {
  return buildShapeGrid((cell) => {
    const stairProgress = 1 - cell.diagonalProgress;
    const stepped = Math.floor(stairProgress * (cell.maxHeight + 0.35));
    return Math.max(0, stepped);
  });
}

function generateDiamondShape() {
  return buildShapeGrid((cell) =>
    toShapeHeight(cell.maxHeight, 1 - cell.manhattan / (cell.radius * 1.45 + 0.35))
  );
}

function generateSpiralShape() {
  return buildShapeGrid((cell) => {
    const envelope = Math.max(0, 1 - cell.normalizedRadius);
    if (envelope <= 0) {
      return 0;
    }

    const turns = 1.85;
    const phase = (cell.angleNormalized + cell.normalizedRadius * turns) % 1;
    const band = 1 - Math.min(1, Math.abs(phase - 0.5) * 3.15);
    const centerLift = Math.max(0, 1 - cell.radial / (cell.radius * 0.55 + 0.35)) * 0.25;
    return toShapeHeight(
      cell.maxHeight,
      Math.max(0, band) * (0.55 + envelope * 0.45) + centerLift,
      1.1
    );
  });
}

function generateTempleShape() {
  return buildShapeGrid((cell) => {
    const terraceCount = Math.max(3, Math.min(cell.maxHeight, 5));
    const terraceBase = Math.max(0, 1 - cell.chebyshev / (cell.radius + 0.65));
    if (terraceBase <= 0) {
      return 0;
    }
    const snapped = Math.ceil(terraceBase * terraceCount) / terraceCount;
    return toShapeHeight(cell.maxHeight, snapped, 1.05);
  });
}

function applyToolAt(x, y) {
  let changed = false;

  getSymmetryTargets(x, y).forEach((target) => {
    const key = `${target.x},${target.y}`;
    state.dragVisited.add(key);

    const currentHeight = state.heights[target.y][target.x];
    const nextHeight = getNextHeightForTool(currentHeight);

    if (nextHeight !== currentHeight) {
      state.heights[target.y][target.x] = nextHeight;
      changed = true;
    }
  });

  if (changed) {
    state.paintSummary = "";
    pruneFaceColors();
  }

  return changed;
}

function getNextHeightForTool(currentHeight) {
  if (state.tool === "raise") {
    return Math.min(state.maxHeight, currentHeight + 1);
  }

  if (state.tool === "lower") {
    return Math.max(0, currentHeight - 1);
  }

  return 0;
}

function getSymmetryTargets(x, y) {
  const max = state.gridSize - 1;
  const targets = [{ x, y }];

  if (state.symmetry === "mirror-x" || state.symmetry === "quad") {
    targets.push({ x: max - x, y });
  }

  if (state.symmetry === "mirror-y" || state.symmetry === "quad") {
    targets.push({ x, y: max - y });
  }

  if (state.symmetry === "quad") {
    targets.push({ x: max - x, y: max - y });
  }

  return dedupeTargets(targets);
}

function getSculptHistoryLabel() {
  if (state.tool === "raise") {
    return "Raise Blocks";
  }

  if (state.tool === "lower") {
    return "Lower Blocks";
  }

  return "Erase Blocks";
}

function rotatePreview(direction) {
  state.viewAngle = normalizeAngle(state.viewAngle + direction * ROTATION_STEP);
  clearHoveredFace();
  renderScene();
  renderPreviewControls();
  updateStatusCards();
}

function setSpinRunning(shouldRun) {
  if (shouldRun === spinController.running) {
    renderPreviewControls();
    return;
  }

  if (shouldRun) {
    startSpinLoop();
  } else {
    stopSpinLoop();
  }

  renderPreviewControls();
}

function resetSpinMotion() {
  spinController.elapsed = 0;
  spinController.anchorAngle = state.viewAngle;
  spinController.lastTimestamp = null;
}

function setSpinSpeed(nextSpeed) {
  state.spinSpeed = clampSpinSpeed(nextSpeed);
}

function startSpinLoop() {
  spinController.running = true;
  resetSpinMotion();
  cancelSpinFrame();
  queueSpinFrame();
}

function stopSpinLoop() {
  spinController.running = false;
  spinController.lastTimestamp = null;
  cancelSpinFrame();
}

function cancelSpinFrame() {
  if (spinController.frameId === null) {
    return;
  }

  window.cancelAnimationFrame(spinController.frameId);
  spinController.frameId = null;
}

function queueSpinFrame() {
  if (!spinController.running || spinController.frameId !== null) {
    return;
  }

  spinController.frameId = window.requestAnimationFrame(stepSpin);
}

function stepSpin(timestamp) {
  spinController.frameId = null;
  if (!spinController.running) {
    return;
  }

  const previousTimestamp = spinController.lastTimestamp ?? timestamp;
  const deltaSeconds = Math.max(0, Math.min((timestamp - previousTimestamp) / 1000, 0.08));
  spinController.lastTimestamp = timestamp;
  const speed = degreesToRadians(state.spinSpeed);

  if (state.spinMode === "clockwise") {
    state.viewAngle = normalizeAngle(state.viewAngle + deltaSeconds * speed);
  } else if (state.spinMode === "counterclockwise") {
    state.viewAngle = normalizeAngle(state.viewAngle - deltaSeconds * speed);
  } else {
    spinController.elapsed += deltaSeconds * speed;
    state.viewAngle = normalizeAngle(
      spinController.anchorAngle + Math.sin(spinController.elapsed) * (Math.PI * 0.78)
    );
  }

  clearHoveredFace();
  renderScene();
  renderPreviewControls();
  updateStatusCards();
  queueSpinFrame();
}

function paintFace(x, y, z, face) {
  const nextColor = normalizeHex(state.selectedColor);
  const currentColor = normalizeHex(getStoredFaceColor(x, y, z, face));

  state.selectedFace = { x, y, z, face };
  state.paintSummary = "";

  if (currentColor === nextColor) {
    return false;
  }

  if (nextColor === DEFAULT_FACE_COLOR) {
    clearStoredFaceColor(x, y, z, face);
    return true;
  }

  const bucket = ensureFaceBucket(x, y, z);
  bucket[face] = nextColor;
  return true;
}

function applySchemeToShape(schemeId) {
  const cubes = getCubeCount();
  if (cubes === 0) {
    state.paintSummary = "There are no blocks yet, so there is nothing to recolor.";
    state.selectedFace = null;
    return false;
  }

  const nextColors = {};

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const height = state.heights[y][x];
      for (let z = 0; z < height; z += 1) {
        const key = cubeKey(x, y, z);
        const bucket = {};

        FACE_DIRECTIONS.forEach((face) => {
          const color = resolveSchemeColor(schemeId, x, y, z, face);
          if (normalizeHex(color) !== DEFAULT_FACE_COLOR) {
            bucket[face] = color;
          }
        });

        if (Object.keys(bucket).length > 0) {
          nextColors[key] = bucket;
        }
      }
    }
  }

  state.faceColors = nextColors;
  state.selectedFace = null;
  state.paintSummary = `Applied the ${getSchemeLabel(schemeId)} scheme to all ${cubes} blocks.`;
  return true;
}

function buildSceneData() {
  const metrics = getSceneMetrics();
  const faces = [];
  const outlines = [];
  const floorTiles = [];
  const allPoints = [];

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const ground = createProjectedPolygon(
        [
          [x, y, 0],
          [x + 1, y, 0],
          [x + 1, y + 1, 0],
          [x, y + 1, 0],
        ],
        metrics
      );
      floorTiles.push(ground);
      allPoints.push(...ground.pointsArray);

      const height = state.heights[y][x];
      for (let z = 0; z < height; z += 1) {
        FACE_DIRECTIONS.forEach((face) => {
          if (!isFaceExposed(x, y, z, face)) {
            return;
          }

          const polygon = createProjectedPolygon(getFaceVertices(x, y, z, face), metrics);
          if (polygon.area <= 0.5) {
            return;
          }

          const fill = getRenderedFaceColor(x, y, z, face);
          faces.push({
            x,
            y,
            z,
            face,
            fill,
            pointsArray: polygon.pointsArray,
            depth: polygon.depth,
            meanY: polygon.meanY,
            meanX: polygon.meanX,
          });
          allPoints.push(...polygon.pointsArray);
        });

        const topOutline = createProjectedPolygon(getFaceVertices(x, y, z, "top"), metrics);
        if (topOutline.area > 0.5) {
          outlines.push(topOutline);
          allPoints.push(...topOutline.pointsArray);
        }
      }
    }
  }

  if (allPoints.length === 0) {
    return { faces: [], outlines: [], floorTiles: [] };
  }

  const bounds = getBounds(allPoints);
  const offsetX = SCENE_CENTER_X - (bounds.minX + bounds.maxX) / 2;
  const offsetY = SCENE_CENTER_Y - (bounds.minY + bounds.maxY) / 2;

  return {
    floorTiles: floorTiles.map((tile) => ({
      points: translatePoints(tile.pointsArray, offsetX, offsetY),
    })),
    outlines: outlines.map((outline) => ({
      points: translatePoints(outline.pointsArray, offsetX, offsetY),
    })),
    faces: faces
      .sort((a, b) => a.depth - b.depth || a.meanY - b.meanY || a.meanX - b.meanX)
      .map((face) => ({
        ...face,
        points: translatePoints(face.pointsArray, offsetX, offsetY),
      })),
  };
}

function createProjectedPolygon(vertices, metrics) {
  const rotated = vertices.map(([x, y, z]) => {
    const spin = rotatePoint(x, y);
    return { x: spin.x, y: spin.y, z };
  });

  const pointsArray = rotated.map((vertex) => projectPoint(vertex.x, vertex.y, vertex.z, metrics));
  return {
    pointsArray,
    area: polygonArea(pointsArray),
    depth:
      rotated.reduce((sum, vertex) => sum + vertex.x + vertex.y + vertex.z, 0) / rotated.length,
    meanY: pointsArray.reduce((sum, point) => sum + point.y, 0) / pointsArray.length,
    meanX: pointsArray.reduce((sum, point) => sum + point.x, 0) / pointsArray.length,
  };
}

function getFaceVertices(x, y, z, face) {
  if (face === "top") {
    return [
      [x, y, z + 1],
      [x + 1, y, z + 1],
      [x + 1, y + 1, z + 1],
      [x, y + 1, z + 1],
    ];
  }

  if (face === "north") {
    return [
      [x, y, z],
      [x + 1, y, z],
      [x + 1, y, z + 1],
      [x, y, z + 1],
    ];
  }

  if (face === "east") {
    return [
      [x + 1, y, z],
      [x + 1, y + 1, z],
      [x + 1, y + 1, z + 1],
      [x + 1, y, z + 1],
    ];
  }

  if (face === "south") {
    return [
      [x, y + 1, z],
      [x, y + 1, z + 1],
      [x + 1, y + 1, z + 1],
      [x + 1, y + 1, z],
    ];
  }

  return [
    [x, y, z],
    [x, y, z + 1],
    [x, y + 1, z + 1],
    [x, y + 1, z],
  ];
}

function isFaceExposed(x, y, z, face) {
  if (face === "top") {
    return z === state.heights[y][x] - 1;
  }

  if (face === "north") {
    return getHeight(x, y - 1) <= z;
  }

  if (face === "east") {
    return getHeight(x + 1, y) <= z;
  }

  if (face === "south") {
    return getHeight(x, y + 1) <= z;
  }

  return getHeight(x - 1, y) <= z;
}

function getRenderedFaceColor(x, y, z, face) {
  const savedColor = getStoredFaceColor(x, y, z, face);
  return shadeHex(savedColor, FACE_SHADE[face] ?? 0);
}

function getStoredFaceColor(x, y, z, face) {
  return state.faceColors[cubeKey(x, y, z)]?.[face] ?? DEFAULT_FACE_COLOR;
}

function getHeight(x, y) {
  if (x < 0 || y < 0 || x >= state.gridSize || y >= state.gridSize) {
    return 0;
  }

  return state.heights[y][x];
}

function getSceneMetrics() {
  const tallest = getTallestHeight();
  const tileWidth = Math.max(
    18,
    Math.min(88, Math.min(760 / state.gridSize, 640 / Math.max(state.gridSize + tallest, 1)))
  );
  return {
    tileWidth,
    tileHeight: tileWidth * 0.52,
    cubeHeight: tileWidth * 0.52,
  };
}

function rotatePoint(x, y) {
  const center = state.gridSize / 2;
  const translatedX = x - center;
  const translatedY = y - center;
  const cos = Math.cos(state.viewAngle);
  const sin = Math.sin(state.viewAngle);

  return {
    x: translatedX * cos - translatedY * sin + center,
    y: translatedX * sin + translatedY * cos + center,
  };
}

function projectPoint(x, y, z, metrics) {
  return {
    x: (x - y) * (metrics.tileWidth / 2),
    y: (x + y) * (metrics.tileHeight / 2) - z * metrics.cubeHeight,
  };
}

function polygonArea(points) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - current.y * next.x;
  }

  return area / 2;
}

function getBounds(points) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );
}

function translatePoints(points, offsetX, offsetY) {
  return points
    .map((point) => {
      const translatedX = point.x + offsetX;
      const translatedY = point.y + offsetY;
      const flippedY = state.viewFlipped
        ? SCENE_CENTER_Y - (translatedY - SCENE_CENTER_Y)
        : translatedY;

      return `${round(translatedX)},${round(flippedY)}`;
    })
    .join(" ");
}

function getCellColor(height) {
  if (height === 0) {
    return "linear-gradient(180deg, #d5c7b3, #b8a287)";
  }

  const intensity = Math.min(18 + height * 9, 58);
  return `linear-gradient(180deg, ${shadeHex("#cf7038", intensity)}, ${shadeHex("#9b4d27", intensity - 10)})`;
}

function ensureFaceBucket(x, y, z) {
  const key = cubeKey(x, y, z);
  if (!state.faceColors[key]) {
    state.faceColors[key] = {};
  }
  return state.faceColors[key];
}

function clearStoredFaceColor(x, y, z, face) {
  const key = cubeKey(x, y, z);
  const bucket = state.faceColors[key];
  if (!bucket) {
    return;
  }

  delete bucket[face];
  if (Object.keys(bucket).length === 0) {
    delete state.faceColors[key];
  }
}

function pruneFaceColors() {
  Object.keys(state.faceColors).forEach((key) => {
    const [x, y, z] = key.split(",").map(Number);
    const outOfBounds = x >= state.gridSize || y >= state.gridSize;
    const removedCube = outOfBounds || z >= getHeight(x, y);

    if (removedCube) {
      delete state.faceColors[key];
    }
  });

  if (
    state.selectedFace &&
    getHeight(state.selectedFace.x, state.selectedFace.y) <= state.selectedFace.z
  ) {
    state.selectedFace = null;
  }
}

function clearHoveredFace() {
  if (state.hoveredFace) {
    state.hoveredFace = null;
  }
}

function getViewLabel() {
  const degrees = Math.round((normalizeAngle(state.viewAngle) * 180) / Math.PI);
  return `${degrees} deg ${state.viewFlipped ? "Upside Down" : "Upright"}`;
}

function getSchemeLabel(id) {
  return COLOR_SCHEMES.find((scheme) => scheme.id === id)?.label ?? "Current";
}

function resolveSchemeColor(schemeId, x, y, z, face) {
  if (schemeId === "selected") {
    return normalizeHex(state.selectedColor);
  }

  if (schemeId === "sunset") {
    return pickSchemeColor(["#ffd166", "#f7b267", "#ef476f", "#9d4edd"], x + y + z);
  }

  if (schemeId === "ocean") {
    return pickSchemeColor(["#7dd3fc", "#38bdf8", "#0ea5e9", "#155e75"], x * 2 - y + z);
  }

  if (schemeId === "forest") {
    return pickSchemeColor(["#d9f99d", "#86efac", "#22c55e", "#166534"], y + z * 2 + x);
  }

  if (schemeId === "candy") {
    return pickSchemeColor(["#f9a8d4", "#f472b6", "#67e8f9", "#fde68a"], x + y * 2 + z);
  }

  if (schemeId === "ember") {
    return pickSchemeColor(["#fed7aa", "#fb923c", "#ef4444", "#991b1b"], z * 3 + x - y);
  }

  return pickSchemeColor(
    ["#ff595e", "#ffca3a", "#8ac926", "#1982c4", "#6a4c93"],
    x * 3 + y * 5 + z * 7 + face.length
  );
}

function pickSchemeColor(colors, index) {
  const safeIndex = ((index % colors.length) + colors.length) % colors.length;
  return colors[safeIndex];
}

function getTallestHeight() {
  let tallest = 0;

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      tallest = Math.max(tallest, state.heights[y][x]);
    }
  }

  return tallest;
}

function getCubeCount() {
  let total = 0;

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      total += state.heights[y][x];
    }
  }

  return total;
}

function cubeKey(x, y, z) {
  return `${x},${y},${z}`;
}

function shadeHex(hex, percent) {
  const value = normalizeHex(hex).replace("#", "");
  const amount = Math.max(-100, Math.min(100, percent)) / 100;
  const next = [];

  for (let index = 0; index < 3; index += 1) {
    const channel = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
    const target = amount >= 0 ? 255 : 0;
    const mixed = Math.round(channel + (target - channel) * Math.abs(amount));
    next.push(mixed.toString(16).padStart(2, "0"));
  }

  return `#${next.join("")}`;
}

function normalizeHex(hex) {
  return hex.trim().toLowerCase();
}

function clampSpinSpeed(speed) {
  return Math.max(
    SPIN_SPEED_SLIDER.minDegreesPerSecond,
    Math.min(SPIN_SPEED_SLIDER.maxDegreesPerSecond, speed)
  );
}

function sliderValueToSpinSpeed(value) {
  const range = SPIN_SPEED_SLIDER.max - SPIN_SPEED_SLIDER.min;
  const normalized = range === 0 ? 0 : (value - SPIN_SPEED_SLIDER.min) / range;
  const safeNormalized = Math.max(0, Math.min(1, normalized));
  const ratio =
    SPIN_SPEED_SLIDER.maxDegreesPerSecond / SPIN_SPEED_SLIDER.minDegreesPerSecond;
  return SPIN_SPEED_SLIDER.minDegreesPerSecond * ratio ** safeNormalized;
}

function spinSpeedToSliderValue(speed) {
  const safeSpeed = clampSpinSpeed(speed);
  const ratio =
    SPIN_SPEED_SLIDER.maxDegreesPerSecond / SPIN_SPEED_SLIDER.minDegreesPerSecond;
  const normalized = Math.log(safeSpeed / SPIN_SPEED_SLIDER.minDegreesPerSecond) / Math.log(ratio);
  return Math.round(
    SPIN_SPEED_SLIDER.min +
      normalized * (SPIN_SPEED_SLIDER.max - SPIN_SPEED_SLIDER.min)
  );
}

function formatSpinSpeed(speed) {
  const rounded = Math.round(speed);
  const revolutionsPerSecond = speed / 360;
  if (revolutionsPerSecond >= 1) {
    return `${rounded} deg/s (${revolutionsPerSecond.toFixed(1)} rev/s)`;
  }

  return `${rounded} deg/s`;
}

function normalizeAngle(angle) {
  const fullTurn = Math.PI * 2;
  const normalized = angle % fullTurn;
  return normalized < 0 ? normalized + fullTurn : normalized;
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function dedupeTargets(targets) {
  const seen = new Set();
  return targets.filter((target) => {
    const key = `${target.x},${target.y}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function makeGrid(size, value) {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => value));
}

function round(number) {
  return Math.round(number * 100) / 100;
}
