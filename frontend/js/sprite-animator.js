/**
 * Sprite Animation System for Fight Club Game
 * Handles animated sprite sequences for character animations
 */

class SpriteAnimator {
    constructor(container, race, animationType = 'idle', fps = 8) {
        this.container = container;
        this.race = race;
        this.animationType = animationType;
        this.fps = fps;
        this.currentFrame = 0;
        this.frames = [];
        this.animationId = null;
        this.isPlaying = false;
        this.img = null;

        this.init();
    }

    async init() {
        // Check if we have sprite animations for this race
        if (this.hasSprites()) {
            await this.loadFrames();
            this.createImageElement();
            this.play();
        } else {
            // Fallback to static image
            this.loadStaticImage();
        }
    }

    hasSprites() {
        // Only orc has sprites for now, but can be extended
        const supportedRaces = ['orc'];
        return supportedRaces.includes(this.race);
    }

    async loadFrames() {
        const basePath = `./images/fighters/sprites/${this.race}/${this.animationType}/`;

        // For orc idle, we have frames 000-015
        const frameCount = this.getFrameCount();

        for (let i = 0; i < frameCount; i++) {
            const frameNumber = i.toString().padStart(3, '0');
            const framePath = `${basePath}Front - ${this.capitalizeFirst(this.animationType)}_${frameNumber}.png`;

            try {
                await this.preloadImage(framePath);
                this.frames.push(framePath);
            } catch (error) {
                console.log(`Frame ${i} not found, stopping at ${this.frames.length} frames`);
                break;
            }
        }

        console.log(`Loaded ${this.frames.length} frames for ${this.race} ${this.animationType}`);
    }

    getFrameCount() {
        // Define frame counts for different animations
        const frameCounts = {
            'idle': 16,
            'attacking': 10,
            'walking': 8,
            'hurt': 6
        };
        return frameCounts[this.animationType] || 16;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
        });
    }

    createImageElement() {
        this.img = document.createElement('img');
        this.img.className = 'fighter-sprite';
        this.img.alt = `${this.race} ${this.animationType}`;

        // Set initial frame
        if (this.frames.length > 0) {
            this.img.src = this.frames[0];
        }

        // Clear container and add sprite
        this.container.innerHTML = '';
        this.container.appendChild(this.img);
    }

    loadStaticImage() {
        // Fallback to original static image loading
        const imgPath = `./images/fighters/${this.race}.png`;
        const img = document.createElement('img');
        img.src = imgPath;
        img.alt = `${this.race} fighter`;
        img.className = 'fighter-image';

        img.onload = () => {
            console.log('Static fighter image loaded:', imgPath);
            this.container.innerHTML = '';
            this.container.appendChild(img);
        };

        img.onerror = () => {
            console.log('Static fighter image failed to load:', imgPath);
            // Show emoji fallback
            const raceAvatars = {
                "human": "🧑",
                "elf": "🧝",
                "dwarf": "🧔",
                "orc": "👹",
                "skeleton": "💀"
            };
            this.container.innerHTML = `<div class="fighter-fallback">${raceAvatars[this.race] || "👤"}</div>`;
        };
    }

    play() {
        if (this.frames.length === 0 || this.isPlaying) return;

        this.isPlaying = true;
        this.animate();
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            clearTimeout(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isPlaying || this.frames.length === 0) return;

        // Update frame
        this.currentFrame = (this.currentFrame + 1) % this.frames.length;

        if (this.img) {
            this.img.src = this.frames[this.currentFrame];
        }

        // Schedule next frame
        const frameDelay = 1000 / this.fps;
        this.animationId = setTimeout(() => this.animate(), frameDelay);
    }

    changeAnimation(newAnimationType) {
        this.stop();
        this.animationType = newAnimationType;
        this.currentFrame = 0;
        this.frames = [];
        this.init();
    }

    destroy() {
        this.stop();
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Global sprite animators for easy access
window.fighterSprites = {
    player: null,
    enemy: null
};

// Utility function to create animated fighter
function createAnimatedFighter(container, race, animationType = 'idle') {
    const animator = new SpriteAnimator(container, race, animationType);
    return animator;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteAnimator, createAnimatedFighter };
}