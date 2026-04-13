AFRAME.registerComponent('collision-detector', {
    init: function () {
        this.tickCounter = 0;
        this.checkInterval = 2;
    },

    tick: function () {
        if (!window.gameManager || !window.gameManager.gameActive) return;
        
        this.tickCounter++;
        if (this.tickCounter % this.checkInterval !== 0) return;

        let platformBox = new THREE.Box3().setFromObject(this.el.getObject3D('mesh'));
        
        if (!platformBox || platformBox.isEmpty()) return;

        const items = document.querySelectorAll('[falling-item]');
        
        for (let i = 0; i < items.length; i++) {
            let itemEl = items[i];
            let itemComp = itemEl.components['falling-item'];
            
            if (!itemComp || !itemComp.active) continue;

            let itemMesh = itemEl.getObject3D('mesh');
            if (!itemMesh) continue;

            let itemBox = new THREE.Box3().setFromObject(itemMesh);

            if (platformBox.intersectsBox(itemBox)) {
                itemComp.catch();
            }
        }
    }
});
