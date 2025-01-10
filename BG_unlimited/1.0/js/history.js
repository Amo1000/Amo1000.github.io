class History {
    constructor() {
        this.clear();
    }

    clear() { // Reset record and iterator
        this.record = [];
        this.iterator = 0;
        return this.record;
    }

    add(data) { // Add 1 and move iterator forward
        this.record.length = this.iterator;
        this.record[this.iterator] = data;
        this.iterator++;
        return this.record;
    }

    undo() { // Move iterator back 1
        if (this.iterator > 1) this.iterator--;
        return this.current();
    }

    redo() { // Move iterator forward 1
        if (this.iterator < this.record.length) this.iterator++;
        return this.current();
    }

    current() { // Get current record by iterator
        return this.record[this.iterator - 1];
    }

    pop() { // Remove and return last item
        return this.record.pop();
    }

    shift() { // Remove and return first item
        return this.record.shift();
    }

    get(index) { // Return item by index
        return this.record[index];
    }

    getAll() {
        return this.record;
    }

    length() {
        return this.record.length;
    }
}