// Fallback branding, used when the account has no active Mapaprop website.
//
// `design` and `settings-v2` are two of the ten Express actions that resolve a websiteId. An
// account without an active site gets 400 CUSTOMER_WITHOUT_WEBSITE from both -- which is the normal
// case for someone building their own site here. Inventory, catalogs, branches and the contact form
// do NOT depend on a site and always work. So: everything functional comes from the API, and only
// the look falls back to this file.
window.SITE_CONFIG = {
  // Language of the texts the kit itself writes. Leave it empty to follow the `lang` of the <html>
  // element of each page. Supported: es, en, pt -- anything else falls back to es.
  // What the API sends (type, operation, amenity labels, zone names) always comes in the account's
  // own language and is never translated by the kit.
  lang: '',
  // Number grouping. Empty follows the language (es -> es-AR, en -> en-US, pt -> pt-BR). Set it
  // when the language is not enough: a Spanish site in Spain groups differently than one in
  // Argentina. The CURRENCY never comes from here -- it comes from each property.
  numberLocale: '',
  // Languages OFFERED to the visitor, as a switcher in the header. Leave one (or none) and the
  // switcher disappears: the site stays in the language above and nothing changes.
  //
  // ⚠️ Decide this with the catalog in mind. The switcher translates what the KIT writes -- menu,
  // buttons, labels, filters. What the API sends -- the type, the operation, the amenities, the
  // zone names and the description -- comes in the language the account loaded it in and is never
  // translated. A page in English over a catalog loaded in Spanish reads "VENTA · DEPARTAMENTO",
  // which is correct and looks mixed. It is worth it for an agency that sells to foreigners; for
  // one that does not, leave a single language.
  languages: ['es', 'en', 'pt'],

  // Leave these empty to use the translated defaults.
  name: '',
  tagline: '',
  // Shown in the footer. Many jurisdictions require the licence number.
  responsible: '',
  whatsapp: '', // international format, digits only: 5491122223333
  colors: {
    primary: '#195fa9',
    primaryText: '#ffffff',
    secondary: '#4a7fe8',
    secondaryText: '#ffffff',
  },
  fontFamily: 'Inter',
  logo: '', // leave empty to show the name as text
  social: {}, // instagram, facebook, twitter, linkedin, tiktok, youtube
  // Home hero. Leave empty to use the translated default; whatever you write here wins, and the
  // slides configured in Mapaprop win over both.
  hero: {
    title: '',
    subtitle: '',
  },
};
