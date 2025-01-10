class LevelEditor extends THREE.Group {
    constructor() {
        super();
        this.name = 'level-editor';
        this.mode = 'draw'; // UI affects this
        this.saved = true; // Default save state
        this.selection = new THREE.Group();
        this.history = new History();
    }

    init() {
        this.add(this.selection);
    }

    update(delta) {

    }

    edit(cursor) {
        if (this.mode == 'drag') {
            if (cursor.state == 'down') {
                app.level.position.x = cursor.move.x - cursor.down.x;
                app.level.position.z = cursor.move.z - cursor.down.z;
            }
            else if (cursor.state == 'up') {
                // Set camera position to level position
                cursor.reset();
                cursor.camera.position.x = -(app.level.position.x - cursor.camera.position.x);
                cursor.camera.position.z = -(app.level.position.z - cursor.camera.position.z);

                // Set level position back to zero
                app.level.position.x = 0;
                app.level.position.z = 0;
                cursor.update();
            }
        }
        else if (this.mode == 'move') {
            if (cursor.state == 'down') {
                if (app.camera.panning != true) {
                    app.camera.panning = true;
                    app.animation.tween({ x: app.camera.position.x, z: app.camera.position.z }, { x: cursor.down.x, z: cursor.down.z }, { update: function(obj) { app.camera.position.x = obj.x; app.camera.position.z = obj.z; app.level.updateBackground(obj); }, callback: function() { app.cursor.update(); app.camera.panning = false; }, easing: TWEEN.Easing.Quadratic.Out });
                }
            }
        }
        else if (this.mode == 'draw' || this.mode == 'erase' || this.mode == 'relocate' || this.mode == 'fill' || this.mode == 'sample') {
            if (cursor.state == 'down' || cursor.state == 'move') {
                var x = Math.round(cursor.move.x);
                var z = Math.round(cursor.move.z);
                var point = x + ',' + z;

                // Modify point if axis snap is enabled
                if (this.axis != null && this.selection.children.length > 1) {
                    var start = this.selection.children[0].position;
                    x = this.axis == 'x' ? x : start.x;
                    z = this.axis == 'z' ? z : start.z;
                    point = x + ',' + z
                }

                // Add selection if it does not exist yet
                if (this.selection.getObjectByProperty('point', point) == null) {
                    var model = app.assets.models.getObjectByName('select').clone();
                    model.position.x = x;
                    model.position.z = z;
                    model.point = point;
                    this.selection.add(model);
                }
            }
            else if (cursor.state == 'up') {
                cursor.reset();
                this.loadSelection();
            }
        }
    }

    loadSelection() {
        var object;
        var length = this.selection.children.length;

        // If selection has more than 1
        if (length > 0) {
            if (this.mode == 'relocate') {
                if (length > 1) {
                    var start = this.selection.children[0].position;
                    var start_point = start.x + ',' + start.z;
                    var end = this.selection.children[length - 1].position;
                    var end_point = end.x + ',' + end.z;
                    var first = app.level.objects.getObjectByProperty('point', start_point);
                    var last = app.level.objects.getObjectByProperty('point', end_point);
    
                    // Move object to the last/end selection, and update point
                    if (first != null) {
                        if (last != null) { last.removeFromParent(); }
                        first.position.set(end.x, end.y, end.z);
                        first.point = end_point;
                        app.assets.models.updateHitbox(first);
                        this.saveHistory();
                        this.saved = false; // Reset level saved status
                    }

                    // Clear selection and reload objects
                    this.selection.clear();
                    app.level.loadMap(app.level.objects);
                }
            }
            else {
                // Erase then repopulate objects from selection
                for (var i = 0; i < length; i++) {
                    var name = app.ui.getSelectedAction();
                    var child = this.selection.children[i];
                    var point = child.position.x + ',' + child.position.z;
                    var settings = { name: name, position: child.position, userData: {}};
                    var selected;

                    // Check if fill mode is selected
                    if (this.mode == 'fill') {
                        this.floodFill(settings);
                        break;
                    }
                    if (this.mode == 'sample') {
                        var sample = app.level.objects.getObjectByProperty('point', point);
                        if (sample) {
                            app.ui.selectAction(sample);
                            this.sample = sample;
                        }
                        break;
                    }
                    else {
                        // Remove objects by point
                        while (app.level.objects.getObjectByProperty('point', point)) {
                            selected = app.level.objects.getObjectByProperty('point', point);
                            selected.removeFromParent();
                        }
    
                        // Add new object if erase mode is not active
                        if (this.mode != 'erase') {
                            // Add new object
                            object = app.level.loadModel(settings);
                            app.level.objects.add(object);

                            // Copy userData from sample if type (name) matches
                            if (this.sample != null) {
                                if (object.name == this.sample.name) {
                                    object.userData = Object.assign({}, this.sample.userData);
                                }
                            }
    
                            // Edit selected text if only one unit is selected
                            if (this.selection.children.length == 1) {
                                // Replace with selected object if it has text
                                if (selected?.userData?.hasOwnProperty('text')) {
                                    object.removeFromParent();
                                    object = app.assets.models.copy(selected);
                                    app.level.objects.add(object);
                                }
                                
                                // Edit selected object text if it exists
                                if (object?.userData?.hasOwnProperty('text')) {
                                    app.ui.editObjectText(object);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Clear the selection
                this.selection.clear();
                this.saved = false; // Reset saved status
                app.level.loadMap(app.level.objects);
                if (object != selected) this.saveHistory();
            }
        }
    }

    floodFill(settings) {
        // get target value
        var map = app.level.objects.map;
        var row = map.maxY - settings.position.z;
        var col = map.maxX - settings.position.x;
        var nameStart, nameNext;

        // Check if in bounds
        function inBounds(row, col) { return col >= 0 && col < map.cols && row >= 0 && row < map.rows; }
        
        // Recursive loop that ends when out of bounds
        function flow(row, col) {
            if (inBounds(row, col) == true) {
                // Define next loop name
                nameNext = map.arr[row][col];
                if (nameNext == null) nameNext = 'null';
                else nameNext = nameNext.name;

                // Replace matching name and being recursion
                if (nameStart == nameNext) {
                    var object = null;
                    var x = (map.maxX - col);
                    var z = (map.maxY - row);
                    var point = x  + ',' + z;
                    var current = app.level.objects.getObjectByProperty('point', point);
                    
                    // Remove current object from parent
                    if (current != null) { current.removeFromParent(); }
                    
                    // Add new object if name is not null
                    if (settings.name) {
                        object = app.level.loadModel(settings);
                        object.point = point;
                        object.position.x = x;
                        object.position.z = z;
                        app.assets.models.updateHitbox(object);
                        app.level.objects.add(object);
                    }
                    map.arr[row][col] = object; // Update object map
                    
                    // Check every side
                    flow(row - 1, col); // check left
                    flow(row + 1, col); // check right
                    flow(row, col - 1); // check up
                    flow(row, col + 1); // check down
                }
            }
        }
    
        // Run flood fill if in bounds
        if (inBounds(row, col) == true && settings.name != '') {
            // Define start loop name
            nameStart = map.arr[row][col];
            if (nameStart == null) nameStart = 'null';
            else nameStart = nameStart.name;

            // Flood fill on new name or remove by same
            if (nameStart == settings.name) settings.name = null;
            flow(row, col);
            this.saveHistory();
        }
    }

    setAxis() {
        this.axis = null;
        var _this = this;
        var length = this.selection.children.length;
        if (length > 1) {
            var start = this.selection.children[0].position;
            var end = this.selection.children[length - 1].position;
            this.axis = Math.abs(start.x - end.x) > Math.abs(start.z - end.z) ? 'x' : 'z';

            // Loop through children to correct selection axis
            this.selection.children.forEach(function(child) {
                child.position.x = _this.axis == 'x' ? child.position.x : start.x;
                child.position.z = _this.axis == 'z' ? child.position.z : start.z;
                child.point = child.position.x + ',' + child.position.z;
            });
        }
    }

    resetAxis() {
        this.axis = null;
    }

    saveLevel(text = 'Saved!') {
        var data = JSON.parse(app.level.toJSON());
        var key = data.key;
        var objects = [app.weather, app.player, app.player.prediction, app.player.skins.trail].concat(app.level.getObjectsByProperty('name', 'out-of-bounds'));
        app.assets.showForScreenshot(false, objects);
        data.thumbnail = app.assets.screenshot();
        app.assets.showForScreenshot(true, objects);
        data.date = app.level.date = new Date().getTime(); // Save new date
        app.storage.set(key, JSON.stringify(data));
        this.saved = true; // Set saved status
        log(text)
    }

    saveHistory() {
        this.history.add(app.level.toJSON());
    }

    undo() {
        app.level.objects.clear(); // Clears nested text as well
        app.level.objects.removeFromParent();
        app.level.objects = app.level.loadObjects(JSON.parse(this.history.undo()));
        app.level.add(app.level.objects);
        log('Undo');
    }

    redo() {
        app.level.objects.clear(); // Clears nested text as well
        app.level.objects.removeFromParent();
        app.level.objects = app.level.loadObjects(JSON.parse(this.history.redo()));
        app.level.add(app.level.objects);
        log('Redo');
    }

    reset() {
        app.level.objects.clear(); // Clears nested text as well
        app.level.objects.removeFromParent();
        app.level.objects = app.level.loadObjects(JSON.parse(this.history.current()));
        app.level.add(app.level.objects);
        app.level.loadPlayer();
    }

    startAutoSave() {
        var _this = this;
        var interval = 30000; // ms
        this.endAutoSave();
        this.autoSave = setInterval(function() {
            _this.saveLevel('Auto saved!');
        }, interval);
    }
    
    endAutoSave() {
        clearInterval(this?.autoSave);
    }
}