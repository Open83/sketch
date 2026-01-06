const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');
const nebulaCanvas = document.getElementById('nebulaCanvas');
const nebulaCtx = nebulaCanvas.getContext('2d');

const state = {
    width: window.innerWidth,
    height: window.innerHeight,
    particles: [],
    shootingStars: [],
    cursor: { x: window.innerWidth/2, y: window.innerHeight/2, active: false },
    tilt: { x: 0, y: 0 },
    scrollProgress: 0,
    frameCount: 0,
    constellationMode: false,
    constellationPoints: [],
    ripples: [],
    meteorShowerActive: false,
    theme: 'cosmic',
    stats: { starsCreated: 0, startTime: Date.now(), fps: 60 },
    fullscreen: false,
    performanceMode: false
};

const config = {
    particleCount: window.innerWidth < 768 ? 400 : 850,
    starColors: ['#ffffff', '#fff4e6', '#ffd700', '#87ceeb'],
    connectionRadius: 250,
    animationSpeed: 1,
    themes: {
        cosmic: { bg: '#020204', accent: '#ffd700', secondary: '#87ceeb' },
        aurora: { bg: '#0f2027', accent: '#4ecdc4', secondary: '#95e1d3' },
        sunset: { bg: '#1e0a3c', accent: '#ff6b9d', secondary: '#f9ca24' },
        nebula: { bg: '#120136', accent: '#b06ab3', secondary: '#4568dc' }
    }
};

function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    nebulaCanvas.width = state.width;
    nebulaCanvas.height = state.height;
    if (state.particles.length === 0) initParticles();
    drawNebula();
}
window.addEventListener('resize', resize);
resize();

function drawNebula() {
    const theme = config.themes[state.theme];
    nebulaCtx.fillStyle = theme.bg;
    nebulaCtx.fillRect(0, 0, state.width, state.height);
    
    for (let i = 0; i < 3; i++) {
        const gradient = nebulaCtx.createRadialGradient(
            Math.random() * state.width, Math.random() * state.height, 0,
            Math.random() * state.width, Math.random() * state.height, state.width * 0.5
        );
        gradient.addColorStop(0, theme.accent + '40');
        gradient.addColorStop(0.5, theme.secondary + '20');
        gradient.addColorStop(1, 'transparent');
        nebulaCtx.fillStyle = gradient;
        nebulaCtx.fillRect(0, 0, state.width, state.height);
    }
}

class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 150;
        this.speed = 3;
        this.opacity = 1;
    }
    update() {
        this.radius += this.speed;
        this.opacity = 1 - (this.radius / this.maxRadius);
        return this.radius < this.maxRadius;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = config.themes[state.theme].accent;
        ctx.globalAlpha = this.opacity * 0.5;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

class Star {
    constructor() {
        this.reset(true);
    }
    reset(randomZ = false) {
        this.x = (Math.random() - 0.5) * state.width * 2;
        this.y = (Math.random() - 0.5) * state.height * 2;
        this.z = randomZ ? Math.random() * 2000 : 2000;
        this.size = Math.random() * 1.5;
        this.color = config.starColors[Math.floor(Math.random() * config.starColors.length)];
        this.velZ = Math.random() * 2 + 0.5;
    }
    update() {
        this.z -= (this.velZ + (state.scrollProgress * 8)) * config.animationSpeed;
        this.x += state.tilt.x * 0.1;
        this.y += state.tilt.y * 0.1;
        if (this.z <= 0) this.reset();
    }
    draw() {
        if (state.performanceMode && Math.random() > 0.7) return;
        const focalLength = 300;
        const scale = focalLength / (focalLength + this.z);
        const sx = state.width/2 + this.x * scale;
        const sy = state.height/2 + this.y * scale;
        if (sx < 0 || sx > state.width || sy < 0 || sy > state.height) return;
        ctx.beginPath();
        ctx.arc(sx, sy, this.size * scale * 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = Math.min(1, (2000 - this.z) / 1000);
        ctx.fill();
        if (state.cursor.active && !state.constellationMode) {
            const dx = sx - state.cursor.x;
            const dy = sy - state.cursor.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < config.connectionRadius) {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(state.cursor.x, state.cursor.y);
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = (1 - dist / config.connectionRadius) * 0.4;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }
}

class ShootingStar {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * state.width;
        this.y = Math.random() * state.height * 0.5;
        this.len = Math.random() * 80 + 20;
        this.speed = (Math.random() * 10 + 6) * config.animationSpeed;
        this.waitTime = Date.now() + Math.random() * 3000 + 500;
        this.active = false;
        this.angle = Math.PI / 4;
    }
    update() {
        if (this.active) {
            this.x -= this.speed * Math.cos(this.angle);
            this.y += this.speed * Math.sin(this.angle);
            if (this.x < -100 || this.y > state.height + 100) {
                this.active = false;
                this.waitTime = Date.now() + Math.random() * (state.meteorShowerActive ? 500 : 5000);
            }
        } else {
            if (Date.now() > this.waitTime) {
                this.reset();
                this.active = true;
            }
        }
    }
    draw() {
        if (!this.active) return;
        const endX = this.x + this.len * Math.cos(this.angle);
        const endY = this.y - this.len * Math.sin(this.angle);
        const grad = ctx.createLinearGradient(this.x, this.y, endX, endY);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}

function initParticles() {
    state.particles = [];
    state.shootingStars = [];
    for(let i = 0; i < config.particleCount; i++) {
        state.particles.push(new Star());
    }
    const shootingStarCount = state.meteorShowerActive ? 10 : 2;
    for(let i = 0; i < shootingStarCount; i++) {
        state.shootingStars.push(new ShootingStar());
    }
}

class TextScramble {
    constructor(el) {
        this.el = el;
        this.chars = '!<>-_\\/[]{}—=+*^?#________';
        this.originalText = el.getAttribute('data-value') || el.innerText;
        this.update = this.update.bind(this);
    }
    setText(newText) {
        const oldText = this.el.innerText;
        const length = Math.max(oldText.length, newText.length);
        const promise = new Promise((resolve) => this.resolve = resolve);
        this.queue = [];
        for (let i = 0; i < length; i++) {
            const from = oldText[i] || '';
            const to = newText[i] || '';
            const start = Math.floor(Math.random() * 40);
            const end = start + Math.floor(Math.random() * 40);
            this.queue.push({ from, to, start, end });
        }
        cancelAnimationFrame(this.frameRequest);
        this.frame = 0;
        this.update();
        return promise;
    }
    update() {
        let output = '';
        let complete = 0;
        for (let i = 0, n = this.queue.length; i < n; i++) {
            let { from, to, start, end, char } = this.queue[i];
            if (this.frame >= end) {
                complete++;
                output += to;
            } else if (this.frame >= start) {
                if (!char || Math.random() < 0.28) {
                    char = this.randomChar();
                    this.queue[i].char = char;
                }
                output += `<span style="opacity: 0.5">${char}</span>`;
            } else {
                output += from;
            }
        }
        this.el.innerHTML = output;
        if (complete === this.queue.length) {
            this.resolve();
        } else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    randomChar() {
        return this.chars[Math.floor(Math.random() * this.chars.length)];
    }
}

let lastTime = performance.now();
let frames = 0;

function updateFPS() {
    frames++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
        state.stats.fps = Math.round((frames * 1000) / (currentTime - lastTime));
        document.getElementById('fps-count').textContent = state.stats.fps;
        frames = 0;
        lastTime = currentTime;
    }
}

function updateTime() {
    const elapsed = Math.floor((Date.now() - state.stats.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    document.getElementById('time-count').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
}

function animate() {
    ctx.fillStyle = 'rgba(2, 2, 4, 0.3)';
    ctx.fillRect(0, 0, state.width, state.height);

    state.particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    state.shootingStars.forEach(s => {
        s.update();
        s.draw();
    });
    
    state.ripples = state.ripples.filter(ripple => {
        const alive = ripple.update();
        if (alive) ripple.draw();
        return alive;
    });
    
    if (state.constellationMode && state.constellationPoints.length > 0) {
        ctx.strokeStyle = config.themes[state.theme].accent;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        for (let i = 0; i < state.constellationPoints.length - 1; i++) {
            ctx.beginPath();
            ctx.moveTo(state.constellationPoints[i].x, state.constellationPoints[i].y);
            ctx.lineTo(state.constellationPoints[i + 1].x, state.constellationPoints[i + 1].y);
            ctx.stroke();
        }
        state.constellationPoints.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = config.themes[state.theme].accent;
            ctx.fill();
        });
        ctx.globalAlpha = 1;
    }

    state.frameCount++;
    updateFPS();
    if (state.frameCount % 60 === 0) updateTime();
    requestAnimationFrame(animate);
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            const textElements = entry.target.querySelectorAll('h1, .highlight, .final-text');
            textElements.forEach(el => {
                if(!el.classList.contains('text-visible')) {
                    el.classList.add('text-visible');
                    const scrambler = new TextScramble(el);
                    scrambler.setText(el.getAttribute('data-value'));
                }
            });
        }
    });
}, { threshold: 0.3 });

document.querySelectorAll('.chapter').forEach(el => observer.observe(el));

function updateCursor(x, y) {
    state.cursor.x = x;
    state.cursor.y = y;
    state.cursor.active = true;
    document.querySelectorAll('.magnetic-btn, .magnetic-text').forEach(el => {
        const rect = el.getBoundingClientRect();
        const dist = Math.hypot(x - (rect.left + rect.width/2), y - (rect.top + rect.height/2));
        if (dist < 150) {
            const pull = 0.15;
            const dx = (x - (rect.left + rect.width/2)) * pull;
            const dy = (y - (rect.top + rect.height/2)) * pull;
            el.style.transform = `translate(${dx}px, ${dy}px)`;
        } else {
            el.style.transform = 'translate(0,0)';
        }
    });
    clearTimeout(window.cursorTimeout);
    window.cursorTimeout = setTimeout(() => {
        state.cursor.active = false;
        document.querySelectorAll('.magnetic-btn, .magnetic-text').forEach(el => {
            el.style.transform = 'translate(0,0)';
        });
    }, 2000);
}

window.addEventListener('mousemove', e => updateCursor(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
    e.preventDefault();
    updateCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });

canvas.addEventListener('click', (e) => {
    const x = e.clientX;
    const y = e.clientY;
    if (state.constellationMode) {
        state.constellationPoints.push({ x, y });
        state.stats.starsCreated++;
        document.getElementById('stars-count').textContent = state.stats.starsCreated;
    } else {
        state.ripples.push(new Ripple(x, y));
    }
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    if (state.constellationMode) {
        state.constellationPoints.push({ x, y });
        state.stats.starsCreated++;
        document.getElementById('stars-count').textContent = state.stats.starsCreated;
    } else {
        state.ripples.push(new Ripple(x, y));
    }
}, { passive: false });

window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = window.scrollY / docHeight;
});

document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('settings-panel').classList.toggle('open');
});

document.addEventListener('click', (e) => {
    const panel = document.getElementById('settings-panel');
    const btn = document.getElementById('settings-btn');
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('open');
    }
});

document.getElementById('capture-btn').addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.width;
    tempCanvas.height = state.height;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(nebulaCanvas, 0, 0);
    tCtx.drawImage(canvas, 0, 0);
    tCtx.font = '30px Cormorant Garamond';
    tCtx.fillStyle = config.themes[state.theme].accent;
    tCtx.fillText('Celestial Resonance', 50, state.height - 50);
    const link = document.createElement('a');
    link.download = `cosmos-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL();
    link.click();
});

document.getElementById('constellation-mode-btn').addEventListener('click', () => {
    state.constellationMode = !state.constellationMode;
    document.getElementById('constellation-mode-btn').classList.toggle('active');
    document.getElementById('constellation-ui').classList.toggle('active');
});

document.getElementById('clear-constellation-btn').addEventListener('click', () => {
    state.constellationPoints = [];
});

document.getElementById('save-constellation-btn').addEventListener('click', () => {
    if (state.constellationPoints.length > 0) {
        const data = JSON.stringify(state.constellationPoints);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `constellation-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }
});

document.getElementById('exit-constellation-btn').addEventListener('click', () => {
    state.constellationMode = false;
    document.getElementById('constellation-mode-btn').classList.remove('active');
    document.getElementById('constellation-ui').classList.remove('active');
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    state.fullscreen = !state.fullscreen;
    document.body.classList.toggle('fullscreen');
    document.getElementById('fullscreen-btn').classList.toggle('active');
});

document.getElementById('particle-slider').addEventListener('input', (e) => {
    config.particleCount = parseInt(e.target.value);
    initParticles();
});

document.getElementById('speed-slider').addEventListener('input', (e) => {
    config.animationSpeed = parseFloat(e.target.value);
});

document.getElementById('connection-slider').addEventListener('input', (e) => {
    config.connectionRadius = parseInt(e.target.value);
});

document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        state.theme = option.dataset.theme;
        const theme = config.themes[state.theme];
        document.documentElement.style.setProperty('--bg-color', theme.bg);
        document.documentElement.style.setProperty('--accent-color', theme.accent);
        drawNebula();
    });
});

document.getElementById('meteor-shower-btn').addEventListener('click', () => {
    state.meteorShowerActive = !state.meteorShowerActive;
    document.getElementById('meteor-shower-btn').classList.toggle('active');
    initParticles();
});

document.getElementById('performance-mode-btn').addEventListener('click', () => {
    state.performanceMode = !state.performanceMode;
    document.getElementById('performance-mode-btn').classList.toggle('active');
});

document.getElementById('reset-btn').addEventListener('click', () => {
    config.particleCount = 850;
    config.animationSpeed = 1;
    config.connectionRadius = 250;
    state.theme = 'cosmic';
    state.meteorShowerActive = false;
    state.performanceMode = false;
    document.getElementById('particle-slider').value = 850;
    document.getElementById('speed-slider').value = 1;
    document.getElementById('connection-slider').value = 250;
    document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
    document.querySelector('[data-theme="cosmic"]').classList.add('active');
    document.getElementById('meteor-shower-btn').classList.remove('active');
    document.getElementById('performance-mode-btn').classList.remove('active');
    document.documentElement.style.setProperty('--bg-color', '#020204');
    document.documentElement.style.setProperty('--accent-color', '#ffd700');
    initParticles();
    drawNebula();
});

if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
        state.tilt.x += ((e.gamma || 0) - state.tilt.x) * 0.1;
        state.tilt.y += ((e.beta || 0) - state.tilt.y) * 0.1;
    });
}

initParticles();
animate();
