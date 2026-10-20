export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface City extends GeoPoint {
  city: string;
  state: string;
  /** metro this city belongs to (for generator clustering) */
  metro: string;
}

// ~60 US cities/suburbs used by the synthetic data and job locations.
export const CITIES: City[] = [
  // Dallas–Fort Worth
  { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797, metro: "Dallas" },
  { city: "Plano", state: "TX", lat: 33.0198, lng: -96.6989, metro: "Dallas" },
  { city: "Irving", state: "TX", lat: 32.814, lng: -96.9489, metro: "Dallas" },
  { city: "Frisco", state: "TX", lat: 33.1507, lng: -96.8236, metro: "Dallas" },
  { city: "Fort Worth", state: "TX", lat: 32.7555, lng: -97.3308, metro: "Dallas" },
  { city: "Arlington", state: "TX", lat: 32.7357, lng: -97.1081, metro: "Dallas" },
  { city: "Denton", state: "TX", lat: 33.2148, lng: -97.1331, metro: "Dallas" },
  // Houston
  { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698, metro: "Houston" },
  { city: "Sugar Land", state: "TX", lat: 29.6197, lng: -95.6349, metro: "Houston" },
  { city: "The Woodlands", state: "TX", lat: 30.1658, lng: -95.4613, metro: "Houston" },
  { city: "Katy", state: "TX", lat: 29.7858, lng: -95.8245, metro: "Houston" },
  { city: "Pasadena", state: "TX", lat: 29.6911, lng: -95.2091, metro: "Houston" },
  { city: "Galveston", state: "TX", lat: 29.3013, lng: -94.7977, metro: "Houston" },
  { city: "Beaumont", state: "TX", lat: 30.0802, lng: -94.1266, metro: "Houston" },
  // Austin / San Antonio
  { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431, metro: "Austin" },
  { city: "Round Rock", state: "TX", lat: 30.5083, lng: -97.6789, metro: "Austin" },
  { city: "Cedar Park", state: "TX", lat: 30.5052, lng: -97.8203, metro: "Austin" },
  { city: "San Marcos", state: "TX", lat: 29.8833, lng: -97.9414, metro: "Austin" },
  { city: "Waco", state: "TX", lat: 31.5493, lng: -97.1467, metro: "Austin" },
  { city: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936, metro: "San Antonio" },
  { city: "New Braunfels", state: "TX", lat: 29.703, lng: -98.1245, metro: "San Antonio" },
  { city: "Boerne", state: "TX", lat: 29.7947, lng: -98.732, metro: "San Antonio" },
  // Phoenix
  { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074, metro: "Phoenix" },
  { city: "Scottsdale", state: "AZ", lat: 33.4942, lng: -111.9261, metro: "Phoenix" },
  { city: "Mesa", state: "AZ", lat: 33.4152, lng: -111.8315, metro: "Phoenix" },
  { city: "Tempe", state: "AZ", lat: 33.4255, lng: -111.94, metro: "Phoenix" },
  { city: "Chandler", state: "AZ", lat: 33.3062, lng: -111.8413, metro: "Phoenix" },
  { city: "Tucson", state: "AZ", lat: 32.2226, lng: -110.9747, metro: "Phoenix" },
  // Atlanta
  { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, metro: "Atlanta" },
  { city: "Marietta", state: "GA", lat: 33.9526, lng: -84.5499, metro: "Atlanta" },
  { city: "Alpharetta", state: "GA", lat: 34.0754, lng: -84.2941, metro: "Atlanta" },
  { city: "Decatur", state: "GA", lat: 33.7748, lng: -84.2963, metro: "Atlanta" },
  { city: "Macon", state: "GA", lat: 32.8407, lng: -83.6324, metro: "Atlanta" },
  // Chicago
  { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, metro: "Chicago" },
  { city: "Evanston", state: "IL", lat: 42.0451, lng: -87.6877, metro: "Chicago" },
  { city: "Naperville", state: "IL", lat: 41.7508, lng: -88.1535, metro: "Chicago" },
  { city: "Schaumburg", state: "IL", lat: 42.0334, lng: -88.0834, metro: "Chicago" },
  { city: "Milwaukee", state: "WI", lat: 43.0389, lng: -87.9065, metro: "Chicago" },
  // Denver
  { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903, metro: "Denver" },
  { city: "Aurora", state: "CO", lat: 39.7294, lng: -104.8319, metro: "Denver" },
  { city: "Lakewood", state: "CO", lat: 39.7047, lng: -105.0814, metro: "Denver" },
  { city: "Boulder", state: "CO", lat: 40.015, lng: -105.2705, metro: "Denver" },
  { city: "Colorado Springs", state: "CO", lat: 38.8339, lng: -104.8214, metro: "Denver" },
  // Charlotte
  { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431, metro: "Charlotte" },
  { city: "Concord", state: "NC", lat: 35.4088, lng: -80.5795, metro: "Charlotte" },
  { city: "Gastonia", state: "NC", lat: 35.2621, lng: -81.1873, metro: "Charlotte" },
  { city: "Rock Hill", state: "SC", lat: 34.9249, lng: -81.0251, metro: "Charlotte" },
  { city: "Columbia", state: "SC", lat: 34.0007, lng: -81.0348, metro: "Charlotte" },
  // Others
  { city: "Raleigh", state: "NC", lat: 35.7796, lng: -78.6382, metro: "Raleigh" },
  { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816, metro: "Nashville" },
  { city: "Tampa", state: "FL", lat: 27.9506, lng: -82.4572, metro: "Tampa" },
  { city: "Orlando", state: "FL", lat: 28.5383, lng: -81.3792, metro: "Orlando" },
  { city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398, metro: "Las Vegas" },
  { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321, metro: "Seattle" },
  { city: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988, metro: "Columbus" },
  { city: "Oklahoma City", state: "OK", lat: 35.4676, lng: -97.5164, metro: "Oklahoma City" },
  { city: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786, metro: "Kansas City" },
  { city: "New York", state: "NY", lat: 40.7128, lng: -74.006, metro: "New York" },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, metro: "Los Angeles" },
];

// First three ZIP digits → city name in CITIES.
export const ZIP_PREFIXES: Record<string, string> = {
  "750": "Dallas", "751": "Dallas", "752": "Dallas", "753": "Dallas",
  "760": "Arlington", "761": "Fort Worth", "762": "Denton",
  "770": "Houston", "772": "Houston", "773": "The Woodlands", "774": "Katy", "775": "Pasadena", "776": "Beaumont",
  "786": "Round Rock", "787": "Austin", "766": "Waco", "767": "Waco",
  "780": "San Antonio", "781": "New Braunfels", "782": "San Antonio",
  "850": "Phoenix", "852": "Mesa", "853": "Scottsdale", "856": "Tucson", "857": "Tucson",
  "300": "Marietta", "301": "Marietta", "303": "Atlanta", "311": "Atlanta", "312": "Macon",
  "600": "Evanston", "601": "Schaumburg", "603": "Naperville", "605": "Naperville", "606": "Chicago", "607": "Chicago", "608": "Chicago",
  "530": "Milwaukee", "532": "Milwaukee",
  "800": "Aurora", "801": "Lakewood", "802": "Denver", "803": "Boulder", "809": "Colorado Springs",
  "280": "Gastonia", "281": "Concord", "282": "Charlotte", "297": "Rock Hill", "292": "Columbia",
  "275": "Raleigh", "276": "Raleigh",
  "370": "Nashville", "372": "Nashville",
  "335": "Tampa", "336": "Tampa", "327": "Orlando", "328": "Orlando",
  "889": "Las Vegas", "891": "Las Vegas",
  "980": "Seattle", "981": "Seattle",
  "430": "Columbus", "432": "Columbus",
  "730": "Oklahoma City", "731": "Oklahoma City",
  "641": "Kansas City", "100": "New York", "900": "Los Angeles",
};

const STATE_NAMES: Record<string, string> = {
  texas: "TX", arizona: "AZ", georgia: "GA", illinois: "IL", colorado: "CO", "north carolina": "NC",
  "south carolina": "SC", tennessee: "TN", florida: "FL", nevada: "NV", washington: "WA", ohio: "OH",
  oklahoma: "OK", missouri: "MO", "new york": "NY", california: "CA", wisconsin: "WI",
};

export function findCity(name: string, state?: string): City | undefined {
  const n = name.trim().toLowerCase();
  return (
    CITIES.find((c) => c.city.toLowerCase() === n && (!state || c.state === state)) ??
    CITIES.find((c) => c.city.toLowerCase() === n)
  );
}

/** Resolve "Dallas, TX", "Dallas Texas", "75201" or "Charlotte, NC (hybrid)" to a city. */
export function resolveLocation(input: string): City | undefined {
  if (!input) return undefined;
  const zip = input.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (zip) {
    const city = ZIP_PREFIXES[zip[1].slice(0, 3)];
    if (city) return findCity(city);
  }
  const lower = input.toLowerCase();
  let state: string | undefined;
  const abbr = input.match(/,\s*([A-Z]{2})\b/);
  if (abbr) state = abbr[1];
  for (const [full, code] of Object.entries(STATE_NAMES)) if (lower.includes(full)) state ??= code;
  // longest city name first so "Fort Worth" beats "Worth"
  const sorted = [...CITIES].sort((a, b) => b.city.length - a.city.length);
  return (
    sorted.find((c) => lower.includes(c.city.toLowerCase()) && (!state || c.state === state)) ??
    sorted.find((c) => lower.includes(c.city.toLowerCase()))
  );
}

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

const STATE_CODES = new Set(Object.values(STATE_NAMES).concat(["LA", "NM", "VA", "WY", "UT", "AR", "KS", "NE", "IA", "MN", "MI", "IN", "KY", "AL", "MS", "PA", "NJ", "MA"]));

/** US states named in free text, e.g. "Texas", "NC", "North Carolina". */
export function statesIn(text: string): string[] {
  const out = new Set<string>();
  const lower = text.toLowerCase();
  for (const [full, code] of Object.entries(STATE_NAMES)) {
    if (new RegExp(`\\b${full}\\b`).test(lower)) out.add(code);
  }
  // two-letter codes only when written in capitals, skipping words like "IN" / "OR"
  for (const m of text.matchAll(/\b([A-Z]{2})\b/g)) if (STATE_CODES.has(m[1]) && m[1] !== "IN" && m[1] !== "OR") out.add(m[1]);
  return [...out];
}
