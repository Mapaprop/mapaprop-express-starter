// Texts of the kit, in one place. No build step: a plain object and a `t()`.
//
// WHY THIS EXISTS: Mapaprop operates in 15 countries, and this kit gets forked. A literal left
// hardcoded in a template multiplies with every copy somebody downloads, and at that point it is no
// longer ours to fix.
//
// THE TWO AXES DO NOT MIX:
//   - LANGUAGE (this file) is how WE talk: labels, buttons, errors, empty states.
//   - The DATA from the API already comes in the account's own language (`propertyType`,
//     `propertyOperation`, `attributes[].label`, the zone names). It is never translated here.
//   - COUNTRY is NOT inferred from the language: the currency comes from the property
//     (`property.currency`), never from the locale. `pt` does not mean Brazil.
//
// Spanish is complete. `en` and `pt` may lag: a missing key falls back to Spanish, which is a
// visible degradation and the reason this can ship before a translation is finished.
const DEFAULT_LANG = 'es';

const NUMBER_LOCALE = { es: 'es-AR', en: 'en-US', pt: 'pt-BR' };

export const STRINGS = {
  es: {
    'nav.home': 'Inicio',
    'nav.sales': 'Ventas',
    'nav.rentals': 'Alquileres',
    'nav.temporary': 'Temporarios',
    'nav.developments': 'Emprendimientos',
    'nav.sell': 'Vender',
    'nav.contact': 'Contacto',
    'nav.toggle': 'Abrir menú',
    'nav.language': 'Idioma',

    'footer.properties': 'Propiedades',
    'footer.forSale': 'En venta',
    'footer.forRent': 'En alquiler',
    'footer.developments': 'Emprendimientos',
    'footer.contact': 'Contacto',
    'footer.writeUs': 'Escribinos',
    'footer.sellOrRent': 'Quiero vender o alquilar',
    'footer.followUs': 'Seguinos',
    'footer.whatsapp': 'Escribinos por WhatsApp',

    'card.noPhotos': 'Sin fotos',
    'card.noTitle': 'Sin título',
    'card.property': 'Propiedad',
    'card.development': 'Emprendimiento',
    'card.askPrice': 'Consultar precio',

    'status.sold': 'Vendida',
    'status.rented': 'Alquilada',
    'status.reserved': 'Reservada',
    'status.suspended': 'Suspendida',

    'specs.ambiences_one': '{n} ambiente',
    'specs.ambiences_other': '{n} ambientes',
    'specs.bedrooms_one': '{n} dormitorio',
    'specs.bedrooms_other': '{n} dormitorios',
    'specs.bathrooms_one': '{n} baño',
    'specs.bathrooms_other': '{n} baños',
    'specs.garages_one': '{n} cochera',
    'specs.garages_other': '{n} cocheras',
    'specs.builtArea': '{n} m² cubiertos',
    'specs.landArea': '{n} m² de terreno',

    'pager.total_one': '{n} propiedad',
    'pager.total_other': '{n} propiedades',

    'home.docTitle': 'Inicio',
    'home.docDescription': 'Propiedades en venta y alquiler. Cartera actualizada al día.',
    'home.heroTitle': 'Encontrá tu próxima propiedad',
    'home.heroSubtitle': 'Toda nuestra cartera, actualizada al día.',
    'home.developments': 'Emprendimientos',
    'home.seeAllDevelopments': 'Ver todos →',
    'home.featured': 'Propiedades destacadas',
    'home.seeAllProperties': 'Ver toda la cartera →',
    'home.byZone': 'Buscá por zona',
    'home.branches': 'Nuestras sucursales',
    'home.empty': 'Todavía no hay propiedades publicadas en esta cuenta.',

    'search.operation': 'Operación',
    'search.type': 'Tipo',
    'search.zone': 'Zona',
    'search.term': 'Buscar',
    'search.termPlaceholder': 'Código, dirección, zona…',
    'search.submit': 'Buscar',
    'search.allFeminine': 'Todas',
    'search.allMasculine': 'Todos',
    'search.none': '—',

    'listing.docTitle': 'Propiedades',
    'listing.docDescription': 'Buscá entre todas nuestras propiedades en venta y alquiler.',
    'listing.title': 'Propiedades',
    'listing.filters': 'Filtros',
    'listing.bedrooms': 'Dormitorios',
    'listing.bathrooms': 'Baños',
    'listing.priceFrom': 'Precio desde',
    'listing.priceTo': 'Precio hasta',
    'listing.noCap': 'Sin tope',
    'listing.apply': 'Aplicar',
    'listing.clear': 'Limpiar',
    'listing.emptyFiltered': 'No encontramos propiedades con esos filtros. Probá quitando alguno.',
    'listing.emptyPage': 'Esta página quedó vacía. Volvé a la primera.',
    'listing.loadError': 'No pudimos cargar las propiedades: {message}',

    'nav.blog': 'Blog',
    'blog.docTitle': 'Blog',
    'blog.docDescription': 'Notas y novedades de la inmobiliaria.',
    'blog.title': 'Blog',
    'blog.empty': 'Todavía no hay notas publicadas.',
    'blog.back': '← Volver al blog',
    'blog.notFound': 'No encontramos esa nota.',
    'developments.docTitle': 'Emprendimientos',
    'developments.docDescription': 'Nuestros emprendimientos y proyectos en pozo.',
    'developments.title': 'Emprendimientos',
    'developments.count_one': '1 emprendimiento',
    'developments.count_other': '{n} emprendimientos',
    'developments.empty': 'Todavía no hay emprendimientos publicados.',
    'developments.loadError': 'No pudimos cargar los emprendimientos: {message}',
    'developments.units_one': '{n} unidad',
    'developments.units_other': '{n} unidades',
    'developments.available': '{n} disponibles',
    'developments.priceFrom': 'desde {price}',
    'developments.manyCurrencies': 'precios en varias monedas',
    'developments.declared': 'Proyecto de {n} unidades',

    'detail.docTitle': 'Propiedad',
    'detail.back': '← Volver a las propiedades',
    'detail.description': 'Descripción',
    'detail.conditions': 'Condiciones',
    'detail.amenities': 'Características',
    'detail.videos': 'Videos y recorridos',
    'detail.videoTitle': 'Video de la propiedad',
    'detail.location': 'Ubicación',
    'detail.mapTitle': 'Mapa de la propiedad',
    'detail.units': 'Unidades del emprendimiento',
    'detail.unitsEmpty': 'Todavía no hay unidades publicadas.',
    'detail.unitsError': 'No pudimos cargar las unidades: {message}',
    'detail.photoAlt': 'Foto {n}',
    'detail.blueprints_one': 'Incluye {n} plano.',
    'detail.blueprints_other': 'Incluye {n} planos.',
    'detail.expenses': 'Expensas: {amount}',
    'detail.taxes': 'Impuestos: {amount}',
    'detail.noHash': 'No indicaste qué propiedad querés ver.',
    'detail.notFound': 'No encontramos esta propiedad. Puede que ya no esté publicada.',
    'detail.loadError': 'No pudimos cargar la propiedad: {message}',

    'facts.type': 'Tipo',
    'facts.operation': 'Operación',
    'facts.ambiences': 'Ambientes',
    'facts.bedrooms': 'Dormitorios',
    'facts.bathrooms': 'Baños',
    'facts.toilettes': 'Toilettes',
    'facts.garages': 'Cocheras',
    'facts.builtArea': 'Superficie cubierta',
    'facts.landArea': 'Superficie del terreno',
    'facts.age': 'Antigüedad',
    'facts.ageValue': '{n} años',
    'facts.totalFloors': 'Pisos del edificio',
    'facts.apartmentsPerFloor': 'Departamentos por piso',
    'facts.ubication': 'Orientación',
    'facts.heating': 'Calefacción',
    'facts.airConditioning': 'Aire acondicionado',
    'facts.code': 'Código',

    'enquiry.title': 'Consultar por esta propiedad',
    'enquiry.name': 'Nombre',
    'enquiry.phone': 'Teléfono',
    'enquiry.email': 'Email',
    'enquiry.message': 'Mensaje',
    'enquiry.draft': 'Hola, quiero más información sobre {subject}.',
    'enquiry.thisProperty': 'esta propiedad',
    'enquiry.hint': 'Dejá al menos un teléfono o un email para que podamos responderte.',
    'enquiry.submit': 'Enviar consulta',
    'enquiry.sending': 'Enviando…',
    'enquiry.needContact': 'Dejanos un email o un teléfono para poder responderte.',
    'enquiry.sent': '¡Listo! Recibimos tu consulta y te vamos a responder a la brevedad.',
    'enquiry.failed': 'No pudimos enviar la consulta ({code}).',
    'enquiry.error': 'No pudimos enviar la consulta: {message}',

    'contact.docTitle': 'Contacto',
    'contact.docDescription': 'Nuestros teléfonos, direcciones y sucursales.',
    'contact.title': 'Contacto',
    'contact.branches': 'Nuestras sucursales',
    'contact.lookingForTitle': '¿Buscás una propiedad en particular?',
    'contact.lookingForText': 'Si ya viste una propiedad en el sitio, consultá desde su ficha: así tu consulta nos llega junto con los datos de esa propiedad y te respondemos más rápido.',
    'contact.seeProperties': 'Ver las propiedades',
    'contact.formTitle': 'Escribinos',
    'contact.name': 'Nombre',
    'contact.email': 'Email',
    'contact.phone': 'Teléfono',
    'contact.branch': 'Sucursal',
    'contact.message': 'Mensaje',
    'contact.submit': 'Enviar',
    'contact.branchesError': 'No pudimos cargar las sucursales en este momento.',
    'contact.branchFallback': 'Sucursal',
    'contact.mainBranch': ' · Principal',
    'contact.zip': 'CP {zip}',
    'contact.whatsapp': 'WhatsApp',
    'contact.hintMailto': 'Al enviar se abre tu programa de correo con el mensaje listo.',
    'contact.hintNoEmail': 'Esta cuenta no tiene un email de sucursal cargado. Usá los teléfonos de la izquierda.',
    'contact.noBranchEmail': 'No hay un email cargado para esta sucursal. Probá por teléfono o WhatsApp.',
    'contact.mailSubject': 'Consulta de {name}',
    'contact.mailName': 'Nombre: {name}',
    'contact.mailEmail': 'Email: {email}',
    'contact.mailPhone': 'Teléfono: {phone}',

    'sell.docTitle': 'Quiero vender o alquilar',
    'sell.docDescription': 'Contanos sobre tu propiedad y te ayudamos a venderla o alquilarla.',
    'sell.intro': 'Contanos los datos principales y nos ponemos en contacto. Si querés, podés adjuntar una foto y la documentación.',
    'sell.yes': 'Sí',
    'sell.no': 'No',
    'sell.title': 'Quiero vender o alquilar mi propiedad',
    'sell.yourData': 'Tus datos',
    'sell.name': 'Nombre y apellido *',
    'sell.phone': 'Teléfono *',
    'sell.email': 'Email *',
    'sell.hours': 'Horario de contacto',
    'sell.hoursPlaceholder': 'Lunes a viernes de 9 a 18',
    'sell.theProperty': 'La propiedad',
    'sell.type': 'Tipo *',
    'sell.operation': 'Operación *',
    'sell.address': 'Dirección *',
    'sell.zone': 'Zona o barrio',
    'sell.zip': 'Código postal',
    'sell.currency': 'Moneda',
    'sell.price': 'Precio pretendido',
    'sell.builtArea': 'Superficie cubierta (m²)',
    'sell.landArea': 'Superficie del terreno (m²)',
    'sell.bedrooms': 'Dormitorios',
    'sell.bathrooms': 'Baños',
    'sell.description': 'Contanos más (máx. 4000 caracteres)',
    'sell.valuation': '¿Querés una tasación?',
    'sell.listed': '¿Está publicada hoy?',
    'sell.attachments': 'Adjuntos (opcional)',
    'sell.photo': 'Una foto (JPG, PNG, GIF o WebP · máx. 2 MB)',
    'sell.pdf': 'Documentación (PDF · máx. 2 MB)',
    'sell.submit': 'Enviar',
    'sell.sending': 'Enviando…',
    'sell.sent': '¡Gracias! Recibimos los datos de tu propiedad y te vamos a contactar.',
    'sell.fileTooBig': '"{name}" pesa más de 2 MB. Subí un archivo más chico.',
    'sell.fileUnreadable': 'No pudimos leer "{name}".',
    'sell.errNoWebsite': 'Este formulario todavía no está disponible. (Para el administrador del sitio: el envío de propietarios necesita un sitio web atado al Token de API, en Configuración > Token de API, tarjeta "Función Sitio Web".)',
    'sell.errRateLimit': 'Recibimos muchos envíos seguidos. Probá de nuevo en un rato.',
    'sell.errInvalidFile': 'Alguno de los archivos no es válido. Se aceptan JPG, PNG, GIF, WebP y PDF.',
    'sell.errFilesTooBigTogether': 'Los dos archivos juntos pesan demasiado. Probá con uno solo, o con versiones más livianas.',
    'sell.errGeneric': 'No pudimos enviar el formulario: {message}',
    'sell.errUnknown': 'error desconocido',

    'brand.fallbackName': 'Tu Inmobiliaria',
    'brand.fallbackTagline': 'Propiedades en venta y alquiler',
  },

  en: {
    'nav.home': 'Home',
    'nav.sales': 'For sale',
    'nav.rentals': 'For rent',
    'nav.temporary': 'Short stay',
    'nav.developments': 'Developments',
    'nav.sell': 'Sell',
    'nav.contact': 'Contact',
    'nav.toggle': 'Open menu',
    'nav.language': 'Language',

    'footer.properties': 'Properties',
    'footer.forSale': 'For sale',
    'footer.forRent': 'For rent',
    'footer.developments': 'Developments',
    'footer.contact': 'Contact',
    'footer.writeUs': 'Write to us',
    'footer.sellOrRent': 'I want to sell or rent',
    'footer.followUs': 'Follow us',
    'footer.whatsapp': 'Message us on WhatsApp',

    'card.noPhotos': 'No photos',
    'card.noTitle': 'Untitled',
    'card.property': 'Property',
    'card.development': 'Development',
    'card.askPrice': 'Price on request',

    'status.sold': 'Sold',
    'status.rented': 'Rented',
    'status.reserved': 'Reserved',
    'status.suspended': 'Suspended',

    'specs.ambiences_one': '{n} room',
    'specs.ambiences_other': '{n} rooms',
    'specs.bedrooms_one': '{n} bedroom',
    'specs.bedrooms_other': '{n} bedrooms',
    'specs.bathrooms_one': '{n} bathroom',
    'specs.bathrooms_other': '{n} bathrooms',
    'specs.garages_one': '{n} parking space',
    'specs.garages_other': '{n} parking spaces',
    'specs.builtArea': '{n} m² built',
    'specs.landArea': '{n} m² of land',

    'pager.total_one': '{n} property',
    'pager.total_other': '{n} properties',

    'home.docTitle': 'Home',
    'home.docDescription': 'Properties for sale and rent. Portfolio updated daily.',
    'home.heroTitle': 'Find your next property',
    'home.heroSubtitle': 'Our whole portfolio, updated daily.',
    'home.developments': 'Developments',
    'home.seeAllDevelopments': 'See all →',
    'home.featured': 'Featured properties',
    'home.seeAllProperties': 'See the whole portfolio →',
    'home.byZone': 'Search by area',
    'home.branches': 'Our offices',
    'home.empty': 'This account has no published properties yet.',

    'search.operation': 'Operation',
    'search.type': 'Type',
    'search.zone': 'Area',
    'search.term': 'Search',
    'search.termPlaceholder': 'Code, address, area…',
    'search.submit': 'Search',
    'search.allFeminine': 'All',
    'search.allMasculine': 'All',
    'search.none': '—',

    'listing.docTitle': 'Properties',
    'listing.docDescription': 'Search across all our properties for sale and rent.',
    'listing.title': 'Properties',
    'listing.filters': 'Filters',
    'listing.bedrooms': 'Bedrooms',
    'listing.bathrooms': 'Bathrooms',
    'listing.priceFrom': 'Price from',
    'listing.priceTo': 'Price up to',
    'listing.noCap': 'No limit',
    'listing.apply': 'Apply',
    'listing.clear': 'Clear',
    'listing.emptyFiltered': 'No properties match those filters. Try removing one.',
    'listing.emptyPage': 'This page came back empty. Go back to the first one.',
    'listing.loadError': 'We could not load the properties: {message}',

    'nav.blog': 'Blog',
    'blog.docTitle': 'Blog',
    'blog.docDescription': 'News and notes from the agency.',
    'blog.title': 'Blog',
    'blog.empty': 'No posts published yet.',
    'blog.back': '← Back to the blog',
    'blog.notFound': 'We could not find that post.',
    'developments.docTitle': 'Developments',
    'developments.docDescription': 'Our developments and off-plan projects.',
    'developments.title': 'Developments',
    'developments.count_one': '1 development',
    'developments.count_other': '{n} developments',
    'developments.empty': 'No developments published yet.',
    'developments.loadError': 'We could not load the developments: {message}',
    'developments.units_one': '{n} unit',
    'developments.units_other': '{n} units',
    'developments.available': '{n} available',
    'developments.priceFrom': 'from {price}',
    'developments.manyCurrencies': 'prices in several currencies',
    'developments.declared': 'Project of {n} units',

    'detail.docTitle': 'Property',
    'detail.back': '← Back to the properties',
    'detail.description': 'Description',
    'detail.conditions': 'Conditions',
    'detail.amenities': 'Features',
    'detail.videos': 'Videos and tours',
    'detail.videoTitle': 'Property video',
    'detail.location': 'Location',
    'detail.mapTitle': 'Property map',
    'detail.units': 'Units in this development',
    'detail.unitsEmpty': 'No units published yet.',
    'detail.unitsError': 'We could not load the units: {message}',
    'detail.photoAlt': 'Photo {n}',
    'detail.blueprints_one': 'Includes {n} floor plan.',
    'detail.blueprints_other': 'Includes {n} floor plans.',
    'detail.expenses': 'Maintenance fee: {amount}',
    'detail.taxes': 'Taxes: {amount}',
    'detail.noHash': 'You did not say which property you want to see.',
    'detail.notFound': 'We could not find this property. It may no longer be published.',
    'detail.loadError': 'We could not load the property: {message}',

    'facts.type': 'Type',
    'facts.operation': 'Operation',
    'facts.ambiences': 'Rooms',
    'facts.bedrooms': 'Bedrooms',
    'facts.bathrooms': 'Bathrooms',
    'facts.toilettes': 'Powder rooms',
    'facts.garages': 'Parking spaces',
    'facts.builtArea': 'Built area',
    'facts.landArea': 'Land area',
    'facts.age': 'Age',
    'facts.ageValue': '{n} years',
    'facts.totalFloors': 'Floors in the building',
    'facts.apartmentsPerFloor': 'Units per floor',
    'facts.ubication': 'Orientation',
    'facts.heating': 'Heating',
    'facts.airConditioning': 'Air conditioning',
    'facts.code': 'Code',

    'enquiry.title': 'Ask about this property',
    'enquiry.name': 'Name',
    'enquiry.phone': 'Phone',
    'enquiry.email': 'Email',
    'enquiry.message': 'Message',
    'enquiry.draft': 'Hi, I would like more information about {subject}.',
    'enquiry.thisProperty': 'this property',
    'enquiry.hint': 'Leave at least a phone or an email so we can get back to you.',
    'enquiry.submit': 'Send enquiry',
    'enquiry.sending': 'Sending…',
    'enquiry.needContact': 'Leave us an email or a phone so we can reply.',
    'enquiry.sent': 'Done! We got your enquiry and will reply shortly.',
    'enquiry.failed': 'We could not send the enquiry ({code}).',
    'enquiry.error': 'We could not send the enquiry: {message}',

    'contact.docTitle': 'Contact',
    'contact.docDescription': 'Our phones, addresses and offices.',
    'contact.title': 'Contact',
    'contact.branches': 'Our offices',
    'contact.lookingForTitle': 'Looking for a particular property?',
    'contact.lookingForText': 'If you already saw a property on the site, ask from its page: your enquiry reaches us together with that property’s details and we reply faster.',
    'contact.seeProperties': 'See the properties',
    'contact.formTitle': 'Write to us',
    'contact.name': 'Name',
    'contact.email': 'Email',
    'contact.phone': 'Phone',
    'contact.branch': 'Office',
    'contact.message': 'Message',
    'contact.submit': 'Send',
    'contact.branchesError': 'We could not load the offices right now.',
    'contact.branchFallback': 'Office',
    'contact.mainBranch': ' · Main',
    'contact.zip': 'ZIP {zip}',
    'contact.whatsapp': 'WhatsApp',
    'contact.hintMailto': 'Sending opens your mail app with the message ready.',
    'contact.hintNoEmail': 'This account has no office email on file. Use the phone numbers on the left.',
    'contact.noBranchEmail': 'There is no email on file for this office. Try the phone or WhatsApp.',
    'contact.mailSubject': 'Enquiry from {name}',
    'contact.mailName': 'Name: {name}',
    'contact.mailEmail': 'Email: {email}',
    'contact.mailPhone': 'Phone: {phone}',

    'sell.docTitle': 'I want to sell or rent',
    'sell.docDescription': 'Tell us about your property and we will help you sell or rent it.',
    'sell.intro': 'Tell us the main details and we will get in touch. If you want, you can attach a photo and the paperwork.',
    'sell.yes': 'Yes',
    'sell.no': 'No',
    'sell.title': 'I want to sell or rent my property',
    'sell.yourData': 'Your details',
    'sell.name': 'Full name *',
    'sell.phone': 'Phone *',
    'sell.email': 'Email *',
    'sell.hours': 'Best time to call',
    'sell.hoursPlaceholder': 'Monday to Friday, 9 to 18',
    'sell.theProperty': 'The property',
    'sell.type': 'Type *',
    'sell.operation': 'Operation *',
    'sell.address': 'Address *',
    'sell.zone': 'Area or neighbourhood',
    'sell.zip': 'Postcode',
    'sell.currency': 'Currency',
    'sell.price': 'Asking price',
    'sell.builtArea': 'Built area (m²)',
    'sell.landArea': 'Land area (m²)',
    'sell.bedrooms': 'Bedrooms',
    'sell.bathrooms': 'Bathrooms',
    'sell.description': 'Tell us more (max. 4000 characters)',
    'sell.valuation': 'Would you like a valuation?',
    'sell.listed': 'Is it listed today?',
    'sell.attachments': 'Attachments (optional)',
    'sell.photo': 'One photo (JPG, PNG, GIF or WebP · max. 2 MB)',
    'sell.pdf': 'Documents (PDF · max. 2 MB)',
    'sell.submit': 'Send',
    'sell.sending': 'Sending…',
    'sell.sent': 'Thank you! We got your property details and will contact you.',
    'sell.fileTooBig': '"{name}" is over 2 MB. Please upload a smaller file.',
    'sell.fileUnreadable': 'We could not read "{name}".',
    'sell.errNoWebsite': 'This form is not available yet. (For the site administrator: seller submissions need a website tied to the API token, under Configuración > Token de API, card "Función Sitio Web".)',
    'sell.errRateLimit': 'We got a lot of submissions in a row. Please try again later.',
    'sell.errInvalidFile': 'One of the files is not valid. JPG, PNG, GIF, WebP and PDF are accepted.',
    'sell.errFilesTooBigTogether': 'The two files together are too large. Try sending just one, or lighter versions.',
    'sell.errGeneric': 'We could not send the form: {message}',
    'sell.errUnknown': 'unknown error',

    'brand.fallbackName': 'Your Agency',
    'brand.fallbackTagline': 'Properties for sale and rent',
  },

  pt: {
    'nav.home': 'Início',
    'nav.sales': 'Vendas',
    'nav.rentals': 'Aluguéis',
    'nav.temporary': 'Temporada',
    'nav.developments': 'Empreendimentos',
    'nav.sell': 'Vender',
    'nav.contact': 'Contato',
    'nav.toggle': 'Abrir menu',
    'nav.language': 'Idioma',

    'footer.properties': 'Imóveis',
    'footer.forSale': 'À venda',
    'footer.forRent': 'Para alugar',
    'footer.developments': 'Empreendimentos',
    'footer.contact': 'Contato',
    'footer.writeUs': 'Fale com a gente',
    'footer.sellOrRent': 'Quero vender ou alugar',
    'footer.followUs': 'Siga a gente',
    'footer.whatsapp': 'Fale com a gente pelo WhatsApp',

    'card.noPhotos': 'Sem fotos',
    'card.noTitle': 'Sem título',
    'card.property': 'Imóvel',
    'card.development': 'Empreendimento',
    'card.askPrice': 'Consultar preço',

    'status.sold': 'Vendido',
    'status.rented': 'Alugado',
    'status.reserved': 'Reservado',
    'status.suspended': 'Suspenso',

    'specs.ambiences_one': '{n} ambiente',
    'specs.ambiences_other': '{n} ambientes',
    'specs.bedrooms_one': '{n} dormitório',
    'specs.bedrooms_other': '{n} dormitórios',
    'specs.bathrooms_one': '{n} banheiro',
    'specs.bathrooms_other': '{n} banheiros',
    'specs.garages_one': '{n} vaga',
    'specs.garages_other': '{n} vagas',
    'specs.builtArea': '{n} m² construídos',
    'specs.landArea': '{n} m² de terreno',

    'pager.total_one': '{n} imóvel',
    'pager.total_other': '{n} imóveis',

    'home.docTitle': 'Início',
    'home.docDescription': 'Imóveis à venda e para alugar. Carteira atualizada todos os dias.',
    'home.heroTitle': 'Encontre seu próximo imóvel',
    'home.heroSubtitle': 'Toda a nossa carteira, atualizada todos os dias.',
    'home.developments': 'Empreendimentos',
    'home.seeAllDevelopments': 'Ver todos →',
    'home.featured': 'Imóveis destacados',
    'home.seeAllProperties': 'Ver toda a carteira →',
    'home.byZone': 'Busque por região',
    'home.branches': 'Nossas lojas',
    'home.empty': 'Esta conta ainda não tem imóveis publicados.',

    'search.operation': 'Operação',
    'search.type': 'Tipo',
    'search.zone': 'Região',
    'search.term': 'Buscar',
    'search.termPlaceholder': 'Código, endereço, região…',
    'search.submit': 'Buscar',
    'search.allFeminine': 'Todas',
    'search.allMasculine': 'Todos',
    'search.none': '—',

    'listing.docTitle': 'Imóveis',
    'listing.docDescription': 'Busque entre todos os nossos imóveis à venda e para alugar.',
    'listing.title': 'Imóveis',
    'listing.filters': 'Filtros',
    'listing.bedrooms': 'Dormitórios',
    'listing.bathrooms': 'Banheiros',
    'listing.priceFrom': 'Preço a partir de',
    'listing.priceTo': 'Preço até',
    'listing.noCap': 'Sem limite',
    'listing.apply': 'Aplicar',
    'listing.clear': 'Limpar',
    'listing.emptyFiltered': 'Não encontramos imóveis com esses filtros. Tente remover algum.',
    'listing.emptyPage': 'Esta página ficou vazia. Volte para a primeira.',
    'listing.loadError': 'Não conseguimos carregar os imóveis: {message}',

    'nav.blog': 'Blog',
    'blog.docTitle': 'Blog',
    'blog.docDescription': 'Notícias e novidades da imobiliária.',
    'blog.title': 'Blog',
    'blog.empty': 'Ainda não há publicações.',
    'blog.back': '← Voltar ao blog',
    'blog.notFound': 'Não encontramos essa publicação.',
    'developments.docTitle': 'Empreendimentos',
    'developments.docDescription': 'Nossos empreendimentos e projetos na planta.',
    'developments.title': 'Empreendimentos',
    'developments.count_one': '1 empreendimento',
    'developments.count_other': '{n} empreendimentos',
    'developments.empty': 'Ainda não há empreendimentos publicados.',
    'developments.loadError': 'Não conseguimos carregar os empreendimentos: {message}',
    'developments.units_one': '{n} unidade',
    'developments.units_other': '{n} unidades',
    'developments.available': '{n} disponíveis',
    'developments.priceFrom': 'a partir de {price}',
    'developments.manyCurrencies': 'preços em várias moedas',
    'developments.declared': 'Projeto de {n} unidades',

    'detail.docTitle': 'Imóvel',
    'detail.back': '← Voltar para os imóveis',
    'detail.description': 'Descrição',
    'detail.conditions': 'Condições',
    'detail.amenities': 'Características',
    'detail.videos': 'Vídeos e tours',
    'detail.videoTitle': 'Vídeo do imóvel',
    'detail.location': 'Localização',
    'detail.mapTitle': 'Mapa do imóvel',
    'detail.units': 'Unidades do empreendimento',
    'detail.unitsEmpty': 'Ainda não há unidades publicadas.',
    'detail.unitsError': 'Não conseguimos carregar as unidades: {message}',
    'detail.photoAlt': 'Foto {n}',
    'detail.blueprints_one': 'Inclui {n} planta.',
    'detail.blueprints_other': 'Inclui {n} plantas.',
    'detail.expenses': 'Condomínio: {amount}',
    'detail.taxes': 'Impostos: {amount}',
    'detail.noHash': 'Você não indicou qual imóvel quer ver.',
    'detail.notFound': 'Não encontramos este imóvel. Talvez já não esteja publicado.',
    'detail.loadError': 'Não conseguimos carregar o imóvel: {message}',

    'facts.type': 'Tipo',
    'facts.operation': 'Operação',
    'facts.ambiences': 'Ambientes',
    'facts.bedrooms': 'Dormitórios',
    'facts.bathrooms': 'Banheiros',
    'facts.toilettes': 'Lavabos',
    'facts.garages': 'Vagas',
    'facts.builtArea': 'Área construída',
    'facts.landArea': 'Área do terreno',
    'facts.age': 'Idade',
    'facts.ageValue': '{n} anos',
    'facts.totalFloors': 'Andares do edifício',
    'facts.apartmentsPerFloor': 'Unidades por andar',
    'facts.ubication': 'Orientação',
    'facts.heating': 'Aquecimento',
    'facts.airConditioning': 'Ar condicionado',
    'facts.code': 'Código',

    'enquiry.title': 'Consultar sobre este imóvel',
    'enquiry.name': 'Nome',
    'enquiry.phone': 'Telefone',
    'enquiry.email': 'E-mail',
    'enquiry.message': 'Mensagem',
    'enquiry.draft': 'Olá, quero mais informações sobre {subject}.',
    'enquiry.thisProperty': 'este imóvel',
    'enquiry.hint': 'Deixe pelo menos um telefone ou um e-mail para podermos responder.',
    'enquiry.submit': 'Enviar consulta',
    'enquiry.sending': 'Enviando…',
    'enquiry.needContact': 'Deixe um e-mail ou um telefone para podermos responder.',
    'enquiry.sent': 'Pronto! Recebemos sua consulta e vamos responder em breve.',
    'enquiry.failed': 'Não conseguimos enviar a consulta ({code}).',
    'enquiry.error': 'Não conseguimos enviar a consulta: {message}',

    'contact.docTitle': 'Contato',
    'contact.docDescription': 'Nossos telefones, endereços e lojas.',
    'contact.title': 'Contato',
    'contact.branches': 'Nossas lojas',
    'contact.lookingForTitle': 'Procura um imóvel específico?',
    'contact.lookingForText': 'Se você já viu um imóvel no site, consulte pela página dele: assim sua consulta chega junto com os dados desse imóvel e respondemos mais rápido.',
    'contact.seeProperties': 'Ver os imóveis',
    'contact.formTitle': 'Fale com a gente',
    'contact.name': 'Nome',
    'contact.email': 'E-mail',
    'contact.phone': 'Telefone',
    'contact.branch': 'Loja',
    'contact.message': 'Mensagem',
    'contact.submit': 'Enviar',
    'contact.branchesError': 'Não conseguimos carregar as lojas neste momento.',
    'contact.branchFallback': 'Loja',
    'contact.mainBranch': ' · Principal',
    'contact.zip': 'CEP {zip}',
    'contact.whatsapp': 'WhatsApp',
    'contact.hintMailto': 'Ao enviar, abre seu programa de e-mail com a mensagem pronta.',
    'contact.hintNoEmail': 'Esta conta não tem um e-mail de loja cadastrado. Use os telefones à esquerda.',
    'contact.noBranchEmail': 'Não há e-mail cadastrado para esta loja. Tente pelo telefone ou WhatsApp.',
    'contact.mailSubject': 'Consulta de {name}',
    'contact.mailName': 'Nome: {name}',
    'contact.mailEmail': 'E-mail: {email}',
    'contact.mailPhone': 'Telefone: {phone}',

    'sell.docTitle': 'Quero vender ou alugar',
    'sell.docDescription': 'Conte sobre o seu imóvel e ajudamos você a vendê-lo ou alugá-lo.',
    'sell.intro': 'Conte os dados principais e entramos em contato. Se quiser, pode anexar uma foto e a documentação.',
    'sell.yes': 'Sim',
    'sell.no': 'Não',
    'sell.title': 'Quero vender ou alugar meu imóvel',
    'sell.yourData': 'Seus dados',
    'sell.name': 'Nome completo *',
    'sell.phone': 'Telefone *',
    'sell.email': 'E-mail *',
    'sell.hours': 'Horário de contato',
    'sell.hoursPlaceholder': 'De segunda a sexta, das 9 às 18',
    'sell.theProperty': 'O imóvel',
    'sell.type': 'Tipo *',
    'sell.operation': 'Operação *',
    'sell.address': 'Endereço *',
    'sell.zone': 'Região ou bairro',
    'sell.zip': 'CEP',
    'sell.currency': 'Moeda',
    'sell.price': 'Preço pretendido',
    'sell.builtArea': 'Área construída (m²)',
    'sell.landArea': 'Área do terreno (m²)',
    'sell.bedrooms': 'Dormitórios',
    'sell.bathrooms': 'Banheiros',
    'sell.description': 'Conte mais (máx. 4000 caracteres)',
    'sell.valuation': 'Quer uma avaliação?',
    'sell.listed': 'Está publicado hoje?',
    'sell.attachments': 'Anexos (opcional)',
    'sell.photo': 'Uma foto (JPG, PNG, GIF ou WebP · máx. 2 MB)',
    'sell.pdf': 'Documentos (PDF · máx. 2 MB)',
    'sell.submit': 'Enviar',
    'sell.sending': 'Enviando…',
    'sell.sent': 'Obrigado! Recebemos os dados do seu imóvel e vamos entrar em contato.',
    'sell.fileTooBig': '"{name}" tem mais de 2 MB. Envie um arquivo menor.',
    'sell.fileUnreadable': 'Não conseguimos ler "{name}".',
    'sell.errNoWebsite': 'Este formulário ainda não está disponível. (Para o administrador do site: o envio de proprietários precisa de um site vinculado ao Token de API, em Configuración > Token de API, cartão "Función Sitio Web".)',
    'sell.errRateLimit': 'Recebemos muitos envios seguidos. Tente de novo mais tarde.',
    'sell.errInvalidFile': 'Algum dos arquivos não é válido. Aceitamos JPG, PNG, GIF, WebP e PDF.',
    'sell.errFilesTooBigTogether': 'Os dois arquivos juntos são muito grandes. Tente enviar só um, ou versões mais leves.',
    'sell.errGeneric': 'Não conseguimos enviar o formulário: {message}',
    'sell.errUnknown': 'erro desconhecido',

    'brand.fallbackName': 'Sua Imobiliária',
    'brand.fallbackTagline': 'Imóveis à venda e para alugar',
  },
};

// The language comes from the CONTEXT, never from guessing: `SITE_CONFIG.lang` if the site owner set
// one, otherwise the `lang` of the <html> element. `es-AR` resolves to `es`. Anything unsupported
// falls back to Spanish -- a visible degradation, not a wrong answer.
// The name of a language is always written IN that language -- "English", never "Inglés". So these
// are not dictionary entries: there is one label per language, not one per language per language.
export const LANG_LABEL = { es: 'Español', en: 'English', pt: 'Português' };
export const LANG_SHORT = { es: 'ES', en: 'EN', pt: 'PT' };

const STORAGE_KEY = 'mp-lang';

function normalise(value) {
  const code = String(value || '').toLowerCase().split('-')[0];
  return STRINGS[code] ? code : '';
}

// The languages the site OFFERS, from config.js. Fewer than two means there is no switcher, and
// then a value left in localStorage by an earlier deploy must not win over the configured language.
export const languages = (() => {
  const list = (globalThis.SITE_CONFIG || {}).languages;
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map(normalise).filter(Boolean))];
})();

// The visitor's choice lives in localStorage: it is a per-viewer convenience, it never leaves the
// browser, and the page has to render correctly when reading it throws (private window, blocked
// site data) -- hence the try/catch and the empty-string fallback.
function storedLang() {
  if (languages.length < 2) return '';
  try {
    const stored = normalise(globalThis.localStorage?.getItem(STORAGE_KEY));
    return languages.includes(stored) ? stored : '';
  } catch {
    return '';
  }
}

// `?lang=xx` is what makes a page shareable in a given language, and it is also the fallback when
// localStorage is unavailable. Same gate as storage: a code the site does not offer is ignored, so
// a stray link cannot flip a single-language site into a language its catalog is not written in.
function queryLang() {
  if (languages.length < 2) return '';
  try {
    const code = normalise(new URLSearchParams(globalThis.location?.search || '').get('lang'));
    return languages.includes(code) ? code : '';
  } catch {
    return '';
  }
}

function resolveLang() {
  const chosen = queryLang() || storedLang();
  if (chosen) return chosen;
  const configured = (globalThis.SITE_CONFIG || {}).lang;
  const declared = globalThis.document?.documentElement?.lang;
  return normalise(configured) || normalise(declared) || DEFAULT_LANG;
}

export const lang = resolveLang();

// Remember a language that arrived by link, so the rest of the navigation keeps it without having
// to carry the parameter on every href.
if (queryLang() === lang && lang) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, lang);
  } catch {
    // Nothing to do: without storage the language lives only in the URL, which still works.
  }
}

// Keep the document in sync with the language the kit is actually writing in. The HTML ships with
// `lang="es"` so it reads before any module runs; once another language wins, leaving the attribute
// on `es` would lie to screen readers, to the browser's translation offer and to a crawler.
if (globalThis.document?.documentElement) globalThis.document.documentElement.lang = lang;

// Switching reloads instead of re-rendering: every module reads `lang` once, at import time, and a
// full reload is both simpler and more honest than repainting half the page. The reload is also
// what re-asks the API, which matters for the pages whose data is already in flight.
export function setLang(next) {
  const code = normalise(next);
  if (!code || !languages.includes(code) || code === lang) return;
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code);
  } catch {
    // No storage, no persistence: the switch still works for this page load via the query string.
  }
  const url = new URL(globalThis.location.href);
  url.searchParams.set('lang', code);
  globalThis.location.assign(url.toString());
}

const missing = new Set();

function lookup(key) {
  const own = STRINGS[lang][key];
  if (own !== undefined) return own;
  const fallback = STRINGS[DEFAULT_LANG][key];
  if (fallback !== undefined) return fallback;
  if (!missing.has(key)) {
    missing.add(key);
    console.warn(`[i18n] falta la clave "${key}"`);
  }
  return key;
}

// `{n}` picks the plural form. Only two forms are handled (`_one` / `_other`), which covers es, en
// and pt; a language with more forms would need its own rule here.
export function t(key, vars = {}) {
  const plural = vars.n !== undefined && vars.n !== null;
  const resolved = plural && STRINGS[DEFAULT_LANG][`${key}_other`] !== undefined
    ? lookup(`${key}_${Number(vars.n) === 1 ? 'one' : 'other'}`)
    : lookup(key);

  return String(resolved).replace(/\{(\w+)\}/g, (match, name) =>
    (vars[name] !== undefined ? String(vars[name]) : match));
}

// Number GROUPING follows the language; the CURRENCY never does -- it comes from the property. The
// site owner can override the grouping in config.js when the language is not enough (a Spanish site
// in Spain groups differently than one in Argentina).
export function formatNumber(value) {
  const locale = (globalThis.SITE_CONFIG || {}).numberLocale || NUMBER_LOCALE[lang] || 'es-AR';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString(locale) : String(value ?? '');
}

// Fills the static markup. The HTML ships with the Spanish text inline so the page is readable
// before the module runs and with JavaScript disabled; this replaces it when another language is
// active. A test checks that every key here matches the Spanish text in the HTML, so the two copies
// cannot drift.
const ATTRIBUTES = [
  ['data-i18n-placeholder', 'placeholder'],
  ['data-i18n-title', 'title'],
  ['data-i18n-aria-label', 'aria-label'],
  ['data-i18n-content', 'content'],
];

export function applyI18n(root = globalThis.document) {
  if (!root) return;
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  ATTRIBUTES.forEach(([dataAttribute, target]) => {
    root.querySelectorAll(`[${dataAttribute}]`).forEach((el) => {
      el.setAttribute(target, t(el.getAttribute(dataAttribute)));
    });
  });
}
