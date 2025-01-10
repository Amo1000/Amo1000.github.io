class Collisions extends THREE.EventDispatcher {
    constructor() {
        super();
        this.start = [];
        this.end = [];
    }

    check(hitbox) {
        this.checkStart(hitbox);
        this.checkEnd(hitbox);
    }

    checkStart(hitbox) {
        // Check new collisions
        for (var i = 0; i < this.start.length; i++) {
            var c = this.start[i];
            // Only check if it has a hitbox
            if (c.hitbox) {
                // Loop through collision hitboxes (plural)
                for (var j = 0; j < c.hitbox.length; j++) {
                    // Only check non-collisions
                    if (!c.hitbox[j].collided) {
                        if (c.hitbox[j].intersectsBox(hitbox)) {
                            var action = { ...c.userData.hitbox[j].action };
                            action.type += 'Start';
                            action.collision = c;
                            c.hitbox[j].collided = true;
                            this.end.push(c); // Add collision history
                            this.dispatchEvent(action);
                        }
                    }
                }
            }
        }
    }

    checkEnd(hitbox) {
        // Check previous collisions that have ended (no longer colliding)
        for (var i = this.end.length - 1; i > -1; i--) {
            var c = this.end[i];
            // Loop through collision hitboxes (plural)
            for (var j = 0; j < c.hitbox.length; j++) {
                // Only check collided hitboxes
                if (c.hitbox[j].collided == true) {
                    // Check if no longer intersecting
                    if (c.hitbox[j].intersectsBox(hitbox) == false) {
                        var action = { ...c.userData.hitbox[j].action };
                        action.type += 'End';
                        action.collision = c;
                        c.hitbox[j].collided = false;
                        this.end.splice(i, 1); // Remove from collisions end
                        this.dispatchEvent(action);
                    }
                }
            }
        }
    }

    reset() {
        // Reset collisions to false (useful for re-spawning)
        for (var i = 0; i < this.start.length; i++) {
            var c = this.start[i];
            c.collided = false;
        }
    }

    empty() {
        this.start = [];
        this.end = [];
    }

    length() {
        return this.start.length;
    }
}