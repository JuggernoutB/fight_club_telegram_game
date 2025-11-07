/**
 * Sprite Animation System for Fight Club Game
 * Handles animated sprite sequences for character animations
 */

class SpriteAnimator {
    constructor(container, race, animationType = 'idle', fps = 8, useSpriteSheet = false, spriteSheetConfig = null, scale = 1.0) {
        this.container = container;
        this.race = race;
        this.animationType = animationType;
        this.fps = fps;
        this.currentFrame = 0;
        this.frames = [];
        this.animationId = null;
        this.isPlaying = false;
        this.img = null;
        this.canvas = null;
        this.ctx = null;

        // Sprite sheet support
        this.useSpriteSheet = useSpriteSheet;
        this.spriteSheet = null;
        this.spriteSheetConfig = spriteSheetConfig || this.getDefaultSpriteSheetConfig();

        // Scale/zoom support
        this.scale = scale;

        this.init();
    }

    getDefaultSpriteSheetConfig() {
        // Default configurations for different races
        const configs = {
            'human': {
                fileName: 'human.png',
                totalFrames: 21,
                framesPerRow: 4,
                firstFrameCenterX: 384,
                firstFrameCenterY: 220,
                stepX: 768,
                stepY: 448,
                frameWidth: 650,
                frameHeight: 450
            },
            'orc': {
                fileName: 'orc_idle.png',
                totalFrames: 16,
                framesPerRow: 16, // Single row
                firstFrameCenterX: 32,
                firstFrameCenterY: 32,
                stepX: 64,
                stepY: 64,
                frameWidth: 64,
                frameHeight: 64
            }
        };
        return configs[this.race] || configs['human'];
    }

    async init() {
        // Check if we should use sprite sheet
        if (this.useSpriteSheet && this.hasSpriteSheet()) {
            await this.loadSpriteSheet();
            this.createCanvasElement();
            this.play();
        } else if (this.hasSprites()) {
            // Use individual frame files
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

    hasSpriteSheet() {
        // Races that have sprite sheet support
        const supportedRaces = ['human', 'orc'];
        return supportedRaces.includes(this.race);
    }

    async loadSpriteSheet() {
        const config = this.spriteSheetConfig;
        const spriteSheetPath = `./images/fighters/sprites/${this.race}/${this.animationType}/${config.fileName}`;

        try {
            this.spriteSheet = await this.preloadImage(spriteSheetPath);
            console.log(`Loaded sprite sheet for ${this.race} ${this.animationType}: ${spriteSheetPath}`);
            console.log('Sprite sheet dimensions:', this.spriteSheet.width, 'x', this.spriteSheet.height);
        } catch (error) {
            console.error(`Failed to load sprite sheet: ${spriteSheetPath}`, error);
            throw error;
        }
    }

    createCanvasElement() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 240;
        this.canvas.height = 300;
        this.canvas.className = 'fighter-sprite-canvas';
        this.ctx = this.canvas.getContext('2d');

        // Clear container and add canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.canvas);

        // Draw initial frame
        if (this.spriteSheet) {
            this.drawSpriteFrame(0);
        }
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

    drawSpriteFrame(frameIndex) {
        if (!this.spriteSheet || !this.ctx) return;

        const config = this.spriteSheetConfig;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate frame position
        const col = frameIndex % config.framesPerRow;
        const row = Math.floor(frameIndex / config.framesPerRow);

        // Calculate source position from center point
        const centerX = config.firstFrameCenterX + (col * config.stepX);
        const centerY = config.firstFrameCenterY + (row * config.stepY);
        const sourceX = centerX - (config.frameWidth / 2);
        const sourceY = centerY - (config.frameHeight / 2);

        // Calculate destination size and position with custom scale
        const scaleX = this.canvas.width / config.frameWidth;
        const scaleY = this.canvas.height / config.frameHeight;
        const baseScale = Math.min(scaleX, scaleY) * 0.9;
        const finalScale = baseScale * this.scale; // Apply custom scale/zoom
        const destWidth = config.frameWidth * finalScale;
        const destHeight = config.frameHeight * finalScale;
        const destX = (this.canvas.width - destWidth) / 2;
        const destY = (this.canvas.height - destHeight) / 2;

        // Draw the frame
        this.ctx.drawImage(
            this.spriteSheet,
            sourceX, sourceY, config.frameWidth, config.frameHeight,
            destX, destY, destWidth, destHeight
        );
    }

    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
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
        if (this.isPlaying) return;

        // Check if we have frames or sprite sheet
        if (this.useSpriteSheet && this.spriteSheet) {
            this.isPlaying = true;
            this.animate();
        } else if (this.frames.length > 0) {
            this.isPlaying = true;
            this.animate();
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            clearTimeout(this.animationId);
            this.animationId = null;
        }
    }

    animate() {
        if (!this.isPlaying) return;

        if (this.useSpriteSheet && this.spriteSheet) {
            // Sprite sheet animation
            const totalFrames = this.spriteSheetConfig.totalFrames;
            this.currentFrame = (this.currentFrame + 1) % totalFrames;
            this.drawSpriteFrame(this.currentFrame);
        } else if (this.frames.length > 0) {
            // Individual frame animation
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            if (this.img) {
                this.img.src = this.frames[this.currentFrame];
            }
        } else {
            return; // Nothing to animate
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

    setScale(newScale) {
        this.scale = newScale;
        // Redraw current frame with new scale
        if (this.useSpriteSheet && this.spriteSheet) {
            this.drawSpriteFrame(this.currentFrame);
        }
    }

    getScale() {
        return this.scale;
    }

    zoomIn(amount = 0.1) {
        this.setScale(this.scale + amount);
    }

    zoomOut(amount = 0.1) {
        const newScale = this.scale - amount;
        this.setScale(Math.max(0.1, newScale)); // Minimum scale of 0.1
    }

    // Manual frame navigation methods
    nextFrame() {
        if (this.useSpriteSheet && this.spriteSheet) {
            const totalFrames = this.spriteSheetConfig.totalFrames;
            this.currentFrame = (this.currentFrame + 1) % totalFrames;
            this.drawSpriteFrame(this.currentFrame);
        } else if (this.frames.length > 0) {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            if (this.img) {
                this.img.src = this.frames[this.currentFrame];
            }
        }
    }

    previousFrame() {
        if (this.useSpriteSheet && this.spriteSheet) {
            const totalFrames = this.spriteSheetConfig.totalFrames;
            this.currentFrame = (this.currentFrame - 1 + totalFrames) % totalFrames;
            this.drawSpriteFrame(this.currentFrame);
        } else if (this.frames.length > 0) {
            this.currentFrame = (this.currentFrame - 1 + this.frames.length) % this.frames.length;
            if (this.img) {
                this.img.src = this.frames[this.currentFrame];
            }
        }
    }

    goToFrame(frameIndex) {
        if (this.useSpriteSheet && this.spriteSheet) {
            const totalFrames = this.spriteSheetConfig.totalFrames;
            this.currentFrame = Math.max(0, Math.min(frameIndex, totalFrames - 1));
            this.drawSpriteFrame(this.currentFrame);
        } else if (this.frames.length > 0) {
            this.currentFrame = Math.max(0, Math.min(frameIndex, this.frames.length - 1));
            if (this.img) {
                this.img.src = this.frames[this.currentFrame];
            }
        }
    }

    getCurrentFrameInfo() {
        if (this.useSpriteSheet && this.spriteSheet) {
            const config = this.spriteSheetConfig;
            const col = this.currentFrame % config.framesPerRow;
            const row = Math.floor(this.currentFrame / config.framesPerRow);
            const centerX = config.firstFrameCenterX + (col * config.stepX);
            const centerY = config.firstFrameCenterY + (row * config.stepY);
            const sourceX = centerX - (config.frameWidth / 2);
            const sourceY = centerY - (config.frameHeight / 2);

            return {
                frameIndex: this.currentFrame,
                col: col,
                row: row,
                centerX: centerX,
                centerY: centerY,
                sourceX: sourceX,
                sourceY: sourceY,
                frameWidth: config.frameWidth,
                frameHeight: config.frameHeight
            };
        } else if (this.frames.length > 0) {
            return {
                frameIndex: this.currentFrame,
                framePath: this.frames[this.currentFrame],
                totalFrames: this.frames.length
            };
        }
        return null;
    }

    getTotalFrames() {
        if (this.useSpriteSheet && this.spriteSheet) {
            return this.spriteSheetConfig.totalFrames;
        } else {
            return this.frames.length;
        }
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
function createAnimatedFighter(container, race, animationType = 'idle', useSpriteSheet = false, customConfig = null, scale = 1.0) {
    const animator = new SpriteAnimator(container, race, animationType, 8, useSpriteSheet, customConfig, scale);
    return animator;
}

// Utility function specifically for sprite sheet animation
function createSpriteSheetFighter(container, race, animationType = 'idle', customConfig = null, scale = 2.0) {
    const animator = new SpriteAnimator(container, race, animationType, 8, true, customConfig, scale);
    return animator;
}

// Utility function to create custom sprite sheet config
function createSpriteSheetConfig(fileName, totalFrames, framesPerRow, firstFrameCenterX, firstFrameCenterY, stepX, stepY, frameWidth, frameHeight) {
    return {
        fileName,
        totalFrames,
        framesPerRow,
        firstFrameCenterX,
        firstFrameCenterY,
        stepX,
        stepY,
        frameWidth,
        frameHeight
    };
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SpriteAnimator,
        createAnimatedFighter,
        createSpriteSheetFighter,
        createSpriteSheetConfig
    };
}