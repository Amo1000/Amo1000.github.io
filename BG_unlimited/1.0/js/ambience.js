class Ambience extends THREE.Group {
    constructor() {
        super();
        this.muted = false;
        this.name = 'ambience';
        this.default = 'ambience-birds';
    }

    play(name = this.default) {
        // Update active and previous values
        this.prev = this.active;
        this.active = name;

        // Stop if values are different then play ambience
        if (this.prev != this.active) this.parent.stop(this.prev);
        this.parent.play(name, { wait: true });
    }
}