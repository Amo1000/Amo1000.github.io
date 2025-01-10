class Piano {
    constructor() {
        this.notes = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    }

    init() {
        this.keys = $('<div>', { id: 'piano' });
    }
    
    add(target, start, end) {
        this.bind(target);
        this.build(start, end);
        this.mount(target);
    }

    bind(input) {
        this.input = input;
        this.input.hide();
    }

    build(start = 60, end = 84) { // Midi values: 60 = C4, 72 = C5
        this.keys.empty();
        for (var i = start; i < end + 1; i++) {
            var index = (i - start) % this.notes.length;
            var note = Tone ? Tone.Frequency(i, 'midi').toNote() : this.notes[index];
            var key = $('<a>', { href: i, note: note });
            if (note.includes('#')) { this.keys.children().last().append(key); }
            else this.keys.append(key);
            this.addListener(key);
        }
        this.setPressedKeys();
        return this.keys;
    }

    mount(target) {
        $(target).after(this.keys);
        return this.keys;
    }

    setPressedKeys() {
        var keys = this.keys;
        this.input.val().split(' ').forEach(function(key) {
            keys.find('[note="' + key + '"]').click();
        });
    }

    getPressedKeys() {
        var keys = '';
        this.keys.find('.pressed').each(function(index, element) { keys += $(element).attr('note') + ' '; });
        return keys.trim();
    }

    addListener(key) {
        var input = this.input;
        var _self = this;
        key.on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            $(this).toggleClass('pressed');
            input.val(_self.getPressedKeys());
            input.change();
        });
    }
}