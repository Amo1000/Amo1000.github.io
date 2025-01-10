class Multiplayer extends THREE.Group {
    constructor() {
        super();
    }

    init() {
        this.ping = 10; // 30 = 30 packets per second
        this.debug = true;
        this.interpolate = true; // true = smooth animations
        this.cards = {}; // Score cards
        this.hosting = false;
        this.prefix = 'boxel-golf-';
        this.guest = false;
        this.clock = new THREE.Clock(true);
        this.timeout = 5; // Used for kicking disconnected players or host
    }

    update() {
        var _self = this;
        // Start server loop
        setTimeout(function() {
            if (_self.hosting == true) {
                // Update guests recursively
                _self.sendPlayersToGuests();
                _self.update();
            }
            else {
                // Disconnected from host after 5 second timeout
                if (_self.hostConn != null && Math.abs(_self.hostConn.time - _self.clock.getElapsedTime()) > _self.timeout) { _self.hostConn.close(); }
                else _self.update(); // Continue recursion
            }
        }, 1000 / this.ping);
    }

    host(hostID, playerID) {
        var _self = this;
        if (this.peer) this.peer.destroy();
        hostID = hostID.substring(0, 16);
        playerID = playerID.substring(0, 16);
        this.peer = new Peer(this.prefix + hostID); // Generate random ID
        this.hosting = true;
        this.guest = false;

        // Add connection listener after ID is generated
        this.peer.on('open', function(id) {
            log('Your are now hosting');
            _self.saveHostIDToStorage(hostID);
            _self.savePlayerIDToStorage(playerID);
            _self.resetScoreCards();

            // Add listeners per "guest" connection
            _self.peer.on('connection', function(conn) {
                _self.addConnectionToHost(conn);
            });
        });

        this.peer.on('error', function(error) {
            if (error.type == 'unavailable-id') {
                _self.disconnect();
                app.ui.popup.add('<h1>Host ID Taken</h1>', [{ value: 'Ok' }]);
            }
        });

        // Start loop
        this.update();
    }

    addConnectionToHost(conn) {
        // Add connection to array
        var _self = this;

        // Add new connection listener
        conn.on('open', function() {
            // Do something when the player first opens connection
            console.log(conn);
        });

        // Add data listener
        conn.on('data', function(data) {
            // Digest user data, and only send using the update() function
            if (data.type == 'request_players') {
                conn.time = _self.clock.getElapsedTime(); // Store time for guest timeout check
                conn.data = data; _self.updateModel(conn.peer, conn.data);
            }
            else if (data.type == 'request_level') { _self.sendLevelToGuest(conn); }
            else if (data.type == 'request_cards') { _self.sendScoreCardsToGuest(conn); }
            else if (data.type == 'update_cards') { _self.updateScoreCards(conn, data); }
        });

        // Add disconnection listener
        conn.on('close', function() {
            // Remove user from Group
            _self.removePlayer(conn.peer);
        });
    }

    join(hostID, playerID, startCallback = function(){}, endCallback = function(){}) {
        var _self = this;
        if (this.peer) this.peer.destroy();
        hostID = hostID.substring(0, 16);
        playerID = playerID.substring(0, 16);
        this.peer = new Peer(); // Generate random ID
        this.guest = true;
        this.hosting = false;
        log('Searching...');

        // Add connection listener after ID is generated
        this.peer.on('open', function(id) {
            if (_self.debug == true) console.log('Guest ID: ' + id);
            _self.saveHostIDToStorage(hostID);
            _self.savePlayerIDToStorage(playerID);
            _self.resetScoreCards();

            // Create new connection for host
            var conn = _self.peer.connect(_self.prefix + hostID);

            // Listen for new data
            conn.on('data', function(data) {
                if (data.type == 'send_players') { // Digest server data and send guest info to host
                    _self.updatePlayersFromHost(data);
                    _self.checkLevelFromHost(conn, data);
                    _self.sendGuestToHost(conn);
                }
                else if (data.type == 'send_level') { _self.loadLevelFromHost(data.level); }
                else if (data.type == 'send_cards') { _self.loadFinalScoreCards(data.cards); }
                else if (data.type == 'send_restart') { _self.restartGuest(); }
                else if (data.type == 'send_message') { _self.loadMessage(data.message); }
            });

            // Send data to host when connected
            conn.on('open', function() {
                _self.sendGuestToHost(conn);
                _self.hostConn = _self.peer.connections[_self.prefix + hostID][0];
                log('You are connected');
                startCallback(); // Run when connected
            });

            // Send close message to guest
            conn.on('close', function() {
                _self.disconnect(endCallback);
                conn.send('Disconnected from host');
                log('Disconnected from host');
            });

            // Send error to guest
            conn.on('error', function(error) {
                _self.disconnect(endCallback);
                app.ui.popup.add('<h1>Disconnected from Host</h1>', [{ value: 'Continue' }]);
            });
        });

        this.peer.on('error', function(error) {
            if (error.type == 'peer-unavailable') {
                _self.disconnect();
                app.ui.popup.add('<h1>Host ID not found</h1>', [{ value: 'Ok', callback: function() { setTimeout(function() { app.ui.showMultiplayerSettings(); }, 250);  }}]);
            }
        });

        // Start loop
        this.update();
    }

    sendPlayersToGuests() {
        var _self = this;
        var order = 0;
        var data = {
            type: 'send_players',
            date: app.level.date,
            players: {}
        };
        
        // Add host player to list
        data.players[this.peer.id] = app.player.toJSON();

        // Add other players to list
        Object.keys(this.peer.connections).forEach(function(key) {
            var conn = _self.peer.connections[key];
            data.players[key] = null; // Default null data
            if (conn.length > 0) {
                var player = conn[0].data;
                if (player != null) {
                    data.players[key] = player;
                    data.players[key].order = order;
                    order++;

                    // Kick disconnected players after 5 second timeout
                    if (Math.abs(conn[0].time - _self.clock.getElapsedTime()) > _self.timeout) { conn[0].close(); }
                }
            }
        });
        
        // Loop through connection to host
        var allFinished = app.player.finished; // Start check with host finish status
        Object.keys(this.peer.connections).forEach(function(key) { 
            var conn = _self.peer.connections[key];
            if (conn.length > 0) {
                var player = conn[0].data;
                if (player != null) {
                    // Check finished and send data
                    if (player.finished == false || player.ready == false) allFinished = false;
                    conn[0].send(data);
                }
            }
        });

        // Check if everyone is finished
        if (allFinished == true) {
            if (app.ui.popup.isOpen() == false) {
                // Finish the course for everyone
                this.sendScoreCardsToGuests();
                this.updateScoreCards(); // Update host card
                this.loadFinalScoreCards(this.cards);
            }
        }
    }

    sendGuestToHost(conn) {
        var data = this.guestToJSON();
        conn.time = this.clock.getElapsedTime(); // Store time for host timeout check
        conn.send(data)
    }

    guestToJSON() {
        var data = app.player.toJSON();
        data['date'] = app.level.date;
        data['type'] = 'request_players';
        return data;
    }

    sendLevelToGuest(conn) {
        var level = Object.assign({ reward: app.level.reward }, JSON.parse(app.level.toJSON()));
        var data = {
            date: app.level.date,
            level: level,
            type: 'send_level'
        }
        conn.send(data);
        if (this.debug == true) console.log('Level sent');
    }

    sendScoreCardToHost(conn) {
        var conn = this.getHostConnection();
        var data = {
            card: app.score.card,
            type: 'update_cards'
        }
        conn.send(data);
    }

    updateScoreCards(conn, data) {
        if (conn != null && data != null) this.cards[conn.peer] = data.card;
        this.cards[this.peer.id] = app.score.card; // Update your score card
    }

    sendScoreCardsToGuest(conn) {
        var data = {
            cards: this.cards,
            type: 'send_cards'
        }
        conn.send(data);
    }

    sendScoreCardsToGuests() {
        // Send all score cards to all guests
        var _this = this;
        Object.keys(this.peer.connections).forEach(function(key) { 
            var conn = _this.peer.connections[key];
            if (conn.length > 0) {
                _this.sendScoreCardsToGuest(conn[0]);
            }
        });
    }

    restartGuest() {
        app.ui.restart();
        app.ui.loadView('guest');
    }

    requestRestartForGuest(conn) {
        var data = { type: 'send_restart' }
        conn.send(data);
    }

    requestRestartForGuests() {
        // Reset all guests without loading new level
        var _this = this;
        Object.keys(this.peer.connections).forEach(function(key) { 
            var conn = _this.peer.connections[key];
            if (conn.length > 0) {
                _this.requestRestartForGuest(conn[0]);
            }
        });
    }

    getHostConnection() {
        return this.peer.connections[Object.keys(this.peer.connections)[0]][0];
    }

    updatePlayersFromHost(data) {
        var _self = this;

        // Loop through players data
        Object.keys(data.players).forEach(function(key) {
            var playerData = data.players[key];
            _self.updateModel(key, playerData);
        });
    }

    updateModel(id, data) {
        if (data != null) {
            // Only check other players
            if (this.peer.id != id) {
                // Add new player object to multiplayer group
                if (this.getObjectByProperty('peer', id) == null) {
                    this.addPlayer(id, data);
                }
                else {
                    this.updatePlayer(id, data);
                }
            }
        }
        else {
            this.removePlayer(id);
        }
    }

    checkLevelFromHost(conn, data) {
        // Guest needs to check if the level date changed
        if (app.level.date != data.date && this.status != 'loading_level') {
            this.status = 'loading_level';
            conn.send({ type: 'request_level' }); // Ask host for new level
        }
    }

    requestScoreCardsFromHost() {
        if (this.hostConn) { this.hostConn.send({ type: 'request_cards' }); }
        else { app.score.showScore(); }
    }

    loadLevelFromHost(level) {
        app.level.loadLevel(level);
        app.ui.loadView('guest', function() { app.player.skins.close(false); });
        app.score.reset(); // Reset score
        this.status = 'ready';
    }

    loadFinalScoreCards(cards) {
        this.cards = cards;
        var callback = function() { app.ui.continue(); }
        app.score.showScore(callback);
    }

    addPlayer(id, data) {
        var player = new Player();
        player.init();
        player.peer = id;
        player.meter.visible = false;
        player.text = new Text({ class: 'text-player', position: { x: 0, y: 0, z: -player.getSize().z } });
        player.text.setText(data.label);
        player.add(player.text);
        this.updatePlayer(id, data, player, true);
        this.add(player);
        log(player.label + ' is connected');
    }

    updatePlayer(id, data, player, initial = false) {
        if (player == null) player = this.getObjectByProperty('peer', id);
        if (this.isEqual(player.position, data.position) == false) {
            // Use interpolation to smoothly animate between new points
            var syncAnimation = (this.isSpectating() == false); // Sync 'false' for smoother spectating experience. Sync 'true' to reduce animation interruptions (ex: swinging)
            if (this.interpolate == true && initial == false) app.animation.tween(player.position, data.position, { duration: 1000 / this.ping, easing: TWEEN.Easing.Linear.None, sync: syncAnimation });
            else player.setPosition(data.position);
        }
        if (this.isEqual(player.rotation, data.rotation) == false) player.setRotation(data.rotation);
        if (this.isEqual(player.scale, data.scale) == false) player.setScale(data.scale);
        if (this.isEqual(player.skins.colorAlpha, data.skin.color) == false) player.skins.setColor(data.skin.color);
        if (this.isEqual(player.skins.hat.name, data.skin.hat) == false) player.skins.setHat(data.skin.hat);
        if (this.isEqual(player.mode, data.mode) == false) { player.mode = data.mode; player.setMode(data.mode); }
        if (this.isEqual(player.finished, data.finished) == false) player.finished = data.finished;
        if (this.isEqual(player.ready, data.ready) == false) player.ready = data.ready;
        if (this.isEqual(player.label, data.label) == false) { player.label = data.label; player.text.setText(data.label); }
        if (this.isEqual(player.afk, data.afk) == false) { player.afk = data.afk; player.text.setText(data.label + ((data.afk == true) ? ' (AFK)' : '' )); }

        // Update Camera target
        this.spectate(player);
    }

    removePlayer(id) {
        var player = this.getObjectByProperty('peer', id)
        if (player != null) {
            player.removeFromParent();
            player.text.remove(player.text.object);
            delete this.cards[id]; // Delete score
            if (this.spectating && this.spectating.peer == player.peer) {
                this.spectating = null; // Stop spectating removed player
            }
            if (this.isConnected()) log(player.label + ' is disconnected');
        }
    }

    removeAllPlayers() {
        // Remove all children using custom remove method
        for (var i = 0; i < this.children.length; i++) {
            this.removePlayer(this.children[i].peer);
        }
    }

    spectate(player) {
        // Only spectate if you are finished
        if (app.player.finished == true) {
            // If you are not spectating, check if this player is not finished
            if (this.isSpectating() == false) {
                if (player.finished == false) {
                    this.spectating = player;
                    app.camera.follow(player);
                }
            }
            else {
                // Stop spectating if current player is finished
                if (this.spectating && this.spectating.peer == player.peer) {
                    if (player.finished == true) {
                        this.spectating = null;
                    }
                }
            }
        }
        else {
            // Disable spectating if you are not finished
            if (this.spectating != null) {
                this.spectating = null;
            }
        }
    }

    isSpectating() {
        return !!this.spectating;
    }

    isHosting() {
        return this.hosting;
    }

    isGuest() {
        return this.guest;
    }

    isConnected() {
        return !!this.peer;
    }

    isEqual(objA, objB) {
        var equal = (typeof objA == typeof objB); // Confirm matching type
        switch(typeof objA) {
            case 'object':
                Object.keys(objA).forEach(function(key) {
                    if (objA[key] != objB[key]) equal = false;
                    return false;
                });
            break;
            default: equal = (objA == objB);
        }
        return equal;
    }

    getHostIDFromStorage() {
        var storageID = app.storage.get('setting-host');
        if (storageID == null) storageID = 'boxel';
        return storageID;
    }

    saveHostIDToStorage(id) {
        app.storage.set('setting-host', id);
    }

    getPlayerIDFromStorage() {
        var storageID = app.storage.get('setting-player');
        if (storageID == null) storageID = 'player';
        return storageID;
    }

    savePlayerIDToStorage(id) {
        app.player.label = id;
        app.storage.set('setting-player', id);
    }

    resetScoreCards() {
        app.score.resetScoreCard(); // Delete host score card
        this.cards = {}; // Empty session score cards
    }

    disconnect(callback = function(){}) {
        if (this.peer) this.peer.destroy();
        this.peer = null;
        this.hostConn = null;
        this.hosting = false;
        this.guest = false;
        this.resetScoreCards();
        this.removeAllPlayers();
        callback(); // Run callback when disconnected
    }

    kick(peer) {
        var conn = this.peer.connections[peer][0];
        conn.close();
    }

    sendMessage(peer, message) {
        var conn = this.peer.connections[peer][0];
        var data = { type: 'send_message', message: message };
        conn.send(data);
    }

    loadMessage(message) {
        log(message);
    }

    updateSpectator() {
        if (this.isSpectating() == true) {
            var players = this.children;
            for (var i = 0; i < players.length; i++) {
                var player = players[i];
                if (this.spectating && this.spectating.peer == player.peer) {
                    var next = players[(i + 1) % players.length];
                    this.spectating = next;
                    this.spectating.follow = true;
                    app.camera.follow(this.spectating);
                    break;
                }
            }
        }
    }

    getPlayerCount() {
        var connected = this.isConnected() ? 1 : 0;
        return this.children.length + connected;
    }
}