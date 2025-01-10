class Level extends THREE.Group {
    constructor() {
        super();
        this.name = 'level';
        this.editor = new LevelEditor();
        this.background = new THREE.Group();
        this.objects = new THREE.Group();
        this.clock = new THREE.Clock(false);
        this.clock.refreshTime = 0;
        this.clock.refreshRate = 1; // Countdown rate = 1 second
        this.clock.refreshMax = 60; // Level max limit in seconds
        this.objects.name = '';
        this.objects.key = '';
        this.debug = false;
    }

    init() {
        var _self = this;
        this.editor.init();
        this.getJSON('./json/levels/lobby.json?v=' + new Date().getTime(), function(json) {
            _self.introLevel = json;
            _self.loadLevel(json);
        });
    }

    reloadIntroLevel() {
        if (this.key != this.introLevel.key) {
            this.loadLevel(this.introLevel);
        }
    }

    update(delta) {
        this.refreshBackground(delta);
        this.updateObjects(delta);
        this.editor.update(delta);
        this.updateCountDown(delta);
    }

    getJSON(path, callback) {
        $.getJSON(path, function(json) {
            // Initialize 2D array
            callback(json);
        });
    }

    loadLevel(objects, hide = true) {
        this.clear();
        this.objects.clear(); // Important for clearing CSS2DObjects
        this.objects = this.loadObjects(objects);
        this.background = this.loadBackground(objects);
        this.key = objects.key;
        this.date = objects.date;
        this.reward = objects.reward || 'MA=='; // Uses rewards from courses.json which are populated at level-menu.js
        this.add(this.objects, this.background, this.editor, app.weather, app.player, app.player.prediction, app.player.skins.trail, app.multiplayer);
        this.loadPlayer();
        this.loadLight(objects);
        this.loadWeather(objects);
        this.loadAmbience(objects);
        this.loadMusic(objects);
        this.refreshBackground();
        this.clock.start();
        this.clock.refreshTime = 0;
        this.editor.history.clear();
        this.editor.saved = true; // Set saved status
        this.editor.saveHistory();
        if (hide == true) app.level.hide(['tip', 'out-of-bounds']);
    }

    loadObjects(objects) {
        var group = new THREE.Group();
        group.key = objects.key;
        group.name = objects.name;
        group.thumbnail = objects.thumbnail;
        group.weather = objects.weather;

        // Add models to group
        for (var i = 0; i < objects.children.length; i++) {
            var child = objects.children[i];
            var model = this.loadModel(child);
            if (model != null) group.add(model);
        }

        this.loadMap(group);
        return group;
    }

    loadModel(child) {
        // Copy model from child data
        var model = app.assets.models.copy(child);

        // Merge child userData with model object
        this.mergeUserData(model, child.userData, null);

        // Add hitbox
        if (this.debug == true) {
            if (model.hitbox) {
                for (var i = 0; i < model.hitbox.length; i++) {
                    this.add(new THREE.Box3Helper(model.hitbox[i], '#ff0000'));
                }
            }
        }
        return model;
    }

    mergeUserData(object, userData, filter) {
        if (userData) {
            if (filter) {
                // Merge userData by filter value
                object.userData = Object.keys(userData).filter(function(key){ return filter.includes(key); }).reduce(function(obj, key) { obj[key] = userData[key]; return obj; }, {});
                if (Object.keys(object.userData).length === 0) delete object.userData;
            }
            else {
                // Merge userData into object
                object.userData = Object.assign(object.userData, userData);
            }
        }
    }

    loadMap(objects) {
        var maxX = Math.max.apply(Math, objects.children.map(function(o) { return o.position.x; }));
        var maxY = Math.max.apply(Math, objects.children.map(function(o) { return o.position.z; }));
        var minX = Math.min.apply(Math, objects.children.map(function(o) { return o.position.x; }));
        var minY = Math.min.apply(Math, objects.children.map(function(o) { return o.position.z; }));
        var rows = (maxY - minY) + 1;
        var cols = (maxX - minX) + 1;
        var resized = (this.objects.map == null || (this.objects.map.rows != rows || this.objects.map.cols != cols));

        objects.map = { maxX: maxX, maxY: maxY, minX: minX, minY: minY, rows: rows, cols: cols, resized: resized, arr: [] };

        // Create empty 2D map
        for (var row = 0; row < rows; row++) {
            objects.map.arr[row] = [];
            for (var col = 0; col < cols; col++) {
                objects.map.arr[row][col] = null;
            }
        }

        // Place children into 2D map
        for (var i = 0; i < objects.children.length; i++) {
            var child = objects.children[i];
            var x = objects.map.maxX - child.position.x;
            var z = objects.map.maxY - child.position.z;
            objects.map.arr[z][x] = child;
        }
        return objects;
    }

    loadBackground(objects) {
        var background = new THREE.Group();
        if (objects.background) {
            background = app.assets.models.copy(objects.background.name);
            if (background == null) background = app.assets.models.copy('background-clouds');
        }
        return background;
    }

    loadLight(objects) {
        if (objects.light == null) { objects.light = { color_one: app.light.hemisphere.color, color_two: app.light.hemisphere.groundColor }; }
        app.light.setColors(objects.light.color_one, objects.light.color_two);
        app.light.animate(objects.light.color_one, objects.light.color_two);
    }

    loadWeather(objects = this.objects) {
        if (objects.weather == null) { objects.weather = { texture: null }; }
        var map = this.objects.map;
        var padding = 32; // Add extra padding
        var options = {
            quantity: (map.rows * map.cols) * 0.5,
            position: { x: map.minX + (map.maxX - map.minX) / 2, y: 0, z: map.minY + (map.maxY - map.minY) / 2 },
            scale: { x: map.cols + padding, y: 20, z: map.rows + padding },
            texture: app.assets.textures.get(objects.weather.texture),
            velocity: objects.weather.velocity
        }
        app.weather.set(options);
    }

    loadAmbience(objects = this.objects) {
        app.assets.audio.ambience.play(objects.ambience);
    }

    loadMusic(objects = this.objects) {
        app.assets.audio.music.play(objects.music);
    }

    refreshBackground(delta = 0) {
        // Constantly rotate background
        this.background.rotation.z = (app.player.position.x * 0.01) - (app.clock.getElapsedTime() * 0.025);

        // Set background position to camera zoom and player position
        this.updateBackground();
    }

    updateBackground(target) {
        if (app.camera.panning == false) {
            if (target == null) target = app.camera.target.position;
            this.background.position.x = target.x;
            this.background.position.z = target.z;
            this.background.position.y = -app.camera.position.y / 10;
        }
        else {
            this.background.position.x = app.camera.position.x - app.camera.offset.x;
            this.background.position.z = app.camera.position.z - app.camera.offset.z;
        }

        // Update scale to camera zoom depth
        this.background.scale.x = Math.abs(app.camera.position.y) * 10;
        this.background.scale.y = Math.abs(app.camera.position.y) * 10;
        this.background.scale.z = Math.abs(app.camera.position.y) * 10;
    }

    updateObjects(delta) {
        for (var i = 0; i < this.objects.children.length; i++) {
            var child = this.objects.children[i];
            if (child.mixer) {
                child.mixer.update(delta);
            }

            // Add material animation
            if (child.material) {
                var speed = Number(child.userData.text) || 1;
                child.material.map.offset.x += (child.userData.material.map.offset.x * delta * speed);
                child.material.map.offset.y += (child.userData.material.map.offset.y * delta * speed);
            }
        }
    }

    getObjectPair(object) {
        var pair;
        for (var i = 0; i < this.objects.children.length; i++) {
            var child = this.objects.children[i];
            // Get object pair by matching name with a different ID
            if (object.name == child.name && object.uuid != child.uuid) {
                if (JSON.stringify(object.userData) == JSON.stringify(child.userData)) {
                    pair = child;
                    break;
                }
            }
        }
        return pair;
    }

    getObjectsByProperty(key, value) {
        return this.objects.children.filter(function(child) { return (child[key] == value); });
    }

    show(names = [], visible = true) {
        // Update settings
        var showTips = (localStorage.getItem('setting-tips') || 'true') == 'true';

        // Loop through objects and check if name exists
        for (var i = 0; i < this.objects.children.length; i++) {
            var child = this.objects.children[i];
            if (names.some(function(name) { return child.name.indexOf(name) >= 0; })) {
                child.visible = visible;
                delete child.hidden; // Delete key to allow physics engine to calculate collision

                // Show tip if child is hidden
                if (child.name == 'tip') {
                    child.visible = !showTips; // Show model if tips are false
                    child.text.dispatchEvent({ type: (child.visible) ? 'hideText' : 'showText' });
                }
            }
        }
    }

    hide(names) {
        this.show(names, false);
    }

    loadPlayer() {
        // Locate tee or cart for spawn point
        var tee = this.objects.getObjectByName('tee');
        var cart = this.objects.getObjectByName('cart'); // Alternative spawn
        var autosave = this.objects.getObjectByName('checkpoint') == null; // Default autosave == true, but allow existence of checkpoint cube to override that
        
        // Set spawn point to tee OR cart
        if (tee) app.player.setPosition({ x: tee.position.x, y: 0, z: tee.position.z });
        else if (cart) app.player.setPosition({ x: cart.position.x, y: 0, z: cart.position.z });
        app.player.reset(); // Reset player properties
        app.player.autosave = autosave;
        app.camera.panning = false; // Reset for multiplayer

        // Optional debug hitbox
        if (this.debug) this.add(new THREE.Box3Helper(app.player.hitbox, '#ff0000'));
    }

    findFlag() {
        var flag = this.objects.getObjectByName('flag-hole');
        var player = app.player;

        if (flag != null) {
            //flag = flag.position.clone();
            if (app.camera.isPanned(flag.position) == false) {
                app.pause();
                flag.z += app.camera.offset.z;
                flag.y = app.camera.position.y;
                app.camera.panning = false;
                app.camera.follow(flag);
            }
            else {
                app.resume();
                player.z += app.camera.offset.z;
                player.y = app.camera.position.y;
                app.camera.follow(player);
            }
        }
    }

    toJSON() {
        var level = {};
        level.name = this.objects.name;
        level.key = this.objects.key;
        level.date = this.date;
        level.background = {};
        level.ambience = app.assets.audio.ambience.active;
        level.music = app.assets.audio.music.active;
        level.light = { color_one: '#' + app.light.hemisphere.color.getHexString(), color_two: '#' + app.light.hemisphere.groundColor.getHexString() }
        level.weather = { texture: app.weather.texture, velocity: app.weather.velocity };
        level.children = [];
        level.thumbnail = this.objects.thumbnail;

        // Update children list
        for (var i = 0; i < this.objects.children.length; i++) {
            var child = this.objects.children[i];
            var object = level.children[i] = {};
            object.name = child.name;
            object.position = { x: child.position.x, y: child.position.y, z: child.position.z };
            this.mergeUserData(object, child.userData, ['text']); // Filter all except text value
        }

        // Update background
        if (this.background && this.background.name) { level.background.name = this.background.name; }

        // Return level in JSON format
        return JSON.stringify(level);
    }

    getLevelKey() {
        return this.objects.key;
    }

    reset() {
        this.editor.reset(); // Use history
    }

    updateCountDown(delta) {
        // Check countdown if the player is not finished or is in the lobby
        if (app.multiplayer.isConnected()) {
            if (this.objects.key != 'lobby' && app.ui.view != 'level-editor') {
                if (app.player.finished == false) {

                    // Update clock every 1000ms
                    this.clock.refreshTime += delta;
                    if (this.clock.refreshTime > this.clock.refreshRate) { // Ex: 1 second
                        this.clock.refreshTime = 0;

                        // Restart clocks if nobody else is connected
                        if (app.multiplayer.getPlayerCount() < 2) {
                            this.clock.start();
                            app.player.clock.start();
                        }
                        else {
                            // Define default elapsed and max time
                            var elapsed = Math.floor(this.clock.getElapsedTime());
                            var max = this.clock.refreshMax;
    
                            // Start afk counter 5 seconds before forfeit
                            if (app.player.afk == true) {
                                elapsed = Math.floor(app.player.clock.getElapsedTime()) - 5;
                                max = app.player.afkMax;
                            }
                
                            // Show remaining time
                            if (elapsed >= max - 10 && elapsed < max) {
                                log({ text: '' + (max - elapsed), color: '#ff0000' })
                            }
                            else if (elapsed >= max) {
                                app.player.finishCourse(true); // Force the player to forfeit
                            }
                        }
                    }
                }
            }
        }
    }
}