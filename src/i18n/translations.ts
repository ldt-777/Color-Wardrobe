import type { MoodId } from '../color/moods';
import type { SwatchRole } from '../color/roles';
import type { Category } from '../types';

export const LANGUAGES = ['it', 'en', 'es'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Nome di ogni lingua nella lingua stessa: nessuno cerca "Italiano" sotto "Italian". */
export const LANGUAGE_NAMES: Record<Language, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
};

/**
 * Forma singolare e plurale. Le tre lingue supportate si accontentano di due
 * forme; se un giorno se ne aggiungesse una con regole piu' ricche (polacco,
 * russo), questo tipo e' il punto in cui allargare.
 */
export type Plural = { one: string; other: string };

/**
 * Il dizionario italiano e' anche il tipo del dizionario.
 *
 * Le altre lingue sono dichiarate `Dictionary`, quindi una voce dimenticata o
 * un nome sbagliato diventano un errore di compilazione invece di una stringa
 * mancante scoperta a schermo.
 */
const it = {
  common: {
    back: 'Indietro',
    close: 'Chiudi',
    cancel: 'Annulla',
    delete: 'Elimina',
    backToWardrobe: 'Torna al guardaroba',
  },

  wardrobe: {
    title: 'Guardaroba',
    empty: 'Ancora vuoto',
    count: { one: '{count} capo', other: '{count} capi' } as Plural,
    families: 'LE FAMIGLIE DI COLORE DEL TUO GUARDAROBA',
    pinnedMood: 'Mood fisso · {mood}',
    change: 'Cambia',
    emptyTitle: 'Il colore comincia da un capo',
    emptyBody:
      'Fotografa qualcosa che indossi spesso. Ne leggo i colori e da li costruisco la palette del tuo guardaroba.',
    emptyAction: 'Scatta la prima foto',
    addGarment: 'Aggiungi un capo',
    openSettings: 'Impostazioni',
    showPhotos: 'Mostra le foto',
    showColorsOnly: 'Mostra solo i colori',
  },

  capture: {
    permissionTitle: 'Serve la fotocamera',
    permissionBody:
      'Le foto restano sul telefono: servono solo per leggere i colori dei tuoi capi.',
    allow: 'Consenti',
    notNow: 'Non ora',
    reading: 'Leggo i colori…',
    hint: 'Inquadra il capo su un fondo semplice',
    error: 'Non sono riuscito a leggere i colori di questa foto. Riprova.',
    flipCamera: 'Cambia fotocamera',
    fromLibrary: 'Scegli dalla galleria',
    shoot: 'Scatta',
  },

  review: {
    title: 'Nuovo capo',
    noDraft: 'Nessuna foto da salvare.',
    colorsFound: 'I colori che ho letto',
    name: 'Nome',
    category: 'Categoria',
    save: 'Salva nel guardaroba',
    saving: 'Salvo…',
    unnamed: 'Capo senza nome',
  },

  garment: {
    notFound: 'Capo non trovato.',
    palette: 'Palette del capo',
    inWardrobe: 'Nel tuo guardaroba',
    versatility: 'Versatilita',
    versatilityHint: 'dei capi ci si abbina',
    rarity: 'Rarita',
    rarityHint: 'quanto e un colore fuori dal coro',
    moodAffinity: 'Mood {mood}',
    moodAffinityHint: 'quanto rientra nel mood attivo',
    matches: 'Ci sta bene con',
    deleteTitle: 'Eliminare questo capo?',
    deleteBody: 'La foto e i suoi colori verranno rimossi.',
    deleteAction: 'Elimina capo',
  },

  settings: {
    title: 'Impostazioni',
    language: 'Lingua',
    languageBody: 'Scegli la lingua dell app, oppure lascia che segua quella del telefono.',
    languageSystem: 'Come il telefono',
    languageSystemBody: 'Segue le impostazioni di sistema',
    pinnedMood: 'Mood fisso',
    pinnedMoodBody:
      'Con un mood fisso il guardaroba si ordina sempre allo stesso modo e i pulsanti in alto spariscono. Senza, puoi cambiare mood quando vuoi.',
    pinnedMoodNone: 'Nessuno',
    pinnedMoodNoneBody: 'Scelgo di volta in volta',
    colorOnly: 'Solo colore',
    colorOnlyBody: 'Nasconde le foto e lascia il guardaroba come pura griglia di colori.',
    privacy: 'Dove finiscono le foto',
    privacyBody:
      'Tutto resta su questo telefono: le immagini in una cartella privata dell app e i colori in un database locale. Niente account, niente rete.',
  },

  roles: {
    base: 'Colore base',
    secondario: 'Secondario',
    accento: 'Accento',
    neutro: 'Neutro',
  } as Record<SwatchRole, string>,

  categories: {
    knitwear: 'Maglieria',
    shirts: 'Camicie',
    tshirts: 'T-shirt',
    trousers: 'Pantaloni',
    jackets: 'Giacche',
    shoes: 'Scarpe',
    accessories: 'Accessori',
    other: 'Altro',
  } as Record<Category, string>,

  moods: {
    spettro: { name: 'Spettro', tagline: 'Il tuo guardaroba come un arcobaleno' },
    flusso: { name: 'Flusso', tagline: 'Una sfumatura continua, senza salti' },
    quiete: { name: 'Quiete', tagline: 'Toni bassi, tutto respira' },
    carattere: { name: 'Carattere', tagline: 'I pezzi che si fanno notare, uno accanto all altro' },
    terra: { name: 'Terra', tagline: 'Caldi, naturali, vissuti' },
    notte: { name: 'Notte', tagline: 'Profondita, neutri, poca luce' },
  } as Record<MoodId, { name: string; tagline: string }>,
};

export type Dictionary = typeof it;

const en: Dictionary = {
  common: {
    back: 'Back',
    close: 'Close',
    cancel: 'Cancel',
    delete: 'Delete',
    backToWardrobe: 'Back to wardrobe',
  },

  wardrobe: {
    title: 'Wardrobe',
    empty: 'Still empty',
    count: { one: '{count} piece', other: '{count} pieces' },
    families: 'THE COLOUR FAMILIES OF YOUR WARDROBE',
    pinnedMood: 'Fixed mood · {mood}',
    change: 'Change',
    emptyTitle: 'Colour starts with one piece',
    emptyBody:
      'Photograph something you wear often. I read its colours and build your wardrobe palette from there.',
    emptyAction: 'Take the first photo',
    addGarment: 'Add a piece',
    openSettings: 'Settings',
    showPhotos: 'Show photos',
    showColorsOnly: 'Show colours only',
  },

  capture: {
    permissionTitle: 'Camera needed',
    permissionBody:
      'Photos stay on your phone: they are only used to read the colours of your clothes.',
    allow: 'Allow',
    notNow: 'Not now',
    reading: 'Reading the colours…',
    hint: 'Frame the piece against a plain background',
    error: 'I could not read the colours in this photo. Try again.',
    flipCamera: 'Flip camera',
    fromLibrary: 'Choose from library',
    shoot: 'Take photo',
  },

  review: {
    title: 'New piece',
    noDraft: 'No photo to save.',
    colorsFound: 'The colours I read',
    name: 'Name',
    category: 'Category',
    save: 'Save to wardrobe',
    saving: 'Saving…',
    unnamed: 'Unnamed piece',
  },

  garment: {
    notFound: 'Piece not found.',
    palette: 'Palette of this piece',
    inWardrobe: 'In your wardrobe',
    versatility: 'Versatility',
    versatilityHint: 'of your pieces go with it',
    rarity: 'Rarity',
    rarityHint: 'how far it stands from the rest',
    moodAffinity: '{mood} mood',
    moodAffinityHint: 'how well it fits the active mood',
    matches: 'Goes well with',
    deleteTitle: 'Delete this piece?',
    deleteBody: 'The photo and its colours will be removed.',
    deleteAction: 'Delete piece',
  },

  settings: {
    title: 'Settings',
    language: 'Language',
    languageBody: 'Pick the language of the app, or let it follow your phone.',
    languageSystem: 'Same as phone',
    languageSystemBody: 'Follows your system settings',
    pinnedMood: 'Fixed mood',
    pinnedMoodBody:
      'With a fixed mood the wardrobe always sorts the same way and the buttons at the top disappear. Without one, you can switch mood whenever you like.',
    pinnedMoodNone: 'None',
    pinnedMoodNoneBody: 'I choose each time',
    colorOnly: 'Colour only',
    colorOnlyBody: 'Hides the photos and leaves the wardrobe as a pure grid of colour.',
    privacy: 'Where the photos go',
    privacyBody:
      'Everything stays on this phone: images in a private app folder, colours in a local database. No account, no network.',
  },

  roles: {
    base: 'Base colour',
    secondario: 'Secondary',
    accento: 'Accent',
    neutro: 'Neutral',
  },

  categories: {
    knitwear: 'Knitwear',
    shirts: 'Shirts',
    tshirts: 'T-shirts',
    trousers: 'Trousers',
    jackets: 'Jackets',
    shoes: 'Shoes',
    accessories: 'Accessories',
    other: 'Other',
  },

  moods: {
    spettro: { name: 'Spectrum', tagline: 'Your wardrobe as a rainbow' },
    flusso: { name: 'Flow', tagline: 'One continuous gradient, no jumps' },
    quiete: { name: 'Quiet', tagline: 'Low tones, everything breathes' },
    carattere: { name: 'Character', tagline: 'The bold pieces, side by side' },
    terra: { name: 'Earth', tagline: 'Warm, natural, lived-in' },
    notte: { name: 'Night', tagline: 'Depth, neutrals, little light' },
  },
};

const es: Dictionary = {
  common: {
    back: 'Atrás',
    close: 'Cerrar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    backToWardrobe: 'Volver al armario',
  },

  wardrobe: {
    title: 'Armario',
    empty: 'Todavía vacío',
    count: { one: '{count} prenda', other: '{count} prendas' },
    families: 'LAS FAMILIAS DE COLOR DE TU ARMARIO',
    pinnedMood: 'Mood fijo · {mood}',
    change: 'Cambiar',
    emptyTitle: 'El color empieza por una prenda',
    emptyBody:
      'Fotografía algo que uses a menudo. Leo sus colores y desde ahí construyo la paleta de tu armario.',
    emptyAction: 'Hacer la primera foto',
    addGarment: 'Añadir una prenda',
    openSettings: 'Ajustes',
    showPhotos: 'Mostrar las fotos',
    showColorsOnly: 'Mostrar solo los colores',
  },

  capture: {
    permissionTitle: 'Hace falta la cámara',
    permissionBody:
      'Las fotos se quedan en el teléfono: solo sirven para leer los colores de tu ropa.',
    allow: 'Permitir',
    notNow: 'Ahora no',
    reading: 'Leyendo los colores…',
    hint: 'Encuadra la prenda sobre un fondo liso',
    error: 'No he podido leer los colores de esta foto. Inténtalo otra vez.',
    flipCamera: 'Cambiar cámara',
    fromLibrary: 'Elegir de la galería',
    shoot: 'Hacer foto',
  },

  review: {
    title: 'Prenda nueva',
    noDraft: 'No hay ninguna foto que guardar.',
    colorsFound: 'Los colores que he leído',
    name: 'Nombre',
    category: 'Categoría',
    save: 'Guardar en el armario',
    saving: 'Guardando…',
    unnamed: 'Prenda sin nombre',
  },

  garment: {
    notFound: 'Prenda no encontrada.',
    palette: 'Paleta de la prenda',
    inWardrobe: 'En tu armario',
    versatility: 'Versatilidad',
    versatilityHint: 'de tus prendas combinan con ella',
    rarity: 'Rareza',
    rarityHint: 'cuánto se sale del conjunto',
    moodAffinity: 'Mood {mood}',
    moodAffinityHint: 'cuánto encaja en el mood activo',
    matches: 'Combina bien con',
    deleteTitle: '¿Eliminar esta prenda?',
    deleteBody: 'Se borrarán la foto y sus colores.',
    deleteAction: 'Eliminar prenda',
  },

  settings: {
    title: 'Ajustes',
    language: 'Idioma',
    languageBody: 'Elige el idioma de la app, o deja que siga al del teléfono.',
    languageSystem: 'Como el teléfono',
    languageSystemBody: 'Sigue los ajustes del sistema',
    pinnedMood: 'Mood fijo',
    pinnedMoodBody:
      'Con un mood fijo el armario se ordena siempre igual y los botones de arriba desaparecen. Sin él, puedes cambiar de mood cuando quieras.',
    pinnedMoodNone: 'Ninguno',
    pinnedMoodNoneBody: 'Lo elijo cada vez',
    colorOnly: 'Solo color',
    colorOnlyBody: 'Oculta las fotos y deja el armario como una rejilla de color pura.',
    privacy: 'Dónde acaban las fotos',
    privacyBody:
      'Todo se queda en este teléfono: las imágenes en una carpeta privada de la app y los colores en una base de datos local. Sin cuenta, sin red.',
  },

  roles: {
    base: 'Color base',
    secondario: 'Secundario',
    accento: 'Acento',
    neutro: 'Neutro',
  },

  categories: {
    knitwear: 'Punto',
    shirts: 'Camisas',
    tshirts: 'Camisetas',
    trousers: 'Pantalones',
    jackets: 'Chaquetas',
    shoes: 'Zapatos',
    accessories: 'Accesorios',
    other: 'Otro',
  },

  moods: {
    spettro: { name: 'Espectro', tagline: 'Tu armario como un arcoíris' },
    flusso: { name: 'Flujo', tagline: 'Un degradado continuo, sin saltos' },
    quiete: { name: 'Calma', tagline: 'Tonos bajos, todo respira' },
    carattere: { name: 'Carácter', tagline: 'Las piezas que se hacen notar, una junto a otra' },
    terra: { name: 'Tierra', tagline: 'Cálidos, naturales, vividos' },
    notte: { name: 'Noche', tagline: 'Profundidad, neutros, poca luz' },
  },
};

export const DICTIONARIES: Record<Language, Dictionary> = { it, en, es };
