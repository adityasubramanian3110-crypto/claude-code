// A1 picture words. Latin American (Mexican/neutral) vocabulary.
// `art` is the article spoken with the word; gender drives the colour code.
// `emoji` selects the OpenMoji illustration (replaceable by your own photo).

export type Gender = 'm' | 'f';

export interface Word {
  id: string;
  word: string;
  art: string; // el, la, los, las
  g: Gender;
  emoji: string; // '' = no emoji: see `pic`
  topic: string;
  pic?: 'drawn' | 'generated'; // drawn: hand-made SVG in public/img; generated: AI image (webp)
}

type Row = [word: string, art: string, emoji: string];

// Words with no OpenMoji icon, and how their picture is made.
const PIC: Record<string, Word['pic']> = { mesa: 'drawn' };

const T: Record<string, Row[]> = {
  comida: [
    ['manzana', 'la', '🍎'], ['plátano', 'el', '🍌'], ['naranja', 'la', '🍊'], ['uva', 'la', '🍇'],
    ['fresa', 'la', '🍓'], ['piña', 'la', '🍍'], ['sandía', 'la', '🍉'], ['limón', 'el', '🍋'],
    ['durazno', 'el', '🍑'], ['pera', 'la', '🍐'], ['aguacate', 'el', '🥑'], ['tomate', 'el', '🍅'],
    ['papa', 'la', '🥔'], ['zanahoria', 'la', '🥕'], ['elote', 'el', '🌽'], ['cebolla', 'la', '🧅'],
    ['ajo', 'el', '🧄'], ['chile', 'el', '🌶️'], ['pan', 'el', '🍞'], ['queso', 'el', '🧀'],
    ['huevo', 'el', '🥚'], ['leche', 'la', '🥛'], ['café', 'el', '☕'], ['té', 'el', '🍵'],
    ['agua', 'el', '💧'], ['jugo', 'el', '🧃'], ['cerveza', 'la', '🍺'], ['vino', 'el', '🍷'],
    ['arroz', 'el', '🍚'], ['carne', 'la', '🥩'], ['taco', 'el', '🌮'], ['galleta', 'la', '🍪'],
    ['pastel', 'el', '🎂'], ['helado', 'el', '🍦'], ['sopa', 'la', '🍲'], ['ensalada', 'la', '🥗'],
    ['chocolate', 'el', '🍫'], ['sal', 'la', '🧂'], ['miel', 'la', '🍯'], ['pizza', 'la', '🍕'],
    ['hamburguesa', 'la', '🍔'], ['dulce', 'el', '🍬'],
  ],
  animales: [
    ['perro', 'el', '🐕'], ['gato', 'el', '🐈'], ['caballo', 'el', '🐎'], ['vaca', 'la', '🐄'],
    ['cerdo', 'el', '🐖'], ['gallina', 'la', '🐔'], ['pájaro', 'el', '🐦'], ['pez', 'el', '🐟'],
    ['ratón', 'el', '🐭'], ['conejo', 'el', '🐇'], ['oso', 'el', '🐻'], ['león', 'el', '🦁'],
    ['tigre', 'el', '🐅'], ['mono', 'el', '🐒'], ['elefante', 'el', '🐘'], ['serpiente', 'la', '🐍'],
    ['tortuga', 'la', '🐢'], ['araña', 'la', '🕷️'], ['mariposa', 'la', '🦋'], ['abeja', 'la', '🐝'],
    ['borrego', 'el', '🐑'], ['pato', 'el', '🦆'], ['rana', 'la', '🐸'], ['burro', 'el', '🫏'],
  ],
  casa: [
    ['casa', 'la', '🏠'], ['mesa', 'la', ''], ['silla', 'la', '🪑'], ['cama', 'la', '🛏️'],
    ['puerta', 'la', '🚪'], ['ventana', 'la', '🪟'], ['llave', 'la', '🔑'], ['libro', 'el', '📖'],
    ['lápiz', 'el', '✏️'], ['pluma', 'la', '🖊️'], ['teléfono', 'el', '☎️'], ['celular', 'el', '📱'],
    ['computadora', 'la', '💻'], ['reloj', 'el', '⌚'], ['lentes', 'los', '👓'], ['cuchillo', 'el', '🔪'],
    ['cuchara', 'la', '🥄'], ['plato', 'el', '🍽️'], ['vaso', 'el', '🥃'], ['botella', 'la', '🍾'],
    ['foco', 'el', '💡'], ['tijeras', 'las', '✂️'], ['jabón', 'el', '🧼'], ['espejo', 'el', '🪞'],
    ['regalo', 'el', '🎁'], ['globo', 'el', '🎈'], ['pelota', 'la', '⚽'], ['bolsa', 'la', '👜'],
    ['mochila', 'la', '🎒'], ['dinero', 'el', '💵'], ['carta', 'la', '✉️'], ['caja', 'la', '📦'],
    ['vela', 'la', '🕯️'], ['escoba', 'la', '🧹'], ['cubeta', 'la', '🪣'], ['paraguas', 'el', '☂️'],
    ['martillo', 'el', '🔨'], ['candado', 'el', '🔒'], ['cámara', 'la', '📷'], ['televisión', 'la', '📺'],
    ['periódico', 'el', '📰'], ['mapa', 'el', '🗺️'], ['campana', 'la', '🔔'], ['bandera', 'la', '🚩'],
  ],
  ropa: [
    ['camisa', 'la', '👔'], ['playera', 'la', '👕'], ['pantalón', 'el', '👖'], ['vestido', 'el', '👗'],
    ['zapato', 'el', '👞'], ['calcetín', 'el', '🧦'], ['sombrero', 'el', '👒'], ['gorra', 'la', '🧢'],
    ['chamarra', 'la', '🧥'], ['bufanda', 'la', '🧣'], ['guante', 'el', '🧤'], ['anillo', 'el', '💍'],
    ['corona', 'la', '👑'],
  ],
  cuerpo: [
    ['ojo', 'el', '👁️'], ['oreja', 'la', '👂'], ['nariz', 'la', '👃'], ['boca', 'la', '👄'],
    ['mano', 'la', '✋'], ['pie', 'el', '🦶'], ['pierna', 'la', '🦵'], ['diente', 'el', '🦷'],
    ['brazo', 'el', '💪'], ['corazón', 'el', '🫀'], ['lengua', 'la', '👅'],
  ],
  transporte: [
    ['carro', 'el', '🚗'], ['camión', 'el', '🚌'], ['avión', 'el', '✈️'], ['barco', 'el', '🚢'],
    ['bicicleta', 'la', '🚲'], ['tren', 'el', '🚆'], ['moto', 'la', '🏍️'], ['taxi', 'el', '🚕'],
    ['cohete', 'el', '🚀'], ['metro', 'el', '🚇'],
  ],
  naturaleza: [
    ['sol', 'el', '☀️'], ['luna', 'la', '🌙'], ['estrella', 'la', '⭐'], ['nube', 'la', '☁️'],
    ['lluvia', 'la', '🌧️'], ['nieve', 'la', '❄️'], ['árbol', 'el', '🌳'], ['flor', 'la', '🌸'],
    ['montaña', 'la', '⛰️'], ['mar', 'el', '🌊'], ['playa', 'la', '🏖️'], ['fuego', 'el', '🔥'],
    ['hoja', 'la', '🍁'], ['piedra', 'la', '🪨'], ['arcoíris', 'el', '🌈'], ['volcán', 'el', '🌋'],
    ['isla', 'la', '🏝️'],
  ],
  gente: [
    ['niño', 'el', '👦'], ['niña', 'la', '👧'], ['hombre', 'el', '👨'], ['mujer', 'la', '👩'],
    ['bebé', 'el', '👶'], ['escuela', 'la', '🏫'], ['hospital', 'el', '🏥'], ['iglesia', 'la', '⛪'],
    ['tienda', 'la', '🏪'], ['banco', 'el', '🏦'], ['hotel', 'el', '🏨'], ['castillo', 'el', '🏰'],
    ['música', 'la', '🎵'], ['guitarra', 'la', '🎸'], ['tambor', 'el', '🥁'], ['trompeta', 'la', '🎺'],
    ['ancla', 'el', '⚓'],
  ],
};

const FEM_EXCEPTIONS = new Set(['agua', 'ancla']); // feminine nouns that take "el"

/** ASCII file-safe id that keeps accent distinctions (papa → papa, papá → pa_pa_). */
function slug(s: string): string {
  const map: Record<string, string> = { á: 'a_', é: 'e_', í: 'i_', ó: 'o_', ú: 'u_', ü: 'u__', ñ: 'n_' };
  return s.toLowerCase().normalize('NFC').replace(/[áéíóúüñ]/g, (c) => map[c]).replace(/[^a-z0-9_]/g, '-');
}

export const WORDS: Word[] = Object.entries(T).flatMap(([topic, rows]) =>
  rows.map(([word, art, emoji]) => ({
    id: `w-${slug(word)}`,
    word,
    art,
    g: (FEM_EXCEPTIONS.has(word) || art === 'la' || art === 'las' ? 'f' : 'm') as Gender,
    emoji,
    topic,
    ...(PIC[word] ? { pic: PIC[word] } : {}),
  })),
);

/** Lowercase hex code points joined by '-', OpenMoji file naming (uppercase on disk). */
export function emojiCode(e: string): string {
  return [...e].map((c) => c.codePointAt(0)!.toString(16).toUpperCase()).join('-');
}

export { slug };
