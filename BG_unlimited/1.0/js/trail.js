class Trail extends THREE.Group {
    constructor() {
        super();
        this.name = 'trail';
        this.geometry = new THREE.BufferGeometry();
        this.line = new MeshLine();
        this.lineMaterial = new MeshLineMaterial({ color: '#ffffff', opacity: 0.5, lineWidth: 0.125, transparent: true });
        this.lineMesh = new THREE.Mesh(this.line, this.lineMaterial);
        this.limit = 16; // Default
        this.max = 32;
        this.cap = 256; // Limit memory overload
        this.time = 0;
        this.rate = 60; // FPS
        this.threshold = 0.5; // How close points can be
        this.points = [];
        this.add(this.lineMesh);
    }

    update(delta, player) {
        if (this.limit > 0) {
            // Declare variables
            var newPoint = player.position.clone();
            var oldPoint = this.points[1];

            // Update time and points
            this.time += delta;
            this.points[0] = newPoint; // Reserve first index for current player position
            
            // Timer to remove points
            if (this.time > 1 / this.rate) {
                this.time = 0; // reset time
                
                // Add more points
                if (this.points.length == 1 || oldPoint?.distanceTo(newPoint) > this.threshold) {
                    this.points.splice(1, 0, newPoint); // Add new point at second index
                }
                
                // Do not auto remove if limit is maxed out
                if (this.limit != this.max || this.points.length > this.cap) {
                    if (this.points.length > this.limit || player.isSleeping()) {
                        if (this.points.length > 1) this.points.pop();
                    }
                }
            }
    
            // Set points to history records
            this.line.setPoints(this.points);
        }
    }

    setLimit(limit, save = true) {
        if (limit == null) limit = app.storage.get('setting-trail') || this.limit;  // Set default
        if (save == true) app.storage.set('setting-trail', limit);
        this.limit = Number(limit);
        this.reset(); // Clear trail
    }

    setColor(color) {
        this.lineMaterial.color = color;
    }

    reset() {
        this.points = [];
        this.line.setPoints(this.points);
    }
}