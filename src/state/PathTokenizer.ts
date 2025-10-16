/**
 * Tokens representing each step in a dotted/bracket path.
 */
export type Token =
    | { kind: 'prop', name: string }
    | { kind: 'index', index: number }
    | { kind: 'mapKey', key: string };

/**
 * Tokenize a path like:
 *   foo.bar
 *   arr[0].x
 *   settings["theme"]
 *   settings['theme']
 *
 * Supports escaped quotes inside brackets: ["a\\\"b"] or ['a\\'b'].
 * Throws on syntax errors; does not validate semantic existence of targets.
 */
export function tokenize(path: string): { top: string, rest: Token[] } {
    if (typeof path !== 'string' || path.length === 0) {
        throw new Error(`Invalid path: '${path}'`);
    }
    let i = 0;
    const ident = /^[A-Za-z_][\w]*/;
    const m = path.slice(i).match(ident);
    if (!m) throw new Error(`Invalid path: '${path}'`);

    const top = m[0];
    i += top.length;
    const rest: Token[] = [];

    while (i < path.length) {
        const ch = path[i];

        if (ch === '.') {
            i++;
            const mm = path.slice(i).match(ident);
            if (!mm) throw new Error(`Property expected after '.' in '${path}' @${i}`);
            rest.push({kind: 'prop', name: mm[0]});
            i += mm[0].length;
            continue;
        }

        if (ch === '[') {
            i++;
            if (i >= path.length) throw new Error(`']' expected in '${path}'`);

            const q = path[i];
            // Quoted map key: ["key"] or ['key']
            if (q === '"' || q === "'") {
                i++; // skip opening quote
                let key = '';
                let escaped = false;
                while (i < path.length) {
                    const c = path[i++];
                    if (escaped) {
                        key += c;
                        escaped = false;
                        continue;
                    }
                    if (c === '\\') {
                        escaped = true;
                        continue;
                    }
                    if (c === q) break;
                    key += c;
                }
                if (path[i - 1] !== q) throw new Error(`Missing closing ${q} in '${path}'`);
                if (path[i] !== ']') throw new Error(`']' expected in '${path}'`);
                i++; // skip ]
                rest.push({kind: 'mapKey', key});
                continue;
            }

            // Numeric index
            const start = i;
            while (i < path.length && /\d/.test(path[i])) i++;
            if (start === i) throw new Error(`Numeric index expected in '${path}' @${i}`);
            const num = Number(path.slice(start, i));
            if (path[i] !== ']') throw new Error(`']' expected in '${path}'`);
            i++; // skip ]
            rest.push({kind: 'index', index: num});
            continue;
        }

        throw new Error(`Unexpected token '${ch}' in '${path}' @${i}`);
    }

    return {top, rest};
}
