const WIDTH = 640;
const HEIGHT = 360;
const SHIP_Y = 323;
const BEST_KEY = "razer-defense-best";

const keyboard = new Map([
  ["ArrowLeft", "left"], ["KeyA", "left"],
  ["ArrowRight", "right"], ["KeyD", "right"],
  ["Space", "fire"]
]);

export function mountRazerDefense(root) {
  const canvas = root.querySelector("canvas");
  const ctx = canvas.getContext("2d");
  const overlay = root.querySelector(".defense-overlay");
  const heading = overlay.querySelector("h3");
  const message = overlay.querySelector("p");
  const action = overlay.querySelector("button");
  const pauseButton = root.querySelector("[data-pause]");
  const scoreLabel = root.querySelector("[data-score]");
  const bestLabel = root.querySelector("[data-best]");
  const waveLabel = root.querySelector("[data-wave]");
  const livesLabel = root.querySelector("[data-lives]");
  const status = root.querySelector("[role=status]");
  const events = new AbortController();
  const listen = (element, type, handler) =>
    element.addEventListener(type, handler, { signal: events.signal });
  const keys = new Set();
  const pointers = new Map();
  let best = 0;
  try {
    best = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0);
  } catch {
    // The game also runs when browser storage is unavailable.
  }

  let mode = "ready";
  let score = 0;
  let lives = 3;
  let wave = 1;
  let shipX = WIDTH / 2;
  let cooldown = 0;
  let invulnerable = 0;
  let spawnClock = 0;
  let spawned = 0;
  let nextWave = 0;
  let drones = [];
  let shots = [];
  let sparks = [];
  let frame = 0;
  let lastTime = 0;
  let sceneTime = 0;

  function updateHud() {
    scoreLabel.textContent = score;
    bestLabel.textContent = best;
    waveLabel.textContent = wave;
    livesLabel.textContent = lives;
  }

  function showOverlay(title, detail, label, focus = false) {
    heading.textContent = title;
    message.textContent = detail;
    action.textContent = label;
    overlay.hidden = false;
    pauseButton.disabled = true;
    if (focus) action.focus({ preventScroll: true });
  }

  function beginWave() {
    spawned = 0;
    spawnClock = 0.35;
    nextWave = 0;
    updateHud();
    status.textContent = `Oleada ${wave}`;
  }

  function run() {
    mode = "playing";
    overlay.hidden = true;
    pauseButton.disabled = false;
    canvas.focus({ preventScroll: true });
    lastTime = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (mode === "paused") {
      run();
      return;
    }
    score = 0;
    lives = 3;
    wave = 1;
    shipX = WIDTH / 2;
    cooldown = 0;
    invulnerable = 0;
    drones = [];
    shots = [];
    sparks = [];
    beginWave();
    draw();
    run();
  }

  function stop() {
    cancelAnimationFrame(frame);
    keys.clear();
    pointers.clear();
  }

  function pause(focus = false) {
    if (mode !== "playing") return;
    mode = "paused";
    stop();
    showOverlay("En pausa", "Continúa cuando estés listo.", "Continuar", focus);
  }

  function takeHit() {
    if (invulnerable > 0) return;
    lives--;
    invulnerable = 1;
    burst(shipX, SHIP_Y, "#ffae70");
    updateHud();
    if (lives > 0) {
      status.textContent = `Vidas restantes: ${lives}`;
      return;
    }
    mode = "over";
    stop();
    showOverlay("Fin de la partida", `Puntos: ${score} · Oleada: ${wave}`, "Jugar de nuevo", true);
  }

  function burst(x, y, color) {
    for (let i = 0; i < 9; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 65;
      sparks.push({ x, y, color, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.45 });
    }
  }

  function isHeld(control) {
    return [...keys].some(key => keyboard.get(key) === control)
      || [...pointers.values()].includes(control);
  }

  function shoot() {
    if (cooldown > 0) return;
    shots.push({ x: shipX, y: SHIP_Y - 15, previousY: SHIP_Y - 15 });
    cooldown = 0.16;
  }

  function update(dt) {
    sceneTime += dt;
    cooldown = Math.max(0, cooldown - dt);
    invulnerable = Math.max(0, invulnerable - dt);
    const direction = Number(isHeld("right")) - Number(isHeld("left"));
    shipX = Math.max(19, Math.min(WIDTH - 19, shipX + direction * 310 * dt));
    if (isHeld("fire")) shoot();

    const waveSize = Math.min(20, 5 + wave * 2);
    if (spawned < waveSize) {
      spawnClock -= dt;
      if (spawnClock <= 0) {
        const lane = spawned % 7;
        const anchor = 65 + ((lane * 3 + wave + 3) % 7) * 85;
        const armored = wave > 1 && spawned % 5 === 4;
        drones.push({ anchor, x: anchor, y: -20, age: 0, hp: armored ? 2 : 1, armored });
        spawned++;
        spawnClock = Math.max(0.36, 0.83 - wave * 0.045);
      }
    }

    for (const shot of shots) {
      shot.previousY = shot.y;
      shot.y -= 500 * dt;
    }
    for (const drone of drones) {
      drone.age += dt;
      drone.x = drone.anchor + Math.sin(drone.age * 2.4 + drone.anchor) * 21;
      drone.y += Math.min(127, 40 + wave * 8) * dt;
      for (const shot of shots) {
        if (shot.hit || drone.hp === 0) continue;
        if (Math.abs(drone.x - shot.x) > 17 || shot.y > drone.y + 12 || shot.previousY < drone.y - 12) continue;
        shot.hit = true;
        drone.hp--;
        burst(drone.x, drone.y, drone.armored ? "#ffae70" : "#5ffeaf");
        if (drone.hp === 0) {
          score += drone.armored ? 200 : 100;
          if (score > best) {
            best = score;
            try {
              localStorage.setItem(BEST_KEY, String(best));
            } catch {
              // The current session still keeps the record.
            }
          }
          updateHud();
        }
      }
      if (drone.hp > 0 && (drone.y > HEIGHT - 8 || (
        Math.abs(drone.y - SHIP_Y) < 17 && Math.abs(drone.x - shipX) < 27
      ))) {
        drone.hp = 0;
        takeHit();
        if (mode !== "playing") break;
      }
    }
    shots = shots.filter(shot => !shot.hit && shot.y > -10);
    drones = drones.filter(drone => drone.hp > 0);
    for (const spark of sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.life -= dt;
    }
    sparks = sparks.filter(spark => spark.life > 0);

    if (mode === "playing" && spawned === waveSize && drones.length === 0) {
      nextWave += dt;
      if (nextWave >= 1.15) {
        wave++;
        beginWave();
      }
    }
  }

  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#a7efbd";
    for (let i = 0; i < 46; i++) {
      ctx.globalAlpha = 0.2 + (i % 5) * 0.1;
      ctx.fillRect((i * 173 + 37) % WIDTH, (i * 91 + sceneTime * (8 + i % 4)) % HEIGHT, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#275839";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(14, HEIGHT - 8);
    ctx.lineTo(WIDTH - 14, HEIGHT - 8);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const drone of drones) {
      ctx.save();
      ctx.translate(drone.x, drone.y);
      polygon([[-17, 2], [-12, -8], [0, -13], [12, -8], [17, 2], [10, 9], [-10, 9]], drone.armored ? "#ff9a54" : "#45dda4");
      polygon([[-10, 0], [0, -6], [10, 0], [0, 5]], "#123023");
      ctx.fillStyle = drone.hp === 2 ? "#ffe5bb" : "#e1fff1";
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    ctx.fillStyle = "#b5ff8d";
    for (const shot of shots) ctx.fillRect(shot.x - 1.5, shot.y - 7, 3, 13);

    if (invulnerable === 0 || Math.floor(invulnerable * 12) % 2 === 0) {
      ctx.save();
      ctx.translate(shipX, SHIP_Y);
      polygon([[-7, 9], [0, 18 + Math.sin(sceneTime * 38) * 3], [7, 9]], "#65fa28");
      polygon([[-19, 10], [-13, -4], [-6, 0], [0, -16], [6, 0], [13, -4], [19, 10], [0, 7]], "#51e322");
      polygon([[-5, 5], [0, -7], [5, 5]], "#d8ffc4");
      ctx.restore();
    }
    for (const spark of sparks) {
      ctx.globalAlpha = spark.life / 0.45;
      ctx.fillStyle = spark.color;
      ctx.fillRect(spark.x, spark.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    if (nextWave > 0.1) {
      ctx.fillStyle = "#c4ffb0";
      ctx.font = "bold 26px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`Oleada ${wave} superada`, WIDTH / 2, HEIGHT / 2);
    }
  }

  function tick(time) {
    if (mode !== "playing") return;
    update(Math.min(0.04, (time - lastTime) / 1000));
    lastTime = time;
    draw();
    if (mode === "playing") frame = requestAnimationFrame(tick);
  }

  listen(action, "click", start);
  listen(pauseButton, "click", () => pause(true));
  listen(root, "keydown", event => {
    if (mode !== "playing") return;
    if (event.code === "Escape") {
      event.preventDefault();
      pause(true);
    } else if (event.target === canvas && keyboard.has(event.code)) {
      event.preventDefault();
      keys.add(event.code);
      if (event.code === "Space") shoot();
    }
  });
  listen(window, "keyup", event => keys.delete(event.code));
  listen(window, "blur", () => pause());
  listen(document, "visibilitychange", () => {
    if (document.hidden) pause();
  });
  listen(root, "focusout", event => {
    if (!root.contains(event.relatedTarget)) pause();
  });
  for (const button of root.querySelectorAll("[data-control]")) {
    listen(button, "pointerdown", event => {
      if (mode !== "playing" || event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, button.dataset.control);
      if (button.dataset.control === "fire") shoot();
    });
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
      listen(button, type, event => pointers.delete(event.pointerId));
    }
  }

  updateHud();
  draw();
  return () => {
    stop();
    events.abort();
  };
}
