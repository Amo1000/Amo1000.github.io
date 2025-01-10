class Text extends THREE.Group {
    constructor(options) {
        super();
        this.init(options);
    }

    init(options) {
        options = Object.assign({ type: 'div', class: 'text', text: 'Hello, World!', id: this.uuid, visible: true, position: { x: 0, y: 0, z: 0 }}, options);
        this.element = document.createElement(options.type);
        this.element.className = options.class;
        this.element.id = options.id;
        this.object = new THREE.CSS2DObject(this.element);
        this.object.position.set(options.position.x, options.position.y, options.position.z);
        this.object.visible = options.visible;
        this.setText(options.text);
        this.add(this.object);
        this.addEventListeners();
    }

    setText(text) {
        this.element.innerHTML = text;
    }

    hideText() {
        this.object.visible = false;
    }

    showText() {
        this.object.visible = true;
    }

    delete() {
        this.remove(this.object);
    }

    addEventListeners() {
        // Fade tip when clicked
        var _this = this;
        $(this.element).on('click', function() { $(this).fadeOut(250, function() { _this.delete(); }); });
        this.addEventListener('showText', function() { _this.showText(); });
        this.addEventListener('hideText', function() { _this.hideText(); });
    }
}