class Score {
    constructor() {
        
    }

    init(target) {
        this.clock = new THREE.Clock(false);
        this.elapsedTime = 0;
        this.refreshRate = 0.25; // 1 = 1000ms
        this.refreshTime = 0;
        this.shots = 0;
        this.card = {};
        this.elem = $(this.scoreToHTML());
        this.target = target;
    }

    update(delta = this.refreshRate) {
        // Update existing score at a consistent rate
        this.refreshTime += delta;
        if (this.refreshTime >= this.refreshRate) {
            this.refreshTime = 0;
            if (document.contains(this.elem[0])) {
                this.elem.find('.shots .data').text(this.shots);
                this.elem.find('.time .data').text(this.timeToString(null, { m: true, s: true, ms: false }));
            }
            else {
                // Append element to target
                $(this.target).replaceWith(this.elem);
            }
        }
    }

    updateElapsedTime() {
        this.elapsedTime = this.clock.getElapsedTime();
    }

    add() {
        // Only start the clock if initial shot
        if (this.shots == 0) this.clock.start()
        return ++this.shots;
    }

    pause() {
        this.clock.stop();
        this.updateElapsedTime();
    }

    resume() {
        // Only start clock if already playing
        if (this.shots > 0) {
            this.updateElapsedTime(); // Refresh elapsed time to prevent restart
            this.clock.start();
        }
        this.clock.elapsedTime = this.elapsedTime;
    }

    resetScoreCard() {
        this.card = {};
    }

    reset() {
        this.clock.stop();
        this.elapsedTime = this.clock.elapsedTime = 0;
        this.refreshTime = this.refreshRate;
        this.shots = 0;
        this.elem = $(this.scoreToHTML());
        this.update();
    }

    timeToString(time, o = { m: true, s: true, ms: true }) {
        if (time == null) time = this.clock.getElapsedTime();
        var duration = time * 1000;
		var milliseconds = Math.floor((duration % 1000));
		var seconds = Math.floor((duration / 1000) % 60);
		var minutes = Math.floor((duration / (1000 * 60)) % 60);
		seconds = (seconds < 10) ? "0" + seconds : seconds; 
		minutes = (minutes < 10) ? "0" + minutes : minutes;
		milliseconds = (milliseconds < 100) ? "0" + milliseconds : milliseconds;
		milliseconds = (milliseconds < 10) ? "0" + milliseconds : milliseconds;
        return ((o.m) ? minutes : '') + ((o.s) ? ':' + seconds : '') + ((o.ms) ? '.' + milliseconds : '');
    }

    checkScore(scoreNew, scoreOld) {
        var score = Object.assign({ new_time: true, new_shots: true }, scoreNew);
        var record = null;

        // Check for new record
        if (scoreOld == null || scoreNew.shots < scoreOld.shots || scoreNew.time < scoreOld.time) {
            // Retain old shots or old time rather than overriding both
            if (scoreOld && scoreOld.shots <= scoreNew.shots) { score.shots = scoreOld.shots; score.new_shots = false; }
            if (scoreOld && scoreOld.time <= scoreNew.time) { score.time = scoreOld.time; score.new_time = false; }

            // Set score to new record partial
            record = score;
        }
        return record;
    }

    saveScore(key, score, forfeit) {
        var storageKey = 'score-' + key;
        var scoreNew = JSON.parse(this.scoreToJSON(score));
        var scoreOld = JSON.parse(app.storage.get(storageKey));
        var scoreSet = scoreNew;
        var record = this.checkScore(scoreNew, scoreOld);
        var card = this.checkScore(scoreNew, this.card[key]);
        
        // Save new record to storage if score is better than previous storage entry
        if (record != null && forfeit != true) {
            var recordSave = Object.assign({}, record);
            delete recordSave.new_shots;
            delete recordSave.new_time;
            app.storage.set(storageKey, JSON.stringify(recordSave));
        }

        // Add new card if score is better than previous card entry
        if (card != null) {
            this.card[key] = scoreSet;
            this.card['label'] = app.player.label;
        }

        // Update card date even if new record was not set
        this.card[key].date = scoreNew.date;

        // Return new record
        return record;
    }

    showScore(callback = function(){}) {
        var cards = { [app.player.name]: this.card }; // Match format of multiplayer "cards"
        var id = app.player.name;
        var label = null; // Default no label

        // Use multiplayer cards if connected
        if (app.multiplayer.isConnected()) {
            cards = app.multiplayer.cards;
            id = app.multiplayer.peer.id;

            // Countdown for auto continue
            var limit = 5;
            var selector = '.timer.card';
            var timer = setInterval(function() {
                $(selector).text(--limit);
                if (limit == 0) {
                    clearInterval(timer);
                    if (app.player.finished == true) { // Prevent click after popup is closed
                        $(selector).parent().next('input').click();
                    }
                }
            }, 1000);
            var label = '<div class="timer card">' + limit + '</div>';
        }
        app.ui.popup.add('<h1>Scores:</h1>' + this.cardsToHTML(cards, id), [{ value: 'Continue', label: label, callback: callback }], callback);
    }

    scoreToHTML(shots, time) {
        if (shots == null) shots = this.shots;
        if (time == null) time = this.timeToString(null, { m: true, s: true, ms: false });
        var html =
            '<div class="score">' +
                '<div class="shots"><span class="material-symbols-outlined">golf_course</span> <span class="data">' + shots + '</span></div>' +
                '<div class="time"><span class="material-symbols-outlined">schedule</span> <span class="data">' + time + '</span></div>' +
            '</div>';
        return html;
    }

    cardsToHTML(cards, yourID) {
        if (Object.keys(cards).length > 0) {
            var courses = {};
            var html = '<div class="cards">';
            var playerID;
            var playerName;
            var wins = 0;

            // Populate courses with player cards
            for (const [cardsKey, card] of Object.entries(cards)) {
                var courseKey;
                playerID = cardsKey;
                playerName = (yourID == playerID) ? app.player.label : card.label;

                // Loop through courses and add player scores
                for (const [cardKey, score] of Object.entries(card)) {
                    if (cardKey != 'label') {
                        courseKey = cardKey;
                        if (courses[courseKey] == null) { courses[courseKey] = []; }
                        courses[courseKey].push({ name: playerName, shots: score.shots, time: score.time, id: playerID, date: score.date });
                    }
                }
            }

            // Convert courses object to array (useful for sorting)
            courses = Object.keys(courses).map(function(name) {
                courses[name]['name'] = name;
                courses[name]['players'] = courses[name];
                courses[name]['date'] = courses[name]['players'][0]['date'];
                return courses[name];
            });

            // Sort courses by date
            courses.sort(function(a, b) {
                if(a['date'] < b['date']) { return -1; }
                if(a['date'] > b['date']) { return 1; }
                return 0;
            });

            // Create HTML from newly sorted courses
            courses.forEach(function(course) {
                // Initialize title for course
                html += '<div class="section course"><div class="title">' + course['name'] + '</div>';
                
                // Sort players by score or time if score is the same
                course.players.sort(function(a, b) {
                    if (a['shots'] === b['shots']) { return a['time'] > b['time'] ? 1 : -1; } // If shots are the same, sort by time
                    return a['shots'] > b['shots'] ? 1 : -1;
                });

                // Loop through player scores
                course.players.forEach(function(player, index) {
                    var yours = (yourID == player.id) ? ' yours' : '';
                    if (index == 0 && yourID == player.id) wins++;
                    html += '<div class="entry' + yours + '"><div class="name">' + player.name + '</div>' + app.score.scoreToHTML(player.shots, player.time) + '</div>';
                });
                html += '</div>'; // Close class "course" div
            });
            html += '<div class="section wins">Wins: ' + wins + '</div>';
            html += '</div>'; // Close class "cards" div
            return html;
        }
        else return '';
    }

    scoreToJSON(score) {
        if (score == null) {
            score = {};
            score.date = new Date();
            score.time = Number(this.clock.getElapsedTime().toFixed(3)); // Trim decimal to 3 (for ms)
            score.shots = this.shots;
            if (score.shots >= 99) score.time = app.level.clock.refreshMax; // Forfeit default clock max
        }
        return JSON.stringify(score);
    }
}