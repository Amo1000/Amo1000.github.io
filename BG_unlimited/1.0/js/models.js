class Models extends THREE.Group {
    constructor(manager) {
        super();
        this.name = 'models';
        this.modelLoader = new THREE.GLTFLoader(manager);
    }

    load(json) {
        // Populate models group
        var _self = this;
        for (const [key, value] of Object.entries(json)) {
            this.modelLoader.load(value.url, function(gltf) {
                // Load model from gltf.scene Object3D (includes SkinnedMesh)
                var model = gltf.scene;
                model.name = key;
                model.animations = gltf.animations;

                // Load initial userData
                _self.addUserData(model, value.userData);
                _self.add(model);
            });
        }
    }

    addUserData(model, userData) {
        // Add userData if available
        if (userData) {
            model.userData = userData;
            
            // Update model properties if userData exists
            if (model.userData.position) { model.position.set(model.userData.position.x, model.userData.position.y, model.userData.position.z); }
            if (model.userData.rotation) { model.rotation.set(model.userData.rotation.x, model.userData.rotation.y, model.userData.rotation.z); }
            if (model.userData.scale) { model.scale.set(model.userData.scale.x, model.userData.scale.y, model.userData.scale.z); }
            
            // Add hitbox with default or predefined userData
            if (model.userData.hitbox == null) model.userData.hitbox = [{}];
            for (var i = 0; i < model.userData.hitbox.length; i++) {
                if (model.userData.hitbox[i].position == null) model.userData.hitbox[i].position = { x: 0, y: 0, z: 0 }; // Default center
                if (model.userData.hitbox[i].scale == null) model.userData.hitbox[i].scale = { x: 1.125, y: 1.125, z: 1.125 }; // Default cube
            }

            // Add default thumbnail position
            if (model.userData.thumbnail == null) model.userData.thumbnail = {
                rotation: { x: 0.25, y: 0, z: 0.25 },
                scale: { x: 0.5, y: 0.5, z: 0.5 }
            }
        }
    }

    updateHitbox(model) {
        if (model.userData && model.userData.hitbox) {
            for (var i = 0; i < model.userData.hitbox.length; i++) {
                var position = new THREE.Vector3(model.userData.hitbox[i].position.x, model.userData.hitbox[i].position.y, model.userData.hitbox[i].position.z);
                if (model.hitbox == null) model.hitbox = [];
                model.hitbox[i] = new THREE.Box3().setFromCenterAndSize(position.add(model.position), model.userData.hitbox[i].scale);
            }
        }
    }

    addAnimation(model) {
        // Add mixer to animations
        if (model.animations.length > 0) {
            model.traverse(function(object) { object.frustumCulled = false; });
            model.mixer = new THREE.AnimationMixer(model);
            model.clips = [];
    
            // Add all animations (for nested models)
            for (var i = 0; i < model.animations.length; i++) {
                var loop = THREE.LoopOnce; // Default 2200: https://github.com/mrdoob/three.js/blob/master/src/constants.js 
                model.clips.push(model.mixer.clipAction(model.animations[i]));
                
                // Set loop type
                if (model.userData.animation) loop = (model.userData.animation.loop == true) ? THREE.LoopRepeat : loop;
                model.clips[i].setLoop(loop);
            }

            // Create animation functions
            model.animation = {
                play: function() { for (var i = 0; i < model.clips.length; i++) { model.clips[i].play(); }},
                reset: function() { for (var i = 0; i < model.clips.length; i++) { model.clips[i].reset(); }}
            }

            // Play immediately if loop is repeating
            if (loop == THREE.LoopRepeat) model.animation.play();
        }
    }

    addMaterialAnimation(model) {
        if (model.userData.material) {
            model.traverse(function(node) {
                if (node.isMesh == true) {
                    if (model.userData.material.name == node.material.name) {
                        model.material = node.material;
                        model.material.map = model.material.map.clone();
                        model.offset = model.userData.material.map.offset;
                    }
                }
            });
        }
    }

    copy(child) {
        // Configure copy by name if applicable
        if (typeof child == 'string') child = this.getObjectByName(child);
        
        // Check if incoming child exists
        if (child != null) {
            // Check if cached model exists
            var model = this.getObjectByName(child.name);
            if (model != null) {
                // Clone model object with child data
                var object = this.getObjectByName(child.name);
                var model = THREE.SkeletonUtils.clone(object);
                var animations = [...object.animations];
                model.traverse(function(node) { if (node.isMesh) { node.material = node.material.clone(); }});
                model.position.copy(child.position);
                model.animations = animations;
                model.visible = (model.userData.visible != null) ? model.userData.visible : true;
                model.point = child.position.x + ',' + child.position.z;
        
                // Copy userData
                if (child.userData) {
                    model.userData = Object.assign(model.userData, child.userData);
        
                    // Add CSS2DObject text with event listener
                    if (model.userData.hasOwnProperty('text')) {
                        if (model.name == 'tip') {
                            model.text = new Text({ text: model.userData.text, class: 'text-' + model.name, id: model.uuid, visible: false });
                            model.add(model.text);
                            model.addEventListener('removed', function(e) { model.text.delete(); });
                        }
                    }
                }
                this.updateHitbox(model);
                this.addAnimation(model);
                this.addMaterialAnimation(model);
                return model;
            }
        }
    }
}