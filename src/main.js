// src/main.js
import * as THREE from "three";
import { Game } from "./game.js";

const canvas = document.getElementById("c");
const modeSelect = document.getElementById("modeSelect");
const difficultySelect = document.getElementById("difficultySelect");
const resetBtn = document.getElementById("resetBtn");
const toast = document.getElementById("toast");
const loading = document.getElementById("loading");

// Win screen UI
const winScreen = document.getElementById("winScreen");
const restartBtn = document.getElementById("restartBtn");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  65,
  window.innerWidth / window.innerHeight,
  0.05,
  250
);

const game = new Game(scene, camera, renderer, { toast, loading, winScreen });

game.bindInput(canvas);

// Mobile buttons
game.bindMobileButtons({
  left: document.getElementById("btnLeft"),
  right: document.getElementById("btnRight"),
  forward: document.getElementById("btnForward"),
  back: document.getElementById("btnBack"),
  jump: document.getElementById("btnJump"),
  dash: document.getElementById("btnDash"),
});

modeSelect.addEventListener("change", async () => {
  await game.setMode(modeSelect.value);
});

difficultySelect.addEventListener("change", () => {
  game.setDifficulty(parseInt(difficultySelect.value, 10));
});

resetBtn.addEventListener("click", () => game.reset());

// Restart the whole run (back to Level 1) from win screen
restartBtn.addEventListener("click", async () => {
  await game.restartRun();
});

window.addEventListener("resize", () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
});

(async () => {
  // Start in whatever the UI currently shows
  await game.setMode(modeSelect.value);
  game.setDifficulty(parseInt(difficultySelect.value, 10));

  function loop() {
    game.update();
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
})();
