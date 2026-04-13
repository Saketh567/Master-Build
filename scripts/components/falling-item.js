AFRAME.registerComponent('falling-item', {
    schema: {
        speed: { type: 'number', default: 0.05 },
        color: { type: 'string', default: '#FFFFFF' },
        name: { type: 'string', default: 'Item' },
        index: { type: 'number', default: -1 }
    },

    init: function () {
        this.system = this.el.sceneEl.systems;
        this.yPos = this.el.object3D.position.y;
        this.active = true;
    },

    tick: function () {
        if (!this.active || !window.gameManager || !window.gameManager.gameActive) return;

        // Move down
        this.yPos -= this.data.speed;
        this.el.object3D.position.y = this.yPos;

        // Check if missed
        if (this.yPos < -1) {
            this.miss();
        }
    },

    catch: function () {
        if (!this.active) return;
        this.active = false;
        
        window.dispatchEvent(new CustomEvent('item-caught', {
            detail: {
                itemIndex: this.data.index,
                itemName: this.data.name,
                itemColor: this.data.color
            }
        }));
        
        this.removeSelf();
    },

    miss: function () {
        if (!this.active) return;
        this.active = false;
        
        window.dispatchEvent(new CustomEvent('item-missed', {
            detail: {
                itemIndex: this.data.index,
                itemName: this.data.name
            }
        }));
        
        this.removeSelf();
    },

    removeSelf: function() {
        if (this.el.parentNode) {
            this.el.parentNode.removeChild(this.el);
        }
    }
});
