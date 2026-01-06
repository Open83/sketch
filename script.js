// ===== SETUP =====
const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');
const nebulaCanvas = document.getElementById('nebulaCanvas');
const nebulaCtx = nebulaCanvas.getContext('2d');

// ===== STATE & CONFIG =====
const state = {
    width: 0,
    height: 0,
    pixelRatio: 1, // Crucial for HD Mobile
    particles: [],
    sparkles: [], // New interaction particle
    cursor: { x: -1000, y: -1000, down: false, active: false },
    tilt: { x: 0, y: 0 },
    scrollProgress: 0,
    frameCount: 0,
    theme: 'cosmic'
};

const config = {
    particleCount: window.innerWidth < 768 ? 400 : 900,
    starColors: ['#ffffff', '#fff4e6', '#ffd700', '#87ceeb'],
    connectionRadius: window.innerWidth < 768 ? 80 : 200, // Reduced for mobile perf
    baseSpeed: 0.5,
    themes: {
        cosmic: { bg: '#020204', accent: '#ffd700', secondary: '#87ceeb' },
        aurora: { bg: '#0f2027', accent: '#4ecdc4', secondary: '#95e1d3' },
        sunset: { bg: '#1e0a3c', accent: '#ff6b9d', secondary: '#f9ca24' },
        nebula: { bg: '#120136', accent: '#b06ab3', secondary: '#4568dc' }
    }
};

// ===== CLASSES =====

class Star {
    constructor() { this.reset(true); }
    
    reset(randomZ = false) {
        this.x = (Math.random() - 0.5) * state.width * 2;
        this.y = (Math.random() - 0.5) * state.height * 2;
        this.z = randomZ ? Math.random() * 2000 : 2000;
        this.size = Math.random() * 2; // Base size
        this.color = config.starColors[Math.floor(Math.random() * config.starColors.length)];
        this.velZ = Math.random() * 1.5 + 0.2;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.twinkleSpeed = Math.random() * 0.05 + 0.02;
    }
    
    update() {
        // Warp logic
        let speed = (this.velZ + (state.scrollProgress * 5)) * config.baseSpeed;
        if (state.cursor.down) speed += 20; // Hyper speed on hold
        
        this.z -= speed;
        
        // Mobile Gyro Parallax
        this.x += state.tilt.x * 0.5;
        this.y += state.tilt.y * 0.5;
        
        if (this.z <= 0) this.reset();
    }
    
    draw() {
        // 3D Projection
        const focalLength = 400;
        const scale = focalLength / (focalLength + this.z);
        const sx = state.width/2 + this.x * scale;
        const sy = state.height/2 + this.y * scale;
        
        // Culling
        if (sx < 0 || sx > state.width || sy < 0 || sy > state.height) return;
        
        // Twinkle Effect
        const twinkle = Math.sin(state.frameCount * this.twinkleSpeed + this.twinkleOffset);
        const alpha = Math.min(1, ((2000 - this.z) / 1000) * (0.7 + twinkle * 0.3));
        
        ctx.beginPath();
        // Adjust size by pixel ratio for crispness
        const r = this.size * scale; 
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        
        // Auto Constellations (Cosmic Web)
        // Check neighbors for auto-connection (expensive, so limited)
        if (state.frameCount % 2 === 0 && this.z < 1000) { 
            // Only connect stars close to screen for performance
           // (Implementation omitted for pure performance on mobile, replaced by interactions)
        }
        
        // Cursor/Touch Connections
        if (state.cursor.active) {
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

class Sparkle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1;
        this.color = config.starColors[Math.floor(Math.random() * config.starColors.length)];
        this.size = Math.random() * 3 + 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
        ctx.fill();
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
        if (complete === this.queue.length) this.resolve();
        else {
            this.frameRequest = requestAnimationFrame(this.update);
            this.frame++;
        }
    }
    randomChar() { return this.chars[Math.floor(Math.random() * this.chars.length)]; }
}

// ===== CORE FUNCTIONS =====

function initParticles() {
    state.particles = [];
    for(let i = 0; i < config.particleCount; i++) state.particles.push(new Star());
}

function resize() {
    // 1. Get Visual Dimensions
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    state.pixelRatio = window.devicePixelRatio || 1;

    // 2. Set Canvas Size (Scaled for HD)
    canvas.width = state.width * state.pixelRatio;
    canvas.height = state.height * state.pixelRatio;
    
    nebulaCanvas.width = state.width * state.pixelRatio;
    nebulaCanvas.height = state.height * state.pixelRatio;

    // 3. Normalize Scale
    ctx.scale(state.pixelRatio, state.pixelRatio);
    nebulaCtx.scale(state.pixelRatio, state.pixelRatio);

    // 4. Mobile Adjustments
    if (state.width < 768) {
        config.particleCount = 450;
        config.connectionRadius = 90;
    }

    if (state.particles.length === 0) initParticles();
    drawNebula();
}

function drawNebula() {
    const theme = config.themes[state.theme];
    nebulaCtx.fillStyle = theme.bg;
    nebulaCtx.fillRect(0, 0, state.width, state.height);
    
    // Smooth gradients
    const gradient = nebulaCtx.createRadialGradient(
        state.width/2, state.height/2, 0,
        state.width/2, state.height/2, state.height
    );
    gradient.addColorStop(0, theme.accent + '20'); // 12% opacity
    gradient.addColorStop(0.5, theme.secondary + '10');
    gradient.addColorStop(1, 'transparent');
    
    nebulaCtx.fillStyle = gradient;
    nebulaCtx.fillRect(0, 0, state.width, state.height);
}

function animate() {
    // Fade trail
    ctx.fillStyle = `rgba(2, 2, 4, ${state.cursor.down ? 0.2 : 0.4})`;
    ctx.fillRect(0, 0, state.width, state.height);

    // Update Stars
    state.particles.forEach(p => { p.update(); p.draw(); });

    // Update Sparkles
    for (let i = state.sparkles.length - 1; i >= 0; i--) {
        const s = state.sparkles[i];
        s.update();
        s.draw();
        if (s.life <= 0) state.sparkles.splice(i, 1);
    }

    state.frameCount++;
    requestAnimationFrame(animate);
}

// ===== INTERACTION =====

// Scroll
window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = window.scrollY / docHeight;
});

// Resize
window.addEventListener('resize', () => {
    resize();
    // Re-draw nebula immediately on resize
    drawNebula(); 
});

// Move
function onMove(x, y) {
    state.cursor.x = x;
    state.cursor.y = y;
    state.cursor.active = true;
    clearTimeout(window.cursorTimeout);
    window.cursorTimeout = setTimeout(() => state.cursor.active = false, 2500);
}
window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
window.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

// Tap/Click (Sparkles + Warp Start)
function onStart(x, y) {
    state.cursor.down = true;
    state.cursor.x = x;
    state.cursor.y = y;
    
    // Spawn sparkles
    for(let i=0; i<8; i++) {
        state.sparkles.push(new Sparkle(x, y));
    }
}
function onEnd() { state.cursor.down = false; }

window.addEventListener('mousedown', e => onStart(e.clientX, e.clientY));
window.addEventListener('touchstart', e => onStart(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
window.addEventListener('mouseup', onEnd);
window.addEventListener('touchend', onEnd);

// Gyroscope
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
        state.tilt.x += ((e.gamma || 0) - state.tilt.x) * 0.1;
        state.tilt.y += ((e.beta || 0) - state.tilt.y) * 0.1;
    });
}

// Intersection Observer (Text Reveal)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            entry.target.querySelectorAll('h1, .highlight, .final-text').forEach(el => {
                if(!el.classList.contains('text-visible')) {
                    el.classList.add('text-visible');
                    new TextScramble(el).setText(el.getAttribute('data-value'));
                }
            });
        }
    });
}, { threshold: 0.2 });
document.querySelectorAll('.chapter').forEach(el => observer.observe(el));

// UI Events
document.getElementById('settings-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('settings-panel').classList.toggle('open');
});
document.addEventListener('click', (e) => {
    const panel = document.getElementById('settings-panel');
    const btn = document.getElementById('settings-btn');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('open');
    }
});

// Settings Logic
document.getElementById('particle-slider').addEventListener('input', e => {
    config.particleCount = parseInt(e.target.value);
    initParticles();
});
document.getElementById('speed-slider').addEventListener('input', e => {
    config.baseSpeed = parseFloat(e.target.value);
});
document.querySelectorAll('.color-option').forEach(opt => {
    opt.addEventListener('click', () => {
        state.theme = opt.dataset.theme;
        const t = config.themes[state.theme];
        document.documentElement.style.setProperty('--bg-color', t.bg);
        document.documentElement.style.setProperty('--accent-color', t.accent);
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        drawNebula();
    });
});
document.getElementById('reset-btn').addEventListener('click', () => {
    config.baseSpeed = 0.5;
    document.getElementById('speed-slider').value = 1;
    resize();
});
document.getElementById('capture-btn').addEventListener('click', () => {
    const tCanvas = document.createElement('canvas');
    tCanvas.width = state.width * state.pixelRatio;
    tCanvas.height = state.height * state.pixelRatio;
    const tCtx = tCanvas.getContext('2d');
    
    // Draw background
    tCtx.fillStyle = config.themes[state.theme].bg;
    tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);
    
    tCtx.drawImage(nebulaCanvas, 0, 0);
    tCtx.drawImage(canvas, 0, 0);
    
    const link = document.createElement('a');
    link.download = `cosmos-${Date.now()}.png`;
    link.href = tCanvas.toDataURL();
    link.click();
});

// Init
resize();
animate();
