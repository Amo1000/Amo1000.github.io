class Popup {
    constructor() {
        
    }
    
    init() {
        this.dialog = $('<div>', { class: 'popup blue', style: 'display: none;' });
        $('body').append(this.dialog);
    }

    add(html, actions = [], callback = this.close) {
        this.dialog.empty();
        var _self = this;
        var overlay = $('<div>', { class: 'overlay', type: 'button' });
        var wrapper = $('<div>', { class: 'wrapper' });
        var content = $('<div>', { class: 'content' });
        var close = $('<a>', { class: 'close', href: 'close-popup', html: '<span class="material-symbols-outlined">close</span>', type: 'button' });
        var form = $('<form>', { type: 'form' });
        this.dialog.append(overlay, wrapper);
        content.append(html, form);
        wrapper.append(close, content);
        this.addListener(overlay, callback);
        this.addListener(close, callback);
        this.addListener(form, callback);

        // Append actions to dialog
        for (var i = 0; i < actions.length; i++) {
            // Set action
            var element;
            var id = "popup-action-" + i;
            var action = Object.assign({ id: id, class: 'action', type: 'button', data: { element: 'input' }}, actions[i]); // Merge action with default values
            var actionCallback = action.callback;
            var data = action.data;
            delete action.callback; // Prevent jQuery triggering callback
            delete action.data; // Remove extra attribute

            // Initialize input and add event listener
            element = $('<' + data.element + '>', action);
            this.updateTitle(element);
            this.addListener(element, actionCallback);
            
            // Append element with or without label
            if (action.label) {
                var group = element.wrap('<div class="group">').parent();
                group.prepend('<label for="' + action.id + '">' + action.label + '</label>');
                if (action.type == 'checkbox') group.append('<label class="toggle" for="' + action.id + '"></label>');
                form.append(group);
            }
            else { form.append(element); }
        }
        this.dialog.trigger('open');
        this.open(function() { _self.dialog.find('input').last().focus(); });
        return this.dialog;
    }

    open(callback) {
        if (this) this.dialog.fadeIn(250, callback);
    }

    close(callback) {
        if (this) this.dialog.fadeOut(250, callback).off();
    }

    isOpen() {
        return this.dialog.css('display') != 'none';
    }

    addListener(element, callback = function(){}) {
        var _self = this;
        var type = element.attr('type');
        if (type == 'form') {
            element.on('submit', function(e) {
                e.preventDefault();
                callback(e);
                _self.close();
            });
        }
        else if (type == 'button') {
            element.on('click', function(e) {
                e.preventDefault();
                callback(e);
                _self.close(); // Default close popup
            })
        }
        else if (type == 'text') {
            element.attr('autocomplete', 'off'); // Disable autocomplete
            element.on('change', function(e) {
                e.preventDefault();
                _self.updateTitle($(e.target));
                callback(e);
            });
        }
        else if (type == 'number') {
            element.on('change', function(e) {
                e.preventDefault();
                _self.updateTitle($(e.target));
                callback(e);
            });
        }
        else if (type == 'range') {
            element.on('change', function(e) {
                e.preventDefault();
                _self.updateTitle($(e.target));
                callback(e);
            });
        }
        else if (type == 'checkbox') {
            element.on('change', function(e) {
                _self.updateTitle($(e.target));
                callback(e);
            });
        }
    }

    updateTitle(element) {
        if (element.val().length) {
            element.attr('title', element.val());
        }
    }

    on(type, listener) {
        this.dialog.on(type, listener);
    }

    off() {
        this.dialog.off();
    }
}