class Music extends THREE.Group {
    constructor() {
        super();
        this.muted = false;
        this.name = 'music';
        this.default = 'music-1';
        this.active = this.default;
    }

    play(name = this.default) {
        // Update active and previous values
        this.prev = this.active;
        this.active = name;

        // Stop if values are different then play ambience
        if (this.prev != this.active) this.parent.stop(this.prev);
        this.parent.play(name, { wait: true });
    }

    setVolume(volume) {
        app.storage.set('setting-volume-music', volume);
        var music = this.parent.getObjectByName(this.active);
        if (music) music.setVolume(volume);
    }
}