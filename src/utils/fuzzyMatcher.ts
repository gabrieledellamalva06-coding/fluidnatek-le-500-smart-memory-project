export function similarity(a: string, b: string): number {

    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();

    if (a === b) return 1;

    if (a.includes(b) || b.includes(a))
        return 0.9;

    let common = 0;

    for (const ch of a) {
        if (b.includes(ch))
            common++;
    }

    return common / Math.max(a.length, b.length);

}