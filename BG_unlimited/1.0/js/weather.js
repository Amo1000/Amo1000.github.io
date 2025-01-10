class Weather extends THREE.Group {
    constructor() {
        super();
        this.name = 'weather';
        this.time = 0;
    }

    set(options) {
        // Initialize options with default values
        options = Object.assign({ texture: null, quantity: 200, position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: -1 }, scale: { x: 10, y: 10, z: 10 }}, options);
        
       // Clear weather if textures are missing
        if (options.texture == null) {
            if (this.particles) {
                this.particles.removeFromParent();
                this.particles = null;
            }

            // Reset to default
            this.texture = '';
            this.velocity = { x: 0, y: 0, z: -1 };
        }
        else {
            // Declare variables
            var vertices = [];
            var geometry = new THREE.BufferGeometry();
            var material = new THREE.PointsMaterial({ size: 0.25, map: options.texture, transparent: true }); 
    
            // Generate random particles
            for (var i = 0; i < options.quantity; i++) {
                var x = options.position.x + (Math.random() * (options.scale.x)) - (options.scale.x / 2);
                var y = options.position.y + (Math.random() * (options.scale.y)) - (options.scale.y / 2);
                var z = options.position.z + (Math.random() * (options.scale.z)) - (options.scale.z / 2);
                vertices.push(x, y, z);
            }
    
            // Populate geometry
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            this.particles = new THREE.Points(geometry, material);
            this.velocity = options.velocity;
            this.texture = options.texture.name;
            this.box = {
                min: { x: options.position.x - (options.scale.x / 2), y: options.position.y - (options.scale.y / 2), z: options.position.z - (options.scale.z / 2) },
                max: { x: options.position.x + (options.scale.x / 2), y: options.position.y + (options.scale.y / 2), z: options.position.z + (options.scale.z / 2) }
            };
    
            // Empty and add new particles
            this.clear();
            this.add(this.particles);
            this.vertices = vertices;
        }
    }

    update(delta) {
        if (this.particles) {
            this.time += delta;
            // Loop through buffered array
            var positions = this.particles.geometry.attributes.position.array;
            for (var i = 0; i < positions.length - 2; i += 3) {
                // Use y value as offset modifier
                var distortion = Math.sin((this.time + positions[i + 1]) * 2) * 0.002;

                // Update position
                positions[i] += (delta * this.velocity.x) + distortion;
                positions[i + 1] += delta * this.velocity.y;
                positions[i + 2] += delta * this.velocity.z;

                // Reset position
                if (positions[i] < this.box.min.x) positions[i] = this.box.max.x;
                if (positions[i] > this.box.max.x) positions[i] = this.box.min.x;
                if (positions[i + 1] < this.box.min.y) positions[i + 1] = this.box.max.y;
                if (positions[i + 1] > this.box.max.y) positions[i + 1] = this.box.min.y;
                if (positions[i + 2] < this.box.min.z) positions[i + 2] = this.box.max.z;
                if (positions[i + 2] > this.box.max.z) positions[i + 2] = this.box.min.z;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }
}