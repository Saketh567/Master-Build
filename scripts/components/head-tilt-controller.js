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

        // Get rotation from camera (Euler angles in radians)
        const rotation = this.el.object3D.rotation;
        
        // Z rotation (Roll) was originally used for Desktop VR headsets.
        // For Mobile / Magic Window, users naturally PAN the camera (Yaw = rotation.y).
        const yaw = rotation.y; 
        const pitch = rotation.x;
        
        // Instead of pure velocity, we will use Responsive Positional Mapping based on where they are looking.
        // If they look left (positive yaw), platform goes left (negative X).
        const reachMultiplier = (this.data.sensitivity * 1.5) + 2.0; 
        
        let targetX = -yaw * reachMultiplier;
        let targetZ = -pitch * reachMultiplier;
        
        // Clamp to physical game boundaries
        targetX = Math.max(-this.data.boundaryX, Math.min(this.data.boundaryX, targetX));
        targetZ = Math.max(-this.data.boundaryZ, Math.min(this.data.boundaryZ, targetZ));
        
        let currentPos = this.platform.object3D.position;
        
        // Smooth positioning (Lerp)
        currentPos.x += (targetX - currentPos.x) * 0.2;
        currentPos.z += (targetZ - currentPos.z) * 0.2;
        
        // --- Desktop Mouse Fallback for Testing ---
        if (this.mouseX !== undefined && this.mouseY !== undefined && !this.el.sceneEl.is('vr-mode')) {
            let deskX = (this.mouseX / window.innerWidth) * 2 - 1; // -1 to 1
            let deskZ = (this.mouseY / window.innerHeight) * 2 - 1;
            
            let deskTargetX = deskX * this.data.boundaryX;
            let deskTargetZ = deskZ * this.data.boundaryZ;
            
            currentPos.x += (deskTargetX - currentPos.x) * 0.5;
            currentPos.z += (deskTargetZ - currentPos.z) * 0.5;
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
