// Rung 0: minimal-pair sound drills for Latin American Spanish.
// Seseo and yeísmo are assumed, so s/z/c and ll/y are not contrasted.
// Each pair becomes one FSRS card; each word is recorded by two voices.

export interface Contrast {
  id: string;
  title: string; // shown on the drill, in Spanish/IPA only (no English on cards)
  hint: string; // short sound label, e.g. "r · rr"
  pairs: [string, string][];
}

export const CONTRASTS: Contrast[] = [
  {
    id: 'r-rr',
    title: 'r suave · rr fuerte',
    hint: '[ɾ] · [r]',
    pairs: [
      ['pero', 'perro'],
      ['caro', 'carro'],
      ['cero', 'cerro'],
      ['para', 'parra'],
      ['coro', 'corro'],
      ['pera', 'perra'],
    ],
  },
  {
    id: 'stress',
    title: 'acento',
    hint: 'sílaba tónica',
    pairs: [
      ['papa', 'papá'],
      ['esta', 'está'],
      ['hablo', 'habló'],
      ['canto', 'cantó'],
      ['termino', 'terminó'],
      ['practico', 'practicó'],
    ],
  },
  {
    id: 'n-ny',
    title: 'n · ñ',
    hint: '[n] · [ɲ]',
    pairs: [
      ['cana', 'caña'],
      ['pena', 'peña'],
      ['mono', 'moño'],
      ['una', 'uña'],
      ['sonar', 'soñar'],
    ],
  },
  {
    id: 'e-i',
    title: 'e · i',
    hint: '[e] · [i]',
    pairs: [
      ['mesa', 'misa'],
      ['peso', 'piso'],
      ['pela', 'pila'],
      ['dejo', 'dijo'],
      ['lema', 'lima'],
    ],
  },
  {
    id: 'o-u',
    title: 'o · u',
    hint: '[o] · [u]',
    pairs: [
      ['rosa', 'rusa'],
      ['loto', 'luto'],
      ['sobo', 'subo'],
      ['poso', 'puso'],
      ['mondo', 'mundo'],
    ],
  },
  {
    id: 'a-o',
    title: 'a · o',
    hint: '[a] · [o]',
    pairs: [
      ['casa', 'cosa'],
      ['pasa', 'posa'],
      ['cama', 'coma'],
      ['rata', 'rota'],
      ['mapa', 'mopa'],
    ],
  },
  {
    id: 'e-a',
    title: 'e · a',
    hint: '[e] · [a]',
    pairs: [
      ['peso', 'paso'],
      ['mesa', 'masa'],
      ['pera', 'para'],
      ['tela', 'tala'],
      ['pelo', 'palo'],
    ],
  },
  {
    id: 'b-p',
    title: 'b/v · p',
    hint: '[b] · [p]',
    pairs: [
      ['beso', 'peso'],
      ['vino', 'pino'],
      ['bala', 'pala'],
      ['bata', 'pata'],
      ['vaso', 'paso'],
    ],
  },
  {
    id: 'd-t',
    title: 'd · t',
    hint: '[d] · [t]',
    pairs: [
      ['dos', 'tos'],
      ['día', 'tía'],
      ['seda', 'seta'],
      ['moda', 'mota'],
      ['cada', 'cata'],
    ],
  },
  {
    id: 'g-k',
    title: 'g · c',
    hint: '[g] · [k]',
    pairs: [
      ['gasa', 'casa'],
      ['gota', 'cota'],
      ['goma', 'coma'],
      ['gallo', 'callo'],
      ['gana', 'cana'],
    ],
  },
  {
    id: 'r-l',
    title: 'r · l',
    hint: '[ɾ] · [l]',
    pairs: [
      ['pero', 'pelo'],
      ['hora', 'hola'],
      ['para', 'pala'],
      ['cara', 'cala'],
      ['mar', 'mal'],
    ],
  },
  {
    id: 'j-g',
    title: 'j · g',
    hint: '[x] · [g]',
    pairs: [
      ['jota', 'gota'],
      ['ajo', 'ago'],
      ['jarra', 'garra'],
      ['pajar', 'pagar'],
      ['lijar', 'ligar'],
    ],
  },
];

export const SOUND_VOICES = ['es-MX-DaliaNeural', 'es-MX-JorgeNeural'] as const;

/** Every distinct word that needs audio for Rung 0. */
export function rung0Words(): string[] {
  const s = new Set<string>();
  for (const c of CONTRASTS) for (const [a, b] of c.pairs) { s.add(a); s.add(b); }
  return [...s];
}
