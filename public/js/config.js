// Fallback branding, used when the account has no active Mapaprop website.
//
// `design` and `settings-v2` are two of the ten Express actions that resolve a websiteId. An
// account without an active site gets 400 CUSTOMER_WITHOUT_WEBSITE from both -- which is the normal
// case for someone building their own site here. Inventory, catalogs, branches and the contact form
// do NOT depend on a site and always work. So: everything functional comes from the API, and only
// the look falls back to this file.
window.SITE_CONFIG = {
  name: 'Tu Inmobiliaria',
  tagline: 'Propiedades en venta y alquiler',
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
  // Home hero, used when the account has no slides configured in Mapaprop.
  hero: {
    title: 'Encontrá tu próxima propiedad',
    subtitle: 'Toda nuestra cartera, actualizada al día.',
  },
};
