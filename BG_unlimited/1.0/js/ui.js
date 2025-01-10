class UI {
    constructor() {
        this.cache = {};
        this.view = 'home'; // Default
        this.log = new Log();
        this.popup = new Popup();
        this.levelMenu = new LevelMenu();
        this.actionMenu = new ActionMenu();
        this.jsonEditor = new JSONEditor($('<div>', { id: 'jsoneditor' })[0], { search: false, enableSort: false, navigationBar: false, enableTransform: false, colorPicker: false, mode: 'form' });
        this.stats = new Stats();
        this.stats.domElement.style.cssText = 'position:absolute;top:0;left:0;height:12px;overflow:hidden;pointer-events:none;';
    }

    init() {
        var _this = this;
        $('body').prepend('<div class="ui"></div>');
        this.loadView(this.view, function() { app.events.addReviewLink('.ui .bottom'); });
        this.popup.init();
        this.showFPS((localStorage.getItem('setting-fps') || 'false') == 'true');
    }

    loadView(view, callback) {
        var ui = $('.ui');
        var _this = this;
        this.prev = this.view;
        this.view = view;

        // Wrap callback with required updates
        var update = function() {
            _this.updateVersion(); // Update version
            app.player.skins.updateWallet();
            app.ui.loadLevelName();
            if (callback) { callback(); }
        }

        // Access or load HTML cache
        if (this.cache[view]) {
            ui.html(JSON.parse(this.cache[view]));
            _this.log.mount();
            update();
        }
        else {
            $.get('./html/' + view + '.html', function(html) {
                ui.html($(html));
                _this.cache[view] = JSON.stringify(html);
                _this.log.mount();
                update();
            });
        }
    }
    
    addLevel() {
        var _self = this;
        app.level.getJSON('./json/levels/level-new.json?v=' + new Date().getTime(), function(json) {
            var key = app.storage.getUniqueKeyByDate('level');
            json.key = key;
            json.date = new Date();
            app.storage.set(key, JSON.stringify(json));
            _self.levelMenu.addItem(json);
            _self.levelMenu.selectLast();
            _self.showLevelOptions(true);
        });
    }

    showLevelOptions(show = true) {
        $('[href="export-level"], [href="delete-level"], [href="edit-level"]').attr('tabindex', (show == true) ? 0 : -1);
    }

    editLevel() {
        var item = this.levelMenu.getSelected();
        var input = item.find('input');
        var key = item.attr('id');
        var data = JSON.parse(app.storage.get(key));

        // Save level name if value changed
        if (input.val() != input.attr('value')) {
            app.ui.editLevelName(input);
            data.name = input.val();
        }
        
        // Load level data and UI
        app.score.reset();
        app.level.loadLevel(data, false);
        this.loadActionBar();
    }

    editLevelName(input) {
        var key = input.attr('name');
        var data = JSON.parse(app.storage.get(key));
        var name = input.val();
        input.attr('value', name); // Refresh in DOM
        data.name = name;
        data.date = new Date();
        app.storage.set(key, JSON.stringify(data));
    }

    loadLevelName() {
        // Update course name
        var name = app.level.objects.name;
        var key = app.level.objects.key;
        if (key && key.length > 0) name = this.levelMenu.getCourseName(key) + name;
        if (name.length > 32) name = name.substring(0, 32) + '...';
        $('.ui .hole').text(name);
    }

    editLevelData() {
        var _this = this;
        var item = this.levelMenu.getSelected();
        var key = item.attr('id');
        var data = JSON.parse(app.storage.get(key));
        var hide = { thumbnail: data.thumbnail, key: data.key, date: data.date };
        var key = data.key;
        var saveCallback = function() {
            var json = _this.jsonEditor.get();
            json = Object.assign(json, hide); // Merge hidden items
            item.find('input').attr('value', json.name); // Refresh in DOM;
            app.storage.set(key, JSON.stringify(json));
        };
        delete data.thumbnail, delete data.key, delete data.date; // Hide from editor
        this.jsonEditor.set(data);
        this.jsonEditor.expandAll();
        this.popup.add(this.jsonEditor.container, [{ value: 'Cancel' }, { value: 'Save', callback: saveCallback }], saveCallback);
    }

    removeLevel() {
        this.popup.add('<h1>Are you sure?</h1>', [{ value: 'Yes', callback: this.deleteLevel }, { value: 'No' }]);
    }

    deleteLevel() {
        var key = app.ui.levelMenu.getSelected().attr('id');
        app.storage.remove(key); // Delete level
        app.storage.remove('score-' + key); // Delete score
        app.ui.levelMenu.removeSelected();
        app.ui.levelMenu.select();
        if (app.ui.levelMenu.length() <= 0) {
            app.ui.showLevelOptions(false);
        }
    }

    exitEditor() {
        var callbackNo = function() { app.resume(); app.ui.loadView('level-manager'); app.ui.levelMenu.loadUserLevels(); };
        var callbackYes = function() { app.resume(); app.level.editor.saveLevel(); app.ui.loadView('level-manager'); app.ui.levelMenu.loadUserLevels(); };
        app.level.editor.endAutoSave();
        app.pause();

        if (app.level.editor.saved == false) {
            // Show dialog if level is not saved
            this.popup.add('<h1>Would you like to save your level?</h1>', [
                { value: 'No', callback: callbackNo },
                { value: 'Yes', callback: callbackYes }
            ], function() { app.resume(); });
        }
        else {
            callbackNo();
        }
    }

    exitCourse() {
        var callbackYes = function() { app.resume(app.play); app.ui.loadView('courses', function() { app.ui.levelMenu.loadCourses(); }); };
        var callbackNo = function() { app.resume(app.play); };
        app.pause(app.play);
        this.popup.add('<h1>Are you sure you want to exit this level?</h1>', [
            { value: 'Yes', callback: callbackYes },
            { value: 'No', callback: callbackNo }
        ], callbackNo);
    }

    loadActionBar() {
        app.assets.modelsToThumbnails(64, 64);
        var models = app.assets.getThumbnails('body'); // Only get thumbnails with body property
        models = app.storage.sort(models, 'order');

        // Loop through 1-9, 0 (keyboard numbers)
        var i = 0;
        for (const [key, value] of Object.entries(models)) {
            var id = (++i) % 10;
            var action = $('.actions [href="' + id + '"]');
            var title = value.key.split('-').map(function(word) { return word[0].toUpperCase() + word.substring(1); }).join(' ');
            action.attr({ style: 'background-image: url(' + value.src + ');', id: value.key, title: title });
            if (i >= 10) break;
        }

        // Set default mode from template selected class
        this.selectAction(2);
        this.selectMode('draw');
    }

    getSelectedAction() {
        return $('.actions .selected').attr('id');
    }

    getSelectedMode() {
        return $('.modes .selected').attr('href').replace('mode-', '');
    }

    selectAction(value) {
        var action;

        // Switch to draw mode
        app.ui.selectMode('draw');
        
        // Update action by variable type
        switch (typeof value) {
            case 'string': action = $('.actions [id="' + value + '"]'); break;
            case 'number': action = $('.actions [href="' + value + '"]'); break;
            case 'object':
                if (value instanceof jQuery) { action = value; }
                else {
                    // Update selected action by object data
                    var title = value.name.split('-').map(function(word) { return word[0].toUpperCase() + word.substring(1); }).join(' ');
                    var src = app.assets.thumbnails[value.name].src;
                    var name = this.getSelectedAction();

                    // Select existing OR update selected action attributes
                    if ($('[id="' + value.name + '"]').length > 0) {
                        this.selectAction(value.name);
                        return false;
                    }
                    else {
                        action = $('[id="' + name + '"]');
                        action.attr({ id: value.name, style: 'background-image: url(' + src + ')', title: title });
                    }
                }
            break;
        }

        // Pause and select action
        this.pause();
        action.siblings().removeClass('selected');
        action.addClass('selected');
    }

    selectMode(value, setOrigin = true) {
        var button;
        switch (typeof value) {
            case 'undefined': button = $('.modes [href="mode-' + app.level.editor.modeOrigin + '"]'); break;
            case 'string': button = $('.modes [href="mode-' + value.replace('mode-', '') + '"]'); break;
            case 'object': button = value; break;
        }
        this.pause();
        button.siblings().removeClass('selected');
        button.addClass('selected');

        // Reset level mode if origin is false
        if (setOrigin == true) app.level.editor.mode = app.level.editor.modeOrigin = this.getSelectedMode();
        else app.level.editor.mode = this.getSelectedMode();
    }

    editObjectText(object) {
        var maxlength = 120;
        var title = '<h1>Edit ' + object.name + '</h1>';
        var elem = { type: 'text', value: object.userData.text, maxlength: maxlength, 
            callback: function(e) {
                var text = $(e.target).val().substring(0, maxlength);
                object.userData.text = text;
                app.level.editor.saveHistory();
                if (object.text) object.text.setText(text);
            }
        };
        var save = { value: 'Save' };
        if (object.name == 'note') {
            Object.assign(elem, { id: 'keyboard' });
            app.ui.popup.on('open', function(e) { 
                app.piano.add($('#' + elem.id), 60, 84);
                app.piano.input.on('change', function() { app.assets.audio.playNotes(app.piano.getPressedKeys()); });
                app.piano.input.change();
            });
        }
        else if (object.name == 'speed') { Object.assign(elem, { type: 'number', min: 0.5, max: 2.0, step: 0.1 }); }
        else if (object.name == 'conveyor') { Object.assign(elem, { type: 'number', label: 'Speed', style: 'margin-top: 0.5rem;', min: -20, max: 20, step: 1 }); }
        this.popup.add(title, [elem, save]);
    }

    showTip(object) {
        if (object.visible) {
            app.pause();
            app.assets.audio.play('ping-2');
            object.visible = false;
            var callback = function() { app.resume(); }
            this.popup.add('<h1>' + object.userData.text + '</h1>', [{ value: 'Ok', callback: callback }], callback);
        }
    }

    finishCourse(forfeit = false) {
        var retry = function() { app.ui.restart(true); app.score.reset(); }
        var next = function() { if (app.player.finished == true) app.ui.continue(); }
        var options = [];
        var score = JSON.parse(app.score.scoreToJSON());
        var scoreHTML = $(app.score.scoreToHTML(score.shots, score.time));
        var key = app.level.getLevelKey();
        var record = app.score.saveScore(key, score, forfeit);
        var reward = Number(atob(app.level.reward));
        var bonus = 0; // Default no bonus rewards
        var text =  ((record != null) ? '<h1>New Record!</h1>' : '<h1>Finished!</h1>') + '<h2>' + app.ui.levelMenu.getCourseName(app.level.objects.key) + ' ' + app.level.objects.name + '</h2>';

        // Change outcome if disqualified (only in multiplayer)
        if (app.multiplayer.getPlayerCount() > 1 && score.time >= app.level.clock.refreshMax) {
            // Ignore AFK host card
            if (app.player.afk == true) {
                text = '<h1>You were AFK too long</h1>';
                scoreHTML = $('<div></div>'); // Clear records
            }
            else text = '<h1>Oh no!</h1><h2>You ran out of time</h2>';
            reward = 0;
        }
        else {
            // Highlight new record for shots and/or time and add bonus
            if (record != null) {
                if (record.new_shots == true) { bonus++; scoreHTML.find('.shots .data').addClass('record'); }
                if (record.new_time == true) { bonus++; scoreHTML.find('.time .data').addClass('record'); }
                reward += bonus;
            }
        }

        // Append score HTML to popup text
        text += scoreHTML[0].outerHTML;

        // Add reward text
        if (reward > 0) {
            app.player.skins.addToWallet(btoa(reward));
            text += '<div class="wallet" aria-label="reward"><span class="material-symbols-outlined">token</span><span class="amount">+' + reward + '</span></div>';
        }

        // Update options if online or offline
        if (app.multiplayer.isConnected()) {
            // Add countdown for continue
            var limit = 5;
            var selector = '.timer.finish';
            var timer = setInterval(function() {
                $(selector).text(--limit); 
                if (limit == 0) {
                    clearInterval(timer);
                    if (app.player.finished == true) { // Prevent click after popup is closed
                        $(selector).parent().next('input').click();
                    }
                }
            }, 1000);
            
            // Update "next" function
            next = function() { app.player.ready = true; }; // Replace default next functionality
            options.push({ value: 'Continue', class: 'action continue', label: '<div class="timer finish">' + limit + '</div>', callback: next });

            if (app.multiplayer.isGuest()) {
                // Begin spectating and send score card
                this.loadView('spectator');
                app.multiplayer.sendScoreCardToHost();
            }
            else {
                // Update view if not hosting level editor
                if (app.ui.view != 'level-editor') this.loadView('spectator-host');
                app.multiplayer.updateScoreCards(); // Update host score cards for guests to request
            }
        }
        else {
            options.push({ value: 'Retry', callback: retry }, { value: 'Next', callback: next });
        }

        this.popup.add(text, options, next);
    }

    continue() {
        var _this = this;
        if (this.view == 'level-editor') {
            this.pause();
            this.restart(true);
            if (app.multiplayer.isHosting() == true) {
                app.multiplayer.requestRestartForGuests();
            }
        }
        else if (this.view == 'course' || this.view.includes('spectator')) {
            // Load courses if you are hosting or NOT a guest (playing offline)
            if (app.multiplayer.isConnected() == false || app.multiplayer.isHosting() == true) {
                this.levelMenu.selectNext();
                var current = app.storage.get('setting-course-current');
                var next = app.storage.get('setting-course-next');

                // Reset host score
                app.score.reset();

                // Show menu if current level is the last level
                if (current == next) {
                    if (app.multiplayer.isHosting()) {
                        // Auto restart to first level in an infinite loop
                        _this.levelMenu.selectFirst();
                        this.loadView('course', function() { _this.play(); });
                    }
                    else {
                        // Show final level popup for campaign mode
                        this.loadView('courses', function() {
                            _this.levelMenu.updateProgress(); // Set next course and return last status
                            _this.levelMenu.loadCourses();
                            setTimeout(function() { app.ui.popup.add('<h1>Congratulations!</h1><span class="material-symbols-outlined" style="margin-bottom: 1rem;">thumb_up</span><p>You finished the last level!<br>Now go build your own levels and share them with friends!</p>', [{ value: 'Continue' }]); }, 250);
                        });
                    }
                }
                else { // Play next level
                    this.loadView('course', function() { _this.play(); });
                }
            }
        }
    }

    pause() {
        app.pause();
        if (this.view == 'level-editor') {
            $('.button[href*="restart-editor"]').attr('tabindex', 0);
            $('.button[href*="pause-editor"]').attr('tabindex', -1);
            $('.button[href*="play-editor"]').attr('tabindex', 0);
            app.level.show(['out-of-bounds']);
        }
    }

    play() {
        // Play level based on current view
        if (this.view == 'level-editor') {
            $('.button[href*="restart-editor"]').attr('tabindex', 0);
            $('.button[href*="pause-editor"]').attr('tabindex', 0);
            $('.button[href*="play-editor"]').attr('tabindex', -1);
            app.resume();
            app.level.hide(['out-of-bounds']);
        }
        else {
            var _self = this;
            var data = this.levelMenu.getSelectedDataFromCache();
            app.level.loadLevel(data);
            _self.levelMenu.storeProgress();
            _self.loadLevelName();
            app.level.loadWeather();
            app.score.reset();
            app.resume();
        }
    }

    restart(updateCamera = false) {
        app.level.reset();
        app.light.resetColors();
        app.cursor.update();

        // Update level editor UI
        if (this.view == 'level-editor') {
            $('.button[href*="restart-editor"]').attr('tabindex', 0);
            $('.button[href*="pause-editor"]').attr('tabindex', 0);
            $('.button[href*="play-editor"]').attr('tabindex', 0);
        }
        else {
            app.level.hide(['tip', 'out-of-bounds']);
        }
        
        // Update camera
        if (updateCamera == true) {
            app.camera.update(); // For edit undo/redo camera position
            app.level.refreshBackground();
        }

        // Punish restart for multiplayer users (only for official levels)
        if (app.multiplayer.isConnected() && (this.view == 'course' || this.view == 'guest')) {
            app.score.add();
            log({ text: 'Penalty +1', color: '#ff0000' });
        }
        else {
            app.score.reset();
            log('Score reset');
        }
    }

    showSettings() {
        var volume = app.storage.get('setting-volume'); // Master volume
        var music = app.storage.get('setting-volume-music');
        var quality = app.storage.get('setting-quality');
        var trail = app.storage.get('setting-trail');
        var antialias = (localStorage.getItem('setting-antialias') || 'true') == 'true';
        var tips = (localStorage.getItem('setting-tips') || 'true') == 'true';
        var showFPS = (localStorage.getItem('setting-fps') || 'false') == 'true';
        var fullscreen = app.events.isFullscreen();
        var resume = function() { app.resume(app.play); }
        var options = [
            { type: 'range', id: 'volume', label: 'Master Volume', min: 0.0, max: 1.0, step: 0.1, value: volume, callback: function(e) { app.assets.audio.setVolume($(e.target).val()); }},
            { type: 'range', id: 'volume-music', label: 'Music Volume', min: 0.0, max: 2.0, step: 0.2, value: music, callback: function(e) { app.assets.audio.music.setVolume($(e.target).val()); }},
            { type: 'checkbox', id: 'fullscreen', checked: fullscreen, label: 'Fullscreen', callback: function(e) { app.events.toggleFullscreen(); }},
            { type: 'range', id: 'quality', label: 'Graphic Quality', min: 2, max: 10, step: 1, value: quality, callback: function(e) { app.camera.setQuality($(e.target).val()); }},
            { type: 'range', id: 'trail', label: 'Trail Length', min: 0, max: app.player.skins.trail.max, step: 4, value: trail, callback: function(e) { app.player.skins.trail.setLimit($(e.target).val()); }},
            { type: 'checkbox', id: 'antialias', checked: antialias, label: 'Anti-aliasing<br><span style="font-size: 0.75rem;">(Restart Required)</span>', title: 'Requires Restart', callback: function(e) { localStorage.setItem('setting-antialias', $(e.target).is(':checked')); }},
            { type: 'checkbox', id: 'tips', checked: tips, label: 'Show Tips', callback: function(e) { var showTips = $(e.target).is(':checked'); localStorage.setItem('setting-tips', showTips); app.level.show(['tip']); }},
            { type: 'checkbox', id: 'fps', checked: showFPS, label: 'Show FPS', callback: function(e) { showFPS = $(e.target).is(':checked'); localStorage.setItem('setting-fps', showFPS); app.ui.showFPS(showFPS); }}
        ];
        app.pause(app.play);
        app.assets.audio.play('ping-1');
        this.popup.add('<h1>Settings</h1>', options, resume);
    }

    showMultiplayerSettings() {
        var _self = this;
        var playerID = app.multiplayer.getPlayerIDFromStorage();
        var hostID = app.multiplayer.getHostIDFromStorage();
        var title = '';
        var options = [
            { type: 'text', label: 'Host ID', id: 'host-id', placeholder: 'Server ID', value: hostID },
            { type: 'text', label: 'Your Name', id: 'player-id', placeholder: 'Your Name', maxlength: 16, value: playerID }
        ];
        var joinCallback = function() { _self.loadView('guest'); };
        var endCallback = function() { _self.loadView('home', function() { app.level.reloadIntroLevel(); }); }

        // Verify application timestamp
        if (app.multiplayer.isConnected() == false) {
            options.push(
                { value: 'Host', class: 'action steam', callback: function(e) {
                        if (app.storage.verify()) { app.multiplayer.host($('#host-id').val(), $('#player-id').val()); }
                        else { setTimeout(function() { app.ui.showUnverifiedMenu(); }, 250); }
                    }
                },
                { value: 'Join', callback: function(e) { app.multiplayer.join($('#host-id').val(), $('#player-id').val(), joinCallback, endCallback); }}
            );
        }
        else {
            options[0].tabindex = -1; // Disable host field
            options.push(
                { value: 'Disconnect', callback: function(e) { app.multiplayer.disconnect(); }},
                { value: 'Continue', callback: function(e) { app.multiplayer.savePlayerIDToStorage($('#player-id').val()); } }
            );

            // Add player list
            var players = [{ label: app.player.label + ' (you)' }]; // Start with you
            var hostClass = app.multiplayer.isHosting() ? ' host' : '';
            var lobby = '<div class="cards lobby' + hostClass + '"><label>Lobby</label><ol class="section">';
            for (var i = 0; i < app.multiplayer.children.length; i++) { players.push(app.multiplayer.children[i]); }
            for (var i = 0; i < players.length; i++) {
                var kick = ((players[i].peer) ? '<a class="kick" href="kick-player" data-peer="' + players[i].peer + '">Kick</a>' : '');
                lobby += '<li class="name">' + players[i].label + kick + '</li>';
            }
            lobby += '</ol></div>'; // Close .section and .card
            title += lobby;
        }
        this.popup.add(title, options);
    }

    showUnverifiedMenu() {
        var _self = this;
        var title = '<h2>You must own Boxel Golf on Steam to host a server.</h2>';
        var options = [
            { label: 'Step 1', value: 'Login', style: 'margin-bottom: 1rem;', callback: function() { chrome.tabs.create({ url: 'https://www.dopplercreative.com/boxel-golf/verify/' }); setTimeout(function() { _self.showMultiplayerToken(); }, 250); }},
            { label: 'Step 2', value: 'Connect', callback: function() { setTimeout(function() { _self.showMultiplayerToken(); }, 250); }}
        ];
        this.popup.add(title, options);
    }

    showMultiplayerToken() {
        app.ui.popup.add('<h2>Enter your new<br>token below.</h2>', [
            { type: 'text', label: 'Token', id: 'token' },
            { value: 'Submit', callback: function() {
                setTimeout(function() {
                    app.storage.verifySteam($('#token').val().toLowerCase());
                }, 250);
            }}
        ]);
    }

    showFPS(show) {
        if (show == true) {
            document.body.appendChild(this.stats.dom);
            this.stats.appended = true;
        }
        else {
            if (this.stats.appended == true) {
                document.body.removeChild(this.stats.dom);
                this.stats.appended = false;
            }
        }
    }

    updateVersion() {
        $.get('./manifest.json?v=' + (new Date()).getTime(), function(json) {
            app.version = json.version;
            $('.version').text('v' + json.version);
        });
    }

    syncData() {
        var _this = this;
        var importData = function() {
            app.storage.loadFromFile(function(data, fileName) {
                if (fileName.includes('boxel-golf-backup-')) {
                    var data = JSON.parse(data);
                    app.storage.setAll(data);
                    _this.popup.add('<h1>Import Successful!</h1>', [{ value: 'Continue' }]);
                }
                else {
                    _this.popup.add('<h1>Error</h1><h2>Incorrect file format</h2>', [{ value: 'Continue' }]);
                }
            });
        };
        var exportData = function() {
            var data = app.storage.getAll();
            app.storage.saveToFile(data, 'boxel-golf-backup-' + new Date().getTime() + '.json');
            setTimeout(function() { _this.popup.add('<h1>Export Successful!</h1>', [{ value: 'Continue' }]); }, 250);
        };
        this.popup.add('<h1>Sync Data</h1>', [{ value: 'Import', callback: importData }, { value: 'Export', callback: exportData }]);
    }
}