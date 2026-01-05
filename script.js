/**
 * CELESTIAL RESONANCE ENGINE
 * * Features:
 * - 3D Starfield with Z-axis depth
 * - Mobile Gyroscope Parallax
 * - Magnetic Touch Interaction
 * - "Capture Moment" Screenshot functionality
 */

const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');

// ===== STATE MANAGEMENT =====
const state = {
    width: window.innerWidth,
    height: window.innerHeight,
    particles: [],
    cursor: { x: window.innerWidth/2, y: window.innerHeight/2, active: false },
    tilt: { x: 0, y: 0 }, // Mobile tilt values
    scrollProgress: 0
};

// Configuration
const config = {
    particleCount: window.innerWidth < 768 ? 400 : 800, // Optimize for mobile
    baseSpeed: 2,
    colors: ['#ffffff', '#ffd700', '#87ceeb', '#ffb7b2']
};

// ===== SETUP & RESIZE =====
function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    
    // Re-initialize if particles look sparse
    if(state.particles.length === 0) initParticles();
}
window.addEventListener('resize', resize);
resize();

// ===== PARTICLE SYSTEM (3D STARS) =====
class Star {
    constructor() {
        this.reset(true); // true = random Z start
    }

    reset(randomZ = false) {
        this.x = (Math.random() - 0.5) * state.width * 2;
        this.y = (Math.random() - 0.5) * state.height * 2;
        // Z is depth: 0 is close, 2000 is far
        this.z = randomZ ? Math.random() * 2000 : 2000;
        this.size = Math.random();
        this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
        this.velZ = Math.random() * 2 + 0.5; // Speed
    }

    update() {
        // Move star towards camera (decrease Z)
        // Add scroll speed boost
        this.z -= this.velZ + (state.scrollProgress * 10);

        // Interaction: Orbit around cursor/finger
        if (state.cursor.active) {
            // Calculate distance to cursor in 2D projected space approximation
            const dx = this.x - (state.cursor.x - state.width/2);
            const dy = this.y - (state.cursor.y - state.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // If close, swirl around
            if (dist < 300) {
                const angle = Math.atan2(dy, dx);
                this.x -= Math.cos(angle + 1.5) * 5; // Orbit
                this.y -= Math.sin(angle + 1.5) * 5;
            }
        }

        // Mobile Parallax: Shift stars based on phone tilt
        this.x += state.tilt.x * 2;
        this.y += state.tilt.y * 2;

        // Reset if star passes camera (Z <= 0)
        if (this.z <= 0) this.reset();
    }

    draw() {
        // 3D Perspective Projection Logic
        const focalLength = 400;
        const scale = focalLength / (focalLength + this.z);
        
        const sx = state.width/2 + this.x * scale;
        const sy = state.height/2 + this.y * scale;
        
        // Skip drawing if off screen
        if (sx < 0 || sx > state.width || sy < 0 || sy > state.height) return;

        const r = this.size * scale * 3; // Size based on depth

        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        // Fade out distant stars
        const alpha = 1 - (this.z / 2000);
        ctx.globalAlpha = alpha;
        
        // Glow effect for close stars
        if (this.z < 500) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.fill();
        ctx.globalAlpha = 1; // Reset alpha
    }
}

// Initialize Stars
function initParticles() {
    state.particles = [];
    for(let i = 0; i < config.particleCount; i++) {
        state.particles.push(new Star());
    }
}

// ===== ANIMATION LOOP =====
function animate() {
    // Clear canvas with slight trail for "warp speed" effect
    ctx.fillStyle = 'rgba(2, 2, 4, 0.4)';
    ctx.fillRect(0, 0, state.width, state.height);

    state.particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}

// Start Animation
initParticles();
animate();

// ===== INTERACTION HANDLERS =====

// 1. Scroll & Reveal (Intersection Observer)
// This is robust: it watches when elements enter the viewport
const observerOptions = {
    threshold: 0.3 // Trigger when 30% visible
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
        }
    });
}, observerOptions);

document.querySelectorAll('.chapter').forEach(el => observer.observe(el));

// 2. Mouse/Touch Tracking
function updateCursor(x, y) {
    state.cursor.x = x;
    state.cursor.y = y;
    state.cursor.active = true;

    // Clear active state after 1 second of no movement
    clearTimeout(window.cursorTimeout);
    window.cursorTimeout = setTimeout(() => {
        state.cursor.active = false;
    }, 1000);
}

window.addEventListener('mousemove', e => updateCursor(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
    // Prevent default scrolling only if needed (optional)
    updateCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

// 3. Mobile Gyroscope (Tilt)
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
        // Smoothly interpolate tilt values
        const x = e.gamma || 0; // Left/Right
        const y = e.beta || 0;  // Front/Back
        state.tilt.x += (x - state.tilt.x) * 0.1;
        state.tilt.y += (y - state.tilt.y) * 0.1;
    });
}

// 4. Capture Button Functionality
const btn = document.getElementById('capture-btn');
if (btn) {
    btn.addEventListener('click', () => {
        // Create a temporary high-res canvas for the snapshot
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = state.width;
        tempCanvas.height = state.height;
        const tCtx = tempCanvas.getContext('2d');
        
        // Fill background (otherwise it's transparent)
        tCtx.fillStyle = '#020204';
        tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw the current state of the main canvas
        tCtx.drawImage(canvas, 0, 0);
        
        // Add a Watermark
        tCtx.font = '20px Montserrat';
        tCtx.fillStyle = 'rgba(255,255,255,0.5)';
        tCtx.fillText('Celestial Resonance', 40, state.height - 40);

        // Download logic
        const link = document.createElement('a');
        link.download = `celestial-moment-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();

        // Button Feedback Animation
        const originalIcon = btn.innerHTML;
        btn.innerHTML = '<span style="font-size:1.5rem">✓</span>';
        setTimeout(() => btn.innerHTML = originalIcon, 2000);
    });
}/**
 * CELESTIAL RESONANCE ENGINE
 * A 3D interactive particle system with physics and mobile-responsiveness.
 */

const canvas = document.getElementById('cosmosCanvas');
const ctx = canvas.getContext('2d');

// ===== STATE & CONFIG =====
const state = {
    width: window.innerWidth,
    height: window.innerHeight,
    particles: [],
    cursor: { x: window.innerWidth/2, y: window.innerHeight/2, active: false },
    tilt: { x: 0, y: 0 }, // For mobile gyroscope
    scrollProgress: 0,
    time: 0
};

const config = {
    particleCount: window.innerWidth < 768 ? 400 : 900, // Optimize for mobile
    connectionDist: 100,
    baseSpeed: 0.5,
    colors: ['#ffffff', '#ffd700', '#87ceeb', '#ffb7b2'] // Star colors
};

// ===== RESIZE HANDLER =====
function resize() {
    state.width = window.innerWidth;
    state.height = window.innerHeight;
    canvas.width = state.width;
    canvas.height = state.height;
    // Re-init particles on drastic resize
    if (state.particles.length === 0) initParticles();
}
window.addEventListener('resize', resize);
resize();

// ===== PARTICLE CLASS =====
class Star {
    constructor() {
        this.reset();
        // Start randomly in 3D space
        this.z = Math.random() * 2000; 
    }

    reset() {
        this.x = (Math.random() - 0.5) * state.width * 3;
        this.y = (Math.random() - 0.5) * state.height * 3;
        this.z = 2000; // Start far away
        this.size = Math.random() * 2;
        this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
        this.velZ = Math.random() * 2 + 1; // Z-axis speed
    }

    update() {
        // Move towards camera
        this.z -= this.velZ + (state.scrollProgress * 5);

        // Interaction: Orbit around cursor
        if (state.cursor.active) {
            const dx = this.x - (state.cursor.x - state.width/2) * 2; // Adjust for 3D coordinate system
            const dy = this.y - (state.cursor.y - state.height/2) * 2;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            if (dist < 400) {
                // Orbital physics
                const angle = Math.atan2(dy, dx);
                const force = (400 - dist) / 400;
                
                this.x -= Math.cos(angle + Math.PI/2) * force * 10;
                this.y -= Math.sin(angle + Math.PI/2) * force * 10;
            }
        }

        // Mobile Tilt Parallax
        this.x += state.tilt.x * 2;
        this.y += state.tilt.y * 2;

        // Reset if passed camera
        if (this.z <= 0) this.reset();
    }

    draw() {
        // 3D Projection Math
        // Perspective formula: screenX = x / z * focalLength
        const focalLength = 400;
        const scale = focalLength / (focalLength + this.z);
        
        const sx = state.width/2 + this.x * scale;
        const sy = state.height/2 + this.y * scale;
        
        // Don't draw if off screen
        if (sx < 0 || sx > state.width || sy < 0 || sy > state.height) return;

        ctx.beginPath();
        ctx.arc(sx, sy, this.size * scale * 2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        
        // Glow effect based on proximity
        const alpha = 1 - (this.z / 2000);
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10 * scale;
        ctx.shadowColor = this.color;
        
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Optional: Draw connections (constellations)
        // Only for close stars to save performance
        if (this.z < 500) {
            this.drawConnections(sx, sy);
        }
    }

    drawConnections(sx, sy) {
        // Simple proximity check with random neighbors
        // Note: Real O(N^2) check is too heavy, checking random subset
        // or just letting the visual density handle it.
        // Here we just draw a faint trail for "motion blur" feel
        const length = this.velZ * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + length);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
    }
}

// ===== SYSTEM INIT =====
function initParticles() {
    state.particles = [];
    for(let i = 0; i < config.particleCount; i++) {
        state.particles.push(new Star());
    }
}
initParticles();

// ===== ANIMATION LOOP =====
function animate() {
    // Clear canvas with trail effect for "warp speed" feel
    ctx.fillStyle = 'rgba(2, 2, 4, 0.3)';
    ctx.fillRect(0, 0, state.width, state.height);

    state.particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(animate);
}
animate();

// ===== INTERACTION EVENTS =====

// 1. Scroll Progress
window.addEventListener('scroll', () => {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    state.scrollProgress = window.scrollY / docHeight;
    
    // Check chapter visibility
    document.querySelectorAll('.chapter').forEach(chap => {
        const rect = chap.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.75 && rect.bottom > 0) {
            chap.classList.add('in-view');
        }
    });
});

// 2. Mouse/Touch Move (Magnetic)
function updateCursor(x, y) {
    state.cursor.x = x;
    state.cursor.y = y;
    state.cursor.active = true;
    
    // Magnetic Text Effect
    document.querySelectorAll('.magnetic-text, .magnetic-btn').forEach(el => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 200) {
            const pull = 0.1;
            el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
        } else {
            el.style.transform = 'translate(0, 0)';
        }
    });
    
    clearTimeout(window.cursorTimeout);
    window.cursorTimeout = setTimeout(() => {
        state.cursor.active = false;
        // Reset text positions
        document.querySelectorAll('.magnetic-text').forEach(el => {
            el.style.transform = 'translate(0,0)';
        });
    }, 1000);
}

window.addEventListener('mousemove', e => updateCursor(e.clientX, e.clientY));
window.addEventListener('touchmove', e => {
    updateCursor(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

// 3. Mobile Gyroscope (Tilt)
if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', e => {
        // Normalizing tilt values
        const x = e.gamma || 0; // Left/Right
        const y = e.beta || 0;  // Front/Back
        
        // Smooth interpolation
        state.tilt.x += (x - state.tilt.x) * 0.1;
        state.tilt.y += (y - state.tilt.y) * 0.1;
    });
}

// 4. Capture Feature
document.getElementById('capture-btn').addEventListener('click', () => {
    // 1. Temporarily render high-quality opaque background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = state.width;
    tempCanvas.height = state.height;
    const tCtx = tempCanvas.getContext('2d');
    
    // Fill black background
    tCtx.fillStyle = '#020204';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw current canvas state over it
    tCtx.drawImage(canvas, 0, 0);
    
    // Add watermark
    tCtx.font = '20px Montserrat';
    tCtx.fillStyle = 'rgba(255,255,255,0.5)';
    tCtx.fillText('Celestial Resonance', 40, state.height - 40);

    // Download
    const link = document.createElement('a');
    link.download = `celestial-moment-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
    
    // Visual feedback
    const btn = document.getElementById('capture-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '✓';
    setTimeout(() => btn.innerHTML = originalContent, 2000);
});
