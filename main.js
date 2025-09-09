/*
  Flappy Bird — Luxe Edition
  High-DPI Canvas, parallax, gradients, particles, glow, shake.
*/

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const overlay = document.getElementById('overlay');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const btnStart = document.getElementById('btn-start');
  const btnPause = document.getElementById('btn-pause');
  const btnResume = document.getElementById('btn-resume');
  const btnRestart = document.getElementById('btn-restart');
  const colorSwatches = () => Array.from(document.querySelectorAll('.swatch'));

  const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let viewportWidth = 0;
  let viewportHeight = 0;

  function resizeCanvas() {
    viewportWidth = Math.max(360, window.innerWidth);
    viewportHeight = Math.max(600, window.innerHeight);
    canvas.width = Math.floor(viewportWidth * DPR);
    canvas.height = Math.floor(viewportHeight * DPR);
    canvas.style.width = viewportWidth + 'px';
    canvas.style.height = viewportHeight + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;

  class Shake {
    constructor() {
      this.magnitude = 0;
      this.decay = 0.92;
      this.offsetX = 0;
      this.offsetY = 0;
    }
    trigger(amount) {
      this.magnitude = Math.max(this.magnitude, amount);
    }
    update(dt) {
      if (this.magnitude < 0.02) { this.magnitude = 0; this.offsetX = 0; this.offsetY = 0; return; }
      this.offsetX = (Math.random() * 2 - 1) * this.magnitude * 8;
      this.offsetY = (Math.random() * 2 - 1) * this.magnitude * 8;
      this.magnitude *= Math.pow(this.decay, dt * 60);
    }
  }

  class Background {
    constructor() {
      this.t = 0;
      this.clouds = Array.from({ length: 8 }, () => ({
        x: rand(-200, viewportWidth + 200),
        y: rand(40, viewportHeight * 0.5),
        r: rand(20, 60),
        s: rand(0.06, 0.18)
      }));
      this.mountains = [
        { h: 160, speed: 12, color: '#0f1a3a' },
        { h: 120, speed: 20, color: '#132050' },
        { h: 90,  speed: 30, color: '#172966' }
      ];
      // day-night cycle
      this.cycleTime = 0; // seconds
      this.cycleLength = 60; // seconds for full cycle day->night->day
      this.stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * viewportWidth,
        y: Math.random() * (viewportHeight * 0.6),
        a: Math.random() * 0.6 + 0.2,
        r: Math.random() * 1.6 + 0.4
      }));
    }
    update(dt, speed) {
      this.t += dt;
      this.cycleTime = (this.cycleTime + dt) % this.cycleLength;
      const wind = speed * 0.25 + 18;
      for (const c of this.clouds) {
        c.x -= c.s * wind * dt * 60;
        if (c.x < -260) {
          c.x = viewportWidth + rand(20, 120);
          c.y = rand(40, viewportHeight * 0.5);
          c.r = rand(20, 60);
        }
      }
    }
    draw(ctx) {
      // Day-Night sky
      const phase = (this.cycleTime / this.cycleLength) * TAU; // 0..2pi
      const dayFactor = Math.max(0, Math.cos(phase)); // 1 day, -1 night
      const nightFactor = 1 - (dayFactor + 1) / 2; // 0 day, 1 night
      const dayTop = '#7cc6ff';
      const dayBottom = '#e7f4ff';
      const nightTop = '#0f1740';
      const nightBottom = '#070b1f';
      const sky = ctx.createLinearGradient(0, 0, 0, viewportHeight);
      const mix = (c1, c2, t) => {
        const p = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
        const [r1,g1,b1] = p(c1); const [r2,g2,b2] = p(c2);
        const r = Math.round(lerp(r2, r1, (dayFactor+1)/2));
        const g = Math.round(lerp(g2, g1, (dayFactor+1)/2));
        const b = Math.round(lerp(b2, b1, (dayFactor+1)/2));
        return `rgb(${r},${g},${b})`;
      };
      sky.addColorStop(0, mix(dayTop, nightTop, dayFactor));
      sky.addColorStop(1, mix(dayBottom, nightBottom, dayFactor));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, viewportWidth, viewportHeight);

      // Sun and Moon positions (opposite arcs)
      const arcY = viewportHeight * 0.22;
      const sunX = viewportWidth * (0.2 + 0.6 * ((Math.cos(phase) + 1) / 2));
      const moonX = viewportWidth * (0.2 + 0.6 * ((Math.cos(phase + Math.PI) + 1) / 2));
      // Sun
      const sunGlow = ctx.createRadialGradient(sunX, arcY, 0, sunX, arcY, 160);
      sunGlow.addColorStop(0, `rgba(255, 242, 175, ${0.8 * (dayFactor+1)/2})`);
      sunGlow.addColorStop(0.4, `rgba(255, 200, 100, ${0.3 * (dayFactor+1)/2})`);
      sunGlow.addColorStop(1, 'rgba(255, 160, 80, 0)');
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, arcY, 160, 0, TAU);
      ctx.fill();
      // Moon
      const moonGlow = ctx.createRadialGradient(moonX, arcY, 0, moonX, arcY, 120);
      moonGlow.addColorStop(0, `rgba(200, 220, 255, ${0.7 * nightFactor})`);
      moonGlow.addColorStop(0.5, `rgba(160, 180, 220, ${0.25 * nightFactor})`);
      moonGlow.addColorStop(1, 'rgba(160, 180, 220, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(moonX, arcY, 120, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Stars (visible at night)
      if (nightFactor > 0.05) {
        ctx.save();
        ctx.globalAlpha = nightFactor;
        ctx.fillStyle = '#ffffff';
        for (const s of this.stars) {
          ctx.globalAlpha = nightFactor * (0.6 + Math.sin((this.t + s.x) * 0.3) * 0.2);
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      // Clouds
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = '#cfe7ff';
      for (const c of this.clouds) {
        drawCloud(ctx, c.x, c.y, c.r);
      }
      ctx.restore();

      // Mountains parallax layers
      for (let i = 0; i < this.mountains.length; i++) {
        const layer = this.mountains[i];
        ctx.fillStyle = layer.color;
        const baseY = viewportHeight - 140 - i * 22;
        ctx.beginPath();
        const peaks = 6 + i;
        for (let p = -1; p <= peaks; p++) {
          const x = (p / peaks) * viewportWidth;
          const y = baseY - Math.abs(Math.sin((p + i) * 1.3)) * layer.h;
          if (p === -1) ctx.moveTo(x, viewportHeight);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(viewportWidth, viewportHeight);
        ctx.closePath();
        ctx.fill();
      }

      // Ground
      const groundGrad = ctx.createLinearGradient(0, viewportHeight - 120, 0, viewportHeight);
      groundGrad.addColorStop(0, '#203a28');
      groundGrad.addColorStop(1, '#0f1f17');
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, viewportHeight - 120, viewportWidth, 120);
    }
  }

  function drawCloud(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.arc(x + r * 0.8, y + r * 0.2, r * 0.9, 0, TAU);
    ctx.arc(x - r * 0.7, y + r * 0.25, r * 0.75, 0, TAU);
    ctx.arc(x + r * 0.1, y + r * 0.35, r * 0.65, 0, TAU);
    ctx.closePath();
    ctx.fill();
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
    }
    emitFeathers(x, y, count) {
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x, y,
          vx: rand(-60, 60),
          vy: rand(-140, -20),
          life: rand(0.4, 0.9),
          age: 0,
          r: rand(1.5, 3.2),
          color: `hsla(${rand(45, 60)}, 90%, ${rand(70, 90)}%, 1)`
        });
      }
    }
    emitSpark(x, y, color) {
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x, y,
          vx: rand(-100, 100),
          vy: rand(-60, -10),
          life: rand(0.25, 0.5),
          age: 0,
          r: rand(1.2, 2.4),
          color
        });
      }
    }
    explode(x, y) {
      for (let i = 0; i < 40; i++) {
        this.particles.push({
          x, y,
          vx: rand(-180, 180),
          vy: rand(-220, 60),
          life: rand(0.6, 1.1),
          age: 0,
          r: rand(1.5, 3.5),
          color: `hsla(${rand(0, 60)}, 90%, ${rand(55, 80)}%, 1)`
        });
      }
    }
    update(dt) {
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.age += dt;
        if (p.age >= p.life) { this.particles.splice(i, 1); continue; }
        p.vy += 300 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const p of this.particles) {
        const alpha = 1 - p.age / p.life;
        ctx.fillStyle = p.color.replace(', 1)', `, ${alpha})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class Bird {
    constructor(x, y, theme) {
      this.x = x;
      this.y = y;
      this.vx = 0;
      this.vy = 0;
      this.rotation = 0;
      this.radius = 22; // chubbier hit circle
      this.alive = true;
      this.trail = [];
      this.trailEvery = 0.02;
      this.trailAcc = 0;
      // wing animation
      this.wingFlapTime = 0; // seconds remaining of strong flap
      this.wingIdlePhase = 0;
      this.theme = theme || 'red';
    }
    flap(particles) {
      if (!this.alive) return;
      this.vy = -280;
      particles.emitFeathers(this.x - 10, this.y + 8, 10);
      this.wingFlapTime = 0.25; // trigger wing animation burst
    }
    update(dt) {
      if (!this.alive) return;
      this.vy += 900 * dt;
      this.y += this.vy * dt;
      this.x += this.vx * dt;
      this.rotation = clamp(lerp(this.rotation, Math.atan2(this.vy, 240), dt * 8), -1.0, 1.0);

      this.trailAcc += dt;
      if (this.trailAcc >= this.trailEvery) {
        this.trailAcc = 0;
        this.trail.push({ x: this.x, y: this.y, r: this.radius * 0.85, alpha: 0.22 });
        if (this.trail.length > 12) this.trail.shift();
      }
      for (const t of this.trail) { t.alpha *= 0.92; t.r *= 0.985; }

      // wing timers
      if (this.wingFlapTime > 0) this.wingFlapTime = Math.max(0, this.wingFlapTime - dt);
      this.wingIdlePhase += dt * 6;
    }
    draw(ctx) {
      // trail
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (const t of this.trail) {
        ctx.fillStyle = `rgba(123,220,255,${t.alpha})`;
        ctx.beginPath();
        ctx.arc(t.x - 10, t.y + 6, t.r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // body with gradient & shine (chubbier, rounder)
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      const colors = themeColors[this.theme];
      const bodyGrad = ctx.createLinearGradient(-26, -26, 30, 30);
      bodyGrad.addColorStop(0, colors.bodyStart);
      bodyGrad.addColorStop(1, colors.bodyEnd);
      ctx.fillStyle = bodyGrad;
      roundedRect(ctx, -26, -20, 52, 40, 20);
      ctx.fill();

      // wings (two small wings that flap on tap)
      const wingGrad = ctx.createLinearGradient(-12, -10, 12, 10);
      wingGrad.addColorStop(0, colors.wingStart);
      wingGrad.addColorStop(1, colors.wingEnd);
      ctx.fillStyle = wingGrad;
      const flapAmp = this.wingFlapTime > 0 ? 0.9 : 0.25;
      const flapSpeed = this.wingFlapTime > 0 ? 26 : 8;
      const phase = this.wingFlapTime > 0 ? (1 - this.wingFlapTime / 0.25) : this.wingIdlePhase;
      const wingAngle = Math.sin(phase * flapSpeed) * flapAmp;
      // left wing
      ctx.save();
      ctx.translate(-8, 0);
      ctx.rotate(-0.6 + wingAngle * 0.5);
      roundedRect(ctx, -10, -6, 16, 12, 6);
      ctx.fill();
      ctx.restore();
      // right wing
      ctx.save();
      ctx.translate(-2, 2);
      ctx.rotate(-0.2 + wingAngle * 0.4);
      roundedRect(ctx, -8, -5, 14, 10, 5);
      ctx.fill();
      ctx.restore();

      // beak
      ctx.fillStyle = '#ff8a3d';
      ctx.beginPath();
      ctx.moveTo(24, -5);
      ctx.lineTo(38, 0);
      ctx.lineTo(24, 5);
      ctx.closePath();
      ctx.fill();

      // eye
      ctx.fillStyle = colors.eyeWhite;
      ctx.beginPath();
      ctx.arc(8, -8, 7, 0, TAU);
      ctx.fill();
      ctx.fillStyle = colors.pupil;
      ctx.beginPath();
      ctx.arc(10, -8, 3.2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    getBounds() {
      return { x: this.x, y: this.y, r: this.radius };
    }
  }

  const themeColors = {
    red: {
      bodyStart: '#ffb07a', bodyEnd: '#ff6a42', wingStart: '#ffd1b0', wingEnd: '#ff9a6b', eyeWhite: '#ffffff', pupil: '#111111'
    },
    white: {
      bodyStart: '#ffffff', bodyEnd: '#e9eef5', wingStart: '#ffffff', wingEnd: '#dfe6f0', eyeWhite: '#ffffff', pupil: '#111111'
    },
    black: {
      bodyStart: '#3b3b3b', bodyEnd: '#0f0f0f', wingStart: '#4a4a4a', wingEnd: '#1a1a1a', eyeWhite: '#e9eef5', pupil: '#000000'
    },
    purple: {
      bodyStart: '#c1a2ff', bodyEnd: '#7a50ff', wingStart: '#e0d4ff', wingEnd: '#a385ff', eyeWhite: '#ffffff', pupil: '#111111'
    },
    pink: {
      bodyStart: '#ffb1df', bodyEnd: '#ff5bb5', wingStart: '#ffd1ec', wingEnd: '#ff93cd', eyeWhite: '#ffffff', pupil: '#111111'
    }
  };

  function roundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  class Pipe {
    constructor(x, gapY, gapH, speed) {
      this.x = x;
      this.gapY = gapY;
      this.gapH = gapH;
      this.width = 70;
      this.speed = speed;
      this.passed = false;
    }
    update(dt) {
      this.x -= this.speed * dt;
    }
    offscreen() { return this.x + this.width < -20; }
    draw(ctx) {
      const topH = this.gapY - this.gapH * 0.5;
      const botY = this.gapY + this.gapH * 0.5;
      const gradTop = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
      gradTop.addColorStop(0, '#6adf92');
      gradTop.addColorStop(1, '#3fba6c');
      const gradBot = ctx.createLinearGradient(this.x, 0, this.x + this.width, 0);
      gradBot.addColorStop(0, '#6adf92');
      gradBot.addColorStop(1, '#3fba6c');
      ctx.fillStyle = gradTop;
      ctx.fillRect(this.x, 0, this.width, topH);
      ctx.fillStyle = gradBot;
      ctx.fillRect(this.x, botY, this.width, viewportHeight - botY);

      // Bevel highlight
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(this.x + 4, 0, 3, topH);
      ctx.fillRect(this.x + 4, botY, 3, viewportHeight - botY);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(this.x + this.width - 5, 0, 3, topH);
      ctx.fillRect(this.x + this.width - 5, botY, 3, viewportHeight - botY);

      // Caps
      ctx.fillStyle = '#2f9a58';
      ctx.fillRect(this.x - 6, topH - 20, this.width + 12, 20);
      ctx.fillRect(this.x - 6, botY, this.width + 12, 20);
    }
    collides(circle) {
      const topH = this.gapY - this.gapH * 0.5;
      const botY = this.gapY + this.gapH * 0.5;
      // Circle-rect collision for top
      if (circleRect(circle.x, circle.y, circle.r, this.x, 0, this.width, topH)) return true;
      // bottom
      if (circleRect(circle.x, circle.y, circle.r, this.x, botY, this.width, viewportHeight - botY)) return true;
      return false;
    }
  }

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = clamp(cx, rx, rx + rw);
    const ny = clamp(cy, ry, ry + rh);
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= cr * cr;
  }

  class PipeManager {
    constructor() {
      this.pipes = [];
      this.spawnX = viewportWidth + 200;
      this.minGap = 140;
      this.maxGap = 200;
      this.baseSpeed = 160;
      this.interval = 1.45;
      this.acc = 0;
    }
    reset() { this.pipes.length = 0; this.acc = 0; }
    update(dt, score) {
      const speed = this.baseSpeed + Math.min(140, score * 6);
      this.acc += dt;
      if (this.acc >= this.interval) {
        this.acc = 0;
        const gap = lerp(this.maxGap, this.minGap, clamp(score / 25, 0, 1));
        const margin = 120;
        const gapY = rand(margin, viewportHeight - 120 - margin);
        this.pipes.push(new Pipe(this.spawnX, gapY, gap, speed));
      }
      for (const p of this.pipes) p.update(dt);
      for (let i = this.pipes.length - 1; i >= 0; i--) {
        if (this.pipes[i].offscreen()) this.pipes.splice(i, 1);
      }
    }
    draw(ctx) { for (const p of this.pipes) p.draw(ctx); }
  }

  class UI {
    constructor() {
      this.state = 'menu'; // menu, running, paused, gameover
      this.score = 0;
      this.best = Number(localStorage.getItem('luxe_best') || 0);
      this.menuVisible = true;
      this.updateOverlay();
    }
    setState(s) { this.state = s; this.updateOverlay(); }
    updateOverlay() {
      scoreEl.textContent = String(this.score);
      bestEl.textContent = String(this.best);

      if (this.state === 'menu') {
        overlay.classList.remove('hidden');
        btnStart.classList.remove('hidden');
        btnPause.classList.add('hidden');
        btnResume.classList.add('hidden');
        btnRestart.classList.add('hidden');
      } else if (this.state === 'running') {
        overlay.classList.add('hidden');
        btnStart.classList.add('hidden');
        btnPause.classList.remove('hidden');
        btnResume.classList.add('hidden');
        btnRestart.classList.add('hidden');
      } else if (this.state === 'paused') {
        overlay.classList.remove('hidden');
        btnStart.classList.add('hidden');
        btnPause.classList.add('hidden');
        btnResume.classList.remove('hidden');
        btnRestart.classList.add('hidden');
      } else if (this.state === 'gameover') {
        overlay.classList.remove('hidden');
        btnStart.classList.add('hidden');
        btnPause.classList.add('hidden');
        btnResume.classList.add('hidden');
        btnRestart.classList.remove('hidden');
      }
    }
    addScore(particles, x, y) {
      this.score += 1;
      scoreEl.textContent = String(this.score);
      particles.emitSpark(x, y, 'rgba(123,220,255,0.9)');
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem('luxe_best', String(this.best));
        bestEl.textContent = String(this.best);
      }
    }
    resetScore() {
      this.score = 0; scoreEl.textContent = '0';
    }
  }

  class Game {
    constructor() {
      this.bg = new Background();
      this.selectedColor = localStorage.getItem('luxe_bird_color') || 'red';
      this.bird = new Bird(viewportWidth * 0.3, viewportHeight * 0.45, this.selectedColor);
      this.pipes = new PipeManager();
      this.ui = new UI();
      this.particles = new ParticleSystem();
      this.shake = new Shake();
      this.lastTime = 0;
      this.running = false;
      this.paused = false;
      this.gravityScale = 1;
      // power-up state
      this.fruit = null;
      this.fruitReady = false; // becomes true at thresholds
      this.invincible = false;
      this.invinciblePipesRemaining = 0;
      this.nextFruitScore = 5; // initial threshold
      this.initInput();
      this.initColorPicker();
    }
    initInput() {
      const flap = () => {
        if (this.ui.state === 'menu') { this.start(); return; }
        if (this.ui.state === 'gameover') { this.restart(); return; }
        if (!this.running || this.paused) return;
        this.bird.flap(this.particles);
        this.shake.trigger(0.1);
      };
      window.addEventListener('pointerdown', (e) => {
        // Ignore clicks on UI overlay/panel (e.g., color swatches, buttons)
        if (!overlay.classList.contains('hidden')) return;
        if (e.target && typeof e.target.closest === 'function' && e.target.closest('.panel')) return;
        flap();
      });
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
        if (e.code === 'KeyP') { e.preventDefault(); this.togglePause(); }
      });

      btnStart.addEventListener('click', () => this.start());
      btnPause.addEventListener('click', () => this.togglePause());
      btnResume.addEventListener('click', () => this.togglePause());
      btnRestart.addEventListener('click', () => this.restart());
    }
    start() {
      this.ui.resetScore();
      this.bird = new Bird(viewportWidth * 0.3, viewportHeight * 0.45, this.selectedColor);
      this.pipes.reset();
      this.running = true;
      this.paused = false;
      this.ui.setState('running');
      this.fruit = null;
      this.fruitReady = false;
      this.invincible = false;
      this.invinciblePipesRemaining = 0;
      this.nextFruitScore = 5;
    }
    initColorPicker() {
      const current = this.selectedColor;
      colorSwatches().forEach(btn => {
        if (btn.dataset.color === current) btn.classList.add('active');
        btn.addEventListener('click', () => {
          colorSwatches().forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedColor = btn.dataset.color;
          localStorage.setItem('luxe_bird_color', this.selectedColor);
          // update live bird if in menu or paused; on running, update immediately too
          this.bird.theme = this.selectedColor;
        });
      });
    }
    togglePause() {
      if (!this.running) return;
      this.paused = !this.paused;
      this.ui.setState(this.paused ? 'paused' : 'running');
    }
    gameOver() {
      this.running = false;
      this.ui.setState('gameover');
      this.particles.explode(this.bird.x, this.bird.y);
      this.shake.trigger(0.35);
    }
    restart() {
      this.start();
    }
    update(dt) {
      const score = this.ui.score;
      const speed = 170 + Math.min(140, score * 6);
      this.bg.update(dt, speed);
      if (this.running && !this.paused) {
        this.bird.update(dt);
        this.pipes.update(dt, this.ui.score);
        this.particles.update(dt);
        this.shake.update(dt);

        // Fruit spawns only once each 50 points, starting at 5
        if (!this.invincible && !this.fruit && !this.fruitReady && this.ui.score >= this.nextFruitScore) {
          this.fruitReady = true;
          this.fruit = new Fruit(viewportWidth + 320, Math.max(140, Math.min(viewportHeight - 200, viewportHeight * 0.4)), speed);
          // schedule next threshold at +50
          this.nextFruitScore += 50;
        }
        // Update fruit
        if (this.fruit) {
          this.fruit.update(dt);
          // collect
          const b = this.bird.getBounds();
          if (this.fruit.collides(b)) {
            // activate invincibility for next 10 pipes
            this.invincible = true;
            this.invinciblePipesRemaining = 10;
            this.particles.explode(this.fruit.x, this.fruit.y);
            this.fruit = null;
            this.fruitReady = false;
          } else if (this.fruit.offscreen()) {
            this.fruit = null; // missed
          }
        }

        // Collisions & scoring
        const bounds = this.bird.getBounds();
        if (!this.invincible && this.bird.y + this.bird.radius > viewportHeight - 120) {
          this.bird.alive = false; this.gameOver();
        }
        for (const p of this.pipes.pipes) {
          if (!this.invincible && p.collides(bounds)) { this.bird.alive = false; this.gameOver(); break; }
          // score when passed center
          if (!p.passed && p.x + p.width < this.bird.x) {
            p.passed = true;
            this.ui.addScore(this.particles, this.bird.x, this.bird.y);
            if (this.invincible && this.invinciblePipesRemaining > 0) {
              this.invinciblePipesRemaining -= 1;
              if (this.invinciblePipesRemaining <= 0) {
                this.invincible = false;
                this.fruitReady = false; // allow future spawns after next threshold (e.g., could re-trigger later by score milestones)
              }
            }
          }
        }
      } else {
        this.particles.update(dt * 0.5);
      }
    }
    draw() {
      ctx.save();
      ctx.translate(this.shake.offsetX, this.shake.offsetY);
      this.bg.draw(ctx);
      this.pipes.draw(ctx);
      if (this.fruit) this.fruit.draw(ctx);
      this.particles.draw(ctx);
      // invincibility aura
      if (this.invincible) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const pulse = (Math.sin(performance.now() * 0.01) * 0.5 + 0.5) * 0.4 + 0.6;
        ctx.strokeStyle = `rgba(123,220,255,${0.6 * pulse})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(this.bird.x, this.bird.y, this.bird.radius + 10, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      this.bird.draw(ctx);
      ctx.restore();

      // HUD score
      drawScore(ctx, this.ui.score, this.ui.best);
    }
    loop = (ms) => {
      if (!this.lastTime) this.lastTime = ms;
      const dt = clamp((ms - this.lastTime) / 1000, 0, 0.033);
      this.lastTime = ms;
      this.update(dt);
      this.draw();
      requestAnimationFrame(this.loop);
    }
  }

  class Fruit {
    constructor(x, y, speed) {
      this.x = x;
      this.y = y;
      this.r = 14;
      this.speed = speed;
      this.bobT = 0;
    }
    update(dt) {
      this.x -= this.speed * dt;
      this.bobT += dt * 3;
    }
    offscreen() { return this.x + this.r < -20; }
    collides(circle) {
      const dx = circle.x - this.x;
      const dy = circle.y - this.y;
      return dx * dx + dy * dy <= (circle.r + this.r) * (circle.r + this.r);
    }
    draw(ctx) {
      // string
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(this.x, 0);
      ctx.lineTo(this.x, this.y - this.r);
      ctx.stroke();
      // fruit body (shiny berry)
      const bobY = Math.sin(this.bobT) * 4;
      const gx = ctx.createRadialGradient(this.x - 4, this.y - 4 + bobY, 2, this.x, this.y + bobY, this.r + 2);
      gx.addColorStop(0, '#ff9aa0');
      gx.addColorStop(1, '#ff3e55');
      ctx.fillStyle = gx;
      ctx.beginPath();
      ctx.arc(this.x, this.y + bobY, this.r, 0, TAU);
      ctx.fill();
      // highlight
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(this.x - 5, this.y - 6 + bobY, 4, 0, TAU);
      ctx.fill();
      // leaf
      ctx.fillStyle = '#58c169';
      ctx.beginPath();
      ctx.ellipse(this.x + 6, this.y - this.r - 2 + bobY, 6, 3, -0.4, 0, TAU);
      ctx.fill();
    }
  }

  function drawScore(ctx, score, best) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '800 42px Inter, sans-serif';
    const text = String(score);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(text, viewportWidth * 0.5 + 2, 24 + 2);
    const grad = ctx.createLinearGradient(0, 0, 0, 80);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#cce8ff');
    ctx.fillStyle = grad;
    ctx.fillText(text, viewportWidth * 0.5, 24);

    // best small tag
    ctx.font = '600 14px Inter, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(`Best ${best}`, viewportWidth * 0.5, 24 + 42 + 18);
    ctx.restore();
  }

  const game = new Game();
  requestAnimationFrame(game.loop);
})();


