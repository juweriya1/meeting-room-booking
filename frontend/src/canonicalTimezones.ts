/**
 * Canonical UTC-offset timezone groups (~37 entries covering GMT-11 to GMT+14).
 * Matches standard enterprise UX (Google Calendar, Zoom, Calendly).
 */

export interface CanonicalTimezone {
  iana: string;
  region: string;
  cities: string;
}

export const CANONICAL_TIMEZONES: CanonicalTimezone[] = [
  { iana: 'Pacific/Midway', region: 'Midway, Samoa', cities: 'Pago Pago, Midway' },
  { iana: 'Pacific/Honolulu', region: 'Hawaii Time', cities: 'Honolulu, Tahiti' },
  { iana: 'Pacific/Marquesas', region: 'Marquesas Islands', cities: 'Taiohae' },
  { iana: 'America/Anchorage', region: 'Alaska Time', cities: 'Anchorage, Juneau' },
  { iana: 'America/Los_Angeles', region: 'Pacific Time (US & Canada)', cities: 'Los Angeles, San Francisco, Seattle, Vancouver, Tijuana' },
  { iana: 'America/Denver', region: 'Mountain Time (US & Canada)', cities: 'Denver, Salt Lake City, Phoenix, Calgary, Edmonton' },
  { iana: 'America/Chicago', region: 'Central Time (US & Canada)', cities: 'Chicago, Dallas, Houston, Minneapolis, Mexico City, Winnipeg' },
  { iana: 'America/New_York', region: 'Eastern Time (US & Canada)', cities: 'New York, Washington DC, Boston, Miami, Toronto, Montreal, Bogota, Lima' },
  { iana: 'America/Halifax', region: 'Atlantic Time', cities: 'Halifax, Caracas, Santiago, Santo Domingo, San Juan, La Paz' },
  { iana: 'America/St_Johns', region: 'Newfoundland Time', cities: "St. John's" },
  { iana: 'America/Sao_Paulo', region: 'Brasilia Time', cities: 'Sao Paulo, Rio de Janeiro, Buenos Aires, Montevideo' },
  { iana: 'America/Noronha', region: 'Mid-Atlantic', cities: 'Fernando de Noronha, South Georgia' },
  { iana: 'Atlantic/Azores', region: 'Azores Time', cities: 'Azores, Cape Verde' },
  { iana: 'UTC', region: 'Coordinated Universal Time', cities: 'UTC, Zulu, Universal' },
  { iana: 'Europe/London', region: 'Greenwich Mean Time / Western Europe', cities: 'London, Dublin, Edinburgh, Lisbon, Casablanca' },
  { iana: 'Europe/Paris', region: 'Central European Time', cities: 'Paris, Berlin, Rome, Madrid, Amsterdam, Brussels, Vienna, Warsaw, Lagos' },
  { iana: 'Europe/Athens', region: 'Eastern European Time', cities: 'Athens, Cairo, Johannesburg, Helsinki, Bucharest, Jerusalem, Kyiv, Beirut' },
  { iana: 'Europe/Moscow', region: 'Moscow / Arabian Time', cities: 'Moscow, St. Petersburg, Istanbul, Riyadh, Nairobi, Baghdad, Doha' },
  { iana: 'Asia/Tehran', region: 'Iran Standard Time', cities: 'Tehran' },
  { iana: 'Asia/Dubai', region: 'Gulf Standard Time', cities: 'Dubai, Abu Dhabi, Muscat, Baku, Tbilisi, Yerevan' },
  { iana: 'Asia/Kabul', region: 'Afghanistan Time', cities: 'Kabul' },
  { iana: 'Asia/Karachi', region: 'Pakistan Standard Time', cities: 'Karachi, Islamabad, Lahore, Tashkent, Yekaterinburg' },
  { iana: 'Asia/Kolkata', region: 'India Standard Time', cities: 'New Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Colombo' },
  { iana: 'Asia/Kathmandu', region: 'Nepal Time', cities: 'Kathmandu' },
  { iana: 'Asia/Dhaka', region: 'Bangladesh Standard Time', cities: 'Dhaka, Almaty, Astana, Novosibirsk' },
  { iana: 'Asia/Yangon', region: 'Myanmar Time', cities: 'Yangon, Naypyidaw' },
  { iana: 'Asia/Bangkok', region: 'Indochina Time', cities: 'Bangkok, Jakarta, Hanoi, Ho Chi Minh' },
  { iana: 'Asia/Singapore', region: 'Singapore / China / Western Australia', cities: 'Singapore, Hong Kong, Beijing, Shanghai, Taipei, Manila, Perth' },
  { iana: 'Australia/Eucla', region: 'Central Western Australia', cities: 'Eucla' },
  { iana: 'Asia/Tokyo', region: 'Japan & Korea Standard Time', cities: 'Tokyo, Seoul, Osaka, Pyongyang' },
  { iana: 'Australia/Adelaide', region: 'Central Australia Time', cities: 'Adelaide, Darwin' },
  { iana: 'Australia/Sydney', region: 'Eastern Australia Time', cities: 'Sydney, Melbourne, Brisbane, Canberra, Hobart, Guam' },
  { iana: 'Pacific/Noumea', region: 'Solomon Islands / New Caledonia', cities: 'Noumea, Port Vila, Vladivostok' },
  { iana: 'Pacific/Auckland', region: 'New Zealand Time', cities: 'Auckland, Wellington, Fiji, Marshall Islands' },
  { iana: 'Pacific/Chatham', region: 'Chatham Islands', cities: 'Waitangi' },
  { iana: 'Pacific/Tongatapu', region: 'Tonga Time', cities: "Nuku'alofa, Apia" },
  { iana: 'Pacific/Kiritimati', region: 'Line Islands Time', cities: 'Kiritimati' },
];

/**
 * Returns formatted offset string such as '(GMT-05:00)' or '(GMT+05:30)'.
 */
export function getFormattedOffset(iana: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    if (!offsetPart || offsetPart === 'GMT') return '(GMT+00:00)';
    // Normalizes GMT+5 to (GMT+05:00)
    return `(${offsetPart})`;
  } catch {
    return '(GMT)';
  }
}
