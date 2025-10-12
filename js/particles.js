// Advanced Particle System for ADV Technologies
class AdvancedParticleSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: -100, y: -100 };
        this.connectionDistance = 120;
        this.mouseInfluence = 100;
        this.resizeCanvas();
        this.createParticles();
        this.bindEvents();
        this.animate();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const area = width * height;
        let particleCount;

        const isMobile = width < 768;
        const isTablet = width >= 768 && width < 1200;

        if (isMobile) {
            particleCount = Math.floor(area / 30000);
            this.connectionDistance = 80;
            this.mouseInfluence = 60;
        } else if (isTablet) {
            particleCount = Math.floor(area / 25000);
            this.connectionDistance = 100;
            this.mouseInfluence = 80;
        } else {
            particleCount = Math.floor(area / 20000);
            this.connectionDistance = 120;
            this.mouseInfluence = 100;
        }

        particleCount = Math.max(15, Math.min(particleCount, 100));
        this.particles = [];

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * (isMobile ? 1.2 : 1.8),
                vy: (Math.random() - 0.5) * (isMobile ? 1.2 : 1.8),
                size: Math.random() * (isMobile ? 2.5 : 3.5) + 1,
                opacity: Math.random() * 0.6 + 0.3,
                baseOpacity: Math.random() * 0.6 + 0.3,
                glowIntensity: Math.random() * 0.5 + 0.5,
                twinkleSpeed: Math.random() * 0.02 + 0.01,
                twinkleOffset: Math.random() * Math.PI * 2,
                trail: []
            });
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createParticles();
        });

        const handleMove = (e) => {
            if (e.touches) {
                this.mouse.x = e.touches[0].clientX;
                this.mouse.y = e.touches[0].clientY;
            } else {
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            }
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('touchmove', handleMove, { passive: true });
        
        window.addEventListener('touchend', () => {
            this.mouse.x = -100;
            this.mouse.y = -100;
        });
    }

    updateParticles() {
        const time = Date.now() * 0.001;

        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.vx * 2.2;
            particle.y += particle.vy * 2.2;

            // Add random motion
            particle.vx += (Math.random() - 0.5) * 0.02;
            particle.vy += (Math.random() - 0.5) * 0.02;

            // Mouse interaction
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.mouseInfluence && distance > 0) {
                const force = Math.pow((this.mouseInfluence - distance) / this.mouseInfluence, 2);
                const angle = Math.atan2(dy, dx);
                
                // Apply displacement
                const displacementForce = force * 0.8;
                particle.vx -= Math.cos(angle) * displacementForce;
                particle.vy -= Math.sin(angle) * displacementForce;

                const immediateDisplacement = force * 8;
                particle.x -= Math.cos(angle) * immediateDisplacement;
                particle.y -= Math.sin(angle) * immediateDisplacement;

                // Visual effects
                particle.opacity = Math.min(1, particle.baseOpacity + force * 0.7);
                particle.glowIntensity = Math.min(2, particle.glowIntensity + force * 0.8);

                // Trail effect
                if (!particle.trail) particle.trail = [];
                particle.trail.push({
                    x: particle.x,
                    y: particle.y,
                    opacity: particle.opacity * 0.5,
                    life: 10
                });

                if (particle.trail.length > 5) {
                    particle.trail.shift();
                }
            } else {
                // Fade back to normal
                particle.opacity = particle.baseOpacity + (particle.opacity - particle.baseOpacity) * 0.95;
                particle.glowIntensity *= 0.96;

                // Update trail
                if (particle.trail && particle.trail.length > 0) {
                    particle.trail.forEach(trailPoint => trailPoint.life--);
                    particle.trail = particle.trail.filter(trailPoint => trailPoint.life > 0);
                }
            }

            // Boundary handling with margin
            const margin = 20;
            
            if (particle.x <= margin) {
                particle.x = margin + 1;
                particle.vx = Math.abs(particle.vx) * 0.8 + 0.2;
            } else if (particle.x >= this.canvas.width - margin) {
                particle.x = this.canvas.width - margin - 1;
                particle.vx = -Math.abs(particle.vx) * 0.8 - 0.2;
            }

            if (particle.y <= margin) {
                particle.y = margin + 1;
                particle.vy = Math.abs(particle.vy) * 0.8 + 0.2;
            } else if (particle.y >= this.canvas.height - margin) {
                particle.y = this.canvas.height - margin - 1;
                particle.vy = -Math.abs(particle.vy) * 0.8 - 0.2;
            }

            // Edge repulsion
            const edgeRepulsion = 0.02;
            if (particle.x < this.canvas.width * 0.1) {
                particle.vx += edgeRepulsion * (1 - particle.x / (this.canvas.width * 0.1));
            } else if (particle.x > this.canvas.width * 0.9) {
                particle.vx -= edgeRepulsion * (1 - (this.canvas.width - particle.x) / (this.canvas.width * 0.1));
            }

            if (particle.y < this.canvas.height * 0.1) {
                particle.vy += edgeRepulsion * (1 - particle.y / (this.canvas.height * 0.1));
            } else if (particle.y > this.canvas.height * 0.9) {
                particle.vy -= edgeRepulsion * (1 - (this.canvas.height - particle.y) / (this.canvas.height * 0.1));
            }

            // Velocity limits
            const maxVel = 2.5;
            if (Math.abs(particle.vx) > maxVel) particle.vx = maxVel * Math.sign(particle.vx);
            if (Math.abs(particle.vy) > maxVel) particle.vy = maxVel * Math.sign(particle.vy);

            // Damping
            particle.vx *= 0.995;
            particle.vy *= 0.995;

            // Twinkle effect
            const twinkle = Math.sin(time * particle.twinkleSpeed + particle.twinkleOffset);
            particle.opacity += twinkle * 0.1;
        });
    }

    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw connections
        this.particles.forEach((particle, i) => {
            this.particles.slice(i + 1).forEach(otherParticle => {
                const dx = particle.x - otherParticle.x;
                const dy = particle.y - otherParticle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < this.connectionDistance) {
                    const opacity = (1 - distance / this.connectionDistance) * 0.4;
                    let connectionOpacity = opacity;

                    // Mouse influence on connections
                    const avgX = (particle.x + otherParticle.x) / 2;
                    const avgY = (particle.y + otherParticle.y) / 2;
                    const mouseDistance = Math.sqrt(
                        (this.mouse.x - avgX) ** 2 + (this.mouse.y - avgY) ** 2
                    );

                    if (mouseDistance < this.mouseInfluence) {
                        const mouseEffect = 1 - (mouseDistance / this.mouseInfluence);
                        connectionOpacity = Math.min(1, opacity + mouseEffect * 0.5);
                    }

                    const gradient = this.ctx.createLinearGradient(
                        particle.x, particle.y, otherParticle.x, otherParticle.y
                    );
                    gradient.addColorStop(0, `rgba(255, 215, 0, ${connectionOpacity * particle.opacity})`);
                    gradient.addColorStop(1, `rgba(255, 215, 0, ${connectionOpacity * otherParticle.opacity})`);

                    this.ctx.beginPath();
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(otherParticle.x, otherParticle.y);
                    this.ctx.strokeStyle = gradient;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.stroke();
                }
            });
        });

        // Draw trails
        this.particles.forEach(particle => {
            if (particle.trail && particle.trail.length > 0) {
                particle.trail.forEach((trailPoint, index) => {
                    const trailOpacity = (trailPoint.life / 10) * trailPoint.opacity * 0.6;
                    const trailSize = particle.size * 0.7 * (trailPoint.life / 10);

                    const trailGradient = this.ctx.createRadialGradient(
                        trailPoint.x, trailPoint.y, 0,
                        trailPoint.x, trailPoint.y, trailSize * 3
                    );
                    trailGradient.addColorStop(0, `rgba(255, 215, 0, ${trailOpacity})`);
                    trailGradient.addColorStop(0.5, `rgba(255, 215, 0, ${trailOpacity * 0.4})`);
                    trailGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

                    this.ctx.beginPath();
                    this.ctx.arc(trailPoint.x, trailPoint.y, trailSize * 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = trailGradient;
                    this.ctx.fill();
                });
            }
        });

        // Draw particles
        this.particles.forEach(particle => {
            // Glow effect
            const glowSize = particle.size * particle.glowIntensity * 4;
            const gradient = this.ctx.createRadialGradient(
                particle.x, particle.y, 0,
                particle.x, particle.y, glowSize
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${particle.opacity * 0.9})`);
            gradient.addColorStop(0.3, `rgba(255, 215, 0, ${particle.opacity * 0.5})`);
            gradient.addColorStop(0.7, `rgba(255, 215, 0, ${particle.opacity * 0.2})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2);
            this.ctx.fillStyle = gradient;
            this.ctx.fill();

            // Core particle
            const coreSize = particle.size * (1 + particle.glowIntensity * 0.3);
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, coreSize, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 215, 0, ${particle.opacity})`;
            this.ctx.fill();

            // Inner white highlight
            if (particle.glowIntensity > 1) {
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
                this.ctx.fillStyle = `rgba(255, 255, 255, ${(particle.glowIntensity - 1) * 0.5})`;
                this.ctx.fill();
            }
        });
    }

    animate() {
        this.updateParticles();
        this.drawParticles();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize particle system when DOM is loaded
window.initParticles = function() {
    const canvas = document.getElementById('particles-canvas');
    if (canvas) {
        return new AdvancedParticleSystem(canvas);
    }
    return null;
};
