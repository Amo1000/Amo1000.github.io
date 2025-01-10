class Log {
    constructor() {
        var _this = this;
        this.list = [];
        this.name = 'log';

        // Expose log function to window
        window.log = function(messageData) {
            if (typeof messageData === 'string') messageData = { text: messageData };
            messageData.parent = _this;
            _this.push(messageData);
            console.log(messageData.text);
        };
    }

    mount(target = '.log', options = { class: '' }) {
        this.element = $(target);
        if (this.element.length) {
            this.element.empty();
            this.element.wrapper = $('<div class="wrapper"></div>');
            this.element.append(this.element.wrapper);
            //this.addAll();
        }
    }

    push(messageData) {
        var _this;
        if (typeof messageData === 'string') messageData = { text: messageData };
        Object.assign(messageData, {
            class: 'message',
            decay: 5000,
            timestamp: new Date().getTime()
        });
        _this = messageData.parent || this;
        delete messageData.parent;
        _this.list.push(messageData);
        _this.add(messageData, true); // Add and scroll to element
    }

    add(messageData, scroll = false) {
        var _this = this;
        if (this.element && this.element.wrapper) {
            var message = $('<div class="message" style="color: ' + messageData.color + '"><span class="text">' + messageData.text + '</span></div>');
            this.element.wrapper.append(message);
            if (messageData.decay && messageData.decay > 0) message.delay(messageData.decay).fadeOut(1000, function() { _this.removeMessage($(this)); });
            if (scroll == true) this.scrollTo(message);
        }
    }

    addAll() {
        var _this = this;
        var scroll = false;
        this.list.forEach(function(messageData, index, array) {
            if (index == array.length - 1) scroll = true; // Scroll to last message
            _this.add(messageData, scroll);
        });
    }

    scrollTo(message) {
        var parent = message.parent();
        var messageOffset = message[0].offsetTop + message[0].offsetHeight - parent.height();
        parent.animate({ scrollTop: messageOffset }, 250);
    }

    scrollToIndex(index) {
        if (this.element) {
            var message = this.element.find('.message').eq(index);
            if (message.length > 0) this.scrollTo(message);
        }
    }

    removeMessage(message) {
        var index = message.index();
        this.list.splice(index, 1);
        message.remove()
    }

    removeAllMessages() {
        this.list = [];
        if (this.element && this.element.wrapper) {
            this.element.wrapper.empty();
        }
    }
}