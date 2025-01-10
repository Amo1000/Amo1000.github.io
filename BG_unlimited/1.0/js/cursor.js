class Cursor extends THREE.Group {
    constructor() {
        super();
        this.raycaster = new THREE.Raycaster();
        this.geometry = new THREE.PlaneGeometry(1000, 1000); // Plenty of clickable space
        this.plane = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({ visible: false }));
        this.plane.name = 'plane';
        this.down = new THREE.Vector3();
        this.move = new THREE.Vector3();
        this.up = new THREE.Vector3();
    }

    init(camera) {
        this.camera = camera;
        this.plane.rotation.copy(this.camera.rotation);
        //this.crosshair = app.assets.models.getObjectByName('crosshair').clone();
        //this.add(this.crosshair);
        this.add(this.plane);
    }

    update(delta) {
        // Move clickable plane with camera
        this.plane.position.x = this.camera.position.x;
        this.plane.position.z = this.camera.position.z;
    }

    mouseDown(e) {
        this.state = 'down';
        this.down = this.getPlanePoint(e);
        return this.down;
    }

    mouseMove(e) {
        this.move = this.getPlanePoint(e);
        return this.move;
    }

    mouseUp(e) {
        this.state = 'up';
        this.up = this.getPlanePoint(e);
        return this.up;
    }

    reset() {
        this.state = '';
    }

    getPlanePoint(e) {
        var mouse = new THREE.Vector2();
        var point = new THREE.Vector3();
        mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
        this.raycaster.setFromCamera(mouse, this.camera);
        point = this.raycaster.intersectObjects([this.plane], false)[0].point;
        point.y = 0;
        return point;
    }
}