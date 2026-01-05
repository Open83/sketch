// ===== CORE STATE MANAGEMENT =====
const state = {
    customTime: 0,
    lastInteractionTime: 0,
    isInteracting: false,
    scrollProgress: 0,
    currentChapter: 0,
    currentTheme: 'void',
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    prevMouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    smoothMouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    velocity: { x: 0, y: 0 },
    idleStartTime: null,
    revealedFragments: new Set(),
    intensity: 0
};

// Theme color palettes
const themes = {
    void: { primary: [74, 85, 104], secondary: [138, 148, 184], accent: [180, 190, 220] },
    awakening: { primary: [183, 148, 246], secondary: [138, 108, 196], accent: [218, 188, 255] },
    connection: { primary: [44, 95, 127], secondary: [64, 125, 157], accent: [94, 155, 187] },
    transformation: { primary: [212, 165, 255], secondary: [182, 135, 225], accent: [242, 195, 255] },
    resonance: { primary: [255, 110, 199], secondary: [225, 80, 169], accent: [255, 140, 219] },
    dissolution: { primary: [90, 185, 234], secondary: [60, 155, 204], accent: [120, 215, 255] },
    transcendence: { primary: [255, 215, 0], secondary: [225, 185, 0], accent: [255, 235, 100] }
};

// ===== CANVAS SETUP =====
const particleCanvas = document.getElementById('particleCanvas');
const geometryCanvas = document.getElementById('geometryCanvas');
const threadCanvas = document.getElementById('threadCanvas');
const auraCanvas = document.getElementById('auraCanvas');

const particleCtx = particleCanvas.getContext('2d');
const geometryCtx = geometryCanvas.getContext('2d');
const threadCtx = threadCanvas.getContext('2d');
const auraCtx = auraCanvas.getContext('2d');

let width, height;

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    
    [particleCanvas, geometryCanvas, threadCanvas, auraCanvas].forEach(canvas => {
        canvas.width = width;
        canvas.height = height;
    });
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ===== UTILITY FUNCTIONS =====
function lerp(start, end, t) {
    return start + (end - start) * t;
}

function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function getThemeColor(theme, type = 'primary', alpha = 1) {
    const color = themes[theme][type];
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
}

// ===== PARTICLE SYSTEM =====
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.life = 1;
        this.decay = 0.003 + Math.random() * 0.005;
        this.size = Math.random() * 3 + 1;
        this.targetX = x + (Math.random() - 0.5) * 100;
        this.targetY = y + (Math.random() - 0.5) * 100;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
        
        this.x = lerp(this.x, this.targetX, 0.02);
        this.y = lerp(this.y, this.targetY, 0.02);
        
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx, theme) {
        const alpha = this.life * 0.6;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = getThemeColor(theme, 'accent', alpha);
        ctx.shadowBlur = 10;
        ctx.shadowColor = getThemeColor(theme, 'secondary', alpha * 0.5);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

let particles = [];

function createParticles(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
    }
}

function updateParticles() {
    particleCtx.clearRect(0, 0, width, height);
    particles = particles.filter(particle => {
        const alive = particle.update();
        if (alive) particle.draw(particleCtx, state.currentTheme);
        return alive;
    });
}

// ===== GEOMETRIC SHAPES =====
class GeometricShape {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'circle', 'triangle', 'square'
        this.size = 0;
        this.targetSize = 30 + Math.random() * 40;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02;
        this.life = 1;
        this.alpha = 0;
    }

    update() {
        this.size = lerp(this.size, this.targetSize, 0.05);
        this.rotation += this.rotationSpeed;
        this.alpha = lerp(this.alpha, 0.3, 0.05);
        
        if (this.life < 0.5) {
            this.targetSize = 0;
            this.alpha = lerp(this.alpha, 0, 0.02);
        }
        
        this.life -= 0.002;
        return this.life > 0 && (this.size > 0.5 || this.alpha > 0.01);
    }

    draw(ctx, theme) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.strokeStyle = getThemeColor(theme, 'secondary', this.alpha);
        ctx.lineWidth = 2;
        
        if (this.type === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'triangle') {
            ctx.beginPath();
            const h = this.size * Math.sqrt(3) / 2;
            ctx.moveTo(0, -h / 2);
            ctx.lineTo(-this.size / 2, h / 2);
            ctx.lineTo(this.size / 2, h / 2);
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 'square') {
            ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }
        
        ctx.restore();
    }
}

let shapes = [];

function createShape(x, y) {
    const types = ['circle', 'triangle', 'square'];
    const type = types[Math.floor(Math.random() * types.length)];
    shapes.push(new GeometricShape(x, y, type));
}

function updateShapes() {
    geometryCtx.clearRect(0, 0, width, height);
    shapes = shapes.filter(shape => {
        const alive = shape.update();
        if (alive) shape.draw(geometryCtx, state.currentTheme);
        return alive;
    });
}

// ===== THREAD SYSTEM =====
class ThreadPoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
        this.vx = 0;
        this.vy = 0;
    }

    update(targetX, targetY, easing = 0.05) {
        this.targetX = targetX;
        this.targetY = targetY;
        
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        
        this.vx += dx * easing;
        this.vy += dy * easing;
        
        this.vx *= 0.85;
        this.vy *= 0.85;
        
        this.x += this.vx;
        this.y += this.vy;
    }
}

class ThreadSystem {
    constructor() {
        this.points = [];
        this.segments = 60;
        this.initializePoints();
    }

    initializePoints() {
        for (let i = 0; i < this.segments; i++) {
            this.points.push(new ThreadPoint(width / 2, height / 2));
        }
    }

    update(mouseX, mouseY, time) {
        const scrollInfluence = state.scrollProgress * 0.01;
        const phase = time * 0.001;
        
        // Lead point follows mouse with organic motion
        const wobbleX = Math.sin(phase * 2 + state.currentChapter) * 15 * (1 - scrollInfluence * 0.5);
        const wobbleY = Math.cos(phase * 1.5 + state.currentChapter) * 15 * (1 - scrollInfluence * 0.5);
        
        this.points[0].update(mouseX + wobbleX, mouseY + wobbleY, 0.1);

        // Subsequent points create flowing motion
        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const easing = 0.04 + (i / this.segments) * 0.03;
            
            // Complex wave patterns
            const wavePhase = phase + i * 0.2;
            const amplitude = 20 + scrollInfluence * 30;
            const waveX = Math.sin(wavePhase + state.currentChapter * 0.5) * amplitude;
            const waveY = Math.cos(wavePhase * 0.7 + state.currentChapter * 0.3) * amplitude;
            
            // Spiral motion based on chapter
            const spiralRadius = i * 0.5;
            const spiralAngle = phase * 0.5 + i * 0.1;
            const spiralX = Math.cos(spiralAngle) * spiralRadius * (state.currentChapter / 7);
            const spiralY = Math.sin(spiralAngle) * spiralRadius * (state.currentChapter / 7);
            
            this.points[i].update(
                prev.x + waveX + spiralX,
                prev.y + waveY + spiralY,
                easing
            );
        }
    }

    draw(theme) {
        threadCtx.clearRect(0, 0, width, height);
        
        // Shadow layer
        threadCtx.shadowBlur = 30;
        threadCtx.shadowColor = getThemeColor(theme, 'primary', 0.4);
        
        // Main thread
        threadCtx.beginPath();
        threadCtx.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.points.length - 1; i++) {
            const point = this.points[i];
            const nextPoint = this.points[i + 1];
            const cpX = (point.x + nextPoint.x) / 2;
            const cpY = (point.y + nextPoint.y) / 2;
            threadCtx.quadraticCurveTo(point.x, point.y, cpX, cpY);
        }
        
        // Dynamic gradient
        const gradient = threadCtx.createLinearGradient(
            this.points[0].x, this.points[0].y,
            this.points[this.points.length - 1].x,
            this.points[this.points.length - 1].y
        );
        
        const alpha = 0.6 + state.intensity * 0.3;
        gradient.addColorStop(0, getThemeColor(theme, 'accent', alpha));
        gradient.addColorStop(0.5, getThemeColor(theme, 'primary', alpha * 0.9));
        gradient.addColorStop(1, getThemeColor(theme, 'secondary', alpha * 0.7));
        
        threadCtx.strokeStyle = gradient;
        threadCtx.lineWidth = 2 + state.intensity * 2;
        threadCtx.lineCap = 'round';
        threadCtx.lineJoin = 'round';
        threadCtx.stroke();
        
        // Glow points
        this.points.forEach((point, i) => {
            if (i % 8 === 0) {
                threadCtx.beginPath();
                threadCtx.arc(point.x, point.y, 3 + state.intensity * 2, 0, Math.PI * 2);
                threadCtx.fillStyle = getThemeColor(theme, 'accent', 0.6 + state.intensity * 0.3);
                threadCtx.fill();
            }
        });
        
        threadCtx.shadowBlur = 0;
    }
}

const threadSystem = new ThreadSystem();

// ===== AURA SYSTEM =====
function drawAura() {
    auraCtx.clearRect(0, 0, width, height);
    
    const gradient = auraCtx.createRadialGradient(
        state.smoothMouse.x, state.smoothMouse.y, 0,
        state.smoothMouse.x, state.smoothMouse.y, 150 + state.intensity * 100
    );
    
    gradient.addColorStop(0, getThemeColor(state.currentTheme, 'accent', 0.2 * state.intensity));
    gradient.addColorStop(0.5, getThemeColor(state.currentTheme, 'primary', 0.1 * state.intensity));
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    auraCtx.fillStyle = gradient;
    auraCtx.fillRect(0, 0, width, height);
}

// ===== CUSTOM TIME & INTERACTION =====
function updateCustomTime(delta) {
    if (state.isInteracting) {
        state.customTime += delta * 0.001;
    }
}

let lastMouseMove = Date.now();
let lastScroll = Date.now();

function setInteracting(value) {
    const wasInteracting = state.isInteracting;
    state.isInteracting = value;
    state.lastInteractionTime = Date.now();
    
    if (!wasInteracting && value) {
        state.idleStartTime = null;
    } else if (wasInteracting && !value) {
        state.idleStartTime = Date.now();
    }
}

// Update smooth mouse position
function updateSmoothMouse() {
    state.smoothMouse.x = lerp(state.smoothMouse.x, state.mouse.x, 0.1);
    state.smoothMouse.y = lerp(state.smoothMouse.y, state.mouse.y, 0.1);
    
    state.velocity.x = state.mouse.x - state.prevMouse.x;
    state.velocity.y = state.mouse.y - state.prevMouse.y;
    
    const speed = Math.sqrt(state.velocity.x ** 2 + state.velocity.y ** 2);
    state.intensity = Math.min(speed / 20, 1);
}

// Mouse/Touch events
document.addEventListener('mousemove', (e) => {
    state.prevMouse = { ...state.mouse };
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    lastMouseMove = Date.now();
    setInteracting(true);
    
    // Create effects on movement
    if (Math.random() < state.intensity * 0.5) {
        createParticles(e.clientX, e.clientY, 2);
    }
    if (Math.random() < 0.02 && state.intensity > 0.3) {
        createShape(e.clientX, e.clientY);
    }
    
    // Update cursor position for custom cursor
    document.body.style.setProperty('--mouse-x', e.clientX + 'px');
    document.body.style.setProperty('--mouse-y', e.clientY + 'px');
});

document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    state.prevMouse = { ...state.mouse };
    state.mouse.x = touch.clientX;
    state.mouse.y = touch.clientY;
    lastMouseMove = Date.now();
    setInteracting(true);
    
    if (Math.random() < 0.3) {
        createParticles(touch.clientX, touch.clientY, 3);
    }
});

// Scroll detection
let scrollTimeout;
window.addEventListener('scroll', () => {
    lastScroll = Date.now();
    setInteracting(true);
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (Date.now() - lastMouseMove > 150) {
            setInteracting(false);
        }
    }, 150);
    
    updateScrollProgress();
});

// Idle detection
setInterval(() => {
    const timeSinceLastMove = Date.now() - lastMouseMove;
    const timeSinceLastScroll = Date.now() - lastScroll;
    
    if (timeSinceLastMove > 200 && timeSinceLastScroll > 200) {
        setInteracting(false);
    }
}, 100);

// ===== SCROLL & THEME =====
function updateScrollProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = (window.scrollY / scrollHeight) * 100;
    
    // Update chapter and theme
    const sections = document.querySelectorAll('.narrative-section');
    sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.6 && rect.bottom > window.innerHeight * 0.4) {
            state.currentChapter = index;
            const newTheme = section.dataset.theme;
            if (newTheme && newTheme !== state.currentTheme) {
                state.currentTheme = newTheme;
                updateBodyBackground();
            }
        }
    });
}

function updateBodyBackground() {
    const theme = themes[state.currentTheme];
    document.body.style.background = `linear-gradient(135deg, 
        rgb(${theme.primary[0] - 40}, ${theme.primary[1] - 40}, ${theme.primary[2] - 40}) 0%, 
        rgb(${theme.secondary[0] - 20}, ${theme.secondary[1] - 20}, ${theme.secondary[2] - 20}) 100%)`;
}

// ===== TEXT REVEAL SYSTEM =====
function checkProximityReveals() {
    const fragments = document.querySelectorAll('.text-fragment[data-reveal-type="proximity"]');
    
    fragments.forEach(fragment => {
        if (state.revealedFragments.has(fragment)) return;
        
        const rect = fragment.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const distance = Math.sqrt(
            (state.mouse.x - centerX) ** 2 + 
            (state.mouse.y - centerY) ** 2
        );
        
        const threshold = parseInt(fragment.dataset.threshold);
        
        if (distance < threshold) {
            fragment.classList.add('proximity-active', 'revealed');
            state.revealedFragments.add(fragment);
            createParticles(centerX, centerY, 8);
            createShape(centerX, centerY);
        }
    });
}

function checkScrollReveals() {
    const fragments = document.querySelectorAll('.text-fragment[data-reveal-type="scroll"]');
    
    fragments.forEach(fragment => {
        if (state.revealedFragments.has(fragment)) return;
        
        const threshold = parseFloat(fragment.dataset.threshold);
        
        if (state.scrollProgress >= threshold * 100) {
            fragment.classList.add('revealed');
            state.revealedFragments.add(fragment);
            const rect = fragment.getBoundingClientRect();
            createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 12);
        }
    });
}

function checkIdleReveals() {
    if (!state.idleStartTime) return;
    
    const idleTime = Date.now() - state.idleStartTime;
    const fragments = document.querySelectorAll('.text-fragment[data-reveal-type="idle"]');
    
    fragments.forEach(fragment => {
        if (state.revealedFragments.has(fragment)) return;
        
        const threshold = parseInt(fragment.dataset.threshold);
        
        if (idleTime >= threshold) {
            fragment.classList.add('revealed');
            state.revealedFragments.add(fragment);
            const rect = fragment.getBoundingClientRect();
            createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 15);
        }
    });
}

function checkImmediateReveals() {
    const fragments = document.querySelectorAll('.text-fragment[data-reveal-type="immediate"]');
    fragments.forEach(fragment => {
        if (!state.revealedFragments.has(fragment)) {
            fragment.classList.add('revealed');
            state.revealedFragments.add(fragment);
        }
    });
}

// ===== HINT FADE =====
setTimeout(() => {
    document.getElementById('hint').classList.add('fade-out');
}, 3000);

// ===== MAIN ANIMATION LOOP =====
let lastTime = performance.now();

function animate(currentTime) {
    const delta = currentTime - lastTime;
    lastTime = currentTime;
    
    updateCustomTime(delta);
    updateSmoothMouse();
    
    // Update all systems
    threadSystem.update(state.smoothMouse.x, state.smoothMouse.y, state.customTime);
    threadSystem.draw(state.currentTheme);
    
    updateParticles();
    updateShapes();
    drawAura();
    
    // Check reveals
    checkProximityReveals();
    checkScrollReveals();
    checkIdleReveals();
    
    requestAnimationFrame(animate);
}

// ===== INITIALIZATION =====
checkImmediateReveals();
updateScrollProgress();
animate(performance.now());

console.log('🎨 Ephemeral initialized');
console.log('Move, scroll, pause — shape your experience');
