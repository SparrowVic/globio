/**
 * Pre-built region groupings as readonly arrays of country IDs.
 *
 * IDs are numeric ISO 3166-1 codes as zero-padded 3-character strings
 * ('032' Argentina, '840' United States) — exactly the ids world-atlas
 * gives country features, so they compare equal to `country.id` in events
 * and to `setCountryData` keys. Pass any of these straight into
 * `setCountryData` (categorical scale or a single color) to highlight
 * membership without copy-pasting ISO arrays around.
 *
 * Source notes (current as of 2024–2026):
 * - NATO and EU memberships reflect Finland/Sweden NATO accession, no UK in EU.
 * - G7 is the seven; G20 is the twenty member countries (EU as a bloc is excluded
 *   here because its members are already listed; add `'EU'` from this module
 *   if you want to render it as a 28th entity, but world-atlas has no EU id).
 * - BRICS includes the 2024 expansion (Iran, UAE, Egypt, Ethiopia) — but NOT
 *   Saudi Arabia, which has not formally accepted as of this snapshot.
 * - OECD is the 38 member states.
 * - ASEAN, EFTA, MERCOSUR, AU as documented.
 *
 * If a grouping shifts after this lib is published (countries get added or
 * leave), users can always pass their own arrays — these are just defaults.
 */

export const G7: ReadonlyArray<string> = [
  '124', // Canada
  '250', // France
  '276', // Germany
  '380', // Italy
  '392', // Japan
  '826', // United Kingdom
  '840', // United States
];

export const G20: ReadonlyArray<string> = [
  '032', // Argentina
  '036', // Australia
  '076', // Brazil
  '124', // Canada
  '156', // China
  '250', // France
  '276', // Germany
  '356', // India
  '360', // Indonesia
  '380', // Italy
  '392', // Japan
  '484', // Mexico
  '410', // South Korea
  '643', // Russia
  '682', // Saudi Arabia
  '710', // South Africa
  '792', // Turkey
  '826', // United Kingdom
  '840', // United States
];

export const NATO: ReadonlyArray<string> = [
  '008', // Albania
  '056', // Belgium
  '100', // Bulgaria
  '124', // Canada
  '191', // Croatia
  '203', // Czechia
  '208', // Denmark
  '233', // Estonia
  '246', // Finland (acceded 2023)
  '250', // France
  '276', // Germany
  '300', // Greece
  '348', // Hungary
  '352', // Iceland
  '380', // Italy
  '428', // Latvia
  '440', // Lithuania
  '442', // Luxembourg
  '499', // Montenegro
  '528', // Netherlands
  '578', // Norway
  '616', // Poland
  '620', // Portugal
  '642', // Romania
  '703', // Slovakia
  '705', // Slovenia
  '724', // Spain
  '752', // Sweden (acceded 2024)
  '792', // Turkey
  '807', // North Macedonia
  '826', // United Kingdom
  '840', // United States
];

export const EU: ReadonlyArray<string> = [
  '040', // Austria
  '056', // Belgium
  '100', // Bulgaria
  '191', // Croatia
  '196', // Cyprus
  '203', // Czechia
  '208', // Denmark
  '233', // Estonia
  '246', // Finland
  '250', // France
  '276', // Germany
  '300', // Greece
  '348', // Hungary
  '372', // Ireland
  '380', // Italy
  '428', // Latvia
  '440', // Lithuania
  '442', // Luxembourg
  '470', // Malta
  '528', // Netherlands
  '616', // Poland
  '620', // Portugal
  '642', // Romania
  '703', // Slovakia
  '705', // Slovenia
  '724', // Spain
  '752', // Sweden
];

export const BRICS: ReadonlyArray<string> = [
  '076', // Brazil
  '643', // Russia
  '356', // India
  '156', // China
  '710', // South Africa
  // 2024 expansion
  '364', // Iran
  '784', // United Arab Emirates
  '818', // Egypt
  '231', // Ethiopia
];

export const ASEAN: ReadonlyArray<string> = [
  '096', // Brunei
  '116', // Cambodia
  '360', // Indonesia
  '418', // Laos
  '458', // Malaysia
  '104', // Myanmar
  '608', // Philippines
  '702', // Singapore
  '764', // Thailand
  '704', // Vietnam
];

export const OECD: ReadonlyArray<string> = [
  '036', // Australia
  '040', // Austria
  '056', // Belgium
  '124', // Canada
  '152', // Chile
  '170', // Colombia
  '188', // Costa Rica
  '203', // Czechia
  '208', // Denmark
  '233', // Estonia
  '246', // Finland
  '250', // France
  '276', // Germany
  '300', // Greece
  '348', // Hungary
  '352', // Iceland
  '372', // Ireland
  '376', // Israel
  '380', // Italy
  '392', // Japan
  '410', // South Korea
  '428', // Latvia
  '440', // Lithuania
  '442', // Luxembourg
  '484', // Mexico
  '528', // Netherlands
  '554', // New Zealand
  '578', // Norway
  '616', // Poland
  '620', // Portugal
  '703', // Slovakia
  '705', // Slovenia
  '724', // Spain
  '752', // Sweden
  '756', // Switzerland
  '792', // Turkey
  '826', // United Kingdom
  '840', // United States
];

export const EFTA: ReadonlyArray<string> = [
  '352', // Iceland
  '438', // Liechtenstein
  '578', // Norway
  '756', // Switzerland
];

export const MERCOSUR: ReadonlyArray<string> = [
  '032', // Argentina
  '076', // Brazil
  '600', // Paraguay
  '858', // Uruguay
  '068', // Bolivia (acceded 2024)
];

/** African Union — 55 member states. */
export const AU: ReadonlyArray<string> = [
  '012', // Algeria
  '024', // Angola
  '204', // Benin
  '072', // Botswana
  '854', // Burkina Faso
  '108', // Burundi
  '120', // Cameroon
  '132', // Cape Verde
  '140', // Central African Republic
  '148', // Chad
  '174', // Comoros
  '178', // Republic of the Congo
  '180', // Democratic Republic of the Congo
  '262', // Djibouti
  '818', // Egypt
  '226', // Equatorial Guinea
  '232', // Eritrea
  '748', // Eswatini
  '231', // Ethiopia
  '266', // Gabon
  '270', // Gambia
  '288', // Ghana
  '324', // Guinea
  '624', // Guinea-Bissau
  '384', // Côte d'Ivoire
  '404', // Kenya
  '426', // Lesotho
  '430', // Liberia
  '434', // Libya
  '450', // Madagascar
  '454', // Malawi
  '466', // Mali
  '478', // Mauritania
  '480', // Mauritius
  '504', // Morocco
  '508', // Mozambique
  '516', // Namibia
  '562', // Niger
  '566', // Nigeria
  '646', // Rwanda
  '678', // São Tomé and Príncipe
  '686', // Senegal
  '690', // Seychelles
  '694', // Sierra Leone
  '706', // Somalia
  '710', // South Africa
  '728', // South Sudan
  '729', // Sudan
  '834', // Tanzania
  '768', // Togo
  '788', // Tunisia
  '800', // Uganda
  '894', // Zambia
  '716', // Zimbabwe
];

/**
 * Loose continental buckets. Boundaries between continents are conventional
 * (Russia spans Europe and Asia, Turkey too — placed by majority population).
 * Use these as starting points and override per-project as needed.
 */

export const EUROPE: ReadonlyArray<string> = [
  '008', // Albania
  '020', // Andorra
  '040', // Austria
  '112', // Belarus
  '056', // Belgium
  '070', // Bosnia and Herzegovina
  '100', // Bulgaria
  '191', // Croatia
  '196', // Cyprus
  '203', // Czechia
  '208', // Denmark
  '233', // Estonia
  '246', // Finland
  '250', // France
  '276', // Germany
  '300', // Greece
  '348', // Hungary
  '352', // Iceland
  '372', // Ireland
  '380', // Italy
  '428', // Latvia
  '438', // Liechtenstein
  '440', // Lithuania
  '442', // Luxembourg
  '470', // Malta
  '498', // Moldova
  '492', // Monaco
  '499', // Montenegro
  '528', // Netherlands
  '807', // North Macedonia
  '578', // Norway
  '616', // Poland
  '620', // Portugal
  '642', // Romania
  '643', // Russia
  '674', // San Marino
  '688', // Serbia
  '703', // Slovakia
  '705', // Slovenia
  '724', // Spain
  '752', // Sweden
  '756', // Switzerland
  '804', // Ukraine
  '826', // United Kingdom
  '336', // Vatican
];

export const ASIA: ReadonlyArray<string> = [
  '004', // Afghanistan
  '051', // Armenia
  '031', // Azerbaijan
  '048', // Bahrain
  '050', // Bangladesh
  '064', // Bhutan
  '096', // Brunei
  '116', // Cambodia
  '156', // China
  '268', // Georgia
  '356', // India
  '360', // Indonesia
  '364', // Iran
  '368', // Iraq
  '376', // Israel
  '392', // Japan
  '400', // Jordan
  '398', // Kazakhstan
  '414', // Kuwait
  '417', // Kyrgyzstan
  '418', // Laos
  '422', // Lebanon
  '458', // Malaysia
  '462', // Maldives
  '496', // Mongolia
  '104', // Myanmar
  '524', // Nepal
  '408', // North Korea
  '512', // Oman
  '586', // Pakistan
  '275', // Palestine
  '608', // Philippines
  '634', // Qatar
  '682', // Saudi Arabia
  '702', // Singapore
  '410', // South Korea
  '144', // Sri Lanka
  '760', // Syria
  '158', // Taiwan
  '762', // Tajikistan
  '764', // Thailand
  '626', // Timor-Leste
  '792', // Turkey
  '795', // Turkmenistan
  '784', // United Arab Emirates
  '860', // Uzbekistan
  '704', // Vietnam
  '887', // Yemen
];

export const AFRICA: ReadonlyArray<string> = AU;

export const NORTH_AMERICA: ReadonlyArray<string> = [
  '124', // Canada
  '484', // Mexico
  '840', // United States
  // Central America + Caribbean
  '044', // Bahamas
  '052', // Barbados
  '084', // Belize
  '188', // Costa Rica
  '192', // Cuba
  '212', // Dominica
  '214', // Dominican Republic
  '222', // El Salvador
  '308', // Grenada
  '320', // Guatemala
  '332', // Haiti
  '340', // Honduras
  '388', // Jamaica
  '558', // Nicaragua
  '591', // Panama
  '659', // Saint Kitts and Nevis
  '662', // Saint Lucia
  '670', // Saint Vincent and the Grenadines
  '780', // Trinidad and Tobago
];

export const SOUTH_AMERICA: ReadonlyArray<string> = [
  '032', // Argentina
  '068', // Bolivia
  '076', // Brazil
  '152', // Chile
  '170', // Colombia
  '218', // Ecuador
  '328', // Guyana
  '600', // Paraguay
  '604', // Peru
  '740', // Suriname
  '858', // Uruguay
  '862', // Venezuela
];

export const OCEANIA: ReadonlyArray<string> = [
  '036', // Australia
  '242', // Fiji
  '296', // Kiribati
  '584', // Marshall Islands
  '583', // Micronesia
  '520', // Nauru
  '554', // New Zealand
  '585', // Palau
  '598', // Papua New Guinea
  '882', // Samoa
  '090', // Solomon Islands
  '776', // Tonga
  '798', // Tuvalu
  '548', // Vanuatu
];
