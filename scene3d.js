/* ============================================================
   1С-ИжТиСи · 3D-сцена «Цифровой монумент»
   Собственный рендер на Canvas 2D: без библиотек, один rAF-цикл,
   демпфированная орбитальная камера, три источника света,
   туман, частицы, экспорт кадра в PNG.
   ============================================================ */
(function () {
  "use strict";
  const cv = document.getElementById("cv");
  if (!cv || !cv.getContext) return;
  const ctx = cv.getContext("2d");
  const stage = document.getElementById("stage");
  const $ = (id) => document.getElementById(id);
  const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------- палитры сцены ---------- */
  const PALETTES = {
    classic: { bg: [27, 18, 6],  mat: [255, 196, 0],  key: [255, 214, 130], rim: [70, 140, 255], fill: [255, 80, 60],  grid: [255, 196, 0],  sparks: [[255, 196, 0], [90, 150, 255], [255, 90, 70]] },
    neon:    { bg: [8, 10, 26],  mat: [58, 214, 255], key: [255, 80, 220],  rim: [120, 255, 120], fill: [90, 90, 255], grid: [58, 214, 255], sparks: [[58, 214, 255], [255, 80, 220], [120, 255, 120]] },
    emerald: { bg: [6, 19, 12],  mat: [89, 201, 59],  key: [220, 255, 150], rim: [255, 196, 0],  fill: [40, 160, 120], grid: [89, 201, 59],  sparks: [[89, 201, 59], [255, 210, 80], [140, 255, 200]] },
    magma:   { bg: [22, 7, 7],   mat: [255, 106, 61], key: [255, 200, 90],  rim: [255, 60, 60],  fill: [200, 40, 90],  grid: [255, 106, 61], sparks: [[255, 106, 61], [255, 200, 90], [255, 60, 60]] }
  };

  /* ---------- состояние и пульт ---------- */
  const DEF = { pal: "classic", spd: 55, par: 140, glw: 65, dst: 18, ang: 35, pow: 100, aut: !RM, wir: false, grd: true, ql: 1.5 };
  let S = Object.assign({}, DEF);
  const ui = { pal: $("cPal"), spd: $("cSpd"), par: $("cPar"), glw: $("cGlw"), dst: $("cDst"), ang: $("cAng"), pow: $("cPow"), aut: $("cAut"), wir: $("cWir"), grd: $("cGrd"), ql: $("cQl") };
  const outs = { spd: $("oSpd"), par: $("oPar"), glw: $("oGlw"), dst: $("oDst"), ang: $("oAng"), pow: $("oPow") };

  /* ---------- камера ---------- */
  const cam = { yaw: 0.6, pitch: 0.32, dist: 18, tYaw: 0.6, tPitch: 0.32, tDist: 18 };
  let idle = 0;

  /* ---------- геометрия: буквы из объёмных ячеек ---------- */
  const ONE = ["..##.", ".###.", "..##.", "..##.", "..##.", "..##.", ".####"];
  const ES  = [".####", "##..#", "##...", "##...", "##...", "##..#", ".####"];
  const faces = [];   /* статичные грани: {v:[4 точки], n:[нормаль], m:'gold'|'dark'|'emit', e} */
  const CELL = 1, DEPTH = 1.2;

  function box(x0, y0, z0, x1, y1, z1, m, e, skip) {
    skip = skip || {};
    const v = (x, y, z) => [x, y, z];
    const put = (pts, n, em) => faces.push({ v: pts, n, m, e: em || 0 });
    if (!skip.pz) put([v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1)], [0, 0, 1], e);
    if (!skip.nz) put([v(x1, y0, z0), v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0)], [0, 0, -1]);
    if (!skip.px) put([v(x1, y0, z1), v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1)], [1, 0, 0]);
    if (!skip.nx) put([v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0)], [-1, 0, 0]);
    if (!skip.py) put([v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0), v(x0, y1, z0)], [0, 1, 0]);
    if (!skip.ny) put([v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1)], [0, -1, 0]);
  }

  function letter(grid, ox) {
    const filled = (c, r) => r >= 0 && r < grid.length && c >= 0 && c < 5 && grid[r][c] === "#";
    for (let r = 0; r < grid.length; r++)
      for (let c = 0; c < 5; c++) {
        if (!filled(c, r)) continue;
        const x = ox + c * CELL, y = (grid.length - 1 - r) * CELL;
        box(x, y, -DEPTH / 2, x + CELL, y + CELL, DEPTH / 2, "gold", 0.16, {
          px: filled(c + 1, r), nx: filled(c - 1, r),
          py: filled(c, r - 1), ny: filled(c, r + 1)
        });
      }
  }
  letter(ONE, -5.8);
  letter(ES, 0.8);
  /* платформа и светящийся кант */
  box(-7.2, -0.9, -3.6, 7.2, 0, 3.6, "dark");
  box(-7.2, 0, -3.6, 7.2, 0.12, -3.35, "emit");
  box(-7.2, 0, 3.35, 7.2, 0.12, 3.6, "emit");
  box(-7.2, 0, -3.35, -6.95, 0.12, 3.35, "emit");
  box(6.95, 0, -3.35, 7.2, 0.12, 3.35, "emit");

  /* ---------- кубы-спутники («документы») ---------- */
  const SAT_COLORS = [[90, 150, 255], [255, 90, 70], [110, 220, 80], [255, 210, 80]];
  const satTpl = [];
  (function () {
    const h = 0.32;
    const v = (x, y, z) => [x, y, z];
    satTpl.push({ v: [v(-h, -h, h), v(h, -h, h), v(h, h, h), v(-h, h, h)], n: [0, 0, 1] });
    satTpl.push({ v: [v(h, -h, -h), v(-h, -h, -h), v(-h, h, -h), v(h, h, -h)], n: [0, 0, -1] });
    satTpl.push({ v: [v(h, -h, h), v(h, -h, -h), v(h, h, -h), v(h, h, h)], n: [1, 0, 0] });
    satTpl.push({ v: [v(-h, -h, -h), v(-h, -h, h), v(-h, h, h), v(-h, h, -h)], n: [-1, 0, 0] });
    satTpl.push({ v: [v(-h, h, h), v(h, h, h), v(h, h, -h), v(-h, h, -h)], n: [0, 1, 0] });
    satTpl.push({ v: [v(-h, -h, -h), v(h, -h, -h), v(h, -h, h), v(-h, -h, h)], n: [0, -1, 0] });
  })();
  const SATS = [];
  for (let i = 0; i < 8; i++) SATS.push({ r: 8.2 + (i % 3) * 0.5, ph: i * Math.PI / 4, sp: 0.25 + (i % 4) * 0.07, col: SAT_COLORS[i % 4], pos: [0, 0, 0] });

  /* ---------- частицы (пул без пересоздания) ---------- */
  const PARTS = [];
  for (let i = 0; i < 300; i++) PARTS.push({
    x: (Math.random() - 0.5) * 17, y: Math.random() * 11, z: (Math.random() - 0.5) * 10,
    vy: 0.35 + Math.random() * 0.9, s: 1.6 + Math.random() * 3.2, c: Math.floor(Math.random() * 3)
  });

  /* ---------- предрендер спрайтов свечения ---------- */
  function makeGlow(rgb) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.85)`);
    grad.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.28)`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return c;
  }
  let glowMain = makeGlow([255, 196, 0]);
  let glowSparks = [makeGlow([255, 196, 0]), makeGlow([90, 150, 255]), makeGlow([255, 90, 70])];

  /* ---------- размеры и качество ---------- */
  let W = 0, H = 0, FL = 0, CX = 0, CY = 0, vignette = null;
  function resize() {
    const r = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, S.ql);
    W = Math.max(50, r.width); H = Math.max(50, r.height);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    FL = H * 1.15; CX = W / 2; CY = H * 0.58;
    vignette = ctx.createRadialGradient(CX, CY, H * 0.35, CX, CY, H * 0.95);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,.55)");
  }

  /* ---------- математика камеры ---------- */
  let cy_ = 1, sy_ = 0, cp_ = 1, sp_ = 0, camPos = [0, 0, -18];
  function updCam() {
    cy_ = Math.cos(cam.yaw); sy_ = Math.sin(cam.yaw);
    cp_ = Math.cos(cam.pitch); sp_ = Math.sin(cam.pitch);
    /* позиция камеры в мире = обратный поворот вектора (0,0,-dist) */
    const y1 = -cam.dist * sp_, z1 = -cam.dist * cp_;
    camPos = [z1 * sy_, y1, z1 * cy_];
  }
  const proj = [0, 0, 0];
  function project(x, y, z) {
    const x1 = x * cy_ - z * sy_;
    const z1 = x * sy_ + z * cy_;
    const y2 = y * cp_ - z1 * sp_;
    const z2 = y * sp_ + z1 * cp_ + cam.dist;
    proj[0] = CX + (x1 * FL) / z2;
    proj[1] = CY - (y2 * FL) / z2;
    proj[2] = z2;
    return proj;
  }

  /* ---------- освещение и туман ---------- */
  function shade(n, center, m, e, P, kI, rI, kd, fd, zc) {
    let base = m === "gold" ? P.mat : m === "dark" ? [96, 74, 40] : P.key;
    /* контровой свет зависит от взгляда */
    let vx = camPos[0] - center[0], vy = camPos[1] - center[1], vz = camPos[2] - center[2];
    const vl = Math.hypot(vx, vy, vz) || 1;
    const rim = Math.pow(1 - Math.abs((n[0] * vx + n[1] * vy + n[2] * vz) / vl), 2) * rI;
    const amb = m === "emit" ? 0.9 : 0.3;
    let r = base[0] * (amb + kd * kI * 0.9) + P.key[0] * kd * 0.22 + P.fill[0] * fd * 0.16 + P.rim[0] * rim * 0.85 + base[0] * e;
    let g = base[1] * (amb + kd * kI * 0.9) + P.key[1] * kd * 0.22 + P.fill[1] * fd * 0.16 + P.rim[1] * rim * 0.85 + base[1] * e;
    let b = base[2] * (amb + kd * kI * 0.9) + P.key[2] * kd * 0.22 + P.fill[2] * fd * 0.16 + P.rim[2] * rim * 0.85 + base[2] * e;
    const fog = clamp((zc - cam.dist + 7) / 30, 0, 0.72);
    r = r + (P.bg[0] - r) * fog; g = g + (P.bg[1] - g) * fog; b = b + (P.bg[2] - b) * fog;
    return `rgb(${clamp(r, 0, 255) | 0},${clamp(g, 0, 255) | 0},${clamp(b, 0, 255) | 0})`;
  }

  /* ---------- главный цикл ---------- */
  const drawList = [];
  let last = performance.now(), frames = 0, fpsT = 0, visible = true, T = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    if (!visible) return;
    T += dt;

    /* демпфирование камеры */
    idle += dt;
    if (S.aut && idle > 1.6) {
      cam.tYaw += dt * (S.spd / 100) * 0.55;
      cam.tPitch += Math.sin(T * 0.4) * 0.0004;
    }
    cam.yaw += (cam.tYaw - cam.yaw) * 0.09;
    cam.pitch += (cam.tPitch - cam.pitch) * 0.09;
    cam.dist += (cam.tDist - cam.dist) * 0.1;
    updCam();

    const P = PALETTES[S.pal];
    const kI = S.pow / 100, rI = (S.pow / 100) * 0.9;
    const aRad = (S.ang * Math.PI) / 180;
    const L = [Math.cos(aRad), 0.62, Math.sin(aRad)];
    const Ll = Math.hypot(L[0], L[1], L[2]);
    L[0] /= Ll; L[1] /= Ll; L[2] /= Ll;
    const F = [-0.6, 0.25, -0.55];

    /* фон */
    ctx.fillStyle = `rgb(${P.bg[0]},${P.bg[1]},${P.bg[2]})`;
    ctx.fillRect(0, 0, W, H);

    /* ореол за монументом */
    const gp = project(0, 3.5, 0);
    if (gp[2] > 0.6 && S.glw > 0) {
      const gs = (FL / gp[2]) * 13 * (0.5 + S.glw / 100);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = S.glw / 130;
      ctx.drawImage(glowMain, gp[0] - gs / 2, gp[1] - gs / 2, gs, gs);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    /* сетка пола */
    if (S.grd) {
      ctx.lineWidth = 1;
      for (let i = -12; i <= 12; i += 2) {
        const segs = [[i, -0.92, -12, i, -0.92, 12], [-12, -0.92, i, 12, -0.92, i]];
        for (const s of segs) {
          const a = project(s[0], s[1], s[2]).slice();
          const b = project(s[3], s[4], s[5]).slice();
          if (a[2] < 0.6 || b[2] < 0.6) continue;
          const al = clamp(1 - ((a[2] + b[2]) / 2 - cam.dist + 10) / 34, 0.04, 0.3);
          ctx.strokeStyle = `rgba(${P.grid[0]},${P.grid[1]},${P.grid[2]},${al})`;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
    }

    /* орбитальное кольцо: дальняя половина — до граней */
    const ringPts = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const p = project(Math.cos(a) * 9.4, 0.4, Math.sin(a) * 9.4);
      ringPts.push(p.slice());
    }
    const drawRing = (far) => {
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = `rgba(${P.grid[0]},${P.grid[1]},${P.grid[2]},${far ? 0.16 : 0.4})`;
      ctx.beginPath();
      let pen = false;
      for (const p of ringPts) {
        const isFar = p[2] > cam.dist;
        if (p[2] < 0.6 || isFar !== far) { pen = false; continue; }
        if (!pen) { ctx.moveTo(p[0], p[1]); pen = true; } else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    };
    drawRing(true);

    /* сбор граней: монумент */
    drawList.length = 0;
    const pushFace = (verts, n, m, e) => {
      const cxw = (verts[0][0] + verts[2][0]) / 2,
            cyw = (verts[0][1] + verts[2][1]) / 2,
            czw = (verts[0][2] + verts[2][2]) / 2;
      /* отсечение невидимых граней */
      if (n[0] * (camPos[0] - cxw) + n[1] * (camPos[1] - cyw) + n[2] * (camPos[2] - czw) <= 0) return;
      const pts = []; let zsum = 0;
      for (const v of verts) {
        const p = project(v[0], v[1], v[2]);
        if (p[2] < 0.6) return;
        pts.push(p[0], p[1]); zsum += p[2];
      }
      const zc = zsum / 4;
      const kd = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      const fd = Math.max(0, n[0] * F[0] + n[1] * F[1] + n[2] * F[2]);
      drawList.push({ pts, z: zc, col: shade(n, [cxw, cyw, czw], m, e, P, kI, rI, kd, fd, zc), m });
    };
    for (const f of faces) pushFace(f.v, f.n, f.m, f.e);

    /* спутники */
    for (const s of SATS) {
      const a = s.ph + T * s.sp;
      const px = Math.cos(a) * s.r, pz = Math.sin(a) * s.r,
            py = 2.4 + Math.sin(T * 0.7 + s.ph * 3) * 1.5;
      s.pos = [px, py, pz];
      const spin = T * (0.8 + s.sp), cs = Math.cos(spin), ss = Math.sin(spin);
      const rot = (v) => [v[0] * cs - v[2] * ss, v[1], v[0] * ss + v[2] * cs];
      for (const f of satTpl) {
        const wv = f.v.map((v) => { const r = rot(v); return [r[0] + px, r[1] + py, r[2] + pz]; });
        const wn = rot(f.n);
        const cxw = (wv[0][0] + wv[2][0]) / 2, cyw = (wv[0][1] + wv[2][1]) / 2, czw = (wv[0][2] + wv[2][2]) / 2;
        if (wn[0] * (camPos[0] - cxw) + wn[1] * (camPos[1] - cyw) + wn[2] * (camPos[2] - czw) <= 0) continue;
        const pts = []; let zsum = 0, ok = true;
        for (const v of wv) {
          const p = project(v[0], v[1], v[2]);
          if (p[2] < 0.6) { ok = false; break; }
          pts.push(p[0], p[1]); zsum += p[2];
        }
        if (!ok) continue;
        const zc = zsum / 4;
        const kd = Math.max(0, wn[0] * L[0] + wn[1] * L[1] + wn[2] * L[2]);
        drawList.push({ pts, z: zc, col: `rgb(${Math.min(255, s.col[0] * (0.55 + kd * 0.6)) | 0},${Math.min(255, s.col[1] * (0.55 + kd * 0.6)) | 0},${Math.min(255, s.col[2] * (0.55 + kd * 0.6)) | 0})`, sat: s.col });
      }
    }

    /* сортировка художника и отрисовка */
    drawList.sort((a, b) => b.z - a.z);
    for (const f of drawList) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0], f.pts[1]);
      for (let i = 2; i < f.pts.length; i += 2) ctx.lineTo(f.pts[i], f.pts[i + 1]);
      ctx.closePath();
      if (S.wir) {
        ctx.fillStyle = `rgba(${P.bg[0]},${P.bg[1]},${P.bg[2]},.85)`;
        ctx.fill();
        ctx.strokeStyle = f.col;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      } else {
        ctx.fillStyle = f.col;
        ctx.fill();
        /* тонкий шов того же цвета скрывает щели между полигонами */
        ctx.strokeStyle = f.col;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }
    drawRing(false);

    /* частицы + свечение спутников (аддитивно) */
    ctx.globalCompositeOperation = "lighter";
    const nPar = S.par | 0;
    for (let i = 0; i < nPar; i++) {
      const p = PARTS[i];
      p.y += p.vy * dt;
      if (p.y > 11.5) { p.y = 0; p.x = (Math.random() - 0.5) * 17; p.z = (Math.random() - 0.5) * 10; }
      const pr = project(p.x, p.y, p.z);
      if (pr[2] < 0.6) continue;
      const size = (p.s * FL) / pr[2] / 22;
      ctx.globalAlpha = clamp(0.55 - (pr[2] - cam.dist) / 40, 0.08, 0.6) * (0.4 + S.glw / 140);
      ctx.drawImage(glowSparks[p.c], pr[0] - size, pr[1] - size, size * 2, size * 2);
    }
    for (const s of SATS) {
      const pr = project(s.pos[0], s.pos[1], s.pos[2]);
      if (pr[2] < 0.6) continue;
      const gs = (FL / pr[2]) * 1.5 * (0.4 + S.glw / 100);
      const spr = glowSparks[SATS.indexOf(s) % 3];
      ctx.globalAlpha = 0.35;
      ctx.drawImage(spr, pr[0] - gs / 2, pr[1] - gs / 2, gs, gs);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    /* виньетка — кинематографичная рамка */
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    /* счётчики */
    frames++; fpsT += dt;
    if (fpsT >= 0.5) {
      $("stFps").textContent = Math.round(frames / fpsT);
      $("stPar").textContent = nPar;
      $("stCam").textContent = cam.dist.toFixed(1);
      frames = 0; fpsT = 0;
    }
  }

  /* ---------- управление мышью / пальцами ---------- */
  const pointers = new Map();
  let pinchD = 0, pinchStart = 18;
  const hint = $("hint");
  cv.addEventListener("pointerdown", (e) => {
    cv.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      pinchD = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      pinchStart = cam.tDist;
    }
    idle = 0;
    if (hint) hint.classList.add("off");
  });
  cv.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    idle = 0;
    if (pointers.size === 1) {
      cam.tYaw += dx * 0.006;
      cam.tPitch = clamp(cam.tPitch + dy * 0.005, -0.1, 1.2);
    } else if (pointers.size === 2) {
      const p = Array.from(pointers.values());
      const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1;
      cam.tDist = clamp((pinchStart * pinchD) / d, 10, 38);
      ui.dst.value = cam.tDist.toFixed(1);
      outs.dst.textContent = (+ui.dst.value).toFixed(1);
    }
  });
  const up = (e) => pointers.delete(e.pointerId);
  cv.addEventListener("pointerup", up);
  cv.addEventListener("pointercancel", up);
  cv.addEventListener("wheel", (e) => {
    e.preventDefault();
    cam.tDist = clamp(cam.tDist * (1 + e.deltaY * 0.0011), 10, 38);
    ui.dst.value = cam.tDist.toFixed(1);
    outs.dst.textContent = (+ui.dst.value).toFixed(1);
    idle = 0;
    if (hint) hint.classList.add("off");
  }, { passive: false });

  /* ---------- пульт: чтение, запись, синхронизация ---------- */
  function applyPalette() {
    const P = PALETTES[S.pal];
    stage.style.background = `rgb(${P.bg[0]},${P.bg[1]},${P.bg[2]})`;
    glowMain = makeGlow(P.key);
    glowSparks = P.sparks.map(makeGlow);
  }
  function readUI() {
    S.pal = ui.pal.value;
    S.spd = +ui.spd.value; S.par = +ui.par.value; S.glw = +ui.glw.value;
    S.dst = +ui.dst.value; S.ang = +ui.ang.value; S.pow = +ui.pow.value;
    S.aut = ui.aut.checked; S.wir = ui.wir.checked; S.grd = ui.grd.checked;
    S.ql = +ui.ql.value;
    cam.tDist = S.dst;
    outs.spd.textContent = S.spd; outs.par.textContent = S.par;
    outs.glw.textContent = S.glw; outs.dst.textContent = S.dst.toFixed(1);
    outs.ang.textContent = S.ang + "°"; outs.pow.textContent = S.pow + "%";
  }
  function syncUI() {
    ui.pal.value = S.pal; ui.spd.value = S.spd; ui.par.value = S.par;
    ui.glw.value = S.glw; ui.dst.value = S.dst; ui.ang.value = S.ang;
    ui.pow.value = S.pow; ui.aut.checked = S.aut; ui.wir.checked = S.wir;
    ui.grd.checked = S.grd; ui.ql.value = String(S.ql);
    readUI();
  }
  Object.values(ui).forEach((el) => {
    el.addEventListener("input", () => {
      const palChanged = ui.pal.value !== S.pal;
      const qlChanged = +ui.ql.value !== S.ql;
      readUI();
      if (palChanged) applyPalette();
      if (qlChanged) resize();
      idle = 0;
    });
  });
  $("cRst").addEventListener("click", () => {
    S = Object.assign({}, DEF);
    cam.tYaw = 0.6; cam.tPitch = 0.32;
    syncUI(); applyPalette(); resize();
    if (window.showToast) showToast("Настройки сцены сброшены ↺");
  });
  $("cRnd").addEventListener("click", () => {
    const keys = Object.keys(PALETTES);
    S.pal = keys[Math.floor(Math.random() * keys.length)];
    S.spd = 20 + Math.floor(Math.random() * 160);
    S.par = 40 + Math.floor(Math.random() * 260);
    S.glw = 25 + Math.floor(Math.random() * 75);
    S.ang = Math.floor(Math.random() * 360);
    S.pow = 60 + Math.floor(Math.random() * 100);
    cam.tYaw = Math.random() * Math.PI * 2;
    cam.tPitch = 0.1 + Math.random() * 0.8;
    syncUI(); applyPalette();
    if (window.showToast) showToast("Случайная сцена готова 🎲");
  });
  $("cExp").addEventListener("click", () => {
    try {
      const a = document.createElement("a");
      a.href = cv.toDataURL("image/png");
      a.download = "1c-izhtisi-3d-kadr.png";
      document.body.appendChild(a); a.click(); a.remove();
      if (window.showToast) showToast("Кадр сцены сохранён в PNG ✓");
    } catch (_) {
      if (window.showToast) showToast("Браузер не дал сохранить кадр");
    }
  });

  /* ---------- видимость и запуск ---------- */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((ents) => { visible = ents[0].isIntersecting; }, { threshold: 0.02 }).observe(stage);
  }
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(stage);
  addEventListener("resize", resize);

  $("stPoly").textContent = faces.length + SATS.length * 6;
  syncUI();
  applyPalette();
  resize();
  requestAnimationFrame(loop);
})();