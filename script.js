// ===== CORE STATE MANAGEMENT =====
const state = {
    customTime: 0,
    lastInteractionTime: 0,
    isInteracting: false,
    scrollProgress: 0,
    currentChapter: 1,
    mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    prevMouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    idleStartTime: null,
    revealedFragments: new Set()
};

// ===== CANVAS SETUP =====
const canvas = document.getElementById('threadCanvas');
const ctx = canvas.getContext('2d');
let width, height;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ===== THREAD ANIMATION SYSTEM =====
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
        
        this.vx *= 0.9;
        this.vy *= 0.9;
        
        this.x += this.vx;
        this.y += this.vy;
    }
}

class ThreadSystem {
    constructor() {
        this.points = [];
        this.segments = 40;
        this.initializePoints();
    }

    initializePoints() {
        for (let i = 0; i < this.segments; i++) {
            const x = width / 2;
            const y = height / 2;
            this.points.push(new ThreadPoint(x, y));
        }
    }

    update(mouseX, mouseY, time) {
        const scrollInfluence = state.scrollProgress * 0.01;
        
        // First point follows mouse with organic motion
        const phase = time * 0.001;
        const wobbleX = Math.sin(phase * 2) * 20 * (1 - scrollInfluence);
        const wobbleY = Math.cos(phase * 1.5) * 20 * (1 - scrollInfluence);
        
        this.points[0].update(
            mouseX + wobbleX,
            mouseY + wobbleY,
            0.08
        );

        // Each subsequent point follows the previous with delay
        for (let i = 1; i < this.points.length; i++) {
            const prev = this.points[i - 1];
            const easing = 0.05 + (i / this.segments) * 0.02;
            
            // Add wave motion based on scroll
            const wavePhase = phase + i * 0.3;
            const waveX = Math.sin(wavePhase) * 30 * scrollInfluence;
            const waveY = Math.cos(wavePhase * 0.8) * 30 * scrollInfluence;
            
            this.points[i].update(
                prev.x + waveX,
                prev.y + waveY,
                easing
            );
        }
    }

    draw() {
        ctx.clearRect(0, 0, width, height);
        
        // Draw glow layer
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(100, 150, 255, 0.6)';
        
        // Draw main thread
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.points.length; i++) {
            const point = this.points[i];
            const prevPoint = this.points[i - 1];
            
            const cpX = (prevPoint.x + point.x) / 2;
            const cpY = (prevPoint.y + point.y) / 2;
            
            ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, cpX, cpY);
        }
        
        // Gradient stroke
        const gradient = ctx.createLinearGradient(
            this.points[0].x, this.points[0].y,
            this.points[this.points.length - 1].x, this.points[this.points.length - 1].y
        );
        
        const alpha = state.isInteracting ? 0.9 : 0.5;
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(100, 150, 255, ${alpha * 0.8})`);
        gradient.addColorStop(1, `rgba(150, 100, 255, ${alpha * 0.6})`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3 + state.scrollProgress * 0.02;
        ctx.lineCap = 'round';
        ctx.stroke();
        
        // Draw points
        this.points.forEach((point, i) => {
            if (i % 5 === 0) {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + alpha * 0.3})`;
                ctx.fill();
            }
        });
        
        ctx.shadowBlur = 0;
    }
}

const threadSystem = new ThreadSystem();

// ===== CUSTOM TIME SYSTEM =====
function updateCustomTime(delta) {
    if (state.isInteracting) {
        state.customTime += delta * 0.001; // Convert to seconds
    }
}

// ===== INTERACTION DETECTION =====
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

// Mouse/Touch movement
document.addEventListener('mousemove', (e) => {
    state.prevMouse.x = state.mouse.x;
    state.prevMouse.y = state.mouse.y;
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    lastMouseMove = Date.now();
    setInteracting(true);
});

document.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    state.prevMouse.x = state.mouse.x;
    state.prevMouse.y = state.mouse.y;
    state.mouse.x = touch.clientX;
    state.mouse.y = touch.clientY;
    lastMouseMove = Date.now();
    setInteracting(true);
});

// Scroll detection
let scrollTimeout;
window.addEventListener('scroll', () => {
    lastScroll = Date.now();
    setInteracting(true);
    
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        if (Date.now() - lastMouseMove > 100) {
            setInteracting(false);
        }
    }, 100);
    
    updateScrollProgress();
});

// Check for idle state
setInterval(() => {
    const timeSinceLastMove = Date.now() - lastMouseMove;
    const timeSinceLastScroll = Date.now() - lastScroll;
    
    if (timeSinceLastMove > 200 && timeSinceLastScroll > 200) {
        setInteracting(false);
    }
}, 100);

// ===== SCROLL PROGRESS =====
function updateScrollProgress() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = (window.scrollY / scrollHeight) * 100;
    
    // Update current chapter based on scroll
    const sections = document.querySelectorAll('.narrative-section');
    sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
            state.currentChapter = index + 1;
        }
    });
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
            Math.pow(state.mouse.x - centerX, 2) + 
            Math.pow(state.mouse.y - centerY, 2)
        );
        
        const threshold = parseInt(fragment.dataset.threshold);
        
        if (distance < threshold) {
            fragment.classList.add('proximity-active');
            fragment.classList.add('revealed');
            state.revealedFragments.add(fragment);
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
        }
    });
}

// ===== DEBUG PANEL =====
function updateDebugPanel() {
    document.getElementById('customTime').textContent = state.customTime.toFixed(2);
    document.getElementById('scrollProgress').textContent = state.scrollProgress.toFixed(1);
    document.getElementById('currentChapter').textContent = state.currentChapter;
}

// ===== MAIN ANIMATION LOOP =====
let lastTime = performance.now();

function animate(currentTime) {
    const delta = currentTime - lastTime;
    lastTime = currentTime;
    
    updateCustomTime(delta);
    
    threadSystem.update(state.mouse.x, state.mouse.y, state.customTime);
    threadSystem.draw();
    
    checkProximityReveals();
    checkScrollReveals();
    checkIdleReveals();
    
    updateDebugPanel();
    
    requestAnimationFrame(animate);
}

// ===== INITIALIZATION =====
updateScrollProgress();
animate(performance.now());

console.log('Thread Experience initialized. Interact to explore.');
