class Textures {
    constructor(manager) {
        this.textureLoader = new THREE.TextureLoader(manager);
        this.cache = {};
    }

    load(json) {
        // Populate models group
        var _self = this;
        for (const [key, value] of Object.entries(json)) {
            this.textureLoader.load(value.url, function(texture) {
                // Load model from gltf.scene Object3D (includes SkinnedMesh)
                _self.cache[key] = texture;
                _self.cache[key]['name'] = key;
                _self.cache[key].magFilter = THREE.NearestFilter;
            });
        }
    }

    get(key) {
        return this.cache[key];
    }
}