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

const state = {
  gridSize: 8,
  maxHeight: 6,
  tool: "raise",
  symmetry: "none",
  viewAngle: 0,
  viewFlipped: false,
  selectedColor: PALETTE[0],
  selectedScheme: "selected",
  spinMode: "clockwise",
  spinSpeed: 45,
  spinning: false,
  spinElapsed: 0,
  spinAnchorAngle: 0,
  hoveredFace: null,
  selectedFace: null,
  paintSummary: "",
  dragActive: false,
  dragVisited: new Set(),
  heights: makeGrid(8, 0),
  faceColors: {},
};

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
  applyScheme: document.querySelector("#apply-scheme"),
  clearGrid: document.querySelector("#clear-grid"),
  presetPyramid: document.querySelector("#preset-pyramid"),
  presetRing: document.querySelector("#preset-ring"),
};

let spinFrameId = null;
let lastSpinTimestamp = 0;

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
  });

  dom.gridSize.addEventListener("input", (event) => {
    resizeGrid(Number(event.target.value));
  });

  dom.maxHeight.addEventListener("input", (event) => {
    state.maxHeight = Number(event.target.value);
    clampHeights();
    render();
  });

  dom.spinSpeed.addEventListener("input", (event) => {
    state.spinSpeed = Number(event.target.value);
    renderPreviewControls();
  });

  dom.customColor.addEventListener("input", (event) => {
    state.selectedColor = event.target.value.toLowerCase();
    renderPalette();
    updateStatusCards();
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

  dom.spinToggle.addEventListener("click", toggleSpin);

  dom.applyScheme.addEventListener("click", () => {
    applySchemeToShape(state.selectedScheme);
  });

  dom.clearGrid.addEventListener("click", () => {
    state.heights = makeGrid(state.gridSize, 0);
    state.faceColors = {};
    state.selectedFace = null;
    state.paintSummary = "Shape cleared. Build a new form and paint it however you like.";
    render();
  });

  dom.presetPyramid.addEventListener("click", () => applyPreset("pyramid"));
  dom.presetRing.addEventListener("click", () => applyPreset("ring"));

  dom.gridEditor.addEventListener("pointerdown", (event) => {
    const cell = event.target.closest(".grid-cell");
    if (!cell) {
      return;
    }

    state.dragActive = true;
    state.dragVisited = new Set();
    applyToolAt(Number(cell.dataset.x), Number(cell.dataset.y));
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

    applyToolAt(Number(cell.dataset.x), Number(cell.dataset.y));
  });

  document.addEventListener("pointerup", () => {
    state.dragActive = false;
    state.dragVisited = new Set();
  });

  dom.scene.addEventListener("click", (event) => {
    const face = event.target.closest(".iso-face");
    if (!face) {
      return;
    }

    paintFace(
      Number(face.dataset.x),
      Number(face.dataset.y),
      Number(face.dataset.z),
      face.dataset.face
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
}

function render() {
  renderToolButtons();
  renderSymmetryButtons();
  renderSchemeButtons();
  renderSpinModeButtons();
  renderPalette();
  renderGridControls();
  renderPreviewControls();
  renderGridEditor();
  renderScene();
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
  dom.spinSpeed.value = String(state.spinSpeed);
  dom.spinSpeedValue.textContent = `${state.spinSpeed} deg/s`;
  dom.spinToggle.textContent = state.spinning ? "Pause Spin" : "Start Spin";
  dom.spinToggle.classList.toggle("is-active", state.spinning);
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
      state.selectedColor = normalizeHex(color);
      renderPalette();
      renderGridControls();
      updateStatusCards();
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

function resizeGrid(newSize) {
  if (newSize === state.gridSize) {
    return;
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
  state.paintSummary = `Grid resized to ${newSize} x ${newSize}.`;
  pruneFaceColors();
  render();
}

function clampHeights() {
  state.heights = state.heights.map((row) => row.map((height) => Math.min(height, state.maxHeight)));
  state.paintSummary = `Maximum stack height set to ${state.maxHeight} levels.`;
  pruneFaceColors();
}

function applyPreset(kind) {
  const size = state.gridSize;
  const center = (size - 1) / 2;

  state.heights = makeGrid(size, 0);
  state.faceColors = {};
  state.selectedFace = null;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (kind === "pyramid") {
        const distance = Math.max(Math.abs(x - center), Math.abs(y - center));
        state.heights[y][x] = Math.max(0, state.maxHeight - Math.floor(distance * 1.5) - 1);
      } else if (kind === "ring") {
        const distance = Math.round(Math.abs(x - center) + Math.abs(y - center));
        const outer = Math.max(0, state.maxHeight - Math.abs(distance - Math.floor(size / 2)));
        state.heights[y][x] = outer > 2 ? Math.min(outer - 1, state.maxHeight) : 0;
      }
    }
  }

  state.paintSummary = kind === "pyramid" ? "Seeded a pyramid." : "Seeded a ring.";
  render();
}

function applyToolAt(x, y) {
  getSymmetryTargets(x, y).forEach((target) => {
    const key = `${target.x},${target.y}`;
    state.dragVisited.add(key);

    if (state.tool === "raise") {
      state.heights[target.y][target.x] = Math.min(
        state.maxHeight,
        state.heights[target.y][target.x] + 1
      );
      return;
    }

    if (state.tool === "lower") {
      state.heights[target.y][target.x] = Math.max(0, state.heights[target.y][target.x] - 1);
      return;
    }

    state.heights[target.y][target.x] = 0;
  });

  state.paintSummary = "";
  pruneFaceColors();
  renderGridEditor();
  renderScene();
  updateStatusCards();
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

function rotatePreview(direction) {
  state.viewAngle = normalizeAngle(state.viewAngle + direction * ROTATION_STEP);
  clearHoveredFace();
  renderScene();
  renderPreviewControls();
  updateStatusCards();
}

function toggleSpin() {
  state.spinning = !state.spinning;

  if (state.spinning) {
    resetSpinMotion();
    lastSpinTimestamp = 0;
    spinFrameId = window.requestAnimationFrame(stepSpin);
  } else if (spinFrameId !== null) {
    window.cancelAnimationFrame(spinFrameId);
    spinFrameId = null;
  }

  renderPreviewControls();
}

function resetSpinMotion() {
  state.spinElapsed = 0;
  state.spinAnchorAngle = state.viewAngle;
}

function stepSpin(timestamp) {
  if (!state.spinning) {
    return;
  }

  if (!lastSpinTimestamp) {
    lastSpinTimestamp = timestamp;
  }

  const deltaSeconds = (timestamp - lastSpinTimestamp) / 1000;
  lastSpinTimestamp = timestamp;
  const speed = degreesToRadians(state.spinSpeed);

  if (state.spinMode === "clockwise") {
    state.viewAngle = normalizeAngle(state.viewAngle + deltaSeconds * speed);
  } else if (state.spinMode === "counterclockwise") {
    state.viewAngle = normalizeAngle(state.viewAngle - deltaSeconds * speed);
  } else {
    state.spinElapsed += deltaSeconds * speed;
    state.viewAngle = normalizeAngle(
      state.spinAnchorAngle + Math.sin(state.spinElapsed) * (Math.PI * 0.78)
    );
  }

  clearHoveredFace();
  renderScene();
  renderPreviewControls();
  updateStatusCards();
  spinFrameId = window.requestAnimationFrame(stepSpin);
}

function paintFace(x, y, z, face) {
  const bucket = ensureFaceBucket(x, y, z);
  bucket[face] = normalizeHex(state.selectedColor);
  state.selectedFace = { x, y, z, face };
  state.paintSummary = "";
  renderScene();
  updateStatusCards();
}

function applySchemeToShape(schemeId) {
  const cubes = getCubeCount();
  if (cubes === 0) {
    state.paintSummary = "There are no blocks yet, so there is nothing to recolor.";
    state.selectedFace = null;
    updateStatusCards();
    return;
  }

  const nextColors = {};

  for (let y = 0; y < state.gridSize; y += 1) {
    for (let x = 0; x < state.gridSize; x += 1) {
      const height = state.heights[y][x];
      for (let z = 0; z < height; z += 1) {
        const key = cubeKey(x, y, z);
        nextColors[key] = {};

        FACE_DIRECTIONS.forEach((face) => {
          nextColors[key][face] = resolveSchemeColor(schemeId, x, y, z, face);
        });
      }
    }
  }

  state.faceColors = nextColors;
  state.selectedFace = null;
  state.paintSummary = `Applied the ${getSchemeLabel(schemeId)} scheme to all ${cubes} blocks.`;
  renderScene();
  updateStatusCards();
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
  return state.faceColors[cubeKey(x, y, z)]?.[face] ?? "#d8c1a2";
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
