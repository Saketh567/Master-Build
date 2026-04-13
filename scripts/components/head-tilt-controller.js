AFRAME.registerComponent('head-tilt-controller', {
    schema: {
        sensitivity: { type: 'number', default: 3 }, // 1-5 scale mapped from settings
        boundaryX: { type: 'number', default: 4.5 },
        boundaryZ: { type: 'number', default: 1.5 }
    },

    init: function () {
        this.camera = this.el.sceneEl.camera;
        this.platform = document.getElementById('platform');
        
        // Listen for setting changes
        window.addEventListener('settings-changed', (e) => {
            if (e.detail && e.detail.sensitivity) {
                this.data.sensitivity = e.detail.sensitivity;
            }
        });
    },

    tick: function () {
        if (!this.platform || !window.gameManager || !window.gameManager.gameActive) return;

        // Ensure we have platform object3D
        if (!this.platform.object3D) return;

        // Get rotation from camera
        const rotation = this.el.object3D.rotation;
        
        // Z rotation (Roll) maps to X movement (left/right head tilt)
        // X rotation (Pitch) maps to Z movement (forward/back head tilt)
        const roll = rotation.z;
        const pitch = rotation.x;
        
        // Multiplier based on sensitivity (1 to 5)
        const speedMult = (this.data.sensitivity * 0.1) + 0.1;
        
        // Calculate new position offsets
        let moveX = -roll * speedMult;
        let moveZ = -pitch * speedMult;
        
        // Apply to current position
        let currentPos = this.platform.object3D.position;
        let targetX = currentPos.x + moveX;
        let targetZ = currentPos.z + moveZ;
        
        // Clamp to boundaries
        targetX = Math.max(-this.data.boundaryX, Math.min(this.data.boundaryX, targetX));
        targetZ = Math.max(-this.data.boundaryZ, Math.min(this.data.boundaryZ, targetZ));
        
        // Smooth positioning
        currentPos.x += (targetX - currentPos.x) * 0.5;
        currentPos.z += (targetZ - currentPos.z) * 0.5;
        
        // --- Desktop Fallback for Testing ---
        if (this.mouseX !== undefined && this.mouseY !== undefined && !this.el.sceneEl.is('vr-mode')) {
            // Map mouse to boundaries
            let deskX = (this.mouseX / window.innerWidth) * 2 - 1; // -1 to 1
            let deskZ = (this.mouseY / window.innerHeight) * 2 - 1;
            
            targetX = deskX * this.data.boundaryX;
            targetZ = deskZ * this.data.boundaryZ;
            
            currentPos.x += (targetX - currentPos.x) * 0.5;
            currentPos.z += (targetZ - currentPos.z) * 0.5;
        }
    },
    
    play: function () {
        this.onMouseMove = this.onMouseMove.bind(this);
        window.addEventListener('mousemove', this.onMouseMove);
    },
    
    pause: function () {
        window.removeEventListener('mousemove', this.onMouseMove);
    },
    
    onMouseMove: function (e) {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;
    }
});
