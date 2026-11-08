export const POLLUTANTS = [
  {
    key: 'pm2_5',
    label: 'PM2.5',
    name: 'Fine particulate matter',
    unit: 'µg/m³',
    precision: 1,
    blurb:
      'Inhalable particles under 2.5 micrometres. They can travel deep into the lungs and are the pollutant most consistently linked with health effects.',
  },
  {
    key: 'pm10',
    label: 'PM10',
    name: 'Particulate matter',
    unit: 'µg/m³',
    precision: 1,
    blurb:
      'Particles under 10 micrometres, including dust and smoke. Larger than PM2.5 but still small enough to reach the airways.',
  },
  {
    key: 'nitrogen_dioxide',
    label: 'NO₂',
    name: 'Nitrogen dioxide',
    unit: 'µg/m³',
    precision: 1,
    blurb:
      'Mainly from vehicle engines and fuel burning. Often higher near busy roads and during morning and evening traffic.',
  },
  {
    key: 'sulphur_dioxide',
    label: 'SO₂',
    name: 'Sulphur dioxide',
    unit: 'µg/m³',
    precision: 1,
    blurb:
      'Released when sulphur-containing fuels are burned, including coal and oil. It can irritate the airways at elevated levels.',
  },
  {
    key: 'ozone',
    label: 'O₃',
    name: 'Ozone',
    unit: 'µg/m³',
    precision: 1,
    blurb:
      'A secondary pollutant formed in sunlight from other emissions. Ground-level ozone tends to peak on sunny afternoons.',
  },
  {
    key: 'carbon_monoxide',
    label: 'CO',
    name: 'Carbon monoxide',
    unit: 'µg/m³',
    precision: 0,
    blurb:
      'An odourless gas from incomplete combustion. It is usually measured in milligrams per cubic metre for AQI purposes.',
  },
];

export const POLLUTANT_KEYS = POLLUTANTS.map((p) => p.key);

export const POLLUTANT_BY_KEY = Object.fromEntries(POLLUTANTS.map((p) => [p.key, p]));

/** US AQI sub-index variables exposed by Open-Meteo, mapped back to the pollutant they describe. */
export const US_SUBINDEX_VARS = {
  us_aqi_pm2_5: 'pm2_5',
  us_aqi_pm10: 'pm10',
  us_aqi_nitrogen_dioxide: 'nitrogen_dioxide',
  us_aqi_sulphur_dioxide: 'sulphur_dioxide',
  us_aqi_ozone: 'ozone',
  us_aqi_carbon_monoxide: 'carbon_monoxide',
};
