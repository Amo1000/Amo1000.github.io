class Assets {
    constructor() {
        this.assets = {};
        this.manager = new THREE.LoadingManager();
        this.audio = new Audio(this.manager);
        this.textures = new Textures(this.manager);
        this.models = new Models(this.manager);
        this.thumbnails = {};

        // Initialize asset render settings
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.canvas = this.renderer.domElement;
        this.light = new THREE.HemisphereLight('#ffffff', '#000000', 1);
        this.light.position.set(0, -1, 1); // Backed up and move above surface
        this.camera = this.assetCamera();
    }

    init() {
        this.audio.init();
    }

    update(delta) {
        for (var i = 0; i < this.models.children.length; i++) {
            var child = this.models.children[i];
            if (child.mixer) {
                child.mixer.update(delta);
            }
        }
    }

    // Load models and set callback
    load(callback) {
        var _self = this;
        this.manager.onLoad = callback; // Set callback
        this.manager.onProgress = this.loadProgress;

        $.getJSON('./json/assets.json?v=' + new Date().getTime(), function(json) {
            _self.audio.load(json.audio);
            _self.textures.load(json.textures);
            _self.models.load(json.models);
        });
    }

    loadProgress(urls, itemsLoaded, itemsTotal) {
        if (!$('.progress').length) { $('body').append('<div class="progress"></div>'); }
        $('.progress').css({ width: Math.ceil((itemsLoaded / itemsTotal) * 100) + '%' });
        if (itemsLoaded == itemsTotal) { $('.progress').remove(); }
    }

    modelToThumbnail(model, width = 64, height = 64, zoom = -1) {
        // Set optional parameters for thumbnail
        if (model.userData && model.userData.thumbnail) {
            for (const [key, value] of Object.entries(model.userData.thumbnail)) {
                if (key == 'position') {
                    model.position.x = value.x;
                    model.position.y = value.y;
                    model.position.z = value.z;
                }
                else if (key == 'rotation') {
                    model.rotation.x = value.x;
                    model.rotation.y = value.y;
                    model.rotation.z = value.z;
                }
                else if (key == 'scale') {
                    model.scale.x = value.x;
                    model.scale.y = value.y;
                    model.scale.z = value.z;
                }
            }
        }

        // Add model to scene and return canvas as an image URL
        this.camera.position.y = zoom;
        this.renderer.setSize(width, height);
        this.scene.add(model, this.light);
        this.renderer.render(this.scene, this.camera);
        this.scene.clear();
        return this.canvas.toDataURL('image/png');
    }

    modelsToThumbnails(width = 64, height = 64, zoom = -1, refresh = false) {
        if (Object.keys(this.thumbnails).length <= 0 || refresh == true) {
            for (var i = 0; i < this.models.children.length; i++) {
                var model = this.models.copy(this.models.children[i]);
                var src = this.modelToThumbnail(model, width, height, zoom);
                var order = (model.userData.order !== undefined) ? model.userData.order : 999;
                var body = model.userData.body;
                var tags = (model.userData.tags !== undefined) ? model.userData.tags : '';

                // Define order and body for sorting and filters
                this.thumbnails[model.name] = { src: src, order: order, body: body, tags: tags };
            }
        }
    }

    assetCamera(type = 'orthographic', width = 1, height = 1) {
        var camera;
        if (type == 'orthographic') camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0, 1000);
        else if (type == 'perspective') camera = new THREE.PerspectiveCamera(75, width / height, 0.5, 1000);
        camera.rotation.x = 90 * Math.PI / 180; // Rotate 90 degrees up
        return camera;
    }

    screenshot(preview = false, width = 160, height = 90) {
        var src = '';
        var widthOrigin = window.innerWidth;
        var heightOrigin = window.innerHeight;

        // Update camera and renderer for screenshot
        app.camera.aspect = width / height;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize(width, height);
        app.renderer.render(app.scene, app.camera);
        src = app.renderer.domElement.toDataURL('image/png');

        // Reset camera and renderer
        app.camera.aspect = widthOrigin / heightOrigin;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize(widthOrigin, heightOrigin);
        app.renderer.render(app.scene, app.camera);

        // Return src for data save
        if (preview == true) this.openImage(src);
        else return src;
    }

    showForScreenshot(visible = true, group) {
        group.forEach(function(child){
            if (visible == true) {
                if (child.visibleOrigin != null) {
                    child.visible = child.visibleOrigin; // Revert to original state (true or false)
                    delete child.visibleOrigin; // Remove origin
                }
                else child.visible = visible;
            }
            else {
                child.visibleOrigin = child.visible; // Store for later
                child.visible = visible; // Set to parameter (false)
            }
        });
    }

    openImage(src) {
        var w = window.open('', '');
        var img = new Image();
        w.document.body.appendChild(img);
        img.src = src;
    }

    getThumbnails(...keys) {
        var thumbnails = {};
        for (const [k, v] of Object.entries(this.thumbnails)) {
            var obj = v;
            for (let key of keys) { obj = obj[key]; }
            if (obj !== undefined) { thumbnails[k] = v; }
        }
        return thumbnails;
    }
}