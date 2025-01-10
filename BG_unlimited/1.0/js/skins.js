class Skins extends THREE.Group {
    constructor() {
        super();
        this.name = 'skins';
    }

    init() {
        // Initialize color map
        this.none = new THREE.Group();
        this.none.name = 'hat-no'; // First hat is nothing
        this.none.userData.cost = 0;
        this.hats = new THREE.Group();
        this.hats.name = 'hats';
        this.trail = new Trail();
        this.trail.setLimit();
        this.setColorMap('spectrum');
        this.setColor(this.getColorFromStorage());
        this.setHat(this.getHatFromStorage());
    }

    open() {
        var zoom = this.parent.position.clone(); // Parent = player
        var _self = this;
        this.hat.visible = false;
        this.addHats();
        this.showNavigation(true);
        this.updateWallet();
        zoom.y = -3;
        app.camera.positionPrev = app.camera.position.clone();
        app.camera.offsetPrev = app.camera.offset.clone();
        app.animation.tween(app.camera.offset, { z: 0 });
        app.animation.tween(app.camera.position, zoom, { callback: function() { _self.selectByIndex(_self.hat.order); _self.updateButton(); } });
        app.assets.showForScreenshot(false, [app.player.meter, app.player.prediction]);
    }

    close(usePreviousView = true) {
        if (app.camera.offsetPrev != null) {
            this.clearHats();
            this.hat.visible = true;
            app.animation.tween(app.camera.offset, app.camera.offsetPrev);
            app.animation.tween(app.camera.position, app.camera.positionPrev);
            app.assets.showForScreenshot(true, [app.player.meter, app.player.prediction]);
            if (usePreviousView == true) app.ui.loadView(app.ui.prev);
        }
    }

    update(delta) {
        // Rotate hats
        if (this.hats && this.hats.parent) {
            for (var i = 0; i < this.hats.children.length; i++) {
                var hat = this.hats.children[i];
                hat.rotation.z += delta;
                this.updateMaterial(hat, delta);
            }
        }

        // Update current hat
        this.updateMaterial(this.hat, delta);

        // Update trail
        this.trail.update(delta, this.parent);
    }

    updateMaterial(hat, delta) {
        // Animate hat material
        if (hat.material) {
            var speed = hat.userData.text || 1;
            hat.material.map.offset.x += (hat.userData.material.map.offset.x * delta * speed);
            hat.material.map.offset.y += (hat.userData.material.map.offset.y * delta * speed);
        }
    }

    updateWallet(wallet) {
        if (wallet == null) wallet = this.getWallet();
        $('.ui .wallet .amount').text(wallet);
    }

    updateButton() {
        var button = $('[href="skin-select"]');
        var purchased = this.isPurchased(this.selected.name);
        var text = '<span class="material-symbols-outlined">verified</span><span class="label">Select</span>';
        if (purchased == false) text = '<span class="material-symbols-outlined">token</span><span class="label">Buy</span>';
        button.html(text)
    }

    addHat(model) {
        model.order = this.hats.children.length; // Used for selecting hat later
        model.position.x = model.order * 2; // Spacing
        model.position.z = 0.5;

        // Add cost if not already ordered
        if (this.isPurchased(model.name) == false && model.userData.cost >= 0) {
            model.text = new Text({ class: 'cost', position: { x: 0, y: 0, z: 1 } });
            model.text.setText('<div class="cost"><span class="material-symbols-outlined">token</span> <span class="amount">' + model.userData.cost + '</span></div>');
            model.addEventListener('removed', function(e) { model.text.delete(); });
            model.add(model.text);
        }

        // Add new model to hats
        this.hats.add(model);
    }

    addHats() {
        var models = app.assets.models.children.filter(function(model) { return model.name.includes('hat-'); }).sort(function(a, b) { return a.userData.order - b.userData.order; });
        this.add(this.hats); // Add group
        this.addHat(this.none); // Populate group with empty 3D object
            
        // Add hat model to hats group
        for (var i = 0; i < models.length; i++) {
            var model = app.assets.models.copy(models[i]);
            this.addHat(model);
        }
    }

    showNavigation() {
        var _self = this;
        var value = this.getColorFromStorage();
        var slider = $('<input>', { type: 'range', min: 0, max: 1, step: 0.01, value: value });
        var css = this.getCSSFromLut();
        
        // Add slider to center navigation
        $('.color-slider').empty().append(slider, css);
        slider.on('input', function() {
            _self.saveColor($(this).val());
            _self.setColor($(this).val());
        });
    }

    select() {
        // Select hat if already purchased
        if (this.isPurchased(this.selected.name)) {
            this.saveHat(this.selected.name);
            this.setHat(this.selected.name);
            this.close();
            log(this.hat.name.substring(4) + ' hat selected');
        }
        else {
            // Purchase hat
            this.purchase(this.selected.name);
        }
    }

    purchase(name) {
        var orders = this.getOrders();
        var wallet = this.getWallet();
        var cost = this.selected.userData.cost;

        // Check if there is enough money
        if (wallet >= cost) {
            wallet -= cost;
            this.updateWallet(wallet);
            this.saveWallet(btoa(wallet));
            this.selected.text.delete(); // Remove price tag
            orders[name] = { cost: cost, date: new Date().getTime() };
            this.saveOrders(btoa(JSON.stringify(orders))); // Store orders
            this.updateButton();
            log({ text: this.selected.name.substring(4) + ' hat purchased!', color: '#ffeb3b' });
        }
        else {
            log({ text: 'Insufficient funds', color: '#ff0000' });
        }
    }

    selectByIndex(index = 0) {
        this.selected = this.hats.getObjectByProperty('order', index);
        this.updateButton();
        app.animation.tween(this.hats.position, { x: this.selected.position.x * -1, y: 0, z: 0 });
    }

    selectPrevious() {
        var index = this.selected.order - 1;
        if (index < 0) index = this.hats.children.length - 1;
        this.selectByIndex(index);
    }

    selectNext() {
        var index = this.selected.order + 1;
        if (index > this.hats.children.length - 1) index = 0;
        this.selectByIndex(index);
    }

    getOrders() {
        var orders = app.storage.get('setting-orders');
        if (orders == null) {
            orders = {};
            this.saveOrders(btoa(JSON.stringify(orders)));
        }
        else orders = JSON.parse(atob(orders));
        return orders;
    }

    saveOrders(orders) {
        var regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
        if (regex.test(orders)) app.storage.set('setting-orders', orders);
    }

    isPurchased(name) {
        return this.getOrders()[name] != null || name == this.none.name;
    }

    getWallet() {
        var wallet = app.storage.get('setting-wallet');
        if (wallet == null) {
            wallet = 0;
            this.saveWallet(btoa(wallet));
        }
        else wallet = Number(atob(wallet));
        return wallet;
    }

    saveWallet(wallet) {
        var regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
        if (regex.test(wallet)) app.storage.set('setting-wallet', wallet);
    }

    addToWallet(amount) {
        var wallet = this.getWallet();
        var regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
        if (regex.test(amount)) {
            amount = Number(atob(amount));
            wallet += amount;
            this.saveWallet(btoa(wallet));
        } 
    }

    reset() {
        // Reset hat rotations
        this.trail.reset();
        for (var i = 0; i < this.hats.children.length; i++) {
            this.hats.visible = true;
            this.hats.children[i].rotation.z = 0;
        }
    }

    setHatDirection(direction) {
        var _self = this;
        var startZ = this.hat.rotation.z;
        var endZ = Math.sign(direction) * Math.PI / 4;
        var duration = 100;
        
        if (startZ != endZ) {
            app.animation.tween({ z: startZ }, { z: endZ }, { sync: false, duration: duration, easing: TWEEN.Easing.Quadratic.Out,
                update: function(obj) {
                    _self.hat.rotation.z = obj.z
                },
                callback: function() {
                    // Check if animation finished - requeue with delay if not
                    if (_self.hat.rotation.z != endZ) {
                        setTimeout(function() { _self.setHatDirection(direction); }, duration);
                    }
                }
            });
        }
    }

    setColorMap(name) {
        // Update spectrum array to the color map array
        var spectrum = ['#FFFFFF', '#FFFFFF', '#FF00FF', '#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF0000', '#000000', '#000000'];
        for (var i = 0; i < spectrum.length; i++) { spectrum[i] = [(i) / (spectrum.length - 1), spectrum[i]]; }
        this.lut = new THREE.Lut();
        this.lut.addColorMap(name, spectrum);
        this.lut.setColorMap(name, 128);
        return this.lut;
    }

    getColorObject(alpha) {
        return this.lut.getColor(alpha);
    }

    getColorFromStorage() {
        return app.storage.get('setting-color') || '0';
    }

    getHatName() {
        return this.hat.name;
    }

    getCSSFromLut() {
        var background = '';
        var css = $('<style></style>');
        var length = this.lut.map.length;
        for (var i = 0; i < length; i++) {
            var color = this.lut.map[i];
            background += color[1] + ' ' + Math.ceil(color[0] * 100) + '%';
            if (i != length - 1) background += ', ';
        }
        css.text('.color-slider input { background: linear-gradient(90deg, ' + background + '); }');
        return css;
    }

    getHatFromStorage() {
        return app.storage.get('setting-hat') || this.none.name;
    }

    saveHat(name) {
        if (name == null) name = this.getHatFromStorage();
        app.storage.set('setting-hat', name);
    }

    setHat(name) {
        if (this.hat) {
            this.prev = this.hat; // Set previous hat
            this.hat.removeFromParent(); // Remove previous hat
        }

        // Copy hat by name
        this.hat = app.assets.models.copy(name);
        
        // Update null hat to empty group 'none'
        if (this.hat == null) this.hat = this.none.clone();
        
        // Set hat values
        this.hat.order = this.hat.userData.order;
        this.hat.position.z = 0.5;
        this.add(this.hat);
    }

    saveColor(alpha) {
        // Set player color
        if (alpha == null) alpha = this.getColorFromStorage();
        app.storage.set('setting-color', alpha);
        this.setColor(alpha);
    }

    setColor(alpha) {
        // Parent is player
        this.colorAlpha = alpha;
        this.parent.setColor(this.getColorObject(alpha));
        this.trail.setColor(this.getColorObject(alpha))
    }

    isOpen() {
        return this.hat.visible == false;
    }

    clearHats() {
        for (var i = this.hats.children.length - 1; i >= 0; i--) {
            var hat = this.hats.children[i];
            hat.removeFromParent();
        }
    }
}