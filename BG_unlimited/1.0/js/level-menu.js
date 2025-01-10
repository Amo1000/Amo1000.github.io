class LevelMenu {
    constructor() {
        // Cache is used for courses built into the game
        this.cache = { courses: [], levels: {}, ready: false };
    }

    mount(target) {
        target.html(this.menu);
    }

    createItem(data) {
        var _self = this;
        var item = $('<a>', { class: 'item', id: data.key, href: '' });
        var thumbnail = $('<img>', { class: 'thumbnail', src: data.thumbnail });
        var input = $('<input>', { value: data.name, name: data.key, autocomplete: 'off', disabled: data.isDisabled });
        var key = 'score-' + data.key;
        var score = JSON.parse(app.storage.get(key));
        var shots = (score != null) ? score.shots : '-';
        var time = (score != null) ? app.score.timeToString(score.time) : '--:--.---';
        var scoreHTML = app.score.scoreToHTML(shots, time);
        item.append(thumbnail, input, scoreHTML, );
        item.on('click', function(e) { _self.select($(this).index('.item')); });
        return item;
    }

    addItem(data) {
        var item = this.createItem(data);
        this.addListener(item);
        this.menu.append(item);
        return item;
    }

    addListener(item) {
        var input = item.find('input');
        input.on('change', function() {
            app.ui.editLevelName(input);
        });
    }

    addText(text) {
        this.menu.append('<div class="about">' + text + '</div>');
    }

    get(index) {
        return this.menu.children('.item').eq(index);
    }

    getSelected() {
        return this.get(this.index);
    }

    getSelectedDataFromCache() {
        return this.cache.levels[this.getSelected().attr('id')];
    }

    getCourseName(key) {
        var name = '';
        this.cache.courses.forEach(function(course) {
            course.levels.forEach(function(level) {
                if (key == level.key) {
                    name = course.name + ' - ';
                }
            });
        });
        return name;
    }

    getNext() {
        return this.get(this.index + 1);
    }

    select(index = this.index) {
        var item = this.get(index);
        this.index = index;
        if (item.length) {
            item.siblings().removeClass('selected');
            item.addClass('selected');
            this.animateTo(index);
        }
        return item;
    }

    selectNext() {
        if (this.index < this.length() - 1) this.index++;
        return this.select(this.index);
    }

    selectFirst() {
        this.index = 0;
        return this.select(this.index);
    }

    selectLast() {
        this.index = this.length() - 1;
        return this.select(this.index);
    }

    selectFromStorage(key = 'setting-course-current') {
        var current = app.storage.get(key);
        if (current == null) { this.selectFirst(); }
        else this.select($('#' + current).index('.item'));
    }

    selectItem(item) {
        this.select(item.index('.item'));
    }

    changeSelected() {
        // Invoke change if value has changed
        var input = this.getSelected().find('input');
        if (input.val() != input.attr('value')) input.change();
    }

    storeProgress() {
        var item = this.getSelected();
        var next = this.getNext();

        // Store current course ID
        app.storage.set('setting-course-current', item.attr('id'));

        // Store the next course ID for progression
        if (next.length) { app.storage.set('setting-course-next', next.attr('id')); }
        else app.storage.set('setting-course-next', item.attr('id'));
    }

    updateProgress() {
        // Set the current course to the next course
        var current = app.storage.get('setting-course-current');
        var next = app.storage.get('setting-course-next');
        var isLast = (current == next);
        if (next) app.storage.set('setting-course-current', next);
        return isLast;
    }

    remove(index) {
        var item = this.get(index);
        this.index = index;
        if (this.index > 0) this.index--;
        item.remove();
    }

    removeSelected() {
        this.remove(this.index);
    }

    animateTo(index, delay = 0) {
        var _this = this;
        setTimeout(function() {
            var item = _this.get(index);
            var parent = item.parent();
            var itemOffset = item.offset().top + parent.scrollTop();
            var itemHeight = item.height();
            var parentHeight = parent.height();
            var offset = itemOffset - ((parentHeight / 2) + itemHeight);
            
            parent.animate({ scrollTop: offset }, 250);
        }, delay);
    }

    loadUserLevels() {
        var data = app.storage.getAll('level');
        var height = app.storage.get('setting-level-menu-height') || 'small';
        this.menu = $('<div>', { class: 'level-menu ' + height });
        this.index = 0;
        this.mount($('.ui .center'));
        data = app.storage.sort(data, 'date'); // Optional 'date'

        // Restart intro level
        app.level.reloadIntroLevel();

        // Populate list of custom levels
        for (const d of data) { this.addItem(d); }
        if (Object.keys(data).length > 0) {
            this.selectLast();
            app.ui.showLevelOptions(true);
        }
    }

    loadCourses(courses, course, level) {
        // Recursively load all courses and levels. AJAX loads files asynchronously, which cause order issues
        var _self = this;
        
        // Initial check for cache or courses (JSON file)
        if (courses == null) {
            // Mount new menu HTML
            var height = app.storage.get('setting-level-menu-height') || 'small';
            this.menu = $('<div>', { class: 'level-menu ' + height });
            this.index = 0;
            this.mount($('.ui .center'));

            // Restart intro level
            app.level.reloadIntroLevel();

            // Render HTML from cache
            if (_self.cache.ready) {

                // Loop through courses and levels
                for (var i = 0; i < _self.cache.courses.length; i++) {
                    var course = _self.cache.courses[i];
                    _self.addText('<h2>' + course.name + '</h2>');
                    for (var j = 0; j < course.levels.length; j++) {
                        var level = course.levels[j];
                        level.isDisabled = true; // Disable input field
                        _self.addItem(level);
                    }
                }

                // Select the list item from storage
                _self.selectFromStorage();
            }
            else {
                // Begin recursion from courses file
                _self.addText('<h2>Loading...</h2>');
                $('[href="play-selected-course"]').attr('tabindex', -1); // Disable button until ready
                $.getJSON('./json/courses.json?v=' + new Date().getTime(), function(json) { _self.loadCourses(json.courses); });
            }
        }
        else if (courses && course == null) {
            // Get course data
            var course = courses.shift(); // Remove and get first course
            _self.cache.courses.push({ name: course.name, levels: [] });
            _self.loadCourses(courses, course);
        }
        else if (course && level == null) {
            // Get level data from json level URL
            var level = course.levels.shift(); // Remove and get first level
            $.getJSON(level.url + '?v=' + new Date().getTime(), function(json) {
                json.reward = btoa(level.reward || 3); // Pass reward to json (default 3 for unset values)
                _self.loadCourses(courses, course, json);
            });
        }
        else {
            _self.cache.levels[level.key] = level; // Cache level JSON for later
            _self.cache.courses[_self.cache.courses.length - 1].levels.push({ key: level.key, name: level.name, thumbnail: level.thumbnail }); // Cache level information
            if (course.levels.length) _self.loadCourses(courses, course); // Load next level
            else if (courses.length) _self.loadCourses(courses); // Load next course
            else {
                // Cache is now ready for rendering
                _self.cache.ready = true;
                _self.loadCourses();
                $('[href="play-selected-course"]').attr('tabindex', 0); // Enable button until ready
            }
        }
    }

    exportLevelToFile() {
        var item = this.getSelected();
        var data = JSON.parse(app.storage.get(item.attr('id')));
        data.name = item.find('input').val(); // Use input name
        app.storage.saveToFile(data, data.name);
    }

    importLevelFromFile() {
        var _self = this;
        app.storage.loadFromFile(function(data) {
            var level = JSON.parse(data);
            var key = app.storage.getUniqueKeyByDate('level');
            var item;
            level.key = key;
            level.date = new Date();
            item = _self.addItem(level);
            app.storage.set(key, JSON.stringify(level));
            app.ui.showLevelOptions(true);
            _self.selectItem(item);
        });
    }

    toggleUI() {
        var height = app.storage.get('setting-level-menu-height') || 'small';
        height = (height == 'large') ? 'small' : 'large';
        app.storage.set('setting-level-menu-height', height);
        $('.level-menu').removeClass('large small').addClass(height);
        this.select(); // Scroll to selected
    }

    length() {
        return this.menu.children('.item').length;
    }
}