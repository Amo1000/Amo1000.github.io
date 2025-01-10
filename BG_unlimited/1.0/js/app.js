class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.animation = new Animation();
        this.camera = new Camera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: (localStorage.getItem('setting-antialias') || 'true') == 'true', alpha: true });
        this.rendererText = new THREE.CSS2DRenderer();
        this.rendererText.domElement.className = 'ui-text';
        this.canvas = this.renderer.domElement;
        this.light = new Light();
        this.weather = new Weather();
        this.assets = new Assets();
        this.piano = new Piano();
        this.level = new Level();
        this.player = new Player();
        this.multiplayer = new Multiplayer();
        this.storage = new Storage();
        this.clock = new THREE.Clock(false);
        this.score = new Score();
        //this.clock.target = 24; // Use for testing
        this.events = new Events();
        this.cursor = new Cursor();
        this.ui = new UI();

        // Update camera options
        this.camera.init({ position: { x: 0, y: -10, z: 0 }, rotation: { x: 90 * Math.PI / 180, y: 0, z: 0 }, listener: this.assets.audio.audioListener });

        // Initialize app after assets are loaded
        this.assets.load(this.init);
    }

    // Initialize application
    init() {
        document.body.appendChild(app.canvas);
        document.body.appendChild(app.rendererText.domElement);
        app.camera.setQuality();
        app.camera.follow(app.player, false);
        app.light.init('#ffffff', '#0096cc');
        app.assets.init();
        app.ui.init();
        app.piano.init();
        app.score.init('.ui .top .score');
        app.events.init();
        app.player.init();
        app.multiplayer.init();
        app.level.init();
        app.cursor.init(app.camera);
        app.scene.add(app.level, app.cursor, app.light);
        app.resume();

        // Begin rendering loop
        app.render();
    }

    render() {
        if (app.clock.target == null) { // Use browser refresh rate
            requestAnimationFrame(function(e) { app.render(); });
            app.update(app.clock.getDelta() * app.player.speed);
            app.renderer.render(app.scene, app.camera);
            app.rendererText.render(app.scene, app.camera);
        }
        else { // Use target FPS for testing
            setTimeout(function() {
                requestAnimationFrame(function(e) { app.render(); });
                app.update(app.clock.getDelta() * app.player.speed);
            }, 1000 / app.clock.target);
            app.renderer.render(app.scene, app.camera);
            app.rendererText.render(app.scene, app.camera);
        }
    }

    pause(play = false) {
        this.play = play;
        app.clock.stop();
        app.score.pause();
    }

    resume(play = true) {
        this.play = play;
        app.clock.start();
        app.score.resume();
    }

    update(delta) {
        app.ui.stats.begin();
        if (app.play == true) {
            this.score.update(delta);
            this.player.update(delta);
            this.level.update(delta);
            this.weather.update(delta);
            this.camera.update(delta);
            this.cursor.update(delta);
        }
        this.animation.update(delta);
        app.ui.stats.end();
    }
}
var app = new App();