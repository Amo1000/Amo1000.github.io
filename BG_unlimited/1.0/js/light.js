class Light extends THREE.Group {
    constructor() {
        super();
    }

    init(color_one, color_two) {
        this.hemisphere = new THREE.HemisphereLight();
        this.setColors(color_one, color_two);
        this.setPosition({ x: 0, y: -1, z: 2 }, true);
        this.add(this.hemisphere);
    }

    setColors(color_one, color_two, setOrigin = true) {
        color_one = new THREE.Color(color_one);
        color_two = new THREE.Color(color_two);
        this.hemisphere.color = color_one;
        this.hemisphere.groundColor = color_two;

        // Set color origin for reset
        this.hemisphere.colorOrigin = (setOrigin) ? color_one.clone() : this.hemisphere.colorOrigin;
        this.hemisphere.groundColorOrigin = (setOrigin) ? color_two.clone() : this.hemisphere.groundColorOrigin;
    }

    setPosition(position, setOrigin) {
        this.hemisphere.position.set(position.x, position.y, position.z);
        this.hemisphere.positionOrigin = (setOrigin) ? this.hemisphere.position.clone() : this.hemisphere.positionOrigin;
    }

    resetColors(options = { duration: 500 }) {
        this.animate(this.hemisphere.colorOrigin, this.hemisphere.groundColorOrigin, options);
    }

    resetPosition() {
        if (this.hemisphere.positionOrigin) this.hemisphere.position.set(this.hemisphere.positionOrigin.x, this.hemisphere.positionOrigin.y, this.hemisphere.positionOrigin.z);
    }

    animate(color_one, color_two, options = { duration: 500 }) {
        color_one = new THREE.Color(color_one);
        color_two = new THREE.Color(color_two);
        if (options.duration > 0) {
            app.animation.tween(this.hemisphere.color, color_one, Object.assign({}, options));
            app.animation.tween(this.hemisphere.groundColor, color_two, Object.assign({}, options));
        }
        else {
            this.setColors(color_one, color_two, false);
            if (options.callback) options.callback();
        }
    }
}