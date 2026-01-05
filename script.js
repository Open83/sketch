// ===== CORE STATE =====
const state = {
    customTime: 0,
    scrollProgress: 0,
    currentChapter: 0,
    currentTheme: 'vision',
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    smoothMouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    velocity: { x: 0, y: 0 }, // Mouse velocity
    intensity: 0, // Calculated from velocity
    revealedFragments: new Set()
};

// Professional Color Palettes (R, G, B)
const themes = {
    vision: { primary: [2, 12, 27], secondary: [10, 25, 47], accent: [100, 255, 218] },
    foundation: { primary: [28, 28, 28], secondary: [45, 45, 45], accent: [224, 224, 224] },
    momentum: { primary: [15, 23, 42], secondary: [30, 41, 59], accent: [56, 189, 248] },
    structure: { primary: [30, 58, 138], secondary: [23, 37, 84], accent: [147, 197, 253] },
    synergy: { primary: [46, 16, 101], secondary: [76, 29, 149], accent: [244, 114, 182] },
    mastery: { primary: [0, 0, 0], secondary: [26, 26, 26], accent: [251, 191, 36] },
    legacy: { primary: [17, 24, 39], secondary: [55, 65, 81], accent: [255, 255, 255] }
};

// ===== CANVAS SETUP =====
const canvases = ['particleCanvas', 'geometryCanvas', 'threadCanvas', 'auraCanvas'];
const ctxs = {};
let width, height;

canvases.forEach(id => {
    const canvas = document.getElementById(id);
    ctxs[id] = canvas.getContext('2d');
});

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvases.forEach(id => {
        document.getElementById(id).width = width;
        document.getElementById(id).height = height;
    });
}
resize();
window.addEventListener('resize', resize);

// ===== UTILS =====
const lerp = (s, e, t) => s + (e - s) * t;
const getColor = (theme, type, a = 1) => {
    const c = themes[theme][type];
    return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
};

// ===== SYSTEMS =====

// 1. Data Sparks (Particles)
class Spark {
    constructor(x, y, burst = false) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = burst ? Math.random() * 5 + 2 : Math.random() * 0.5;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.01;
        this.size = Math.random() * 2 + 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.95; // Friction
        this.vy *= 0.95;
        this.life -= this.decay;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.fillStyle = getColor(state.currentTheme, 'accent', this.life);
        ctx.fillRect(this.x, this.y, this.size, this.size); // Square pixels for "digital" feel
    }
}

let sparks = [];

// 2. Structural Geometry (Hexagons & Squares)
class BlueprintShape {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = Math.random() > 0.5 ? 'hex' : 'rect';
        this.size = 0;
        this.maxSize = 20 + Math.random() * 40;
        this.life = 1;
        this.rotation = Math.random() * Math.PI;
    }

    update() {
        this.size = lerp(this.size, this.maxSize, 0.1);
        this.rotation += 0.01;
        this.life -= 0.005;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.strokeStyle = getColor(state.currentTheme, 'secondary', this.life * 0.5);
        ctx.lineWidth = 1;

        if (this.type === 'rect') {
            ctx.strokeRect(-this.size/2, -this.size/2, this.size, this.size);
        } else {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (Math.PI / 3) * i;
                const sx = Math.cos(angle) * this.size * 0.6;
                const sy = Math.sin(angle) * this.size * 0.6;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
            ctx.stroke();
        }
        ctx.restore();
    }
}

let shapes = [];

// 3. Focus Thread (The "Flow" Line)
class FocusThread {
    constructor() {
        this.points = Array(40).fill().map(() => ({x: width/2, y: height/2}));
    }

    update() {
        // Head follows mouse
        let targetX = state.smoothMouse.x;
        let targetY = state.smoothMouse.y;
        
        // Add "wobble" based on intensity (effort)
        targetX += (Math.random() - 0.5) * state.intensity * 20;
        targetY += (Math.random() - 0.5) * state.intensity * 20;

        this.points[0].x = lerp(this.points[0].x, targetX, 0.2);
        this.points[0].y = lerp(this.points[0].y, targetY, 0.2);

        // Tail follows head
        for (let i = 1; i < this.points.length; i++) {
            const p = this.points[i];
            const prev = this.points[i-1];
            p.x = lerp(p.x, prev.x, 0.25);
            p.y = lerp(p.y, prev.y, 0.25);
        }
    }

    draw(ctx) {
        ctx.clearRect(0, 0, width, height);
        
        if (this.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        // Draw Catmull-Rom or Quadratic curve
        for (let i = 1; i < this.points.length - 1; i++) {
            const xc = (this.points[i].x + this.points[i+1].x) / 2;
            const yc = (this.points[i].y + this.points[i+1].y) / 2;
            ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
        }
        
        const alpha = 0.5 + state.intensity * 0.5;
        ctx.strokeStyle = getColor(state.currentTheme, 'accent', alpha);
        ctx.lineWidth = 1 + state.intensity * 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 10 + state.intensity * 20;
        ctx.shadowColor = getColor(state.currentTheme, 'accent', 1);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}

const thread = new FocusThread();

// ===== MAIN LOOP =====
function animate() {
    // 1. Mouse Physics
    state.smoothMouse.x = lerp(state.smoothMouse.x, state.mouse.x, 0.1);
    state.smoothMouse.y = lerp(state.smoothMouse.y, state.mouse.y, 0.1);
    
    const dx = state.mouse.x - state.smoothMouse.x;
    const dy = state.mouse.y - state.smoothMouse.y;
    const speed = Math.sqrt(dx*dx + dy*dy);
    state.intensity = Math.min(speed / 50, 1); // Normalize 0 to 1

    // 2. Particles
    ctxs.particleCanvas.clearRect(0, 0, width, height);
    if (Math.random() < 0.1 + state.intensity * 0.5) {
        sparks.push(new Spark(state.mouse.x, state.mouse.y, false));
    }
    sparks = sparks.filter(p => p.update());
    sparks.forEach(p => p.draw(ctxs.particleCanvas));

    // 3. Geometry
    ctxs.geometryCanvas.clearRect(0, 0, width, height);
    // Create shapes on rapid movement or "clicks" (simulated by high intensity)
    if (state.intensity > 0.8 && Math.random() < 0.2) {
        shapes.push(new BlueprintShape(state.mouse.x, state.mouse.y));
    }
    shapes = shapes.filter(s => s.update());
    shapes.forEach(s => s.draw(ctxs.geometryCanvas));

    // 4. Thread
    thread.update();
    thread.draw(ctxs.threadCanvas);

    // 5. Aura (Focus Field)
    const ac = ctxs.auraCanvas;
    ac.clearRect(0, 0, width, height);
    const grad = ac.createRadialGradient(
        state.smoothMouse.x, state.smoothMouse.y, 0,
        state.smoothMouse.x, state.smoothMouse.y, 200 + state.intensity * 100
    );
    grad.addColorStop(0, getColor(state.currentTheme, 'primary', 0.2));
    grad.addColorStop(1, 'transparent');
    ac.fillStyle = grad;
    ac.fillRect(0, 0, width, height);

    // 6. Text Logic
    checkReveals();

    requestAnimationFrame(animate);
}

// ===== INTERACTION HANDLERS =====
function updateTheme() {
    const scrollP = window.scrollY + window.innerHeight * 0.5;
    const sections = document.querySelectorAll('.narrative-section');
    
    sections.forEach((sec, idx) => {
        const top = sec.offsetTop;
        const bottom = top + sec.offsetHeight;
        
        if (scrollP >= top && scrollP < bottom) {
            const newTheme = sec.dataset.theme;
            if (state.currentTheme !== newTheme) {
                state.currentTheme = newTheme;
                updateBodyStyle();
            }
        }
    });
}

function updateBodyStyle() {
    const t = themes[state.currentTheme];
    // Dynamic background transition
    document.body.style.background = `linear-gradient(135deg, 
        rgba(${t.primary.join(',')},1) 0%, 
        rgba(${t.secondary.join(',')},1) 100%)`;
    
    // Update accent color for CSS text
    const accentString = `rgb(${t.accent.join(',')})`;
    document.documentElement.style.setProperty('--current-accent', accentString);
}

function checkReveals() {
    const fragments = document.querySelectorAll('.text-fragment:not(.revealed)');
    fragments.forEach(f => {
        const rect = f.getBoundingClientRect();
        
        // Reveal if visible on screen
        if (rect.top < window.innerHeight * 0.85) {
            f.classList.add('revealed');
            
            // Spawn bursts when words appear
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            for(let i=0; i<10; i++) sparks.push(new Spark(cx, cy, true));
        }
    });
}

// Event Listeners
window.addEventListener('mousemove', e => {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
});
window.addEventListener('scroll', updateTheme);

// Init
setTimeout(() => document.getElementById('hint').classList.add('fade-out'), 3000);
updateBodyStyle();
animate();
