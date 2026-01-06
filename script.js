// ===== SETUP =====
const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');
const nebulaCanvas = document.getElementById('nebulaCanvas');
const nebulaCtx = nebulaCanvas.getContext('2d');

// ===== STATE =====
const state = {
    width: window.innerWidth,
    height: window.innerHeight,
    particles: [],
    shootingStars: [],
    ripples: [],
    cursor: { x: window.innerWidth/2, y: window.innerHeight/2, active: false, down: false },
    tilt: { x: 0, y: 0 },
    scrollProgress: 0,
    frameCount: 0,
    performanceMode: false,
    theme: 'cosmic',
    warpFactor: 0
};

// Configuration
const config = {
    // Reduce particle count on mobile (300) vs desktop (800)
    particleCount: window.innerWidth < 768 ? 300 : 800,
    starColors: ['#ffffff', '#fff4e6', '#ffd700', '#87ceeb'],
    connectionRadius: window.innerWidth < 768 ? 100 : 250,
    baseSpeed: 1,
    themes: {
        cosmic: { bg: '#020204', accent: '#ffd700', secondary: '#87ceeb' },
        aurora: { bg: '#0f2027', accent: '#4ecdc4', secondary: '#95e1d3' },
        sunset: { bg: '#1e0a3c', accent: '#ff6b9d', secondary: '#f9ca24' },
        nebula: { bg: '#120136', accent: '#b06ab3', secondary: '#4568dc' }
    }
};

// ===== CLASSES (Defined Top-Level) =====

class Star {
    constructor() { this.reset(true); }
    
    reset(randomZ = false) {
        this.x = (Math.random() - 0.5) * state.width * 2;
        this.y = (Math.random() - 0.5) * state.height * 2;
        this.z = randomZ ? Math.random() * 2000 : 2000;
        this.size = Math.random() * 1.5;
        this.color = config.starColors[Math.floor(Math.random() * config.starColors.length)];
        this.velZ = Math.random() * 2 + 0.5;
    }
    
    update() {
        // WARP SPEED LOGIC: Increase speed if cursor is down (Long Press)
        let speed = this.velZ + (state.scrollProgress * 8);
        if (state.cursor.down) speed += 30; // Warp speed!
        
        this.z -= speed * config.baseSpeed;
        
        // Mobile Parallax
        this.x += state.tilt.x * 0.5;
        this.y += state.tilt.y * 0.5;
        
        if (this.z <= 0) this.reset();
    }
    
    draw() {
        if (state.performanceMode && Math.random() > 0.6) return;
        
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
        
        // Connections (Constellations) - Only if not moving too fast
        if (state.cursor.active && !state.cursor.down) {
            const dx = sx - state.cursor.x;
            const dy = sy - state.cursor.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < config.connectionRadius) {
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.lineTo(state.cursor.x, state.cursor.y);
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = (1 - dist / config.connectionRadius) * 0.3;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }
}

class Ripple {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = 0;
        this.alpha = 1;
    }
    update() {
        this.radius += 4;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.strokeStyle = config.themes[state.theme].accent;
        ctx.globalAlpha = this.alpha;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
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

// ===== FUNCTIONS =====

function initParticles() {
    state.particles = [];
    for(let i = 0; i < config.particleCount; i++) state.particles.push(new Star());
}

function drawNebula() {
    const theme = config.themes[state.theme];
    nebulaCtx.fillStyle = theme.bg;
    nebulaCtx.fillRect(0, 0, state.width, state.height);
    
    for (let i = 0; i < 3; i++) {
        const gradient = nebulaCtx.createRadialGradient(
            Math.random() * state.width, Math.random() * state.height, 0,
            Math.random() * state.width, Math.random() * state.height, state.width * 0.6
        );
        gradient.addColorStop(0, theme.accent + '33'); // 20% opacity hex
        gradient.addColorStop(1, 'transparent');
        nebulaCtx.fillStyle = gradient;
        nebulaCtx.fillRect(0, 0, state.width, state.height);
    }
}

function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    nebulaCanvas.width = state.width;
    nebulaCanvas.height = state.height;
    
    // Auto-adjust for mobile
    if (state.width < 768) {
        config.particleCount = 300;
        config.connectionRadius = 100;
    } else {
        config.particleCount = 800;
        config.connectionRadius = 250;
    }
    
    if(state.particles.length === 0) initParticles();
    drawNebula();
}

function animate() {
    // Trails
    ctx.fillStyle = state.cursor.down ? 'rgba(2, 2, 4, 0.1)' : 'rgba(2, 2, 4, 0.3)';
    ctx.fillRect(0, 0, state.width, state.height);

    state.particles.forEach(p => { p.update(); p.draw(); });
    
    // Manage Ripples
    for (let i = state.ripples.length - 1; i >= 0; i--) {
        const r = state.ripples[i];
        r.update();
        r.draw();
        if (r.alpha <= 0) state.ripples.splice(i, 1);
    }

    state.frameCount++;
    requestAnimationFrame(animate);
}

// ===== INPUT HANDLING =====

// Scroll
window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = window.scrollY / docHeight;
});

// Resize
window.addEventListener('resize', resize);

// Mouse/Touch Move
function onMove(x, y) {
    state.cursor.x = x;
    state.cursor.y = y;
    state.cursor.active = true;
    
    // Clear active state after 2s of inactivity
    clearTimeout(window.cursorTimeout);
    window.cursorTimeout = setTimeout(() => state.cursor.active = false, 2000);
}

window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
// IMPORTANT: Passive listener for mobile scroll support
window.addEventListener('touchmove', e => onMove(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

// Mouse/Touch Down (Warp & Ripple)
function onDown(x, y) {
    state.cursor.down = true;
    state.ripples.push(new Ripple(x, y));
}

function onUp() {
    state.cursor.down = false;
}

window.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
window.addEventListener('touchstart', e => onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
window.addEventListener('mouseup', onUp);
window.addEventListener('touchend', onUp);

// Gyroscope
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
        state.tilt.x += ((e.gamma || 0) - state.tilt.x) * 0.1;
        state.tilt.y += ((e.beta || 0) - state.tilt.y) * 0.1;
    });
}

// ===== UI LOGIC =====
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
}, { threshold: 0.2 }); // Trigger earlier on mobile

document.querySelectorAll('.chapter').forEach(el => observer.observe(el));

// Settings Panel Toggle
document.getElementById('settings-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('settings-panel').classList.toggle('open');
});

// Close settings if clicking outside
document.addEventListener('click', (e) => {
    const panel = document.getElementById('settings-panel');
    const btn = document.getElementById('settings-btn');
    if (panel.classList.contains('open') && !panel.contains(e.target) && !btn.contains(e.target)) {
        panel.classList.remove('open');
    }
});

// Controls
document.getElementById('particle-slider').addEventListener('input', e => {
    config.particleCount = parseInt(e.target.value);
    initParticles();
});
document.getElementById('speed-slider').addEventListener('input', e => {
    config.baseSpeed = parseFloat(e.target.value);
});
document.getElementById('performance-mode-btn').addEventListener('click', function() {
    state.performanceMode = !state.performanceMode;
    this.classList.toggle('active');
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
    resize(); // Resets to defaults based on screen size
    config.baseSpeed = 1;
    document.getElementById('speed-slider').value = 1;
    document.getElementById('particle-slider').value = config.particleCount;
});

// Capture
document.getElementById('capture-btn').addEventListener('click', () => {
    const tCanvas = document.createElement('canvas');
    tCanvas.width = state.width; tCanvas.height = state.height;
    const tCtx = tCanvas.getContext('2d');
    tCtx.drawImage(nebulaCanvas, 0, 0);
    tCtx.drawImage(canvas, 0, 0);
    tCtx.font = '30px Montserrat';
    tCtx.fillStyle = '#ffffff';
    tCtx.fillText('Celestial Resonance', 40, state.height - 40);
    
    const link = document.createElement('a');
    link.download = `cosmos-${Date.now()}.png`;
    link.href = tCanvas.toDataURL();
    link.click();
});

// Start
resize();
animate();
