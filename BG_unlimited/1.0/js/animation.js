// This class utilizes tween.js within /libraries
class Animation {
    constructor() {
        
    }

    update(delta) {
        var tweens = TWEEN.getAll();
        for (var i = 0; i < tweens.length; i++) {
            if (tweens[i].sync == true) tweens[i].update();
        }
    }

    init(options) {
        options.duration = (options.duration != null) ? options.duration : 250;
        options.fps = (options.fps != null) ? options.fps : 60;
        options.easing = (options.easing != null) ? options.easing : TWEEN.Easing.Quadratic.InOut;
        options.update = (options.update != null) ? options.update : function(object) { return object; };
        options.callback = (options.callback != null) ? options.callback : function() {};
        options.sync = (options.sync != null) ? options.sync : true;
    }

    tween(before, after, options = {}) {
        // Initialize tween options
        this.init(options);

        // Create tween
        var tween = new TWEEN.Tween(before).to(after, options.duration).easing(options.easing).onUpdate(options.update);
        tween.sync = options.sync;

        // Sync tween with loop or use asynchronous interval if defined
        if (options.sync == true) {
            tween.onComplete(function() {
                options.callback();
            });
        }
        else {
            var interval = setInterval(
                function() { 
                    if (TWEEN.update()) {
                        TWEEN.update();
                    } 
                    else {
                        TWEEN.remove(tween);
                        clearInterval(interval);
                        options.callback();
                    }
                }, 1 / options.fps
            );
        }

        // Start tween
        tween.start();
    }

    finishAll() {
        var tweens = TWEEN.getAll();
        for (var i = 0; i < tweens.length; i++) {
            var tween = tweens[i];
            tween.stop();
        }
    }

    removeAll() {
        TWEEN.removeAll();
    }
}