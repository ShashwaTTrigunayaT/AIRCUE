export const STANDARD_LABELS = {
  CPCB: { short: 'CPCB', long: 'CPCB AQI (India)', note: 'Computed by AIR CUE from modelled hourly concentrations using CPCB breakpoints and averaging requirements.' },
  US: { short: 'US AQI', long: 'US EPA AQI', note: 'Provider-computed US AQI from Open-Meteo. Uses a different scale from CPCB AQI.' },
  EU: { short: 'EU AQI', long: 'European AQI', note: 'Provider-computed European AQI from Open-Meteo. Uses a 0–100+ scale.' },
};

// Darker category colors keep text and gauge strokes readable on the white theme
// while remaining suitable as filled map-marker accents.
const COLORS = {
  cpcb: {
    good: '#15803d',
    satisfactory: '#4d7c0f',
    moderate: '#a16207',
    poor: '#c2410c',
    veryPoor: '#b91c1c',
    severe: '#7f1d1d',
  },
  us: {
    good: '#15803d',
    moderate: '#a16207',
    usg: '#c2410c',
    unhealthy: '#b91c1c',
    veryUnhealthy: '#7e22ce',
    hazardous: '#6b0f0f',
  },
  eu: {
    good: '#15803d',
    fair: '#4d7c0f',
    moderate: '#a16207',
    poor: '#c2410c',
    veryPoor: '#b91c1c',
    extremelyPoor: '#7f1d1d',
  },
};

export function categoryColor(standard, key) {
  const table = COLORS[String(standard || 'US').toLowerCase()];
  return table?.[key] || '#64748b';
}

export const SCALES = {
  CPCB: [
    { range: '0–50', label: 'Good', key: 'good' },
    { range: '51–100', label: 'Satisfactory', key: 'satisfactory' },
    { range: '101–200', label: 'Moderate', key: 'moderate' },
    { range: '201–300', label: 'Poor', key: 'poor' },
    { range: '301–400', label: 'Very Poor', key: 'veryPoor' },
    { range: '401–500', label: 'Severe', key: 'severe' },
  ],
  US: [
    { range: '0–50', label: 'Good', key: 'good' },
    { range: '51–100', label: 'Moderate', key: 'moderate' },
    { range: '101–150', label: 'Unhealthy for Sensitive Groups', key: 'usg' },
    { range: '151–200', label: 'Unhealthy', key: 'unhealthy' },
    { range: '201–300', label: 'Very Unhealthy', key: 'veryUnhealthy' },
    { range: '301–500', label: 'Hazardous', key: 'hazardous' },
  ],
  EU: [
    { range: '0–20', label: 'Good', key: 'good' },
    { range: '21–40', label: 'Fair', key: 'fair' },
    { range: '41–60', label: 'Moderate', key: 'moderate' },
    { range: '61–80', label: 'Poor', key: 'poor' },
    { range: '81–100', label: 'Very Poor', key: 'veryPoor' },
    { range: '100+', label: 'Extremely Poor', key: 'extremelyPoor' },
  ],
};

const LEVEL_INDEX = {
  CPCB: { good: 0, satisfactory: 1, moderate: 2, poor: 3, veryPoor: 4, severe: 5 },
  US: { good: 0, moderate: 1, usg: 2, unhealthy: 3, veryUnhealthy: 4, hazardous: 5 },
  EU: { good: 0, fair: 1, moderate: 2, poor: 3, veryPoor: 4, extremelyPoor: 5 },
};

export function levelIndex(standard, key) {
  return LEVEL_INDEX[standard]?.[key] ?? 0;
}

const GENERIC = {
  headline: 'Air quality information is available for this location.',
  health: 'Use the pollutant values and category together, and follow local health advisories.',
  sensitive: 'People with heart or lung conditions, older adults, children and pregnant people may be more sensitive to air pollution.',
  outdoors: 'Choose shorter or lighter outdoor activity if you notice symptoms such as coughing or shortness of breath.',
  mask: 'If you must be outdoors in polluted air, a well-fitted N95/FFP2 mask can reduce fine-particle exposure. Cloth masks are not reliable for PM2.5.',
};

const GUIDANCE = {
  CPCB: {
    good: {
      headline: 'Air quality is good.',
      health: 'Air pollution is low today. Most people can carry on with usual outdoor activity.',
      sensitive: 'People with severe respiratory or heart conditions should follow their own care plan as usual.',
      outdoors: 'A good time for outdoor activity, though conditions can change through the day.',
      mask: 'A mask is generally not needed for outdoor activity at this level.',
    },
    satisfactory: {
      headline: 'Air quality is generally acceptable.',
      health: 'Most people are unlikely to notice effects, but sensitive people may experience mild discomfort.',
      sensitive: 'Consider reducing prolonged heavy outdoor exertion if you have asthma or another respiratory condition.',
      outdoors: 'Light to moderate outdoor activity is reasonable; adjust if you feel irritated eyes or throat.',
      mask: 'A mask is usually unnecessary; consider one if you are sensitive and spending long periods outdoors.',
    },
    moderate: {
      headline: 'Air quality is moderate.',
      health: 'Sensitive groups may experience discomfort. Others are less likely to be affected.',
      sensitive: 'Reduce prolonged or heavy outdoor exertion. Keep reliever medication accessible if it is prescribed to you.',
      outdoors: 'Shorter, lighter outdoor sessions are preferable, especially away from busy roads.',
      mask: 'A well-fitted N95/FFP2 mask can help sensitive people during longer outdoor exposure.',
    },
    poor: {
      headline: 'Air quality is poor.',
      health: 'Health effects are more likely for sensitive groups and possible for others with prolonged exposure.',
      sensitive: 'Avoid prolonged or heavy outdoor exertion. Consider moving exercise indoors with filtered air.',
      outdoors: 'Limit outdoor time and avoid strenuous activity. Choose a cleaner window from the forecast if you must go out.',
      mask: 'Use a well-fitted N95/FFP2 mask if you need to be outdoors for extended periods.',
    },
    veryPoor: {
      headline: 'Air quality is very poor.',
      health: 'Health effects are likely for everyone, and sensitive groups may be affected more seriously.',
      sensitive: 'Avoid outdoor exertion. Keep windows closed where practical and use clean indoor air if available.',
      outdoors: 'Stay indoors where possible. Postpone outdoor exercise and non-essential trips.',
      mask: 'If you must go out, use a well-fitted N95/FFP2 mask and keep exposure time short.',
    },
    severe: {
      headline: 'Air quality is severe.',
      health: 'Serious health effects are possible for everyone. This is an emergency-level category.',
      sensitive: 'Stay indoors, avoid exertion, and follow local public-health advisories. Seek medical help for breathing difficulty.',
      outdoors: 'Avoid outdoor activity. Keep indoor air as clean as possible and reduce indoor pollution sources.',
      mask: 'Use a well-fitted N95/FFP2 mask if you absolutely must go outdoors; it reduces but does not remove exposure.',
    },
  },
  US: {
    good: {
      headline: 'Air quality is good.',
      health: 'Air quality is satisfactory and air pollution poses little or no risk.',
      sensitive: 'No special precautions are needed for most people.',
      outdoors: 'A suitable time for outdoor activity based on current pollution levels.',
      mask: 'A mask is generally not needed outdoors at this level.',
    },
    moderate: {
      headline: 'Air quality is moderate.',
      health: 'Air quality is acceptable; unusually sensitive people may notice mild effects.',
      sensitive: 'If you are unusually sensitive, consider a shorter or lighter outdoor session.',
      outdoors: 'Usual outdoor activity is reasonable; reduce intensity if you notice symptoms.',
      mask: 'Usually unnecessary; sensitive people may consider one for long outdoor exposure.',
    },
    usg: {
      headline: 'Air quality is unhealthy for sensitive groups.',
      health: 'Sensitive groups may experience health effects; the general public is less likely to be affected.',
      sensitive: 'Reduce prolonged heavy outdoor exertion and keep reliever medication accessible if prescribed.',
      outdoors: 'Choose lighter and shorter outdoor activity, or move it indoors if you are sensitive.',
      mask: 'A well-fitted N95/FFP2 mask can reduce exposure if you are sensitive and outdoors.',
    },
    unhealthy: {
      headline: 'Air quality is unhealthy.',
      health: 'Some people may experience health effects; sensitive groups may experience more serious effects.',
      sensitive: 'Avoid outdoor exertion and follow your care plan. Seek medical advice if symptoms worsen.',
      outdoors: 'Limit outdoor activity and avoid strenuous exercise. Use the forecast to find a comparatively cleaner window if you must go out.',
      mask: 'Use a well-fitted N95/FFP2 mask outdoors, especially if you are sensitive.',
    },
    veryUnhealthy: {
      headline: 'Air quality is very unhealthy.',
      health: 'Health alert: everyone may experience more serious health effects.',
      sensitive: 'Stay indoors and avoid exertion. Follow local public-health guidance and seek care for breathing difficulty.',
      outdoors: 'Avoid outdoor activity. Keep indoor air clean and reduce indoor pollution sources.',
      mask: 'If you must go outdoors, use a well-fitted N95/FFP2 mask and keep exposure short.',
    },
    hazardous: {
      headline: 'Air quality is hazardous.',
      health: 'Emergency conditions: everyone is likely to be affected. Avoid outdoor exposure.',
      sensitive: 'Stay indoors, avoid exertion, and follow emergency health advisories. Seek medical help for breathing difficulty.',
      outdoors: 'Do not exercise outdoors. Keep windows closed and use filtered indoor air if available.',
      mask: 'Use a well-fitted N95/FFP2 mask only if you must go outdoors; it reduces but does not eliminate exposure.',
    },
  },
  EU: {
    good: {
      headline: 'Air quality is good.',
      health: 'Pollution levels are low and most people are unlikely to notice effects.',
      sensitive: 'No special precautions are usually needed.',
      outdoors: 'A suitable time for outdoor activity.',
      mask: 'A mask is generally not needed outdoors at this level.',
    },
    fair: {
      headline: 'Air quality is fair.',
      health: 'Air quality is acceptable, though very sensitive people may notice mild effects.',
      sensitive: 'Consider lighter outdoor exertion if you have a respiratory condition.',
      outdoors: 'Usual outdoor activity is reasonable; adjust if you feel symptoms.',
      mask: 'Usually unnecessary.',
    },
    moderate: {
      headline: 'Air quality is moderate.',
      health: 'Sensitive people may experience discomfort with prolonged exposure.',
      sensitive: 'Reduce extended or heavy outdoor activity and follow your care plan.',
      outdoors: 'Shorter outdoor sessions are preferable.',
      mask: 'Consider a well-fitted N95/FFP2 mask for longer outdoor exposure if you are sensitive.',
    },
    poor: {
      headline: 'Air quality is poor.',
      health: 'Health effects are more likely, especially for sensitive groups.',
      sensitive: 'Avoid prolonged or heavy outdoor exertion and keep windows closed where practical.',
      outdoors: 'Limit outdoor time and choose lower-pollution windows where possible.',
      mask: 'Use a well-fitted N95/FFP2 mask for extended outdoor exposure.',
    },
    veryPoor: {
      headline: 'Air quality is very poor.',
      health: 'Health effects are likely for everyone.',
      sensitive: 'Stay indoors where possible and avoid exertion.',
      outdoors: 'Avoid outdoor activity and keep indoor air clean.',
      mask: 'Use a well-fitted N95/FFP2 mask if you must go outside.',
    },
    extremelyPoor: {
      headline: 'Air quality is extremely poor.',
      health: 'Serious health effects are likely for everyone.',
      sensitive: 'Stay indoors, avoid exertion, and follow local health advisories.',
      outdoors: 'Avoid outdoor exposure. Reduce indoor pollution sources.',
      mask: 'Use a well-fitted N95/FFP2 mask if going outside is unavoidable.',
    },
  },
};

export function guidanceFor(standard, key) {
  return { ...GENERIC, ...(GUIDANCE[standard]?.[key] || {}) };
}

export const POLLUTANT_HEALTH = {
  pm2_5: 'Fine particles can penetrate deep into the lungs and, at high exposure, affect the heart and blood vessels.',
  pm10: 'Coarse particles can irritate the eyes, nose and airways, especially during long outdoor exposure.',
  nitrogen_dioxide: 'Can irritate the airways and is often linked with traffic emissions; people with asthma may be more sensitive.',
  sulphur_dioxide: 'Can irritate the respiratory tract; people with asthma may be more sensitive to short-term peaks.',
  ozone: 'Ground-level ozone can irritate the airways and reduce lung function, particularly during outdoor exercise.',
  carbon_monoxide: 'Reduces the blood’s ability to carry oxygen; outdoor levels are usually low, but it is relevant near combustion sources.',
};

export const ACTIVITIES = [
  { key: 'walking', label: 'Walking', defaultDuration: 60, note: 'Light effort. Exposure is lower than vigorous exercise, but time outdoors still matters.' },
  { key: 'cycling', label: 'Cycling', defaultDuration: 120, note: 'Moderate effort with higher breathing rates, so polluted air matters more than at rest.' },
  { key: 'running', label: 'Running', defaultDuration: 60, note: 'Vigorous effort with high ventilation. Consider the forecast ranking carefully.' },
  { key: 'outdoor-exercise', label: 'Outdoor exercise', defaultDuration: 120, note: 'General outdoor training. Match intensity and duration to conditions and how you feel.' },
];

// Whole hours only: the forecast used for ranking is hourly.
export const DURATIONS = [60, 120, 180];

export const MONITORING_NOTE =
  'AIR CUE checks alerts only while the app is open or refreshed. There is no background monitoring service while the browser is closed.';
