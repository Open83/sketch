/**
 * THE MUSE ENGINE
 * A generative flow-field art system
 * Optimized for mobile performance and touch interaction
 */

const canvas = document.getElementById('artCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimization

// ===== CONFIGURATION =====
const config = {
    particleCount: window.innerWidth < 768 ? 800 : 1500, // Fewer particles on mobile for FPS
    baseSpeed: 1,
    trailOpacity: 0.08, // Creates the watercolor bleed effect
    interactionRadius: 150,
    colorTransitionSpeed: 0.02
};

// ===== PALETTES =====
// Each chapter has a distinct emotional color scheme
const palettes = {
    dawn:   { r: 255, g: 182, b: 193 }, // Light Pink
    rose:   { r: 220, g: 20,  b: 60  }, // Crimson
    ocean:  { r: 0,   g: 255, b: 255 }, // Cyan/Aqua
    gold:   { r: 255, g: 215, b: 0   }, // Gold
    midnight:{ r: 147, g: 112, b: 219 } // Purple
};

let currentState = {
    width: 0,
    height: 0,
    particles: [],
    flowField: [],
    cols: 0,
    rows: 0,
    cellSize: 20,
    zOff: 0, // Time dimension for noise
    targetColor: palettes.dawn,
    currentColor: { ...palettes.dawn },
    mouse: { x: -1000, y: -1000, active: false }
};

// ===== NOISE FUNCTION (Simple pseudo-random) =====
// Using a simple sin/cos mix for fluid motion without heavy libraries
function noise(x, y, z) {
    return Math.sin(x * 0.01 + z) + Math.cos(y * 0.01 + z) * Math.sin(z * 0.5);
}

// ===== PARTICLE SYSTEM =====
class Particle {
    constructor() {
        this.reset();
        // Start randomly on screen
        this.pos.x = Math.random() * currentState.width;
        this.pos.y = Math.random() * currentState.height;
    }

    reset() {
        this.pos = { x: Math.random() * currentState.width, y: Math.random() * currentState.height };
        this.vel = { x: 0, y: 0 };
        this.acc = { x: 0, y: 0 };
        this.maxSpeed = config.baseSpeed + Math.random();
        this.prevPos = { ...this.pos };
        this.width = Math.random() * 2 + 0.5; // Varied brush stroke width
    }

    follow(flowField) {
        const x = Math.floor(this.pos.x / currentState.cellSize);
        const y = Math.floor(this.pos.y / currentState.cellSize);
        const index = x + y * currentState.cols;
        
        if (flowField[index]) {
            const angle = flowField[index];
            this.acc.x += Math.cos(angle) * 0.5;
            this.acc.y += Math.sin(angle) * 0.5;
        }
    }

    applyInteraction() {
        if (!currentState.mouse.active) return;

        const dx = currentState.mouse.x - this.pos.x;
        const dy = currentState.mouse.y - this.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < config.interactionRadius) {
            const force = (config.interactionRadius - dist) / config.interactionRadius;
            const angle = Math.atan2(dy, dx);
            // Push away/swirl effect
            this.acc.x -= Math.cos(angle) * force * 2;
            this.acc.y -= Math.sin(angle) * force * 2;
        }
    }

    update() {
        this.vel.x += this.acc.x;
        this.vel.y += this.acc.y;
        
        // Limit speed
        const speed = Math.sqrt(this.vel.x**2 + this.vel.y**2);
        if (speed > this.maxSpeed) {
            this.vel.x = (this.vel.x / speed) * this.maxSpeed;
            this.vel.y = (this.vel.y / speed) * this.maxSpeed;
        }

        this.prevPos.x = this.pos.x;
        this.prevPos.y = this.pos.y;
        
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        
        this.acc.x = 0;
        this.acc.y = 0;

        // Wrap around edges
        if (this.pos.x > currentState.width) { this.pos.x = 0; this.prevPos.x = 0; }
        if (this.pos.x < 0) { this.pos.x = currentState.width; this.prevPos.x = currentState.width; }
        if (this.pos.y > currentState.height) { this.pos.y = 0; this.prevPos.y = 0; }
        if (this.pos.y < 0) { this.pos.y = currentState.height; this.prevPos.y = currentState.height; }
    }

    draw() {
        ctx.beginPath();
        ctx.moveTo(this.prevPos.x, this.prevPos.y);
        ctx.lineTo(this.pos.x, this.pos.y);
        
        // Color blending
        const c = currentState.currentColor;
        // Vary alpha slightly for depth
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${Math.random() * 0.3 + 0.1})`;
        ctx.lineWidth = this.width;
        ctx.stroke();
    }
}

// ===== ENGINE FUNCTIONS =====

function init() {
    currentState.width = window.innerWidth;
    currentState.height = window.innerHeight;
    canvas.width = currentState.width;
    canvas.height = currentState.height;
    
    currentState.cols = Math.floor(currentState.width / currentState.cellSize);
    currentState.rows = Math.floor(currentState.height / currentState.cellSize);
    
    // Create particles
    currentState.particles = [];
    for (let i = 0; i < config.particleCount; i++) {
        currentState.particles.push(new Particle());
    }

    // Initial background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, currentState.width, currentState.height);
}

function updateFlowField() {
    currentState.zOff += 0.005; // Time moves forward
    
    for (let y = 0; y < currentState.rows; y++) {
        for (let x = 0; x < currentState.cols; x++) {
            const index = x + y * currentState.cols;
            // Noise angle (multiply by PI*4 for full rotation)
            const angle = noise(x, y, currentState.zOff) * Math.PI * 4;
            // Guide vector
            currentState.flowField[index] = angle;
        }
    }
}

function lerpColor() {
    const c = currentState.currentColor;
    const t = currentState.targetColor;
    const speed = config.colorTransitionSpeed;
    
    c.r += (t.r - c.r) * speed;
    c.g += (t.g - c.g) * speed;
    c.b += (t.b - c.b) * speed;
}

function animate() {
    // Fade out previous frames slightly to create trails
    // Instead of clearRect, we draw a semi-transparent black rect
    ctx.fillStyle = `rgba(5, 5, 5, ${config.trailOpacity})`;
    ctx.fillRect(0, 0, currentState.width, currentState.height);

    updateFlowField();
    lerpColor();

    currentState.particles.forEach(p => {
        p.follow(currentState.flowField);
        p.applyInteraction();
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// ===== EVENTS & INTERACTION =====

// Resize
window.addEventListener('resize', () => {
    // Debounce resize
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(init, 200);
});

// Scroll / Theme Change
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            const paletteName = entry.target.dataset.palette;
            if (palettes[paletteName]) {
                currentState.targetColor = palettes[paletteName];
            }
        }
    });
}, { threshold: 0.4 });

document.querySelectorAll('.chapter').forEach(el => observer.observe(el));

// Mouse & Touch
function updatePointer(x, y) {
    currentState.mouse.x = x;
    currentState.mouse.y = y;
    currentState.mouse.active = true;
    
    // Clear active state after inactivity
    clearTimeout(window.pointerTimeout);
    window.pointerTimeout = setTimeout(() => {
        currentState.mouse.active = false;
    }, 1000);
}

window.addEventListener('mousemove', e => updatePointer(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
    updatePointer(e.touches[0].clientX, e.touches[0].clientY);
    // e.preventDefault(); // Optional: uncomment if scroll interference is an issue
}, { passive: false });

// Initialize
init();
animate();

// Console art
console.log("%c The Muse ", "background: #222; color: #bada55; padding: 10px; border-radius: 5px;");
