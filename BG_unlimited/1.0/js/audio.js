class Audio extends THREE.Group {
    constructor(manager) {
        super();
        this.muted = false;
        this.name = 'audio';
        this.audioListener = new THREE.AudioListener(); // This gets add to the camera
        this.audioLoader = new THREE.AudioLoader(manager);
        this.ambience = new Ambience();
        this.music = new Music();
        this.synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.005, decay: 0.1, release: 1, sustain: 0.3 }}).toDestination();
        this.synth.context.lookAhead = 0; // Reduce lag
        this.add(this.ambience, this.music);
    }

    init() {
        var volume = app.storage.get('setting-volume') || 0.5; // Master volume
        var volumeMusic = app.storage.get('setting-volume-music') || 1; // Music volume
        this.setVolume(volume);
        this.music.setVolume(volumeMusic);
    }

    load(json) {
        var _self = this;
        for (const [key, value] of Object.entries(json)) {
            this.audioLoader.load(value.url, function(buffer) {
                var sound = new THREE.Audio(_self.audioListener);
                sound.name = key;
                sound.setBuffer(buffer);

                // Add userData if available
                if (value.userData) {
                    sound.userData = value.userData;
                    if (sound.userData.loop) sound.setLoop(sound.userData.loop);
                    if (sound.userData.volume) sound.setVolume(sound.userData.volume);
                }
                _self.add(sound);
            });
        }
    }

    play(name, options) {
         // Set default options
        options = Object.assign({ type: 'file', wait: false }, options);
        
        // Play ThreeJS audio file or ToneJS tone
        if (options.type == 'file') {
            var _self = this;
            var audio = app.assets.audio.getObjectByName(name);
            if (audio && audio.isPlaying == false) audio.play();
            if (audio == null) {
                // Recursively wait for audio to load every 100ms
                if (options.wait == true) { setTimeout(function() { _self.play(name, options); }, 100); }
                else console.warn('Audio file "' + name + '" does not exist');
            }
        }
        else if (options.type == 'tone') {
            this.synth.triggerAttackRelease(options.notes, options.duration);
        }
    }

    stop(name) {
        var audio = app.assets.audio.getObjectByName(name);
        if (audio && audio.isPlaying == true) audio.stop();
    }

    playNotes(notes = 'c4', duration = '16n') {
        notes = this.cleanNotes(notes).split(' ');
        if (notes != '?') this.play(null, { type: 'tone', notes: notes, duration: duration });
    }

    playMidiNotes(notes = [60], duration = '16n') { // Default "C4"
        var noteString = '';
        notes = Array.isArray(notes) ? notes : [notes];
        notes.forEach(function(n) { noteString += Tone.Frequency(n, "midi").toNote() + ' '; });
        this.playNotes(noteString.trim(), duration);
    }

    cleanNotes(notes) {
        // Clean notes using ToneJS regex pattern - https://github.com/Tonejs/Tone.js/blob/c313bc6/Tone/core/type/Frequency.ts
        notes = notes.replace(/[^a-zA-Z#0-9 ]/g,'').replace(/\s+/g,' ').trim().split(' ');
        notes.forEach(function(note, index) { this[index] = /^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i.test(note) ? note : '?'; }, notes);
        return notes.join(' ');
    }

    toggleVolume() {
        if (this.muted == true) {
            this.muted = false;
            this.synth._voices.forEach(function(voice) { voice.oscillator.mute = false; });
            this.setMasterVolume(this.prevVolume);
        }
        else {
            this.muted = true;
            this.synth._voices.forEach(function(voice) { voice.oscillator.mute = true; });
            this.prevVolume = this.getMasterVolume();
            this.setMasterVolume(0);
        }
    }

    mute(mute) {
        this.muted = !mute; // Set state to opposite
        this.toggleVolume();
    }

    setVolume(volume) {
        app.storage.set('setting-volume', volume);
        if (this.prevVolume == null) this.prevVolume = volume;
        this.setMasterVolume(volume);
        if (volume > 0) this.synth.volume.value = (-16 * (1 - volume) - 16);
        else this.synth.volume.value = -100; // super quiet
    }

    getMasterVolume() {
        return this.audioListener.getMasterVolume();
    }

    setMasterVolume(volume) {
        this.audioListener.setMasterVolume(volume);
    }
}