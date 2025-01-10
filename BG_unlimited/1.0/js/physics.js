class Physics {
    constructor() {
        this.power = 100;
        this.speed = 0;
        this.sleep = true;
        this.rolling = false;
        this.sleepThreshold = 0.5;
        this.gravityPower = 0.5;
        this.setFriction(1);
        this.setRestitution(1);
        this.setGravity({ x: 0, y: 0, z: 1 });
        this.setVelocity({ x: 0, y: 0, z: 0 });
        this.setVelocityLimit({ x: 0.5, y: 0.5, z: 0.5 });
    }

    init() {
        
    }

    update(object, map, delta) {
        return this.checkCollision(object, map, delta);
    }

    checkCollision(objectA, map, delta) {
        var pointA = new THREE.Vector3();
        var pointB = new THREE.Vector3();
        var force = new THREE.Vector3(this.gravity.x * delta * this.gravityPower, 0, this.gravity.z * delta * this.gravityPower);
        var distance;
        var samples;
        var resolution = 1; // Smaller = more samples
        var collisions = [];
        var sensors = [];
        
        if (map != null) {
            // Apply gravity
            if (this.sleep == false) {
                this.velocity.x -= force.x;
                this.velocity.z -= force.z;
                this.velocity.clamp(this.velocityMin, this.velocityMax);
            }

            // Set future point before interpolation
            pointB.x = objectA.position.x + (this.velocity.x * delta * this.power);
            pointB.z = objectA.position.z + (this.velocity.z * delta * this.power);
            
            // Define interpolation sample rate by objectA scale
            distance = objectA.position.distanceTo(pointB);
            samples = Math.floor(distance / (objectA.scale.x * resolution)) + 1;
            
            // Loop through points by sample rate
            for (var s = 0; s <= samples; s++) {
                collisions = []; // Reset collisions
                sensors = []; // Reset sensors
                pointA.x = objectA.position.x + (pointB.x - objectA.position.x) * (s / samples);
                pointA.z = objectA.position.z + (pointB.z - objectA.position.z) * (s / samples);

                // Loop through each point
                for (var p = 0; p < objectA.points.length; p++) {
                    var point = objectA.points[p];
                    var x = point.x + pointA.x;
                    var z = point.z + pointA.z;
                    var row = Math.round(map.maxY - z);
                    var col = Math.round(map.maxX - x);

                    // Only check objects within map range
                    if (row >= 0 && row < map.rows && col >= 0 && col < map.cols) {
                        var objectB = map.arr[row][col];
                        if (objectB != null && objectB.hidden == null) {
                            var body = objectB.userData.body;
                            if (body == 'static') collisions.push(objectB);
                            else if (body == 'sensor') sensors.push(objectB);
                        }
                    }
                }

                // Remove duplicate sensors
                if (sensors.length > 0) {
                    sensors = [...new Set(sensors)];
                }
                
                // Analyze collisions
                if (collisions.length > 0) {
                    collisions = [...new Set(collisions)]; // Remove duplicates
                    var c1 = collisions[0];
                    var c2 = c1;

                    // Loop through collisions
                    for (var c = 1; c < collisions.length; c++) {
                        // Match 2 objects from first collisions[0] by 'x' or 'y'
                        if (c1.position.x == collisions[c].position.x || c1. position.z == collisions[c].position.z) {
                            c2 = collisions[c];
                            break;
                        }
                    }
                    var x = (c1.position.x + c2.position.x) / 2;
                    var z = (c1.position.z + c2.position.z) / 2;
                    var xDiff = pointA.x - x;
                    var zDiff = pointA.z - z;
                    var xDir = xDiff >= 0 ? 1 : -1;
                    var zDir = zDiff >= 0 ? 1 : -1;
                    var axis = Math.abs(xDiff) > Math.abs(zDiff) ? 'x' : 'z';
                    var r1 = (c1.userData.restitution != null) ? c1.userData.restitution : 0.5;
                    var r2 = (c2.userData.restitution != null) ? c2.userData.restitution : 0.5;
                    var f1 = (c1.userData.friction != null) ? c1.userData.friction : 0.05;
                    var f2 = (c2.userData.friction != null) ? c2.userData.friction : 0.05;
                    var restitution = ((r1 + r2) / 2) * this.restitution; // Average bounce between collisions (0 = reflect, 1 = stop)
                    var friction = ((f1 + f2) / 2) * this.friction; // Average friction between collisions (0 = slide, 1 = stop)

                    // Apply calculations
                    if (axis == 'z') {
                        pointA.z = z + zDir * ((c1.scale.z / 2) + (objectA.scale.z / 2)) + (0.001 * zDir);
                        this.velocity.z *= -restitution;

                        // Set velocity z to zero at sleep threshold
                        if (Math.abs(this.velocity.z / delta) < this.sleepThreshold) {
                            this.velocity.z = 0;
                        }

                        // Add friction to x axis
                        if (this.velocity.x > 0) {
                            this.velocity.x -= delta * friction;
                            if (this.velocity.x < 0) this.velocity.x = 0;
                        }
                        else {
                            this.velocity.x += delta * friction;
                            if (this.velocity.x > 0) this.velocity.x = 0;
                        }
                    }
                    else if (axis == 'x') {
                        pointA.x = x + xDir * ((c1.scale.x / 2) + (objectA.scale.x / 2)) + (0.001 * xDir);
                        if (this.velocity.x > 0 && xDir < 0) { this.velocity.x *= -restitution; }
                        else if (this.velocity.x < 0 && xDir > 0) { this.velocity.x *= -restitution; }
                    }
                    break;
                }
            }
        }

        // Apply position values to latest point
        this.speed = (1 / delta) * this.getMagnitude({ x: objectA.position.x - pointA.x, y: objectA.position.z - pointA.z });
        objectA.position.x = pointA.x;
        objectA.position.z = pointA.z;

        // Set sleep state
        this.sleep = this.velocity.equals({ x: 0, y: 0, z: 0 });
        this.rolling = (this.velocity.z == 0);

        // Return sensors
        return collisions.concat(sensors);
    }

    force(pointA, pointB, max) {
        var force = new THREE.Vector3();
        var angle = Math.atan2(pointB.z - pointA.z, pointB.x - pointA.x);
        var distance = Math.sqrt(Math.pow((pointA.x - pointB.x), 2) + Math.pow((pointA.z - pointB.z), 2));
        force.subVectors(pointB, pointA);

        // Apply max radius if defined
        if (distance > max) {
            force.x = Math.cos(angle) * max;
            force.z = Math.sin(angle) * max;
        }
        
        force.x *= this.power * 0.001;
        force.z *= this.power * 0.001;
        this.velocity.add(force);
    }

    setVelocity(velocity, setOrigin = true) {
        this.velocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z);
        this.velocityOrigin = (setOrigin) ? this.velocity.clone() : this.velocityOrigin;
    }

    setVelocityLimit(range, setOrigin = true) {
        this.velocityMin = new THREE.Vector3(-range.x, -range.y, -range.z);
        this.velocityMax = new THREE.Vector3(range.x, range.y, range.z);
        this.velocityMinOrigin = (setOrigin) ? this.velocityMin.clone() : this.velocityMinOrigin;
        this.velocityMaxOrigin = (setOrigin) ? this.velocityMax.clone() : this.velocityMaxOrigin;
    }

    setVelocityScale(scale) {
        this.velocity.x *= scale;
        this.velocity.y *= scale;
        this.velocity.z *= scale;
    }

    setFriction(friction, setOrigin = true) {
        this.friction = friction;
        this.frictionOrigin = (setOrigin) ? this.friction : this.frictionOrigin;
    }

    setRestitution(restitution, setOrigin = true) {
        this.restitution = restitution;
        this.restitutionOrigin = (setOrigin) ? this.restitution : this.restitutionOrigin;
    }

    getMagnitude(vector) {
        return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y));
    }

    getGravity() {
        return this.gravity;
    }

    getGravityDirection(direction) {
        return this.gravity[direction] >= 0 ? 1 : -1;
    }

    setGravity(gravity, setOrigin = true) {
        // Set gravity direction between -1, and 1
        this.gravity = new THREE.Vector3(gravity.x, gravity.y, gravity.z).clampScalar(-1, 1);
        this.gravityOrigin = (setOrigin) ? this.gravity.clone() : this.gravityOrigin;
    }

    setGravityDirection(direction, value) {
        this.gravity[direction] = Math.sign(value);
    }

    setSleep(sleep) {
        this.sleep = sleep;
        this.velocity.set(0, 0, 0);
    }

    isSleeping() {
        return this.sleep;
    }

    isMoving() {
        return this.getMagnitude(this.velocity) > 0;
    }

    wake() {
        this.sleep = false;
    }

    resetFriction() {
        this.friction = this.frictionOrigin;
    }
    
    resetRestitution() {
        this.restitution = this.restitutionOrigin;
    }

    resetGravity() {
        this.gravity = this.gravityOrigin.clone();
    }

    reverseGravity() {
        this.gravity.negate();
    }

    resetVelocity() {
        this.velocity.x = 0;
        this.velocity.z = 0;
        this.velocityMin = this.velocityMinOrigin.clone();
        this.velocityMax = this.velocityMaxOrigin.clone();
        this.sleep = true;
    }
}