export class MinHeap<T> {
    private items: { key: number; value: T }[] = [];

    get size(): number {
        return this.items.length;
    }

    push(key: number, value: T): void {
        const n = this.items.length;
        this.items.push({ key, value });
        this.bubbleUp(n);
    }

    pop(): { key: number; value: T } | undefined {
        const n = this.items.length;
        if (n === 0) return undefined;
        const top = this.items[0];
        const last = this.items.pop()!;
        if (n > 1) {
            this.items[0] = last;
            this.bubbleDown(0);
        }
        return top;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parent = (index - 1) >> 1;
            if (this.items[parent].key <= this.items[index].key) break;
            [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
            index = parent;
        }
    }

    private bubbleDown(index: number): void {
        const n = this.items.length;
        for (;;) {
            const l = index * 2 + 1;
            const r = l + 1;
            let best = index;
            if (l < n && this.items[l].key < this.items[best].key) best = l;
            if (r < n && this.items[r].key < this.items[best].key) best = r;
            if (best === index) return;
            [this.items[best], this.items[index]] = [this.items[index], this.items[best]];
            index = best;
        }
    }
}

