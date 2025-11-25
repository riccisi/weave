# fJS State — Guida completa

Benvenuto nel cuore reattivo del framework: **State**.  
Questa pagina è una documentazione *developer–friendly* completa, progressiva e ricca di esempi pronti da copiare.

> **In breve:** `State` è un oggetto reattivo **a schema immutabile** con ereditarietà padre/figlio, proprietà derivate, alias (con operatori e pipe), path `dot/bracket`, liste e mappe reattive, batching/coalescing e un parser di path robusto con **preflight**.

---

## Sommario

- [Installazione & import](#installazione--import)
- [Concetti chiave](#concetti-chiave)
- [Quick Start](#quick-start)
- [Schema & ereditarietà](#schema--ereditarietà)
- [Derivate (computed)](#derivate-computed)
- [Alias (base, `!`, pipe e mapper)](#alias-base--pipe-e-mapper)
    - [Registry globale dei mapper](#registry-globale-dei-mapper)
- [Path: dot, array index, map key](#path-dot-array-index-map-key)
    - [Preflight dei path](#preflight-dei-path)
- [Liste reattive](#liste-reattive)
- [Mappe reattive](#mappe-reattive)
- [Oggetti annidati](#oggetti-annidati)
- [Sottoscrizioni (on/subscribe)](#sottoscrizioni-onsubscribe)
- [Batching & coalescing](#batching--coalescing)
- [Ricette](#ricette)
- [Troubleshooting](#troubleshooting)
- [Linee guida di design](#linee-guida-di-design)
- [API Reference](#api-reference)
- [FAQ](#faq)
- [Glossario](#glossario)

---

## Installazione & import

> Supponiamo che il pacchetto stia in `src/state/*` (alias `@/state/*` nel tuo Vite/TS).

```ts
import { State } from '@/state/State';
import { StateConfig } from '@/state/StateConfig';
import { ReactiveRuntime } from '@/state/ReactiveRuntime';
import { PathResolver } from '@/state/PathResolver';
```

---

## Concetti chiave

- **Schema immutabile**: le chiavi di primo livello sono **esattamente** quelle passate al costruttore. Niente proprietà “create-on-write”.
- **Ereditarietà padre/figlio**:
    - Scrivere su una chiave **non dichiarata** localmente inoltra la write al **primo parent** che la dichiara.
    - Se la chiave è dichiarata localmente, l’assegnazione resta **locale** (override).
- **Reattività**: leggi/scrivi come su un oggetto JS; usa `.on()` per ascoltare. Le notifiche sono **coalescenti** dentro un `batch`.
- **Derivate**: funzioni pure che dipendono da altre chiavi e si aggiornano automaticamente.
- **Alias**: chiavi che “puntano” ad altre, anche con l’operatore `!` e con **pipe di mapper**.
- **Liste/Mappe**: array e mappe diventano reattivi con API ergonomiche e helper chainable.
- **Path robusti**: `user.addresses[0].street`, `settings["theme"]` — con tokenizer dedicato e **preflight**.

---

## Quick Start

```ts
const app = new State({
  name: 'Ada',
  valid: true,

  // derived
  greeting: (s) => `Hello, ${s.name}!`,

  // alias: diretto e con operatore
  isOk: '{valid}',
  isDisabled: '{!valid}',
});

console.log(app.greeting); // "Hello, Ada!"
app.name = 'Alan';
console.log(app.greeting); // "Hello, Alan!"

app.on('name', v => console.log('name ->', v));
app.on('greeting', v => console.log('greeting ->', v));
```

**Batching** (coalescing delle notifiche):

```ts
const rt = (app as any)._runtime as ReactiveRuntime;

rt.batch(() => {
  app.name = 'Barbara';
  app.name = 'Katherine';
});
// I watcher di 'name' e 'greeting' ricevono UNA sola notifica, con lo stato finale.
```

---

## Schema & ereditarietà

### Schema immutabile

```ts
const s = new State({ name: 'Ada' });
(s as any).age = 42; // ❌ ERRORE: 'age' non è nello schema
```

### Scrittura “in su” (chiave non dichiarata localmente)

```ts
const parent = new State({ name: 'Ada', valid: true });
const child  = new State({}, { parent }); // nessuna chiave locale

child.name = 'Alan';          // write inoltrata al parent
console.log(parent.name);     // "Alan"
```

### Override locale (chiave dichiarata nel figlio)

```ts
const parent = new State({ name: 'Ada', valid: true });
const child  = new State({ name: 'John' }, { parent });

child.name = 'Alan';          // modifica locale
console.log(child.name);      // "Alan"
console.log(parent.name);     // "Ada"
```

> **Regola pratica:** dichiara nel figlio le chiavi che vuoi possano divergere dal padre.

---

## Derivate (computed)

Le derivate sono funzioni pure `fn(s: State): any`. Tracciano automaticamente le dipendenze.

```ts
const s = new State({
  a: 1,
  b: 2,
  sum: (st) => st.a + st.b,
});

s.on('sum', v => console.log('sum ->', v)); // 3
s.a = 5;                                    // 7
```

- Read-only (non scrivibili).
- Ricalcolo lazily e coerente (dipendenze tracciate durante `get()`).

---

## Alias (base, `!`, pipe e mapper)

**Base**: `'{path}'` (read/write)

```ts
const s = new State({ a: 1, aa: '{a}' });
s.aa = 10;              // scrive su 'a'
console.log(s.a);       // 10
```

**Operatore `!`**: `'{!path}'` (read/write invertito)

```ts
const s = new State({ valid: false, enabled: '{!valid}' });
console.log(s.enabled); // true
s.enabled = false;      // ⇒ valid = true
```

**Pipe**: `'{path |> mapper(args?) |> other()}'`  
Di default la pipe è **read-only**, a meno che i mapper nella catena implementino `mapWrite`.

```ts
// registry globale
StateConfig.registerGlobalMapper({
  name: 'suffix',
  create: (arg: string) => ({
    mapRead: (v: any) => String(v) + arg,
    mapWrite: (next: any) => String(next).replace(new RegExp(`${arg}$`), ''),
  })
});

const s = new State({
  name: 'Ada',
  loud: '{name |> suffix("™")}', // "Ada™"
});

s.loud = 'Alan™'; // mapWrite → name = "Alan"
```

### Registry globale dei mapper

- **Perché globale?** Per coerenza semantica in tutta l’app.
- **Quando registrare?** Idealmente all’avvio dell’app. La risoluzione avviene lazy: se accedi a un alias prima della registrazione, ottieni un errore “Mapper X non registrato”.

```ts
StateConfig.resetGlobalStateConfig();

StateConfig.registerGlobalMapper({
  name: 'upper',
  create: () => ({ mapRead: (v: any) => String(v).toUpperCase() })
});

StateConfig.registerGlobalMapper({
  name: 'bool',
  create: () => ({ mapRead: (v: any) => !!v })
});
```

---

## Path: dot, array index, map key

- **Dot**: `user.name`, `role.name`
- **Array index**: `users[0].name`
- **Map key**: `settings["theme"]`, `settings['locale']`

```ts
const s = new State({
  user: { name: 'Ada' },
  users: [{ name: 'Grace' }, { name: 'Barbara' }],
  settings: new Map([['theme', 'dark']]),
});

s.on('user.name', v => console.log('user.name ->', v));
s.on('users[1].name', v => console.log('users[1].name ->', v));
s.on('settings["theme"]', v => console.log('theme ->', v));

s.user.name = 'Alan';
s.users[1].name = 'Hopper';
s.settings.set('theme', 'light');
```

> Il tokenizer supporta chiavi mappa con spazi/simboli e **quote escape** (`\"`, `\'`).

### Preflight dei path

Vuoi “lintare” i path senza creare binding? Usa `PathResolver.preflight`.

```ts
import { PathResolver } from '@/state/PathResolver';

const pf = PathResolver.preflight(s, 'users[99].name');
if (!pf.ok) {
  console.warn(pf.error, pf.hops);
}
```

**Output**: `{ ok: boolean, error?: string, finalKind?: 'prop' | 'index' | 'mapKey', hops: [...] }`  
Gli **hops** descrivono ogni passo (utile per messaggi UX o log diagnostici).

---

## Liste reattive

Una chiave array diventa un **ListAttribute** con proxy, metodi nativi e **helpers chainable**.

```ts
const s = new State({
  values: [1, 2, 3],
  users:  [{ name: 'Ada' }, { name: 'Grace' }],
  sum: st => st.values.reduce((a,b) => a + b, 0),
});

s.on('sum', v => console.log('sum ->', v)); // 6
s.values.push(4);                            // 10
s.values.splice(1, 1, 7);                    // [1,7,3,4] ⇒ 15
```

**Helpers**:
- `update(index, fn)`
- `replaceAll(fn)`
- `insertAt(index, value)`
- `removeAt(index, count=1)`
- `move(from, to)`

```ts
s.users
  .insertAt(1, { name: 'Barbara' })  // [Ada, Barbara, Grace]
  .move(2, 1)                         // [Ada, Grace, Barbara]
  .update(0, u => ({ ...u, name: 'A.' }));
```

**Note sulle sottoscrizioni:**
- Puoi ascoltare `users[0].name`.
- Gli spostamenti (`move`) ri-cablano le sottoscrizioni interne evitando **doppie emissioni** accidentali.

---

## Mappe reattive

Una chiave `Map` o `Record` diventa un **MapAttribute** con proxy tipo “mappa”:

```ts
const s = new State({
  settings: new Map([['theme', 'dark']]),
  meta: { version: '1.0.0' }, // Record → MapAttribute
});

const settings = s.settings;
settings.set('lang', 'it');
settings.get('theme'); // 'dark'
settings.delete('theme');
settings.clear();
```

**Riferimenti utili:**

```ts
const keysRef = s.settings.keysRef(); // Attribute<string[]>
const sizeRef = s.settings.sizeRef(); // Attribute<number>

keysRef.subscribe(k => console.log('keys:', k));
sizeRef.subscribe(n => console.log('size:', n));
```

**Path sulle chiavi mappa:**

```ts
s.on('settings["theme"]', t => console.log('theme ->', t));
s.settings.set('theme', 'light'); // notifica
```

---

## Oggetti annidati

Gli oggetti plain diventano `State` figli (stesso runtime, schema separato).

```ts
const s = new State({
  user: {
    name: 'Ada',
    role: { name: 'Admin' }
  }
});

s.on('user.role.name', v => console.log('role ->', v));
s.user.role.name = 'Editor';
```

> L’ereditarietà schema-based vale anche nel nested: per override locali, **dichiarali** a quel livello.

---

## Sottoscrizioni (on/subscribe)

API uniforme per chiavi e path:

```ts
const off = s.on('name', v => {/* ... */}, { immediate: true });
s.on('users[0].name', v => {/* ... */});
s.on('user.role.name', v => {/* ... */});

off(); // annulla la sottoscrizione
```

- `immediate` default: **true** (l’handler riceve il valore corrente subito).
- Le sottoscrizioni su path ri-cablano automaticamente gli intermedi quando la struttura cambia.

---

## Batching & coalescing

Usa il runtime per compattare più modifiche in **una sola emissione coerente**:

```ts
const rt = (s as any)._runtime as ReactiveRuntime;

rt.batch(() => {
  s.values.push(10);
  s.values.push(20);
  s.values.push(30);
});
// Notifica singola su 'values' e su ogni derivata dipendente.
```

> Suggerimento: wrappa in `batch` le azioni UI (click, submit) che fanno più cambi.

---

## Ricette

### Abilitazione pulsante con validazione centralizzata

```ts
const form = new State({
  name: '',
  hasErrors: (s) => s.name.trim().length === 0,
  canSubmit: '{!hasErrors}',
});

// TextField: value ↔ form.name
// Button: disabled ↔ form.hasErrors  (oppure enabled ↔ form.canSubmit)
```

### Trasformazioni con pipe

```ts
StateConfig.registerGlobalMapper({
  name: 'title',
  create: () => ({
    mapRead: (v: any) => String(v).replace(/\b\w/g, c => c.toUpperCase())
  })
});

const s = new State({
  name: 'ada lovelace',
  displayName: '{name |> title()}',
});

console.log(s.displayName); // "Ada Lovelace"
```

### Lista con reordering e update immutabile

```ts
const s = new State({
  items: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
});

s.items
  .move(2, 0) // C, A, B
  .update(1, it => ({ ...it, title: it.title + '!' }));
```

### Dizionario impostazioni con key path

```ts
const s = new State({
  settings: new Map([['theme', 'dark'], ['locale', 'en']]),
});

s.on('settings["theme"]', t => console.log('theme ->', t));
s.settings.set('theme', 'light');
```

---

## Troubleshooting

**`Cannot set unknown property 'x' (no schema in chain)`**  
Stai scrivendo una chiave non dichiarata nello schema né del corrente né dei parent. Dichiara la chiave nel livello corretto.

**`'foo': index on non-list`**  
Hai usato `[n]` su una proprietà che non è una lista.

**`List element not navigable in 'path'`**  
Stai navigando dentro un elemento di lista che non è un oggetto (es. `number` o `undefined`).

**`'prop' not found in schema` / `'prop' not found in element schema`**  
La proprietà non esiste nello schema del livello target. Aggiungila allo schema iniziale.

**`Mapper 'xyz' non registrato`**  
Registra il mapper con `StateConfig.registerGlobalMapper(...)` prima di accedere all’alias.

**`After [idx] a .prop is required`**  
Per path tipo `arr[0]something` manca il punto/prop: usa `arr[0].something`.

> Debugga i path con `PathResolver.preflight(state, path)` → ottieni `hops` con una traccia passo–passo.

---

## Linee guida di design

- Mantieni lo **schema essenziale e chiaro**. Niente chiavi “a sorpresa”.
- Usa **alias** per condividere stato tra componenti; evita duplicazioni.
- Tieni le **derivate pure** e senza effetti collaterali.
- Wrappa azioni multi–mutazione in **`batch`**.
- Registra i **mapper globali** all’avvio per semantica consistente.

---

## API Reference

### `new State(initial, options?)`
Crea uno state con schema uguale a `initial`.

- `initial`: chiavi di primo livello (valori, nested, array, mappe, alias `'{...}'`, derivate `(s)=>...`).
- `options.parent`: opzionale, abilita ereditarietà e write-forwarding.
- `options.runtime`: opzionale; se assente, riusa quello del parent o ne crea uno.
- `options.schema`: JSON Schema per validazione/default (usa AJV condiviso).
- `options.validateOnWrite`: se `true`, valida ad ogni assegnazione (non solo all'init).
- `options.ajv` / `options.ajvOptions`: per fornire/customizzare l'istanza AJV.

### `state.on(keyOrPath, fn, { immediate = true })`
Sottoscrive modifiche a una chiave/path. Restituisce `() => void` per annullare.

### `ReactiveRuntime.batch(fn)`
Coalescenza notifiche: tutte le mutazioni in `fn` producono notifiche compattate.

### **Liste** (chiave array)
- Metodi nativi: `push/pop/splice/shift/unshift/reverse/sort/fill/copyWithin`
- Helpers: `update(i, fn)`, `replaceAll(fn)`, `insertAt(i, v)`, `removeAt(i, count=1)`, `move(from, to)`

### **Mappe** (chiave `Map`/`Record`)
- API: `get/set/delete/clear/has/keys/values/entries/forEach`
- Getter: `size`
- Ref: `keysRef(): Attribute<string[]>`, `sizeRef(): Attribute<number>`

### **Alias**
- Base: `'{path}'` (read/write)
- Operatore: `'{!path}'` (read/write invertito)
- Pipe: `'{path |> mapper(args?) |> ... }'` (read-only salvo `mapWrite`)

### **PathResolver**
- `PathResolver.preflight(state, path)` → `{ ok, error?, finalKind?, hops[] }`
- `finalKind`: `'prop' | 'index' | 'mapKey'`

### **StateConfig**
- `registerGlobalMapper({ name, create(...args){ return { mapRead(v), mapWrite?(next) } } })`
- `resetGlobalStateConfig()`

---

## FAQ

**Posso creare nuove chiavi al volo?**  
No. Lo schema è immutabile. Dichiara sempre le chiavi in `initial`.

**Le pipe supportano più mapper in catena?**  
Sì. La write è permessa solo se **tutti** i mapper interessati supportano `mapWrite` in modo coerente.

**Spostare elementi in lista rompe le sottoscrizioni tipo `items[0].name`?**  
No: le sottoscrizioni si ri–cablano, evitando doppie emissioni.

**Posso annidare `State` dentro liste/mappe?**  
Sì. Gli oggetti plain vengono wrappati automaticamente; se è già `State`, viene usato com’è.

---

## Glossario

- **Schema immutabile**: insieme fisso delle chiavi dichiarate nel costruttore.
- **Override locale**: chiave ridefinita nel figlio che non propaga sul padre.
- **Write-forwarding**: assegnazione inoltrata al primo parent che dichiara la chiave.
- **Derivata (computed)**: proprietà calcolata da una funzione pura delle altre proprietà.
- **Alias**: proprietà “puntatore” a un’altra, eventualmente trasformata da operatori/mapper.
- **Pipe/Mapper**: trasformazione in lettura (e opzionalmente in scrittura) applicata a un alias.
- **Batch/Coalescing**: compattazione delle notifiche generate da più mutazioni ravvicinate.
- **Preflight**: verifica sintattico–semantica dei path senza creare binding runtime.
