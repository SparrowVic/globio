/** URL-safe id from a heading title: "flyTo and focusOnCountry" → "flyto-and-focusoncountry". */
export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
