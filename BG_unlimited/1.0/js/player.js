class Player extends THREE.Group {
    constructor() {
        super();
        this.name = 'player';
        this.label = 'Player';
        this.physics = new Physics();
        this.prediction = new Prediction();
        this.ready = false;
        this.alive = true;
        this.swinging = false;
        this.jumping = false;
        this.mode = 'swing'; // Options: swing, cart
        this.power = 5;
        this.points = [];
        this.collisions = new Collisions();
        this.skins = new Skins();
        this.swingOffset = new THREE.Vector3();
        this.move = new THREE.Vector3();
        this.moving = false; // Conveyor
        this.translating = false; // UFO
        this.sticky = false;
        this.clock = new THREE.Clock(); // Used to check AFK
        this.afk = false;
        this.afkMax = 10; // AFK limit in seconds
    }

    init() {
        this.model = app.assets.models.copy('ball');
        this.meter = app.assets.models.copy('meter');
        this.cart = app.assets.models.copy('cart');
        this.club = app.assets.models.copy('club-putter');
        this.fire = this.getFireMesh();
        this.fire.visible = false;
        this.club.visible = false;
        this.cart.visible = false;
        this.cart.scale.set(2, 2, 2); // Default 2x
        this.cart.offset = new THREE.Vector3(0, 0, 0.5);
        this.cart.position.set(this.cart.offset.x, this.cart.offset.y, this.cart.offset.z); // Shift position
        this.colorMeter = new THREE.Lut('rainbow', 256);
        this.add(this.model, this.meter, this.cart, this.club, this.skins);
        this.label = app.storage.get('setting-player') || this.label;
        this.skins.init();
        this.setRotation(0);
        this.setScale({ x: 0.5, y: 0.5, z: 0.5 });
        this.setHitBox();
        this.setSpeed(1);
        this.addEvents();
    }

    update(delta) {
        // Check physics if player is alive
        if (this.alive == true && this.translating == false) {
            this.collisions.start = this.physics.update(this, app.level.objects.map, delta);
            this.model.rotation.y += this.physics.velocity.x * delta * 250;
    
            // Check collisions
            this.setHitBox(); // Refresh hitbox
            this.collisions.check(this.hitbox);

            // Animate cart
            this.cart.position.z = this.cart.offset.z - (Math.sin(app.clock.getElapsedTime() * 50) / 50);

            if (this.isSleeping()) {
                // Move player if not zero (used for conveyor)
                if (this.move.length() != 0) {
                    this.position.x += this.move.x * delta;
                    this.position.y += this.move.y * delta;
                    this.position.z += this.move.z * delta;
                }
            }
            else {
                this.moving = false;

                // Set hat direction on impact
                if (this.collisions.start.length > 0) {
                    this.setHatDirection(this.physics.velocity.x);
                }
            }
            // Enable swing based on swing mode
            if (this.mode == 'swing') {
                if (this.ready == false) {
                    if (this.swinging == false) {
                        if (this.finished == false) {
                            if (this.isSleeping() && this.moving == false) {
                                this.ready = true;
                                this.meter.visible = true;
                                this.updateShot(this.swingOffset.add(this.position));
                                this.setCheckpoint();
                            }
                        }
                    }
                }
            }
            else if (this.mode == 'cart') {
                // Show meter if ready
                if (this.ready == false) {
                    this.ready = true;
                    this.meter.visible = true;
                }

                // Add checkpoint if landed
                if (this.jumping == true) {
                    if (this.isLanded()) {
                        this.jumping = false;
                        this.updateShot(this.swingOffset.add(this.position));
                        this.setCheckpoint(); // Set checkpoint to initial landing spot
                    }
                }
            }

            // Fall damage
            if (this.position.z < -200 || this.position.z > 200) {
                this.kill({ text: 'Out of bounds! +1 Penalty', audio: 'sword' });
            }
        }

        // Update skins
        this.skins.update(delta);

        // Update AFK status
        this.afk = this.clock.getElapsedTime() > this.afkMax;
    }

    updateShot(pointB) {
        this.clampShot(pointB); // Clamp shot

        // Redraw meter even if not visible
        if (this.swinging == false && this.moving == false && this.skins.isOpen() == false) {
            var pointA = this.position;
            var directionGravity = this.physics.getGravityDirection('z');
            var directionSwing = (Math.sign(pointA.x - pointB.x) >= 0 ? 1 : -1);
            var scale = Math.sqrt(Math.pow((pointA.x - pointB.x), 2) + Math.pow((pointA.z - pointB.z), 2)) / this.power;
            var angle = Math.atan2((directionGravity * pointB.z) - (directionGravity * pointA.z), (directionGravity * pointB.x) - (directionGravity * pointA.x));
            var meter = this.meter.getObjectByName('meter-amount');
            this.swingOffset = pointB.clone().sub(pointA.clone());
            if (scale > 1) scale = 1;
            this.powerScale = scale;
            meter.visible = false;
            meter.material.emissive.set(this.colorMeter.getColor(scale));
            meter.scale.z = scale;
            this.meter.rotation.y = -angle + (90 * Math.PI / 180);
            this.prediction.visible = !this.isMoving() && !this.finished;
            if (this.prediction.visible == true) this.prediction.calculate(this, pointB, this.power, app.level.objects.map, this.colorMeter.getColor(scale));
            
            // Update club rotation & position
            if (this.ready == true) {
                this.club.rotation.y = -(Math.PI * scale * directionSwing * directionGravity);
                this.club.position.y = -2;
                this.club.position.z = 4;
            }
        }
    }

    setMode(mode) {
        this.mode = mode;
        if (mode == 'swing') {
            this.cart.visible = false;
            this.physics.setGravityDirection('x', 0, false); // Remove x-gravity force
            this.physics.resetVelocity();
        }
        else if (mode == 'cart') {
            // Set cart direction to current velocity OR checkpoint gravity direction
            var xDir = -this.physics.velocity.x;
            if (this.checkpoint && this.checkpoint.gravity.x != 0) xDir = this.checkpoint.gravity.x;

            // Update physics
            this.jumping = false;
            this.cart.visible = true;
            this.physics.wake();
            this.physics.setGravityDirection('x', xDir, false);
            this.physics.setVelocityLimit({ x: 0.1, y: 0.2, z: 0.25 }, false);
            app.assets.audio.play('cart');
        }
    }

    action(pointB, callback) {
        // Only perform action if not finished
        if (this.finished == false) {
            if (this.mode == 'swing') this.swing(pointB, callback);
            else if (this.mode == 'cart') this.jump(pointB, callback);
        }
    }

    swing(pointB, callback = function() {}) {
        this.clampShot(pointB); // Clamp shot

        if (this.ready == true && this.alive == true && this.skins.isOpen() == false) {
            var _self = this;
            this.ready = false;
            this.sticky = false;
            this.swinging = true;
            this.club.visible = true;
            this.meter.visible = false;
            this.prediction.visible = false;
            if (this.powerScale > 0 && this.powerScale < 0.25) app.assets.audio.play('swing-putt');
            else if (this.powerScale >= 0.25 && this.powerScale < 0.5) app.assets.audio.play('swing-chip');
            else if (this.powerScale >= 0.5) app.assets.audio.play('swing-fast');
            app.animation.tween(this.club.rotation, { x: 0, y: 0, z: 0 }, { callback: function() {
                _self.physics.force(_self.position, pointB, _self.power);
                _self.setHatDirection(_self.physics.velocity.x);
                _self.swinging = false;
                _self.club.visible = false;
                callback();
            }, easing: TWEEN.Easing.Quadratic.In, duration: 250 });
        }
    }

    jump(pointB, callback = function() {}) {
        var xDir = this.position.x - pointB.x;
        var _this = this;
        if (this.jumping == false && this.alive == true && this.moving == false) {
            this.jumping = true;
            this.meter.visible = false;
            this.prediction.visible = false;
            this.physics.velocity.z = 0; // Clear start jump velocity
            this.physics.setGravityDirection('x', xDir, false);
            
            // If sleeping, move player or jump (add 'reverse' variable for in)
            if (this.isSleeping()) { this.swing(pointB, function() { _this.meter.visible = false; }); }
            else { this.force({ x: 0, y: 0, z: 2 * this.physics.getGravityDirection('z') }); }
            app.assets.audio.play('cart-jump');
            callback();
        }
    }

    clampShot(pointB) {
        // Clamp z axis for better putting
        if (this.sticky == false) {
            var offset = 0.5;
            var g = this.physics.getGravityDirection('z');
            if (g == 1 && pointB.z < this.position.z + offset) pointB.z = this.position.z + offset;
            else if (g == -1 && pointB.z > this.position.z - offset) pointB.z = this.position.z - offset;
        }
    }

    force(direction) {
        var pointB = new THREE.Vector3(this.position.x + direction.x, this.position.y + direction.y, this.position.z + direction.z);
        this.physics.force(this.position, pointB);
    }

    kill(action) {
        var _self = this;
        var directionSwing = this.position.x > this.checkpoint.x ? 1 : -1;
        var directionGravity = this.physics.getGravityDirection('z');
        
        this.alive = false;
        this.meter.visible = false;
        this.prediction.visible = false;

        app.score.add(); // Penalize 1 point

        // Add action message to log
        if (action) {
            log({ text: action.text, color: '#ff0000' });
            if (action.audio) app.assets.audio.play(action.audio);
        }

        // Animate spin/flip then respawn after position is reset
        app.animation.tween({ z: _self.rotation.z + (Math.PI * 2) }, { z: _self.rotation.z }, { update: function(obj) { _self.rotation.z = obj.z }, 
        callback: function() { 
                app.animation.tween({ y: _self.rotation.y + (Math.PI * 4 * directionSwing * directionGravity) }, { y: _self.rotation.y }, { update: function(obj) { _self.rotation.y = obj.y }, duration: 500 });
                app.animation.tween(_self.position, _self.checkpoint, { callback: function() { _self.respawn(); }, duration: 500 });
            }, duration: 500 
        });
    }

    setPosition(position, setOrigin = true) {
        this.position.set(position.x, position.y, position.z);
        this.positionOrigin = (setOrigin) ? this.position.clone() : this.positionOrigin;
    }

    setCheckpoint(position) {
        if (this.autosave == true || position != null) {
            this.checkpoint = (position == null) ? this.position.clone() : position.clone();
            this.checkpoint.gravity = this.physics.gravity.clone();
            this.checkpoint.scale = this.scale.clone();
            this.checkpoint.mode = this.mode;
            this.checkpoint.speed = this.speed;
            this.checkpoint.sticky = this.sticky;
        }
    }

    setScale(scale = { x: 0.5, y: 0.5, z: 0.5 }, setOrigin = true) {
        scale = (isNaN(scale)) ? scale : { x: scale, y: scale, z: scale }; // Convert number to object
        this.scale.set(scale.x, scale.y, scale.z);
        this.meter.scale.set(1 / scale.x, 1 / scale.y, (1 / scale.z) * this.power);
        this.points = []; // Reset array
        this.points.push({ x: -(scale.x / 2), y: scale.y, z: -(scale.z / 2) }); // Bottom Left
        this.points.push({ x: (scale.x / 2), y: scale.y, z: -(scale.z / 2) }); // Bottom Right
        this.points.push({ x: -(scale.x / 2), y: scale.y, z: (scale.z / 2) }); // Top Left
        this.points.push({ x: (scale.x / 2), y: scale.y, z: (scale.z / 2) }); // Top Right
        this.scaleOrigin = (setOrigin) ? this.scale.clone() : this.scaleOrigin;
    }

    getScale() {
        return (this.scale.x + this.scale.y + this.scale.z) / 3;
    }

    slow(scale) {
        // 0.5 = slower, 2 = faster
        this.physics.setVelocityScale(scale);
    }

    teleport(object) {
        var _this = this;
        var pair = app.level.getObjectPair(object);
        if (pair) {
            if (this.teleporting != true) {
                this.teleporting = true;
                this.setPosition(pair.position, false);
                var color_one = '#' + app.light.hemisphere.color.getHexString();
                var color_two = '#' + app.light.hemisphere.groundColor.getHexString();

                // Flash purple immediately (0 duration)
                app.light.animate('#ff00ff', '#ff00ff', { duration: 0,
                    callback: function() {
                        // Animate back to original colors
                        app.light.animate(color_one, color_two, { duration: 250, callback: function() {
                            _this.teleporting = false; // Allow teleporting again
                        }});
                    }
                });
            }
        }
    }

    translate(e) {
        var _this = this;
        if (this.getScale() >= 0.5) {
            log('You are too big to carry!');
        }
        else {
            var speed = 1000;
            var ufo = e.collision;
            var offset = ufo.userData.text.replace(' ', '').split(',');
            var target = ufo.getObjectByName(e.value);
            var isOnline = app.multiplayer.isConnected(); // Fix sync animation when online
            _this.sleep();
            _this.setPosition(ufo.position, false);
            _this.moving = _this.translating = true;
            offset = { x: parseInt(offset[0]), y: 0, z: parseInt(offset[1]) };
            
            // Start animation
            app.assets.audio.stop(e.audio);
            app.assets.audio.play(e.audio);
            app.animation.tween({ x: 0, z: 0 }, { x: offset.x, z: offset.z }, {
                duration: speed,
                sync: isOnline,
                update: function(obj) {
                    // Move target model
                    target.position.x = obj.x;
                    target.position.z = obj.z;
                    
                    // Move player model
                    _this.position.x = ufo.position.x + obj.x;
                    _this.position.z = ufo.position.z + obj.z;
                },
                callback: function() {
                    _this.physics.wake();
                    _this.moving = _this.translating = false;
                    app.assets.audio.stop(e.audio);
                    app.assets.audio.play(e.audio);
                    app.animation.tween({ x: offset.x, z: offset.z }, { x: 0, z: 0 }, {
                        duration: speed,
                        sync: isOnline,
                        update: function(obj) {
                            target.position.x = obj.x;
                            target.position.z = obj.z;
                        }
                    });
                }
            });
        }
    }

    setRotation(rotation, setOrigin = true) {
        this.rotation.set(rotation.x, rotation.y, rotation.z);
        this.rotationOrigin = (setOrigin) ? this.rotation.clone() : this.rotationOrigin;
    }

    setHitBox() {
        if (this.hitbox == null) this.hitbox = new THREE.Box3();
        this.hitbox.setFromCenterAndSize(this.position, this.scale);
    }

    getSize() {
        return this.hitbox.getSize(new THREE.Vector3())
    }

    reset() {
        app.player.physics.gravityPower = 0.5;
        this.resetPosition();
        this.resetRotation();
        this.resetScale();
        this.resetSpeed();
        this.setMode('swing');
        this.alive = true;
        this.finished = false;
        this.meter.visible = false;
        this.prediction.visible = false;
        this.skins.reset();
        this.autosave = true; // Default autosave
        this.collisions.empty();
        this.jumping = false;
        this.move.set(0, 0, 0); // Remove existing move vector (from conveyor)
        this.moving = false;
        this.ready = false; // This changes in the update method
        this.swinging = false;
        this.sticky = false; // Used for clamping shot
        this.clock.start(); // Reset afk counter
        this.afk = false;
        this.fire.visible = false;
        this.cart.rotation.z = 0;
        this.rotating = false;
        this.teleporting = false;
        this.physics.resetVelocity();
        this.physics.resetGravity();
        this.prediction.physics.resetGravity();
        this.setHatDirection(0);
        this.setCheckpoint();
        this.sleep(); // Force sleep state

        // Reset camera
        app.camera.resetRotation(); // Reset gravity rotation offset
        app.camera.resetOffset(); // Reset gravity rotation offset
        app.camera.follow(app.player, false); // Follow player if changed

        // Stop all animations to prevent onComplete callbacks
        app.animation.finishAll();
    }

    resetPosition() {
        if (this.positionOrigin != null) this.position.set(this.positionOrigin.x, this.positionOrigin.y, this.positionOrigin.z);
    }

    resetScale() {
        if (this.scaleOrigin != null) this.setScale({ x: this.scaleOrigin.x, y: this.scaleOrigin.y, z: this.scaleOrigin.z });
    }

    resetRotation() {
        if (this.rotationOrigin != null) {
            this.rotation.set(this.rotationOrigin.x, this.rotationOrigin.y, this.rotationOrigin.z);
            this.meter.rotation.set(0, 0, 0);
            this.skins.rotation.set(0, 0, 0);
        }
    }

    respawn() {
        // Reverse gravity if checkpoint 'z' does not match current 'z'
        if (this.checkpoint.gravity.z != this.physics.gravity.z) {
            this.reverseGravity();
        }
        
        // Configure previous mode
        this.alive = true;
        this.physics.resetVelocity();
        this.move.set(0, 0, 0);
        this.moving = false;
        this.speed = this.checkpoint.speed;
        this.sticky = this.checkpoint.sticky;
        this.setHatDirection(0);
        this.setScale(this.checkpoint.scale, false);
        this.setMode(this.checkpoint.mode);
    }

    reverseGravity() {
        // Reverse gravity
        this.physics.reverseGravity();
        this.prediction.physics.reverseGravity();

        // Rotate player and camera
        var _self = this;
        var rotateY = this.physics.gravity.z > 0 ? 0 : Math.PI;
        var duration = 1000; // ms
        this.rotating = true;
        app.animation.tween({ y: this.rotation.y }, { y: rotateY }, { duration: duration, update: function(obj) { _self.rotation.y = obj.y; }, callback: function() { _self.rotating = false; }});
        app.animation.tween({ z: app.camera.rotation.z }, { z: rotateY }, { duration: duration, update: function(obj) { app.camera.rotation.z = obj.z; }});
        app.camera.reverseOffset();
    }

    setHatDirection(direction) {
        this.skins.setHatDirection(Math.sign(direction * this.physics.getGravityDirection('z')));
    }

    sleep() {
        this.physics.setSleep(true);
    }

    isSleeping() {
        return this.physics.isSleeping();
    }

    isMoving() {
        return this.physics.isMoving();
    }

    isLanded() {
        var landed = this.isSleeping(); // Sleeping == landed
        if (landed == false) {
            for (var i = 0; i < this.collisions.start.length; i++) {
                var c = this.collisions.start[i];
                var axis = Math.abs(this.position.x - c.position.x) > Math.abs(this.position.z - c.position.z) ? 'x' : 'z';
                var angle = Math.atan2(c.position.z - this.position.z, c.position.x - this.position.x);
                
                if (axis == 'z') {
                    if (angle * this.physics.getGravityDirection('z') < 0) {
                        if (c.userData.body == 'static') landed = true;

                        // Do not save if action type is 'kill'
                        if (c.userData.hitbox) {
                            for (var j = 0; j < c.userData.hitbox.length; j++) {
                                var action = c.userData.hitbox[j].action;
                                if (action && action.type == 'kill') return false;
                            }
                        }
                    }
                }
            }
        }
        return landed;
    }

    setSpeed(speed = 1, setOrigin = true) {
        this.speed = speed; // 0.5 = slow motion
        if (setOrigin == true) this.speedOrigin = speed;
    }

    setSpeedFromObject(object) {
        if (object.visible) {
            this.setSpeed(object.userData.text, false);
            object.visible = false;
        }
    }

    resetSpeed() {
        this.speed = this.speedOrigin;
    }

    toJSON() {
        var player = {
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            rotation: { x: this.rotation.x, y: this.rotation.y, z: this.rotation.z },
            scale: { x: this.scale.x, y: this.scale.y, z: this.scale.z },
            skin: { color: this.skins.colorAlpha, hat: this.skins.hat.name },
            mode: this.mode,
            finished: this.finished,
            ready: this.ready,
            label: this.label,
            afk: this.afk
        }
        return player;
    }

    setColor(color) {
        this.model.traverse(function(node) {
            if (node.type == "Mesh" && node.material.name != 'ball-fire') {
                node.material.color.set(color);
            }
        });
    }

    getFireMesh() {
        var object;
        this.model.traverse(function(node) { if (node.type == "Mesh" && node.material.name == 'ball-fire') object = node; });
        return object;
    }

    ignite(duration = 1000, speed = -2) {
        var fire = this.fire;
        var offset = fire.material.map.offset;
        var target = offset.clone();
        fire.visible = true;
        target.x -= speed;
        target.y -= speed;
        app.animation.tween(offset, target, { duration: duration, callback: function() { fire.visible = false; }, easing: TWEEN.Easing.Linear.None });
    }



    finishCourse(forfeit = false) {
        // Pause the score and set finished state
        app.score.pause();
        this.finished = true;
        this.sleep();
        this.skins.updateWallet();

        // Punish slow players
        if (forfeit == true) app.score.shots = 99;
        
        // Show dialog window updates
        app.ui.finishCourse(forfeit);
    }

    addEvents() {
        var _self = this;
        this.collisions.addEventListener('audioStart', function(e) {
            if (_self.physics.rolling == false) app.assets.audio.play(e.audio);
        });
        this.collisions.addEventListener('checkpointStart', function(e) {
            if (_self.checkpoint.equals(e.collision.position) == false) {
                e.collision.animation.reset();
                e.collision.animation.play();
                app.assets.audio.play(e.audio);
                log('Checkpoint!')
                _self.setCheckpoint(e.collision.position);
            }
        });
        this.collisions.addEventListener('finishStart', function(e) {
            if (_self.finished == false) {
                app.assets.audio.play(e.audio);
                _self.finishCourse();
            }
        });
        this.collisions.addEventListener('forceStart', function(e) {
            if (e.collision.animation) {
                e.collision.animation.reset();
                e.collision.animation.play();
                app.assets.audio.play(e.audio);
            }
            _self.force(e.value);
        });
        this.collisions.addEventListener('gravityStart', function(e) {
            if (_self.rotating != true) {
                e.collision.animation.reset();
                e.collision.animation.play();
                app.assets.audio.play(e.audio);
                _self.reverseGravity();
            }
        });
        this.collisions.addEventListener('hideEnd', function(e) {
            if (e.collision.hidden != true) {
                e.collision.hidden = true;
                e.collision.visible = false;
                app.assets.audio.play(e.audio);
            }
        });
        this.collisions.addEventListener('igniteStart', function(e) {
            app.assets.audio.play(e.audio);
            _self.ignite();
        });
        this.collisions.addEventListener('gravStart', function(e) {
            app.assets.audio.play(e.audio);
            app.player.physics.gravityPower = e.collision.userData.text;
        });
        this.collisions.addEventListener('exitStart', function(e) {
            	app.assets.audio.play(e.audio);
	    	this.mode = 'swing';
	    	_self.setMode('swing');
        });
        this.collisions.addEventListener('killStart', function(e) {
            if (_self.alive == true) {
                if (e.collision.animation) {
                    e.collision.animation.reset();
                    e.collision.animation.play();
                }
                _self.kill(e);
            }
        });
        this.collisions.addEventListener('moveStart', function(e) {
            var speed = e.collision.userData.text;
            var direction = new THREE.Vector3(e.value.x * speed, e.value.y * speed, e.value.z * speed);
            _self.sleep();
            _self.move.add(direction);
            _self.moving = true;
        });
        this.collisions.addEventListener('moveEnd', function(e) {
            var speed = e.collision.userData.text;
            var direction = new THREE.Vector3(e.value.x * speed, e.value.y * speed, e.value.z * speed);
            var force = direction.clone();
            var axis = new THREE.Vector3(0, 1, 0);
            var angle = Math.sign(speed) * Math.PI * 0.25; // 0.5 = 90deg, 0.25 = 45deg

            // Wake player and push towards the conveyor
            if (_self.move.equals(direction)) {
                force.applyAxisAngle(axis, angle);
                force.multiplyScalar(0.25);
                _self.force(force); // Wake
            }

            // Reset 'move' so it no longer moves
            if (_self.moving == true) _self.move.sub(direction);
        });
        this.collisions.addEventListener('showStart', function(e) {
            e.collision.visible = true;
        });
        this.collisions.addEventListener('portalStart', function(e) {
            _self.teleport(e.collision);
            app.assets.audio.play(e.audio);
        });
        this.collisions.addEventListener('scaleStart', function(e) {
            _self.setScale(Number(e.value), false);
            app.assets.audio.play(e.audio);
        });
        this.collisions.addEventListener('customscaleStart', function(e) {
            _self.setScale(Number(e.collision.userData.text), false);
            app.assets.audio.play(e.audio);
        });
        this.collisions.addEventListener('slowStart', function(e) {
            _self.slow(e.value);
            app.assets.audio.play(e.audio);
        });
        this.collisions.addEventListener('gooStart', function(e) {
            _self.sleep();
            _self.sticky = true;
            _self.meter.visible = true;
            if (e.collision.animation) {
                app.assets.audio.play(e.audio);
                e.collision.animation.reset();
                e.collision.animation.play();
            }
        });
        this.collisions.addEventListener('speedStart', function(e) { _self.setSpeedFromObject(e.collision); });
        this.collisions.addEventListener('tipStart', function(e) {
            if (e.collision.visible == true) {
                log(e.collision.userData.text);
                app.assets.audio.play(e.audio);
            }
        });
        this.collisions.addEventListener('translateStart', function(e) {
            _self.translate(e);
        });
        this.collisions.addEventListener('noteStart', function(e) {
            e.collision.animation.reset();
            e.collision.animation.play();
            app.assets.audio.playNotes(e.collision.userData.text);
        });
        this.collisions.addEventListener('cartStart', function(e) {
            if (e.collision.visible == true) {
                e.collision.visible = false;
                _self.setMode('cart');
                _self.setCheckpoint(_self.position); // Include position to force checkpoint
            }
        });
    }
}