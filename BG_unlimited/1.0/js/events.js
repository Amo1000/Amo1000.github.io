class Events {
    constructor() {
        this.ctrl = false;
        this.shift = false;
        this.alt = false;
    }

    init() {
        var _self = this;
        $(document).on('click', 'a', function(e) { e.preventDefault(); });
        $(document).on('mousedown', function(e) { _self.mouseDown(e); });
        $(document).on('mousemove', function(e) { _self.mouseMove(e); });
        $(document).on('mouseup', function(e) { _self.mouseUp(e); });
        $(document).on('wheel', function(e) { _self.mouseWheel(e); });
        $(document).on('change', 'input', function(e) { _self.change(e); });
        $(document).on('keydown', function(e) { _self.keyDown(e); });
        $(document).on('keyup', function(e) { _self.keyUp(e); });
        $(document).on('visibilitychange', function() { _self.visibilityChange(document.visibilityState); })
        $(document).on('contextmenu', function(e) { _self.contextmenu(e); });
        $(document).ready(function(e) { _self.ready(); });
        $(window).on('resize', function(e) { _self.resizeWindow(e); });
        this.resizeWindow(); // Initial resize
    }

    mouseDown(e) {
        var target = $(e.target);
        var type = target.get(0).tagName;
        var button = (e.which) ? e.which : 1; // Default left click
        app.player.clock.start(); // Restart player AFK timer
        
        if (type == 'CANVAS') {
            app.cursor.mouseDown(e);
            if (app.play == true) {
                if (button == 1) { // Left click
                    if (app.ui.view.includes('spectator')) {
                        app.multiplayer.updateSpectator();
                    }
                    else {
                        app.player.action(app.cursor.down, function() { app.score.add(); });
                    }
                }
            }
            else {
                if (app.ui.view == 'level-editor') {
                    if (e.which == 2) app.ui.selectMode('drag', false);
                    else if (e.which == 3 && this.shift == false) app.ui.selectMode('move', false);
                    this.draw(e);
                }
            }
        }
        else {
            if (button == 1) { // Left click
                var action = target.closest('a').not('.disabled').attr('href');
                // Add actions for all possible links
                switch (action) {
                    case 'skins': app.ui.loadView('skins', function() { app.player.skins.open(); }); break;
                    case 'exit-skins': app.player.skins.close(); break;
                    case 'skin-previous': app.player.skins.selectPrevious(); break;
                    case 'skin-next': app.player.skins.selectNext(); break;
                    case 'skin-select': app.player.skins.select(); break;
                    case 'level-manager': app.ui.loadView('level-manager', function() { app.ui.levelMenu.loadUserLevels(); }); break;
                    case 'play-courses': app.ui.loadView('courses', function() { app.ui.levelMenu.loadCourses(); }); break;
                    case 'play-selected-course': app.ui.loadView('course', function() { app.ui.play(); }); break;
                    case 'toggle-level-menu-height': app.ui.levelMenu.toggleUI(); break;
                    case 'exit-course': app.ui.exitCourse(); break;
                    case 'find-flag': app.level.findFlag(); break;
                    case 'view-score': app.multiplayer.requestScoreCardsFromHost(); break;
                    case 'settings': app.ui.showSettings(); break;
                    case 'review': app.events.openReviewLink(); break;
                    case 'delete-level': app.ui.removeLevel(); break;
                    case 'edit-level': app.ui.loadView('level-editor', function() { app.level.editor.startAutoSave(); app.ui.editLevel(); }); break;
                    case 'new-level': app.ui.addLevel(); break;
                    case 'exit-level-manager': app.ui.levelMenu.changeSelected(); app.ui.loadView('home'); break;
                    case 'export-level': app.ui.levelMenu.exportLevelToFile(); break;
                    case 'import-level': app.ui.levelMenu.importLevelFromFile(); break;
                    case 'edit-level-data': app.ui.editLevelData(); break;
                    case 'exit-level-editor': app.ui.exitEditor(); break;
                    case 'save-level-editor': app.level.editor.saveLevel(); break;
                    case 'undo-edit': app.level.editor.undo(); break;
                    case 'redo-edit': app.level.editor.redo(); break;
                    case 'mode-drag': app.ui.selectMode(action); break;
                    case 'mode-draw': app.ui.selectMode(action); break;
                    case 'mode-erase': app.ui.selectMode(action); break;
                    case 'mode-relocate': app.ui.selectMode(action); break;
                    case 'mode-fill': app.ui.selectMode(action); break;
                    case 'mode-sample': app.ui.selectMode(action); break;
                    case 'mode-move': app.ui.selectMode(action); break;
                    case 'zoom-in': app.camera.zoomDepth(4, { easing: TWEEN.Easing.Quadratic.Out, sync: false }); break;
                    case 'zoom-out': app.camera.zoomDepth(-4, { easing: TWEEN.Easing.Quadratic.Out, sync: false }); break;
                    case 'zoom-toggle': app.camera.zoomToggle({ easing: TWEEN.Easing.Quadratic.Out, sync: app.player.isSleeping() }); break;
                    case 'restart': app.ui.restart(); break;
                    case 'restart-editor': app.ui.restart(true); break;
                    case 'pause-editor': app.ui.pause(); break;
                    case 'play-editor': app.ui.play(); break;
                    case 'open-menu': app.ui.actionMenu.open(); break;
                    case 'multiplayer': app.ui.showMultiplayerSettings(); break;
                    case 'kick-player': app.multiplayer.kick(target.attr('data-peer')); target.closest('li').remove(); break;
                    case 'sync-data': app.ui.syncData(); break;
                    case 'fullscreen': app.events.toggleFullscreen(); break;
                    default:
                        // Actionbar
                        if (parseInt(action) >= 0 || parseInt(action) < 10) {
                            app.ui.selectAction(target);
                        }
    
                        // Update actionbar from menu
                        if (app.assets.thumbnails[action]) {
                            app.ui.actionMenu.select(target);
                        }
                    break;
                }
            }
        }
    }

    mouseMove(e) {
        var target = $(e.target);
        var type = target.get(0).tagName;
        
        app.cursor.mouseMove(e);
        if (app.play == true) {
            app.player.updateShot(app.cursor.move);
        }
        if (app.ui.view == 'level-editor') {
            if (app.play == false) {
                if (app.ui.view == 'level-editor') {
                    this.draw(e);
                }
            }
        }
    }

    mouseUp(e) {
        var target = $(e.target);
        var type = target.get(0).tagName;
        app.cursor.mouseUp(e);

        if (type == 'CANVAS') {
            if (app.ui.view == 'level-editor') {
                this.draw(e);

                // Reset original select if not drawing
                if (e.which == 2) app.ui.selectMode();
                else if (e.which == 3 && this.shift == false) app.ui.selectMode();
            }
        }
    }

    draw(e) {
        app.level.editor.edit(app.cursor);
    }

    mouseWheel(e) {
        var target = $(e.target);
        var type = target.get(0).tagName;
        var event = (e.originalEvent) ? e.originalEvent : e;

        if (type == 'CANVAS' && app.ui.view != 'skins') {
            var target = app.camera.position.clone();
            target.y = app.camera.position.y - (event.deltaY / 20);
            app.camera.zoomTo(target, { easing: TWEEN.Easing.Quadratic.Out, sync: app.player.isSleeping() });
        }
    }

    change(e) {
        e.preventDefault();
        var input = $(e.target);
    }

    keyDown(e) {
        // Global shortcuts
        switch (e.keyCode) {
            case 9: break; // Tab
            case 27: // Esc
                if (app.ui.popup.isOpen() == false) $('[href*="settings"]').first().trigger('mousedown');
                else $('[href="close-popup"]').click();
            break; // Tab
            default: break;
        }

        // Level editor shortcuts
        if (app.ui.popup.isOpen() == false) {
            if (app.play == true) {
                if (app.ui.view == 'course' || app.ui.view == 'level-editor') {
                    var resetCamera = app.ui.view == 'level-editor';
                    switch (e.keyCode) {
                        case 69: app.ui.loadView('courses', function() { app.ui.levelMenu.loadCourses(); }); break; // E
                        case 82: app.ui.restart(resetCamera); break; // R
                    }
                }
            }
            else if (app.ui.view == 'level-editor') {
                switch (e.keyCode) {
                    case 9: break; // Tab
                    case 13: e.preventDefault(); $(':focus').trigger('mousedown'); break; // Enter
                    case 16: if (this.shift == false) { this.shift = true; app.level.editor.setAxis(); if (app.level.editor.axis == null) { app.ui.selectMode('erase', false); }} break; // Shift
                    case 17: if (this.ctrl == false) { this.ctrl = true; app.ui.selectMode('relocate', false); } break; // Ctrl
                    case 18: if (this.alt == false) { e.preventDefault(); this.alt = true; app.ui.selectMode('sample', false); } break; // Ctrl
                    case 27: break; // Escape (Esc)
                    case 32: app.ui.play(); break; // Space
                    case 81: if (app.ui.popup.isOpen() == false) $('[href="open-menu"]').trigger('mousedown'); else app.ui.popup.close(); break; // Q
                    case 68: // D: fall-through
                    case 87: $('[href="mode-draw"]').trigger('mousedown'); break; // W
                    case 88: // X: fall-through
                    case 69: $('[href="mode-erase"]').trigger('mousedown'); break; // E
                    case 71: // G: fall-through
                    case 82: $('[href="mode-relocate"]').trigger('mousedown'); break; // R
                    case 70: // F: fall-through
                    case 84: $('[href="mode-fill"]').trigger('mousedown'); break; // T
                    case 73: // I: fall-through
                    case 75: // K: fall-through
                    case 89: $('[href="mode-sample"]').trigger('mousedown'); break; // Y
                    case 85: $('[href="mode-move"]').trigger('mousedown'); break; // U
                    case 83: if (this.ctrl) { e.preventDefault(); app.level.editor.saveLevel(); } break; // S
                    case 90: // Z
                        if (this.ctrl && this.shift) { app.level.editor.redo(); }
                        else if (this.ctrl) { app.level.editor.undo(); }
                        else $('[href="zoom-toggle"]').trigger('mousedown'); // Zoom
                    break;
                    default:
                        var number_key = e.keyCode - 48;
                        if (number_key >= 0 && number_key < 10) {
                            app.ui.selectAction(number_key); // Select action by number
                        }
                    break;
                }
            }
        }
    }

    keyUp(e) {
        if (app.ui.view == 'level-editor') {
            if (e.keyCode == 16) { this.shift = false; app.level.editor.resetAxis(); app.ui.selectMode(); }
            if (e.keyCode == 17) { this.ctrl = false; app.ui.selectMode(); }
            if (e.keyCode == 18) { this.alt = false; app.ui.selectMode(); }
        }
    }

    resizeWindow() {
        var width = window.innerWidth;
        var height = window.innerHeight;
        app.camera.aspect = width / height;
        app.camera.updateProjectionMatrix();
        app.renderer.setSize(width, height);
        app.rendererText.setSize(width, height);
    }

    visibilityChange(visibility) {
        if (visibility == 'visible') {
            app.resume(app.play);
            app.assets.audio.mute(false);
        }
        else {
            app.pause(app.play);
            app.assets.audio.mute(true);
        }
    }

    contextmenu(e) {
        if (app.ui.view == 'level-editor') {
            e.preventDefault();
        }
    }

    ready() {
        var _self = this;
        // Check if using chromium browser
        if (!!window.chrome == false) {
            app.ui.popup.add('<h1>Error!<br>Please use Google Chrome.</h1>', [{ value: 'I don\'t care' }]);
        }
    }

    addReviewLink(selector) {
        if (chrome.extension) {
            $(selector).append('<a class="review d-flex" href="review"><span class="material-symbols-outlined">favorite_border</span>Write a review</a>');
        }
    }

    openReviewLink() {
        if (chrome.extension) {
            if((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1) {
                
            }
            else if(navigator.userAgent.indexOf("Edg") != -1) {
                chrome.tabs.create({ url: 'https://microsoftedge.microsoft.com/addons/detail/boxel-golf/cmkjhoeejjdjnhpjpkejjdkpakjhlcap' });
            }
            else if(navigator.userAgent.indexOf("Chrome") != -1) {
                chrome.tabs.create({ url: 'https://chrome.google.com/webstore/detail/boxel-golf/mmgjkfjlmdkmoipndaeombfnomjfgeff/reviews' });
            }
            else if(navigator.userAgent.indexOf("Safari") != -1) {
                
            }
            else if(navigator.userAgent.indexOf("Firefox") != -1) {
                
            }
            else if((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true)) {
                
            }  
            else {
                
            }
        }
        else {
            // DEPRECATED: Steam does not allow review links
            window.open('https://store.steampowered.com/app/1945820/Boxel_Golf/#app_reviews_hash');
        }
    }

    toggleFullscreen() {
        // Open popup in new window or fullscreen the app
        if (chrome.extension && chrome.extension.getViews({ type: "popup" }).length > 0) {
            chrome.tabs.create({ url: location.href });
        }
        else {
            var isFullscreen = this.isFullscreen();
            var element = document.body;
            var button = $('[href="fullscreen"]');
            
            // Define toggle functions for all browsers
            element.requestFullScreen = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || function () { return false; };
            document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen || function () { return false; };
            
            // Toggle document and button state
            if (isFullscreen == true) {
                document.cancelFullScreen();
                if (button != null) button.html('<span class="material-symbols-outlined">fullscreen</span>');
            }
            else {
                element.requestFullScreen();
                if (button != null) button.html('<span class="material-symbols-outlined">fullscreen_exit</span>');
            }
        }
    }

    isFullscreen() {
        return document.webkitIsFullScreen || document.mozFullScreen || false;
    }
}