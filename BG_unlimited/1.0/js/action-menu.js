class ActionMenu {
    constructor() {
        
    }

    open() {
        var _self = this;
        var menu = $('<div>', { class: 'menu' });
        var search = $('<form class="search"><input class="filter action" placeholder="Search" autocomplete="off"></form>');
        var models = app.assets.getThumbnails('body'); // Only get thumbnails with body property
        var action = $('.actions .selected');
        var selected;
        
        // Sort models by key
        models = app.storage.sort(models, 'key');

        // Sort models by tag 'special'
        models.sort(function(a, b) {
            if (a['tags'] === b['tags']) { return a['key'] > b['key'] ? 1 : -1; } // If tags are the same, sort by key
            return a['tags'].includes('special') ? -1 : 1;
        });
        
        // Add models to menu
        for (const [key, value] of Object.entries(models)) {
            var title = value.key.split('-').map(function(word) { return word[0].toUpperCase() + word.substring(1); }).join(' ');
            var model = $('<a>', { class: 'model', href: value.key, style: 'background-image: url(' + value.src + ');', title: title });
            menu.append(model);
        }

        // Select current action id
        if (action.attr('id') != undefined) {
            selected = menu.find('[href="' + action.attr('id') + '"]');
            selected.addClass('selected');
            
        }
        app.ui.popup.add(menu);
        if (selected != null) this.animateTo(selected, selected.closest('.content'));

        // Append search
        menu.closest('.wrapper').append(search);

        // Add search listener
        search.on('submit', function(e) { e.preventDefault(); });
        search.find('.filter').on('input', function(e) {
            _self.filter(menu.find('[href]'), 'href', $(this).val());
        });
    }

    select(target) {
        var selected = $('.actions .selected');
        
        // Replace actionbar item if not present
        if ($('.actions #' + target.attr('href')).length <= 0) { selected.attr({ id: target.attr('href'), style: target.attr('style'), title: target.attr('title') }); }
        
        // Select action by target href (which is the action 'id' and the object 'name')
        app.ui.selectAction(target.attr('href'));
        app.ui.popup.close();
    }

    animateTo(target, parent) {
        var targetOffset = target.position().top + parent.scrollTop();
        var targetHeight = target.height();
        var parentHeight = parent.height();
        var offset = targetOffset - ((parentHeight / 2) - (targetHeight / 2));
        
        // Animate parent to offset
        parent.animate({ scrollTop: offset }, 0);
    }

    filter(children, key, value) {
        // Search children by key and matching value
        children.each(function(index, element) {
            var elem = $(element);
            elem.addClass('hidden');
            if (elem.attr(key).includes(value)) {
                elem.removeClass('hidden');
            }
        });
    }
}