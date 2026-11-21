/**
 * Fotografías del sitio público y del acceso.
 *
 * Mientras ARGOS no tenga sesión de fotos propia se usan fotos con licencia
 * libre servidas desde su origen (sin descargarlas al repo):
 * - Unsplash (Licencia Unsplash: uso comercial libre, sin atribución obligatoria).
 * - Wikimedia Commons (CC BY / CC BY-SA: se acredita al autor; ver `PHOTO_CREDITS`).
 *
 * Antes de producción conviene reemplazarlas por fotos propias de las
 * propiedades de los clientes y servirlas desde nuestro bucket (S3).
 */
export interface Photo {
  readonly src: string;
  readonly srcset: string;
  readonly alt: string;
  /** Nombre corto para créditos. */
  readonly name: string;
  /** `object-position` para encuadrar bien en recortes. */
  readonly position: string;
  readonly credit: string;
  readonly license: string;
  readonly source: string;
}

const UNSPLASH_WIDTHS = [640, 1080, 1600, 2400];
/** Commons solo sirve miniaturas en anchos estándar. */
const COMMONS_WIDTHS = [960, 1280, 1920];

function unsplash(id: string, alt: string, position = '50% 50%'): Photo {
  const url = (w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=78`;
  return {
    src: url(1600),
    srcset: UNSPLASH_WIDTHS.map((w) => `${url(w)} ${w}w`).join(', '),
    alt,
    name: alt,
    position,
    credit: 'Unsplash',
    license: 'Licencia Unsplash',
    source: 'https://unsplash.com/license',
  };
}

function commons(path: string, name: string, alt: string, credit: string, license: string, position = '50% 50%'): Photo {
  const file = path.split('/').pop() as string;
  const url = (w: number) => `https://thumb.wikimedia.org/wikipedia/commons/thumb/${path}/${w}px-${file}`;
  return {
    src: url(1920),
    srcset: COMMONS_WIDTHS.map((w) => `${url(w)} ${w}w`).join(', '),
    alt,
    name,
    position,
    credit,
    license,
    source: `https://commons.wikimedia.org/wiki/File:${file}`,
  };
}

export const PHOTOS = {
  /* Lugares de Guatemala */
  antiguaArch: commons(
    '0/07/Brooding_-_Arco_de_Santa_Catalina%2C_Antigua_Guatemala_2022.jpg',
    'Arco de Santa Catalina',
    'Arco de Santa Catalina con el Volcán de Agua al fondo, Antigua Guatemala',
    'Not So Dusty',
    'CC BY 2.0',
    '50% 40%',
  ),
  antiguaStreet: commons(
    'c/cd/Volcano_Street%2C_Antigua_Guatemala%2C_2022-01-27.jpg',
    'Calle del Arco, Antigua',
    'Calle empedrada de Antigua Guatemala vista a través de un arco, con el volcán al fondo',
    'Not So Dusty',
    'CC BY 2.0',
    '50% 45%',
  ),
  atitlan: commons(
    '6/6a/1_lake_atitlan_panorama_2009.jpg',
    'Lago de Atitlán',
    'Lago de Atitlán con sus volcanes al amanecer',
    'chensiyuan',
    'CC BY-SA 4.0',
    '50% 55%',
  ),

  /* Propiedades */
  lakeRoom: unsplash('1596394516093-501ba68a0ba6', 'Habitación con terraza frente al lago y las montañas', '50% 60%'),
  beachPool: unsplash('1520250497591-112f2f40a3f4', 'Piscina rodeada de palmeras en una casa de playa'),
  brightRoom: unsplash('1615874959474-d609969a20ed', 'Dormitorio luminoso con plantas, listo para el siguiente huésped'),

  /* Personas trabajando */
  cleaning: unsplash('1581578731548-c64695cc6952', 'Integrante del equipo de limpieza limpiando una ventana', '40% 30%'),
  maintenance: unsplash('1621905251189-08b45d6a269e', 'Técnico de mantenimiento revisando una instalación eléctrica', '30% 40%'),
  checkin: unsplash('1556745757-8d76bdb6984b', 'Registro de llegada en recepción con una tablet', '50% 40%'),
} satisfies Record<string, Photo>;

export type PhotoKey = keyof typeof PHOTOS;

/** Fotos que exigen atribución (Commons), para el pie de página. */
export const PHOTO_CREDITS: readonly Photo[] = Object.values(PHOTOS).filter((p) => p.credit !== 'Unsplash');
