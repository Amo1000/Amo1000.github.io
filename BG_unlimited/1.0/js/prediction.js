class Prediction extends THREE.Group {
    constructor() {
        super();
        this.name = 'prediction';
        this.physics = new Physics();
        this.geometry = new THREE.BufferGeometry();
        this.line = new MeshLine();
        this.lineShadow = new MeshLine();
        this.lineMaterial = new MeshLineMaterial({ color: '#ffffff', opacity: 1, lineWidth: 0.125, transparent: true });
        this.lineShadowMaterial = new MeshLineMaterial({ color: '#000000', opacity: 1, lineWidth: 0.125, transparent: true });
        this.lineMesh = new THREE.Mesh(this.line, this.lineMaterial);
        this.lineShadowMesh = new THREE.Mesh(this.lineShadow, this.lineShadowMaterial);
        this.limit = 8; // 20
        this.add(this.lineMesh, this.lineShadowMesh);
    }

    calculate(player, pointB, power, map, color) {
        var object = {
            points: [...player.points],
            position: player.position.clone(),
            scale: player.scale.clone()
        };
        this.physics.resetVelocity();
        this.physics.force(object.position, pointB, power);

        // Predict loop
        var points = [];
        var pointsShadow = [];
        for (var i = 0; i < this.limit; i++) {
            this.physics.update(object, map, i * 0.01);
            if (i < this.limit) {
                points.push(object.position.clone());
                pointsShadow.push(object.position.clone().add({ x: 0, y: 0.0625, z: -0.0625 }));
            }
        }
        this.line.setPoints(points);
        this.lineShadow.setPoints(pointsShadow);
        this.updateColor(color);
    }

    updateColor(color) {
        this.lineMaterial.color = color;
    }
}