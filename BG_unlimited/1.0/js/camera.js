class Camera extends THREE.PerspectiveCamera {
    constructor() {
        super();
    }

    init(options) {
        options.position = (options.position) ? options.position : { x: 0, y: 0, z: 0 };
        options.rotation = (options.rotation) ? options.rotation : { x: 0, y: 0, z: 0 };
        options.offset = (options.offset) ? options.offset : { x: 0, y: 0, z: 1 }; // Default 1 cube up
        this.zoomMin = (options.zoomMin) ? options.zoomMin : -50;
        this.zoomMax = (options.zoomMax) ? options.zoomMax : -4;
        this.setPosition(options.position);
        this.setRotation(options.rotation);
        this.setOffset(options.offset);
        this.setListener(options.listener);
        this.panning = false;
    }

    setPosition(position, setOrigin = true) {
        this.position.set(position.x, position.y, position.z);
        this.positionOrigin = (setOrigin) ? this.position.clone() : this.positionOrigin;
    }

    setRotation(rotation, setOrigin = true) {
        this.rotation.set(rotation.x, rotation.y, rotation.z);
        this.rotationOrigin = (setOrigin) ? this.rotation.clone() : this.rotationOrigin;
    }

    setOffset(offset, setOrigin = true) {
        if (this.offset == null) this.offset = new THREE.Vector3();
        this.offset.set(offset.x, offset.y, offset.z);
        this.offsetOrigin = (setOrigin) ? this.offset.clone() : this.offsetOrigin;
    }

    setListener(listener) {
        if (listener) this.add(listener);
    }

    reset() {
        this.resetPosition();
        this.resetRotation();
        this.resetOffset();
    }

    resetPosition() {
        if (this.positionOrigin) this.position.set(this.positionOrigin.x, this.positionOrigin.y, this.positionOrigin.z);
    }

    resetRotation() {
        if (this.rotationOrigin) this.rotation.set(this.rotationOrigin.x, this.rotationOrigin.y, this.rotationOrigin.z);
    }

    resetOffset() {
        if (this.offsetOrigin) this.offset.set(this.offsetOrigin.x, this.offsetOrigin.y, this.offsetOrigin.z);
    }

    reverseOffset() {
        // Used for gravity reverse
        var offset = this.offset.clone();
        offset.negate();
        app.animation.tween(this.offset, offset, { duration: 500 });
    }

    update(delta) {
        // Follow player if panning is true
        if (this.panning == false) {
            // Snap to target if not panning
            this.position.x = this.target.position.x + this.offset.x;
            this.position.z = this.target.position.z + this.offset.z;
            
             // Player fallback if guest disconnects
            if (this.target == null || this.target.parent == null) {
                this.follow(app.player, false);
            }
        }
    }

    follow(target, animate = true) {
        if (target != null) {
            var _self = this;
            var end = target.position.clone().add(this.offset);
            this.target = target;
            
            // Animate or snap to end target
            if (animate == true) {
                if (this.panning == false) {
                    this.panning = true;
                    end.y = this.position.y;
                    app.animation.tween(this.position, end, { callback: function() { _self.panning = false; }, update: function() { app.level.updateBackground(); }, duration: 500, easing: TWEEN.Easing.Quadratic.Out });
                }
            }
            else this.position.set(end.x, this.position.y, end.z);
        }
    }

    panTo(target, options = { duration: 500, easing: TWEEN.Easing.Quadratic.Out }) {
        var _self = this;
        var start = this.position.clone();
        var end = target.clone().add(this.offset);
        this.panning = true;
        app.animation.tween({ x: start.x, y: start.y, z: start.z }, { x: end.x, y: end.y, z: end.z }, { duration: options.duration, update: function(obj) { app.camera.position.x = obj.x; app.camera.position.y = obj.y; app.camera.position.z = obj.z; }, callback: function() { _self.panning = false; }, easing: options.easing });
    }

    isPanned(target) {
        return (this.position.x == target.x && this.position.z == target.z + this.offset.z);
    }

    zoomTo(target, options) {
        if (target.y > this.zoomMax) target.y = this.zoomMax;
        else if (target.y < this.zoomMin) target.y = this.zoomMin;
        target.x = this.position.x; // Retain x distance
        target.z = this.position.z; // Retain z distance
        app.animation.tween(this.position, target, options);
    }

    zoomDepth(zoom, options) {
        var target = this.position.clone();
        target.y += zoom;
        this.zoomTo(target, options);
    }

    zoomToggle(options) {
        var target = this.position.clone();
        target.y -= this.zoomMin / this.zoomMax;
        if (target.y < this.zoomMin) target.y = this.positionOrigin.y;
        this.zoomTo(target, options);
    }

    setQuality(quality, save = true) {
        if (quality == null) quality = app.storage.get('setting-quality');
        if (quality == null) quality = 10; // Set default
        if (save == true) app.storage.set('setting-quality', quality);
        app.renderer.setPixelRatio(window.devicePixelRatio / (10 / quality));
        this.quality = parseFloat(quality);
    }

    animateQuality(q1 = 1.0, q2 = 10.0, pingpong = true) {
        app.animation.tween({ quality: q1 }, { quality: q2 }, { duration: 1000, update: function(obj) { app.camera.setQuality(obj.quality, false); }, callback: function() { if (pingpong == true) app.animation.tween({ quality: q2 }, { quality: q1 }, { duration: 1000, update: function(obj) { app.camera.setQuality(obj.quality, false); }}); }});
    }
}