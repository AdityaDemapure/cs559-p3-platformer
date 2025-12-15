// src/game.js
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LEVELS, LEVEL_COUNT } from "./levels.js";

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

class AABB {
  constructor(center, half) {
    this.c = center.clone();
    this.h = half.clone();
  }
  get min() { return this.c.clone().sub(this.h); }
  get max() { return this.c.clone().add(this.h); }
}

function aabbOverlap(aMin, aMax, bMin, bMax) {
  const ox = Math.min(aMax.x, bMax.x) - Math.max(aMin.x, bMin.x);
  const oy = Math.min(aMax.y, bMax.y) - Math.max(aMin.y, bMin.y);
  const oz = Math.min(aMax.z, bMax.z) - Math.max(aMin.z, bMin.z);
  return { ox, oy, oz, hit: (ox > 0 && oy > 0 && oz > 0) };
}

export class Game {
  constructor(scene, camera, renderer, ui) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.ui = ui;

    this.clock = new THREE.Clock();
    this.mode = "prototype";
    this.difficulty = 2;

    // Level progression
    this.levelIndex = 0;
    this._advancing = false;
    this._pendingAdvance = false;
    this._pendingIndex = 0;

    // Camera orbit controls
    this.camYaw = 0;
    this.camPitch = -0.25;
    this.camDist = 14;

    // Input state
    this.keys = new Map();
    this.btn = { left:false,right:false,forward:false,back:false,jump:false,dash:false };
    this.pointer = { dragging:false, lastX:0, lastY:0 };
    this.touches = new Map();
    this.pinch = { active:false, startDist:0, startCamDist:14 };

    // World state
    this.level = null;
    this.platforms = [];
    this.movingPlatforms = [];
    this.collectibles = [];
    this.enemies = [];
    this.goal = null;

    this.player = {
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      half: new THREE.Vector3(0.45, 0.9, 0.45),
      grounded: false,
      groundPlatform: null,
      coyote: 0,
      dashAvailable: true,
      dashing: false,
      dashTime: 0,
      jumpBuffer: 0,
      spawn: new THREE.Vector3(),
      mesh: null,
      modelRoot: null,
      modelYOffset: -0.85,
      mixer: null,
      actions: new Map(),
      activeAction: null,
      facing: new THREE.Vector3(0, 0, 1)
    };

    this.assets = {
      groundTex: null,
      playerGLTF: null
    };

    this._setupLights();
  }

  _setupLights() {
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (obj.isLight) this.scene.remove(obj);
    }

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 0.8);
    this.scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(8, 14, 6);
    dir.castShadow = false;
    this.scene.add(dir);
  }

  async setMode(mode) {
    this.mode = mode;
    await this._rebuildWorld();
    this._toast(`Mode: ${mode.toUpperCase()} • Level ${this.levelIndex + 1}/${LEVEL_COUNT}`);
  }

  setDifficulty(d) {
    this.difficulty = d;
    this._toast(`Difficulty: ${["","Easy","Normal","Hard"][d]}`);
  }

  async goToLevel(index) {
    const i = ((index % LEVEL_COUNT) + LEVEL_COUNT) % LEVEL_COUNT;
    this.levelIndex = i;
    await this._rebuildWorld();
    this._toast(`Level ${this.levelIndex + 1}/${LEVEL_COUNT}`);
  }

  async nextLevel() {
    const next = (this.levelIndex + 1) % LEVEL_COUNT;
    await this.goToLevel(next);
  }

  bindInput(canvas) {
    window.addEventListener("keydown", (e) => this.keys.set(e.code, true));
    window.addEventListener("keyup", (e) => this.keys.set(e.code, false));

    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.pointer.dragging = true;
      this.pointer.lastX = e.clientX;
      this.pointer.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!this.pointer.dragging) return;
      const dx = e.clientX - this.pointer.lastX;
      const dy = e.clientY - this.pointer.lastY;
      this.pointer.lastX = e.clientX;
      this.pointer.lastY = e.clientY;
      this.camYaw -= dx * 0.005;
      this.camPitch = clamp(this.camPitch - dy * 0.005, -1.2, 0.2);
    });

    canvas.addEventListener("pointerup", () => { this.pointer.dragging = false; });
    canvas.addEventListener("pointercancel", () => { this.pointer.dragging = false; });

    canvas.addEventListener("wheel", (e) => {
      this.camDist = clamp(this.camDist + e.deltaY * 0.01, 6, 28);
    }, { passive: true });

    canvas.addEventListener("touchstart", (e) => {
      for (const t of e.changedTouches) this.touches.set(t.identifier, { x:t.clientX, y:t.clientY });
      this._updatePinchStart();
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const prev = this.touches.get(t.identifier);
        if (prev) {
          const dx = t.clientX - prev.x;
          const dy = t.clientY - prev.y;
          this.camYaw -= dx * 0.005;
          this.camPitch = clamp(this.camPitch - dy * 0.005, -1.2, 0.2);
          prev.x = t.clientX; prev.y = t.clientY;
        }
      }

      if (e.touches.length === 2) {
        const a = e.touches[0], b = e.touches[1];
        const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        if (!this.pinch.active) this._updatePinchStart();
        const k = dist / (this.pinch.startDist || dist);
        this.camDist = clamp(this.pinch.startCamDist / k, 6, 28);
      }
    }, { passive: true });

    canvas.addEventListener("touchend", (e) => {
      for (const t of e.changedTouches) this.touches.delete(t.identifier);
      this._updatePinchStart();
    }, { passive: true });

    canvas.addEventListener("touchcancel", (e) => {
      for (const t of e.changedTouches) this.touches.delete(t.identifier);
      this._updatePinchStart();
    }, { passive: true });
  }

  bindMobileButtons(btnEls) {
    const bindHold = (el, key) => {
      const down = (e) => { e.preventDefault(); this.btn[key] = true; };
      const up = (e) => { e.preventDefault(); this.btn[key] = false; };
      el.addEventListener("pointerdown", down);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
      el.addEventListener("pointerleave", up);
      el.addEventListener("touchstart", down, { passive:false });
      el.addEventListener("touchend", up, { passive:false });
      el.addEventListener("touchcancel", up, { passive:false });
    };

    bindHold(btnEls.left, "left");
    bindHold(btnEls.right, "right");
    bindHold(btnEls.forward, "forward");
    bindHold(btnEls.back, "back");
    bindHold(btnEls.jump, "jump");
    bindHold(btnEls.dash, "dash");
  }

  _updatePinchStart() {
    if (this.touches.size === 2) {
      const pts = [...this.touches.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      this.pinch.active = true;
      this.pinch.startDist = dist;
      this.pinch.startCamDist = this.camDist;
    } else {
      this.pinch.active = false;
    }
  }

  reset() {
    this._respawn();
    this._toast(`Reset • Level ${this.levelIndex + 1}/${LEVEL_COUNT}`);
  }

  _respawn() {
    this.player.pos.copy(this.player.spawn);
    this.player.vel.set(0, 0, 0);
    this.player.grounded = false;
    this.player.groundPlatform = null;
    this.player.coyote = 0;
    this.player.dashAvailable = true;
    this.player.dashing = false;
    this.player.dashTime = 0;
    this.player.jumpBuffer = 0;
    this.player.facing.set(0, 0, 1);

    for (const c of this.collectibles) {
      c.taken = false;
      c.mesh.visible = true;
    }

    this._applyPlayerTransforms();
  }

  _applyPlayerTransforms() {
    const p = this.player;
    const yaw = Math.atan2(p.facing.x, p.facing.z);

    if (p.mesh) {
      p.mesh.position.copy(p.pos);
      p.mesh.rotation.y = yaw;
    }

    if (p.modelRoot) {
      p.modelRoot.position.set(p.pos.x, p.pos.y + p.modelYOffset, p.pos.z);
      p.modelRoot.rotation.y = yaw;
    }
  }

  _clearWorld() {
    for (let i = this.scene.children.length - 1; i >= 0; i--) {
      const obj = this.scene.children[i];
      if (!obj.isLight) this.scene.remove(obj);
    }
    this.platforms = [];
    this.movingPlatforms = [];
    this.collectibles = [];
    this.enemies = [];
    this.goal = null;

    if (this.player.mesh) this.scene.remove(this.player.mesh);
    this.player.mesh = null;

    if (this.player.modelRoot) this.scene.remove(this.player.modelRoot);
    this.player.modelRoot = null;

    this.player.mixer = null;
    this.player.actions.clear();
    this.player.activeAction = null;
  }

  async _loadFullAssetsIfNeeded() {
    if (this.mode !== "full") return;

    if (!this.assets.groundTex) {
      this.ui.loading.classList.remove("hidden");
      const texLoader = new THREE.TextureLoader();
      this.assets.groundTex = await new Promise((res, rej) => {
        texLoader.load(
          "https://threejs.org/examples/textures/terrain/grasslight-big.jpg",
          (t) => res(t),
          undefined,
          (e) => rej(e)
        );
      });
      this.assets.groundTex.wrapS = THREE.RepeatWrapping;
      this.assets.groundTex.wrapT = THREE.RepeatWrapping;
      this.assets.groundTex.repeat.set(10, 10);
    }

    if (!this.assets.playerGLTF) {
      const loader = new GLTFLoader();
      this.assets.playerGLTF = await new Promise((res, rej) => {
        loader.load(
          "https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb",
          (gltf) => res(gltf),
          undefined,
          (e) => rej(e)
        );
      });
    }

    this.ui.loading.classList.add("hidden");
  }

  async _rebuildWorld() {
    this._clearWorld();
    this._setupLights();

    this.scene.background = new THREE.Color(this.mode === "full" ? 0x87b5ff : 0x0b1020);

    try {
      await this._loadFullAssetsIfNeeded();
    } catch (e) {
      this.ui.loading.classList.add("hidden");
      this._toast("Full mode asset load failed — primitives fallback.");
    }

    // Load current level
    this.level = LEVELS[this.levelIndex];

    const protoMat = new THREE.MeshStandardMaterial({ color: 0x8fd3ff, roughness: 0.8, metalness: 0.0 });
    const protoPlatMat = new THREE.MeshStandardMaterial({ color: 0x6bffb3, roughness: 0.9, metalness: 0.0 });
    const fullPlatMat = (this.assets.groundTex)
      ? new THREE.MeshStandardMaterial({ map: this.assets.groundTex, roughness: 1.0, metalness: 0.0 })
      : protoPlatMat;

    const platformMat = (this.mode === "full") ? fullPlatMat : protoPlatMat;

    // Static platforms
    for (const p of this.level.platforms) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]),
        platformMat
      );
      mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
      this.scene.add(mesh);

      const aabb = new AABB(mesh.position, new THREE.Vector3(p.size[0]/2, p.size[1]/2, p.size[2]/2));
      this.platforms.push({ mesh, aabb, size: p.size });
    }

    // Moving platforms
    const mpMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.7, metalness: 0.1 });
    for (const def of this.level.movingPlatforms) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(def.size[0], def.size[1], def.size[2]),
        (this.mode === "full") ? mpMat : new THREE.MeshStandardMaterial({ color: 0xffffff * Math.random() })
      );
      mesh.position.set(def.pos[0], def.pos[1], def.pos[2]);
      this.scene.add(mesh);

      const aabb = new AABB(mesh.position, new THREE.Vector3(def.size[0]/2, def.size[1]/2, def.size[2]/2));
      this.movingPlatforms.push({
        def,
        mesh,
        aabb,
        basePos: mesh.position.clone(),
        prevPos: mesh.position.clone(),
        delta: new THREE.Vector3(),
        t: 0
      });
    }

    // Collectibles
    const colGeo = new THREE.IcosahedronGeometry(0.35, 1);
    const colMat = new THREE.MeshStandardMaterial({ color: 0xff4d6d, roughness: 0.4, metalness: 0.2 });
    for (const c of this.level.collectibles) {
      const mesh = new THREE.Mesh(colGeo, colMat);
      mesh.position.set(c.pos[0], c.pos[1], c.pos[2]);
      this.scene.add(mesh);
      this.collectibles.push({ mesh, taken: false });
    }

    // Enemies
    const eGeo = new THREE.SphereGeometry(0.55, 16, 12);
    const eMat = new THREE.MeshStandardMaterial({ color: 0x9b5de5, roughness: 0.5, metalness: 0.2 });
    for (const def of this.level.enemies) {
      const mesh = new THREE.Mesh(eGeo, eMat);
      mesh.position.set(def.pos[0], def.pos[1], def.pos[2]);
      this.scene.add(mesh);

      const aabb = new AABB(mesh.position, new THREE.Vector3(0.55, 0.55, 0.55));
      this.enemies.push({ mesh, aabb, def, t: 0 });
    }

    // Goal
    const gGeo = new THREE.TorusKnotGeometry(0.7, 0.2, 80, 10);
    const gMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, roughness: 0.25, metalness: 0.6 });
    const goalMesh = new THREE.Mesh(gGeo, gMat);
    goalMesh.position.set(this.level.goal.pos[0], this.level.goal.pos[1], this.level.goal.pos[2]);
    this.scene.add(goalMesh);
    this.goal = { mesh: goalMesh, pos: goalMesh.position, radius: this.level.goal.radius };

    // Spawn
    this.player.spawn.set(this.level.spawn.pos[0], this.level.spawn.pos[1], this.level.spawn.pos[2]);

    // Player visuals
    if (this.mode === "full" && this.assets.playerGLTF) {
      const gltf = this.assets.playerGLTF;
      const root = gltf.scene.clone(true);
      root.scale.set(0.6, 0.6, 0.6);
      this.scene.add(root);
      this.player.modelRoot = root;

      if (gltf.animations && gltf.animations.length) {
        const mixer = new THREE.AnimationMixer(root);
        this.player.mixer = mixer;
        for (const clip of gltf.animations) {
          const action = mixer.clipAction(clip);
          this.player.actions.set(clip.name, action);
        }
        this._playAction("Idle");
      }

      // Invisible collider mesh
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(this.player.half.x*2, this.player.half.y*2, this.player.half.z*2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 })
      );
      this.scene.add(mesh);
      this.player.mesh = mesh;
    } else {
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.45, 1.2, 8, 16),
        protoMat
      );
      this.scene.add(mesh);
      this.player.mesh = mesh;
    }

    this._respawn();
  }

  _playAction(name) {
    if (!this.player.mixer) return;
    const next = this.player.actions.get(name);
    if (!next) return;

    if (this.player.activeAction === next) return;

    if (this.player.activeAction) this.player.activeAction.fadeOut(0.12);
    next.reset().fadeIn(0.12).play();
    this.player.activeAction = next;
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 1 / 30);

    // World animation
    this._updateMovingPlatforms(dt);
    this._updateEnemies(dt);
    this._updateCollectibles(dt);
    this._updateGoal(dt);

    // Player
    this._stepPlayer(dt);
    this._updateCamera(dt);

    if (this.player.mixer) this.player.mixer.update(dt);

    // Handle pending level change safely outside collision logic
    if (this._pendingAdvance && !this._advancing) {
      this._advancing = true;
      const target = this._pendingIndex;
      this._pendingAdvance = false;

      // Kick off rebuild; keep game loop running
      this.goToLevel(target).finally(() => {
        this._advancing = false;
      });
    }
  }

  _inputAxes() {
    const k = (code) => this.keys.get(code) === true;

    const left = k("ArrowLeft") || k("KeyA") || this.btn.left;
    const right = k("ArrowRight") || k("KeyD") || this.btn.right;
    const forward = k("ArrowUp") || k("KeyW") || this.btn.forward;
    const back = k("ArrowDown") || k("KeyS") || this.btn.back;

    const jumpHeld = k("Space") || this.btn.jump;
    const dashHeld = k("ShiftLeft") || k("ShiftRight") || k("KeyK") || this.btn.dash;

    return {
      x: (right ? 1 : 0) - (left ? 1 : 0),
      z: (forward ? 1 : 0) - (back ? 1 : 0),
      jumpHeld,
      dashHeld
    };
  }

  _cameraRelativeAxes() {
    // W = away from camera, S = toward camera, A = left, D = right
    const p = this.player.pos;
    const cam = this.camera.position;

    const away = new THREE.Vector3().subVectors(p, cam);
    away.y = 0;

    if (away.lengthSq() < 1e-8) away.set(0, 0, 1);
    else away.normalize();

    const up = new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(away, up).normalize();

    return { away, right };
  }

  _stepPlayer(dt) {
    const p = this.player;

    // Carry by moving platform
    if (p.grounded && p.groundPlatform && p.groundPlatform.delta) {
      p.pos.add(p.groundPlatform.delta);
    }

    const { x, z, jumpHeld, dashHeld } = this._inputAxes();
    if (jumpHeld) p.jumpBuffer = 0.12;
    else p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);

    if (!this._prevDashHeld) this._prevDashHeld = false;
    const dashPressed = (dashHeld && !this._prevDashHeld);
    this._prevDashHeld = dashHeld;

    if (p.grounded) p.coyote = 0.10;
    else p.coyote = Math.max(0, p.coyote - dt);

    const { away, right } = this._cameraRelativeAxes();
    const wish = new THREE.Vector3()
      .addScaledVector(right, x)
      .addScaledVector(away, z);

    if (wish.lengthSq() > 0) {
      wish.normalize();
      p.facing.copy(wish);
    }

    const maxSpeed = (this.difficulty === 1) ? 7.2 : (this.difficulty === 3) ? 6.2 : 6.6;
    const accel = p.grounded ? 36.0 : 18.0;
    const airControl = 0.75;

    const dashDuration = 0.22;
    const dashSpeed = (this.difficulty === 3) ? 18.0 : 20.0;

    if (dashPressed && p.dashAvailable && !p.dashing) {
      const dir = (wish.lengthSq() > 0) ? wish : away.clone();
      p.dashing = true;
      p.dashTime = dashDuration;
      p.dashAvailable = false;

      p.vel.copy(dir).multiplyScalar(dashSpeed);
      p.vel.y = 0.0;

      this._toast("DASH!");
    }

    if (p.dashing) {
      p.dashTime -= dt;
      if (p.dashTime <= 0) p.dashing = false;
    }

    const g = -24.0;
    if (!p.dashing) p.vel.y += g * dt;

    if (!p.dashing) {
      const curH = new THREE.Vector3(p.vel.x, 0, p.vel.z);
      const target = wish.clone().multiplyScalar(maxSpeed);
      const a = accel * (p.grounded ? 1.0 : airControl);
      curH.lerp(target, 1 - Math.exp(-a * dt));

      if (wish.lengthSq() === 0 && p.grounded) {
        curH.multiplyScalar(Math.pow(0.0008, dt));
      }

      p.vel.x = curH.x;
      p.vel.z = curH.z;
    }

    const jumpSpeed = 9.2;
    if (p.jumpBuffer > 0 && (p.grounded || p.coyote > 0)) {
      p.vel.y = jumpSpeed;
      p.grounded = false;
      p.groundPlatform = null;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this._toast("JUMP!");
    }

    p.pos.addScaledVector(p.vel, dt);

    p.grounded = false;
    p.groundPlatform = null;
    this._resolvePlayerCollisions();

    if (p.grounded) p.dashAvailable = true;

    if (p.mixer) {
      if (!p.grounded) this._playAction("Jump");
      else {
        const speed = Math.hypot(p.vel.x, p.vel.z);
        if (speed > 1.0) this._playAction("Walking");
        else this._playAction("Idle");
      }
    }

    this._applyPlayerTransforms();

    if (p.pos.y < -30) {
      this._toast("Fell! Respawn.");
      this._respawn();
      return;
    }

    const pAABB = new AABB(p.pos, p.half);
    const pMin = pAABB.min, pMax = pAABB.max;
    for (const e of this.enemies) {
      if (aabbOverlap(pMin, pMax, e.aabb.min, e.aabb.max).hit) {
        this._toast("Hit by drone! Respawn.");
        this._respawn();
        return;
      }
    }

    for (const c of this.collectibles) {
      if (c.taken) continue;
      if (c.mesh.position.distanceTo(p.pos) < 1.2) {
        c.taken = true;
        c.mesh.visible = false;
        this._toast("Collected!");
      }
    }
  }

  _resolvePlayerCollisions() {
    const p = this.player;

    let pAABB = new AABB(p.pos, p.half);
    let pMin = pAABB.min;
    let pMax = pAABB.max;

    const colliders = [...this.platforms, ...this.movingPlatforms];

    for (const c of colliders) {
      const aabb = c.aabb;
      const overlap = aabbOverlap(pMin, pMax, aabb.min, aabb.max);
      if (!overlap.hit) continue;

      const { ox, oy, oz } = overlap;

      if (ox <= oy && ox <= oz) {
        const dir = (p.pos.x < aabb.c.x) ? -1 : 1;
        p.pos.x += dir * ox;
        p.vel.x = 0;
      } else if (oz <= ox && oz <= oy) {
        const dir = (p.pos.z < aabb.c.z) ? -1 : 1;
        p.pos.z += dir * oz;
        p.vel.z = 0;
      } else {
        const dir = (p.pos.y < aabb.c.y) ? -1 : 1;
        p.pos.y += dir * oy;

        if (dir > 0) {
          p.grounded = true;
          if (c && c.delta) p.groundPlatform = c;
        }

        p.vel.y = 0;
      }

      pAABB = new AABB(p.pos, p.half);
      pMin = pAABB.min;
      pMax = pAABB.max;
    }
  }

  _updateMovingPlatforms(dt) {
    for (const mp of this.movingPlatforms) {
      mp.t += dt * mp.def.speed;
      mp.prevPos.copy(mp.mesh.position);

      const off = Math.sin(mp.t) * mp.def.amp;
      mp.mesh.position.copy(mp.basePos);
      if (mp.def.axis === "x") mp.mesh.position.x += off;
      if (mp.def.axis === "y") mp.mesh.position.y += off;
      if (mp.def.axis === "z") mp.mesh.position.z += off;

      mp.delta.subVectors(mp.mesh.position, mp.prevPos);
      mp.aabb.c.copy(mp.mesh.position);
    }
  }

  _updateEnemies(dt) {
    for (const e of this.enemies) {
      e.t += dt * e.def.speed * (this.difficulty === 1 ? 0.8 : this.difficulty === 3 ? 1.25 : 1.0);
      const off = Math.sin(e.t) * e.def.amp;

      const base = new THREE.Vector3(e.def.pos[0], e.def.pos[1], e.def.pos[2]);
      e.mesh.position.copy(base);
      if (e.def.patrolAxis === "x") e.mesh.position.x += off;
      if (e.def.patrolAxis === "y") e.mesh.position.y += off;
      if (e.def.patrolAxis === "z") e.mesh.position.z += off;

      e.aabb.c.copy(e.mesh.position);
    }
  }

  _updateCollectibles(dt) {
    for (const c of this.collectibles) {
      c.mesh.rotation.y += dt * 2.2;
      c.mesh.position.y += Math.sin(performance.now() * 0.002) * 0.002;
    }
  }

  _updateGoal(dt) {
    if (!this.goal) return;

    this.goal.mesh.rotation.x += dt * 0.7;
    this.goal.mesh.rotation.y += dt * 1.1;

    const p = this.player.pos;
    if (p.distanceTo(this.goal.pos) < this.goal.radius) {
      // queue next level (so we don't rebuild in the middle of physics)
      if (!this._pendingAdvance && !this._advancing) {
        const next = (this.levelIndex + 1) % LEVEL_COUNT;
        this._pendingAdvance = true;
        this._pendingIndex = next;
        this._toast(`Level clear! → ${next + 1}/${LEVEL_COUNT}`);
      }
    }
  }

  _updateCamera(dt) {
    const p = this.player.pos;

    const cosP = Math.cos(this.camPitch);
    const sinP = Math.sin(this.camPitch);
    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);

    const offset = new THREE.Vector3(
      sinY * cosP,
      sinP,
      cosY * cosP
    ).multiplyScalar(this.camDist);

    const desired = p.clone().add(offset);
    this.camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
    this.camera.lookAt(p.x, p.y + 0.8, p.z);
  }

  _toast(msg) {
    if (!this.ui.toast) return;
    this.ui.toast.textContent = msg;
    this.ui.toast.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.ui.toast.classList.add("hidden"), 1100);
  }
}
