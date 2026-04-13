/* =========================================
   BUILD MASTER VR - Game Manager
   ========================================= */

class GameManager {
    constructor() {
        // Core State
        this.state = {
            currentScreen: 'flash',
            difficulty: 'medium',
            sensitivity: 3,
            musicEnabled: true,
            sfxEnabled: true
        };
        
        // Game variables
        this.gameActive = false;
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.time = 90;
        this.currentStep = 0; // Index in sequence
        this.itemsCaughtCount = 0;
        this.itemsCorrectCount = 0;
        
        this.spawner = null;
        this.timer = null;
        
        // Initializer for the WebAudio synthesis
        this.soundPlayer = new SoundPlayer();
        
        // Level Progression System
        this.currentLevelIndex = 0;
        
        // Define explicit recipes and requirements per level
        this.levelsInfo = [
            {
                level: 1,
                name: "Basic Burger",
                targetScore: 40, // Needs 4 correct catches out of 5 minimum (some misses allowed)
                sequence: [
                    { name: "Bottom Bun", color: "#8B4513", shape: "cylinder" },
                    { name: "Patty", color: "#3B1A08", shape: "cylinder" },
                    { name: "Lettuce", color: "#32CD32", shape: "box" },
                    { name: "Tomato", color: "#FF6347", shape: "cylinder" },
                    { name: "Top Bun", color: "#DEB887", shape: "sphere" }
                ]
            },
            {
                level: 2,
                name: "Double Cheese",
                targetScore: 80, // Needs significant accuracy
                sequence: [
                    { name: "Bottom Bun", color: "#8B4513", shape: "cylinder" },
                    { name: "Patty", color: "#3B1A08", shape: "cylinder" },
                    { name: "Cheese", color: "#FFD700", shape: "box" },
                    { name: "Patty", color: "#3B1A08", shape: "cylinder" },
                    { name: "Cheese", color: "#FFD700", shape: "box" },
                    { name: "Lettuce", color: "#32CD32", shape: "box" },
                    { name: "Pickles", color: "#90EE90", shape: "cylinder" },
                    { name: "Top Bun", color: "#DEB887", shape: "sphere" }
                ]
            },
            {
                level: 3,
                name: "The Works",
                targetScore: 120, // Strict accuracy needed
                sequence: [
                    { name: "Bottom Bun", color: "#8B4513", shape: "cylinder" },
                    { name: "Patty", color: "#3B1A08", shape: "cylinder" },
                    { name: "Cheese", color: "#FFD700", shape: "box" },
                    { name: "Bacon", color: "#A52A2A", shape: "box" },
                    { name: "Lettuce", color: "#32CD32", shape: "box" },
                    { name: "Tomato", color: "#FF6347", shape: "cylinder" },
                    { name: "Onions", color: "#BA55D3", shape: "cylinder" },
                    { name: "Pickles", color: "#90EE90", shape: "cylinder" },
                    { name: "Top Bun", color: "#DEB887", shape: "sphere" }
                ]
            }
        ];
        
        // Difficulty settings mapping
        this.diffSettings = {
            easy: { time: 120, spawnRate: 3000, fallSpeed: 0.015 },
            medium: { time: 90, spawnRate: 2000, fallSpeed: 0.02 },
            hard: { time: 60, spawnRate: 1500, fallSpeed: 0.03 }
        };
        
        // Bind methods
        this.init = this.init.bind(this);
        this.setupEventListeners = this.setupEventListeners.bind(this);
        this.startGame = this.startGame.bind(this);
        this.levelComplete = this.levelComplete.bind(this);
        this.spawnItem = this.spawnItem.bind(this);
        this.onItemCaught = this.onItemCaught.bind(this);
        this.updateTime = this.updateTime.bind(this);
    }
    
    init() {
        console.log("Game Manager initialized");
        this.setupEventListeners();
        
        // Try to update slider visual initially
        const slider = document.getElementById('sensitivity-slider');
        if(slider) {
            slider.style.setProperty('--val', ((slider.value - slider.min) / (slider.max - slider.min) * 100) + '%');
        }
    }
    
    setupEventListeners() {
        // UI Buttons
        document.getElementById('start-button')?.addEventListener('click', async () => {
            // Request iOS 13+ sensor permissions on first user gesture
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                try {
                    const permissionState = await DeviceOrientationEvent.requestPermission();
                    if (permissionState !== 'granted') {
                        console.warn("Device orientation permission denied.");
                    }
                } catch(e) {
                    console.error("Permission request failed", e);
                }
            }
            this.showScreen('setup');
        });
        document.getElementById('play-button')?.addEventListener('click', this.startGame);
        document.getElementById('tutorial-button')?.addEventListener('click', () => this.showScreen('tutorial'));
        document.getElementById('start-from-tutorial')?.addEventListener('click', this.startGame);
        document.getElementById('back-to-setup')?.addEventListener('click', () => this.showScreen('setup'));
        document.getElementById('replay-button')?.addEventListener('click', this.startGame);
        document.getElementById('menu-button')?.addEventListener('click', () => this.showScreen('setup'));
        
        // Settings Inputs
        document.getElementById('difficulty-select')?.addEventListener('change', (e) => {
            this.state.difficulty = e.target.value;
        });
        
        const sensitivitySlider = document.getElementById('sensitivity-slider');
        const sensitivityValue = document.getElementById('sensitivity-value');
        sensitivitySlider?.addEventListener('input', (e) => {
            this.state.sensitivity = parseInt(e.target.value);
            if(sensitivityValue) sensitivityValue.textContent = e.target.value;
            // Update custom property for gradient visual
            e.target.style.setProperty('--val', ((e.target.value - e.target.min) / (e.target.max - e.target.min) * 100) + '%');
            
            window.dispatchEvent(new CustomEvent('settings-changed', {
                detail: { sensitivity: this.state.sensitivity }
            }));
        });
        
        document.getElementById('music-toggle')?.addEventListener('change', (e) => {
            this.state.musicEnabled = e.target.checked;
            this.manageAudio();
        });
        
        document.getElementById('sfx-toggle')?.addEventListener('change', (e) => {
            this.state.sfxEnabled = e.target.checked;
        });
        
        // Game Events
        window.addEventListener('item-caught', this.onItemCaught);
    }
    
    hideAllScreens() {
        const screens = document.querySelectorAll('.screen');
        screens.forEach(s => s.classList.remove('active'));
    }
    
    showScreen(screenName) {
        this.hideAllScreens();
        
        let screenId;
        switch(screenName) {
            case 'flash': screenId = 'flash-screen'; break;
            case 'setup': screenId = 'setup-menu'; break;
            case 'tutorial': screenId = 'tutorial-screen'; break;
            case 'complete': screenId = 'complete-screen'; break;
        }
        
        if(screenId) {
            document.getElementById(screenId).classList.add('active');
        }
        
        // Manage A-Frame scene visibility
        const scene = document.getElementById('game-scene');
        const hud = document.getElementById('hud-overlay');
        const refGuide = document.getElementById('reference-guide');
        
        if (screenName === 'game') {
            scene.classList.add('active');
            scene.style.display = 'block';
            hud.classList.add('active');
            hud.style.display = 'block';
            if (refGuide) refGuide.classList.add('active');
        } else {
            scene.classList.remove('active');
            scene.style.display = 'none';
            hud.classList.remove('active');
            hud.style.display = 'none';
            if (refGuide) refGuide.classList.remove('active');
        }
    }
    
    startGame() {
        // Load the current level configuration
        const levelData = this.levelsInfo[this.currentLevelIndex];
        this.recipeName = `Level ${levelData.level}: ${levelData.name}`;
        this.sequence = levelData.sequence;
        this.targetScore = levelData.targetScore;
        
        // Setup initial UI states
        window.dispatchEvent(new CustomEvent('level-started', { detail: { level: levelData.level } }));

        this.showScreen('game');
        this.resetGameState();
        this.buildReferenceGuide();
        this.updateHUD();
        
        this.gameActive = true;
        
        // Start timers
        const diff = this.diffSettings[this.state.difficulty];
        this.spawner = setInterval(this.spawnItem, diff.spawnRate);
        this.timer = setInterval(this.updateTime, 1000);
        
        this.manageAudio();
    }
    
    resetGameState() {
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.currentStep = 0;
        this.itemsCaughtCount = 0;
        this.itemsCorrectCount = 0;
        this.time = this.diffSettings[this.state.difficulty].time;
        
        // Clear stack and items container
        const stackContainer = document.getElementById('stack-container');
        if (stackContainer) stackContainer.innerHTML = '';
        
        const itemsContainer = document.getElementById('items-container');
        if (itemsContainer) itemsContainer.innerHTML = '';
        
        // Reset platform position
        const platform = document.getElementById('platform');
        if (platform) {
            platform.setAttribute('position', '0 0 0');
        }
    }
    
    buildReferenceGuide() {
        const titleEl = document.getElementById('ref-title');
        if(titleEl) titleEl.textContent = this.recipeName;
        
        const listEl = document.getElementById('ref-list');
        if(!listEl) return;
        
        listEl.innerHTML = '';
        
        this.sequence.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = `ref-item ${index === 0 ? 'current' : ''}`;
            row.id = `ref-item-${index}`;
            
            const marker = document.createElement('div');
            marker.className = 'ref-marker';
            marker.textContent = index === 0 ? '→' : '⬜';
            
            const num = document.createElement('span');
            num.textContent = `${index + 1}. `;
            
            const name = document.createElement('span');
            name.textContent = item.name;
            
            // Visual dot of color
            const dot = document.createElement('div');
            dot.className = 'ref-dot';
            dot.style.backgroundColor = item.color;
            dot.style.marginLeft = 'auto'; // push right
            
            row.appendChild(marker);
            row.appendChild(num);
            row.appendChild(name);
            row.appendChild(dot);
            
            listEl.appendChild(row);
        });
        
        this.updateNextHUD();
    }
    
    updateHUD() {
        document.getElementById('hud-score').textContent = this.score;
        document.getElementById('hud-combo').textContent = `x${this.combo}`;
        document.getElementById('hud-time').textContent = this.time;
    }
    
    updateNextHUD() {
        const nextEl = document.getElementById('hud-next');
        const refItems = document.querySelectorAll('.ref-item');
        
        if(this.currentStep < this.sequence.length) {
            if(nextEl) nextEl.textContent = this.sequence[this.currentStep].name;
            
            refItems.forEach((item, index) => {
                const marker = item.querySelector('.ref-marker');
                
                if(index < this.currentStep) {
                    item.className = 'ref-item done';
                    if(marker) marker.textContent = '✓';
                } else if(index === this.currentStep) {
                    item.className = 'ref-item current';
                    if(marker) marker.textContent = '→';
                } else {
                    item.className = 'ref-item';
                    if(marker) marker.textContent = '⬜';
                }
            });
            
        } else {
            if(nextEl) nextEl.textContent = "Done!";
        }
    }
    
    showFeedback(isCorrect, message) {
        const flash = document.getElementById('feedback-flash');
        if(!flash) return;
        
        flash.textContent = message;
        flash.className = isCorrect ? 'correct' : 'wrong';
        flash.style.display = 'block';
        
        // Remove animation to re-trigger
        flash.style.animation = 'none';
        flash.offsetHeight; /* trigger reflow */
        flash.style.animation = 'flashFade 1s ease forwards';
    }
    
    spawnItem() {
        if(!this.gameActive) return;
        
        const container = document.getElementById('items-container');
        if(!container) return;
        
        // Increase difficulty by dropping multiple items at once
        let numItems = 2; // default easy
        if (this.state.difficulty === 'medium') numItems = 3;
        if (this.state.difficulty === 'hard') numItems = 4;
        
        // Generate distinct safe X and Z positions so they don't overlap spatially (2D Grid)
        let spawnPositions = [];
        while(spawnPositions.length < numItems) {
            let candidateX = (Math.random() * 8) - 4; // -4 to 4 on X axis
            let candidateZ = (Math.random() * 3) - 1.5; // -1.5 to 1.5 on Z axis (Depth)
            
            let isTooClose = false;
            for (let pos of spawnPositions) {
                // Ensure at least 1.5 unit spatial 2D gap
                let dx = candidateX - pos.x;
                let dz = candidateZ - pos.z;
                if (Math.sqrt(dx*dx + dz*dz) < 1.5) { 
                    isTooClose = true;
                    break;
                }
            }
            if (!isTooClose) spawnPositions.push({x: candidateX, z: candidateZ});
        }
        
        // Decide which of the falling items will be the correct one
        let correctIndex = Math.floor(Math.random() * numItems);
        
        for (let i = 0; i < numItems; i++) {
            let posX = spawnPositions[i].x;
            let posZ = spawnPositions[i].z;
            let itemToSpawn;
            
            // Assign the correct item to the designated index
            if (i === correctIndex && this.currentStep < this.sequence.length) {
                itemToSpawn = this.sequence[this.currentStep];
            } else {
                // Force an explicitly WRONG item for the decoys
                let randIndex;
                let potentialWrongItem;
                do {
                    randIndex = Math.floor(Math.random() * this.sequence.length);
                    potentialWrongItem = this.sequence[randIndex];
                } while (this.currentStep < this.sequence.length && potentialWrongItem.name === this.sequence[this.currentStep].name);
                
                itemToSpawn = Object.assign({}, potentialWrongItem);
            }
            
            // STAGGER VERTICAL FALLING 
            const posY = 5 + (Math.random() * 4); // Spawns from Y=5 up to Y=9
            
            const el = document.createElement(`a-${itemToSpawn.shape || 'sphere'}`);
            el.setAttribute('color', itemToSpawn.color);
            
            // Sizing based on shape
            if (itemToSpawn.shape === 'cylinder') {
                el.setAttribute('radius', '0.4');
                el.setAttribute('height', '0.1');
            } else if (itemToSpawn.shape === 'box') {
                el.setAttribute('width', '0.6');
                el.setAttribute('height', '0.1');
                el.setAttribute('depth', '0.6');
            } else {
                el.setAttribute('radius', '0.35');
            }
            
            el.setAttribute('position', `${posX} ${posY} ${posZ}`);
            el.setAttribute('shadow', 'cast: true');
            el.setAttribute('material', 'roughness: 0.3; metalness: 0.1');
            
            // Subtle spinning animation
            el.setAttribute('animation', 'property: rotation; to: 0 360 0; loop: true; dur: 5000; easing: linear');
            
            // Attach falling logic
            const speed = this.diffSettings[this.state.difficulty].fallSpeed;
            el.setAttribute('falling-item', `speed: ${speed}; color: ${itemToSpawn.color}; name: ${itemToSpawn.name}; index: ${this.sequence.findIndex(s => s.name === itemToSpawn.name)}`);
            
            container.appendChild(el);
        }
    }
    
    onItemCaught(e) {
        if(!this.gameActive) return;
        
        const detail = e.detail;
        this.itemsCaughtCount++;
        
        // Check if it's the correct item for current step
        const requiredItem = this.sequence[this.currentStep];
        const isCorrect = (detail.itemColor === requiredItem.color && detail.itemName === requiredItem.name);
        
        if (isCorrect) {
            // Correct logic
            this.itemsCorrectCount++;
            this.score += (10 * this.combo);
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;
            
            this.playSound('success');
            this.showFeedback(true, `+${10 * (this.combo - 1)}`);
            
            this.addToStack(requiredItem);
            
            this.currentStep++;
            this.updateNextHUD();
            
            // Win condition check
            if (this.currentStep >= this.sequence.length) {
                setTimeout(() => this.levelComplete(true), 1000);
            }
        } else {
            // Wrong logic
            this.score -= 5;
            if (this.score < 0) this.score = 0;
            this.combo = 1;
            
            this.playSound('error');
            this.showFeedback(false, 'Miss!');
        }
        
        this.updateHUD();
    }
    
    addToStack(itemData) {
        const stack = document.getElementById('stack-container');
        if(!stack) return;
        
        const yOffset = 0.2 + (this.currentStep * 0.15); // Stack upwards
        
        const el = document.createElement(`a-${itemData.shape || 'sphere'}`);
        el.setAttribute('color', itemData.color);
        
        if (itemData.shape === 'cylinder') {
            el.setAttribute('radius', '0.4');
            el.setAttribute('height', '0.1');
        } else if (itemData.shape === 'box') {
            el.setAttribute('width', '0.6');
            el.setAttribute('height', '0.1');
            el.setAttribute('depth', '0.6');
        } else {
            // sphere mapped to half sphere for top bun maybe later
            el.setAttribute('radius', '0.35');
        }
        
        el.setAttribute('position', `0 ${yOffset} 0`);
        el.setAttribute('shadow', 'cast: true; receive: true');
        el.setAttribute('material', 'roughness: 0.3; metalness: 0.1');
        stack.appendChild(el);
    }
    
    updateTime() {
        if(!this.gameActive) return;
        
        this.time--;
        this.updateHUD();
        
        if (this.time <= 0) {
            this.levelComplete(false);
        }
    }
    
    levelComplete(success) {
        this.gameActive = false;
        clearInterval(this.spawner);
        clearInterval(this.timer);
        
        this.playSound('complete');
        
        // Remove all falling items
        const container = document.getElementById('items-container');
        if(container) container.innerHTML = '';
        
        // Calculate stats
        const accuracy = this.itemsCaughtCount > 0 ? Math.round((this.itemsCorrectCount / this.itemsCaughtCount) * 100) : 0;
        const totalTime = this.diffSettings[this.state.difficulty].time - this.time;
        const mins = Math.floor(totalTime / 60);
        const secs = totalTime % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        
        // Calculate stars
        let stars = 1;
        if (success) {
            stars = 2;
            if (accuracy >= 80 && this.score >= Math.floor(this.sequence.length * 10 * 2)) {
                stars = 3;
            }
        }
        
        // Apply stats to UI
        document.getElementById('final-score-display').textContent = this.score;
        
        const targetLabel = document.getElementById('target-score-display');
        if(targetLabel) targetLabel.textContent = this.targetScore;
        
        document.getElementById('stat-combo').textContent = `x${this.maxCombo}`;
        document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
        document.getElementById('stat-time').textContent = timeStr;
        
        const starsContainer = document.getElementById('star-rating-container');
        if (starsContainer) {
            starsContainer.innerHTML = '';
            for(let i=0; i<3; i++) {
                const star = document.createElement('div');
                star.className = `star ${i < stars ? 'earned' : ''}`;
                star.textContent = '★';
                starsContainer.appendChild(star);
            }
        }
        
        // Level Progression Checks
        const titleEl = document.querySelector('#complete-screen .screen-title');
        const nextBtn = document.getElementById('next-level-button');
        const replayBtn = document.getElementById('replay-button');
        const menuBtn = document.getElementById('menu-button');
        
        // Does player meet minimum passing score?
        const passedLevel = (success && this.score >= this.targetScore);
        
        if (titleEl) {
            if (passedLevel) {
                titleEl.textContent = "Level Cleared!";
                titleEl.style.color = "#4CAF50";
            } else {
                titleEl.textContent = "Level Failed!";
                titleEl.style.color = "#F44336";
            }
        }
        
        // Setup progression buttons
        if (passedLevel && this.currentLevelIndex < this.levelsInfo.length - 1) {
            // Unlock next level
            if(nextBtn) {
                nextBtn.style.display = 'inline-block';
                // Remove old listeners cleanly via clone
                const newNextBtn = nextBtn.cloneNode(true);
                nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
                
                newNextBtn.addEventListener('click', () => {
                    this.currentLevelIndex++;
                    this.startGame();
                });
            }
            if(replayBtn) replayBtn.style.display = 'none'; // Hide general replay, we want them to go Next
        } else {
            // Failed, or final game completed
            if(nextBtn) nextBtn.style.display = 'none';
            if(replayBtn) {
                replayBtn.style.display = 'inline-block';
                replayBtn.textContent = (passedLevel) ? "Victory Replay!" : "Retry Level";
                
                // Keep the existing play-again binding clean
                const newReplayBtn = replayBtn.cloneNode(true);
                replayBtn.parentNode.replaceChild(newReplayBtn, replayBtn);
                newReplayBtn.addEventListener('click', this.startGame);
            }
            if (titleEl && passedLevel && this.currentLevelIndex >= this.levelsInfo.length - 1) {
                titleEl.textContent = "GAME MASTERED!";
                titleEl.style.color = "#FFD700";
            }
        }
        
        // Assure menu button always works
        if(menuBtn) {
            const newMenuBtn = menuBtn.cloneNode(true);
            menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);
            newMenuBtn.addEventListener('click', () => this.showScreen('setup'));
        }
        
        this.showScreen('complete');
    }
    
    manageAudio() {
        if(this.state.musicEnabled && this.gameActive) {
            this.soundPlayer.playBackgroundLoop();
        } else {
            this.soundPlayer.stopBackgroundLoop();
        }
    }
    
    playSound(type) {
        if(!this.state.sfxEnabled) return;
        this.soundPlayer.playSFX(type);
    }
}

/* =========================================
   Asset-based Audio Player
   Loads physical files from assets/sounds
   ========================================= */
class SoundPlayer {
    constructor() {
        this.bgMusic = new Audio('assets/sounds/background.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3;
        
        this.sounds = {
            success: new Audio('assets/sounds/success.wav'),
            error: new Audio('assets/sounds/error.wav'),
            complete: new Audio('assets/sounds/complete.wav'),
            catch: new Audio('assets/sounds/catch.wav') // if you want a separate catch sound
        };
        
        // Preload sounds
        Object.values(this.sounds).forEach(audio => {
            audio.load();
            audio.volume = 0.5;
        });
    }

    playSFX(type) {
        if (this.sounds[type]) {
            // Clone the node to allow overlapping sounds
            let sfx = this.sounds[type].cloneNode();
            sfx.volume = 0.6;
            sfx.play().catch(e => console.warn('SFX play blocked:', e));
        }
    }
    
    playBackgroundLoop() {
        this.bgMusic.play().catch(e => console.warn('BGM play blocked:', e));
    }
    
    stopBackgroundLoop() {
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }
}


// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
    window.gameManager = new GameManager();
    window.gameManager.init();
});
