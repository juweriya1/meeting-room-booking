/**
 * Canonical deduplicated UTC offset timezone groups (36 unique global offsets).
 * Strictly 1 entry per active offset from UTC-11:00 to UTC+14:00.
 * Neutral geographic grouping with comprehensive world city search index.
 */

export interface CanonicalTimezone {
  iana: string;
  label: string;
  cities: string;
}

export const CANONICAL_TIMEZONES: CanonicalTimezone[] = [
  {
    iana: 'Pacific/Midway',
    label: 'Midway & American Samoa',
    cities: 'Pago Pago, Midway, Niue, Samoa, Alofi',
  },
  {
    iana: 'Pacific/Honolulu',
    label: 'Hawaii & French Polynesia',
    cities: 'Honolulu, Papeete, Tahiti, Cook Islands, Rarotonga',
  },
  {
    iana: 'Pacific/Marquesas',
    label: 'Marquesas Islands',
    cities: 'Taiohae, Marquesas',
  },
  {
    iana: 'America/Anchorage',
    label: 'Alaska Time',
    cities: 'Anchorage, Juneau, Fairbanks, Nome, Sitka',
  },
  {
    iana: 'America/Los_Angeles',
    label: 'Pacific Time (US & Canada)',
    cities: 'Los Angeles, San Francisco, San Diego, San Jose, Seattle, Portland, Las Vegas, Sacramento, Vancouver, Victoria, Tijuana',
  },
  {
    iana: 'America/Denver',
    label: 'Mountain Time (US & Canada)',
    cities: 'Denver, Salt Lake City, Phoenix, Tucson, Calgary, Edmonton, Boise, Albuquerque, El Paso, Santa Fe',
  },
  {
    iana: 'America/Chicago',
    label: 'Central Time (US & Canada)',
    cities: 'Chicago, Dallas, Houston, Austin, San Antonio, Fort Worth, Minneapolis, St. Paul, Milwaukee, Kansas City, St. Louis, New Orleans, Nashville, Memphis, Mexico City, Monterrey, Guadalajara, Winnipeg, Regina, Guatemala City, San Salvador, Managua, Tegucigalpa, San Jose CR',
  },
  {
    iana: 'America/New_York',
    label: 'Eastern Time (US & Canada)',
    cities: 'New York, Washington DC, Boston, Philadelphia, Miami, Atlanta, Charlotte, Orlando, Tampa, Pittsburgh, Detroit, Baltimore, Toronto, Montreal, Ottawa, Quebec, Bogota, Medellin, Cali, Lima, Quito, Guayaquil, Havana, Kingston, Panama City, Nassau',
  },
  {
    iana: 'America/Halifax',
    label: 'Atlantic Time & Caribbean',
    cities: 'Halifax, Moncton, San Juan, Santo Domingo, Caracas, Santiago, La Paz, Georgetown, Manaus, Port of Spain, Willemstad, Bermuda',
  },
  {
    iana: 'America/St_Johns',
    label: 'Newfoundland Time',
    cities: "St. John's, Newfoundland, Labrador, Corner Brook",
  },
  {
    iana: 'America/Sao_Paulo',
    label: 'Eastern South America & Greenland',
    cities: 'Sao Paulo, Rio de Janeiro, Buenos Aires, Montevideo, Brasilia, Salvador, Belo Horizonte, Cordoba, Rosario, Asuncion, Nuuk',
  },
  {
    iana: 'America/Noronha',
    label: 'Mid-Atlantic',
    cities: 'Fernando de Noronha, South Georgia, Grytviken',
  },
  {
    iana: 'Atlantic/Azores',
    label: 'Azores & Cape Verde',
    cities: 'Azores, Ponta Delgada, Praia, Cape Verde, Mindelo',
  },
  {
    iana: 'Europe/London',
    label: 'Western Europe & UTC Baseline',
    cities: 'London, Dublin, Lisbon, Edinburgh, Glasgow, Belfast, Manchester, Birmingham, Casablanca, Rabat, Marrakech, Accra, Abidjan, Dakar, Bamako, Conakry, Freetown, Monrovia, Reykjavik, UTC, GMT, Zulu, Universal',
  },
  {
    iana: 'Europe/Paris',
    label: 'Central Europe & West Africa',
    cities: 'Berlin, Paris, Rome, Madrid, Barcelona, Amsterdam, Rotterdam, Brussels, Vienna, Zurich, Geneva, Warsaw, Prague, Budapest, Munich, Frankfurt, Hamburg, Cologne, Milan, Naples, Stockholm, Oslo, Copenhagen, Belgrade, Zagreb, Sarajevo, Bratislava, Ljubljana, Lagos, Abuja, Algiers, Tunis, Douala, Kinshasa, Luanda, Yaounde',
  },
  {
    iana: 'Africa/Cairo',
    label: 'Egypt, South Africa & Levant',
    cities: 'Cairo, Alexandria, Giza, Johannesburg, Cape Town, Pretoria, Durban, Jerusalem, Tel Aviv, Haifa, Athens, Thessaloniki, Helsinki, Bucharest, Sofia, Kyiv, Lviv, Odesa, Chisinau, Vilnius, Riga, Tallinn, Beirut, Amman, Damascus, Nicosia, Khartoum, Kigali, Harare, Lusaka, Maputo, Gaborone, Windhoek',
  },
  {
    iana: 'Asia/Riyadh',
    label: 'Arabian Peninsula, East Africa & Turkey',
    cities: 'Riyadh, Jeddah, Mecca, Medina, Dammam, Doha, Kuwait City, Manama, Baghdad, Basra, Erbil, Nairobi, Mombasa, Addis Ababa, Kampala, Dar es Salaam, Mogadishu, Djibouti, Asmara, Istanbul, Ankara, Izmir, Moscow, St. Petersburg, Nizhny Novgorod, Kazan, Minsk',
  },
  {
    iana: 'Asia/Tehran',
    label: 'Iran Standard Time',
    cities: 'Tehran, Mashhad, Isfahan, Tabriz, Shiraz, Karaj, Ahvaz, Qom',
  },
  {
    iana: 'Asia/Dubai',
    label: 'Gulf Standard Time & Caucasus',
    cities: 'Dubai, Abu Dhabi, Sharjah, Muscat, Baku, Ganja, Tbilisi, Batumi, Yerevan, Samara, Saratov, Port Louis, Mahe',
  },
  {
    iana: 'Asia/Kabul',
    label: 'Afghanistan Time',
    cities: 'Kabul, Kandahar, Herat, Mazar-i-Sharif, Jalalabad',
  },
  {
    iana: 'Asia/Karachi',
    label: 'Pakistan & Central Asia',
    cities: 'Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Tashkent, Samarkand, Bukhara, Ashgabat, Dushanbe, Khujand, Yekaterinburg, Ufa, Chelyabinsk, Male, Maldives',
  },
  {
    iana: 'Asia/Kolkata',
    label: 'India Standard Time',
    cities: 'New Delhi, Delhi, Mumbai, Bombay, Bengaluru, Bangalore, Hyderabad, Chennai, Madras, Kolkata, Calcutta, Pune, Ahmedabad, Surat, Jaipur, Lucknow, Kanpur, Nagpur, Indore, Kochi, Thiruvananthapuram, Colombo, Sri Lanka, Kandy, Galle',
  },
  {
    iana: 'Asia/Kathmandu',
    label: 'Nepal Time',
    cities: 'Kathmandu, Pokhara, Lalitpur, Bharatpur, Biratnagar',
  },
  {
    iana: 'Asia/Dhaka',
    label: 'Bangladesh & Central Asia',
    cities: 'Dhaka, Chittagong, Khulna, Rajshahi, Sylhet, Almaty, Astana, Nur-Sultan, Shymkent, Bishkek, Osh, Novosibirsk, Omsk, Thimphu, Bhutan',
  },
  {
    iana: 'Asia/Yangon',
    label: 'Myanmar & Cocos',
    cities: 'Yangon, Rangoon, Mandalay, Naypyidaw, Bago, Cocos Islands',
  },
  {
    iana: 'Asia/Bangkok',
    label: 'Indochina & Western Indonesia',
    cities: 'Bangkok, Nonthaburi, Chiang Mai, Phuket, Jakarta, Surabaya, Bandung, Medan, Semarang, Hanoi, Ho Chi Minh City, Saigon, Da Nang, Phnom Penh, Siem Reap, Vientiane, Krasnoyarsk',
  },
  {
    iana: 'Asia/Singapore',
    label: 'Singapore, China & Western Australia',
    cities: 'Singapore, Hong Kong, Beijing, Shanghai, Shenzhen, Guangzhou, Chengdu, Chongqing, Wuhan, Tianjin, Hangzhou, Taipei, Kaohsiung, Manila, Quezon City, Cebu, Davao, Kuala Lumpur, George Town, Johor Bahru, Perth, Fremantle, Bali, Denpasar, Makassar, Bandar Seri Begawan, Ulaanbaatar, Irkutsk',
  },
  {
    iana: 'Australia/Eucla',
    label: 'Central Western Australia',
    cities: 'Eucla, Caiguna, Border Village, Cocklebiddy',
  },
  {
    iana: 'Asia/Tokyo',
    label: 'Japan & Korea Standard Time',
    cities: 'Tokyo, Yokohama, Osaka, Nagoya, Sapporo, Kyoto, Kobe, Fukuoka, Sendai, Hiroshima, Seoul, Busan, Incheon, Daegu, Daejeon, Gwangju, Pyongyang, Dili, Jayapura, Yakutsk, Chita',
  },
  {
    iana: 'Australia/Brisbane',
    label: 'Eastern Australia (Standard) & Guam',
    cities: 'Brisbane, Gold Coast, Sunshine Coast, Cairns, Townsville, Guam, Hagatna, Saipan, Port Moresby, Papua New Guinea, Vladivostok',
  },
  {
    iana: 'Australia/Adelaide',
    label: 'Central Australia',
    cities: 'Adelaide, Darwin, Alice Springs, Mount Gambier',
  },
  {
    iana: 'Australia/Sydney',
    label: 'Eastern Australia (DST) & Pacific',
    cities: 'Sydney, Melbourne, Canberra, Hobart, Newcastle, Wollongong, Geelong, Noumea, New Caledonia, Honiara, Solomon Islands, Port Vila, Vanuatu, Magadan',
  },
  {
    iana: 'Pacific/Fiji',
    label: 'Fiji & Marshall Islands',
    cities: 'Suva, Nadi, Lautoka, Majuro, Tarawa, Funafuti, Tuvalu, Petropavlovsk-Kamchatsky',
  },
  {
    iana: 'Pacific/Auckland',
    label: 'New Zealand & Tonga',
    cities: 'Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin, Queenstown, Nuku\'alofa, Apia, Samoa, Fakaofo',
  },
  {
    iana: 'Pacific/Chatham',
    label: 'Chatham Islands',
    cities: 'Waitangi, Chatham Island',
  },
  {
    iana: 'Pacific/Kiritimati',
    label: 'Line Islands',
    cities: 'Kiritimati, Christmas Island (Kiribati)',
  },
];

/**
 * Computes the real-time UTC minute offset for an IANA timezone string.
 */
export function getOffsetMinutes(iana: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: iana,
      timeZoneName: 'longOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const offsetStr = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT';
    const match = offsetStr.match(/GMT([+-])(\d{1,2}):(\d{2})/);
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
  } catch {
    return 0;
  }
}

/**
 * Returns formatted offset string like 'UTC-05:00' or 'UTC+05:30'.
 */
export function formatOffsetString(mins: number): string {
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return `UTC${sign}${h}:${m}`;
}

export function getFormattedOffset(iana: string): string {
  return formatOffsetString(getOffsetMinutes(iana));
}
