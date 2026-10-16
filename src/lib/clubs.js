// The clubs a player can support: everyone in the top five leagues this season
// (2026/27), plus the Championship. Each has a code, its colours and the pattern they are worn in, from
// which the app draws a small crest — no image files, no fetching, and nothing that
// stops working when a club redesigns its badge.
//
// Patterns: solid (first colour, second as trim), stripes (vertical), hoops, halves,
// sash (a diagonal band), quarters.

export const LEAGUES = [
  ['ENG', 'Premier League'],
  ['ESP', 'La Liga'],
  ['ITA', 'Serie A'],
  ['GER', 'Bundesliga'],
  ['FRA', 'Ligue 1'],
  ['EFL', 'Championship'],
];

// [code, name, league, first colour, second colour, pattern]
const LIST = [
  // Premier League
  ['ARS', 'Arsenal', 'ENG', '#EF0107', '#FFFFFF', 'solid'],
  ['AVL', 'Aston Villa', 'ENG', '#670E36', '#95BFE5', 'solid'],
  ['BOU', 'Bournemouth', 'ENG', '#DA291C', '#000000', 'stripes'],
  ['BRE', 'Brentford', 'ENG', '#E30613', '#FFFFFF', 'stripes'],
  ['BHA', 'Brighton & Hove Albion', 'ENG', '#0057B8', '#FFFFFF', 'stripes'],
  ['CHE', 'Chelsea', 'ENG', '#034694', '#FFFFFF', 'solid'],
  ['COV', 'Coventry City', 'ENG', '#78D0F0', '#FFFFFF', 'solid'],
  ['CRY', 'Crystal Palace', 'ENG', '#1B458F', '#C4122E', 'stripes'],
  ['EVE', 'Everton', 'ENG', '#003399', '#FFFFFF', 'solid'],
  ['FUL', 'Fulham', 'ENG', '#FFFFFF', '#000000', 'solid'],
  ['HUL', 'Hull City', 'ENG', '#F5A12D', '#000000', 'stripes'],
  ['IPS', 'Ipswich Town', 'ENG', '#0044AA', '#FFFFFF', 'solid'],
  ['LEE', 'Leeds United', 'ENG', '#FFFFFF', '#1D428A', 'solid'],
  ['LIV', 'Liverpool', 'ENG', '#C8102E', '#FFFFFF', 'solid'],
  ['MCI', 'Manchester City', 'ENG', '#6CABDD', '#FFFFFF', 'solid'],
  ['MUN', 'Manchester United', 'ENG', '#DA291C', '#000000', 'solid'],
  ['NEW', 'Newcastle United', 'ENG', '#241F20', '#FFFFFF', 'stripes'],
  ['NFO', 'Nottingham Forest', 'ENG', '#DD0000', '#FFFFFF', 'solid'],
  ['SUN', 'Sunderland', 'ENG', '#EB172B', '#FFFFFF', 'stripes'],
  ['TOT', 'Tottenham Hotspur', 'ENG', '#FFFFFF', '#132257', 'solid'],
  // La Liga
  ['ALA', 'Alavés', 'ESP', '#0761AF', '#FFFFFF', 'stripes'],
  ['ATH', 'Athletic Club', 'ESP', '#EE2523', '#FFFFFF', 'stripes'],
  ['ATM', 'Atlético Madrid', 'ESP', '#CB3524', '#FFFFFF', 'stripes'],
  ['BAR', 'Barcelona', 'ESP', '#A50044', '#004D98', 'stripes'],
  ['BET', 'Real Betis', 'ESP', '#0BB363', '#FFFFFF', 'stripes'],
  ['CEL', 'Celta Vigo', 'ESP', '#8AC3EE', '#FFFFFF', 'solid'],
  ['DEP', 'Deportivo La Coruña', 'ESP', '#005BAC', '#FFFFFF', 'stripes'],
  ['ELC', 'Elche', 'ESP', '#FFFFFF', '#00843D', 'solid'],
  ['ESP', 'Espanyol', 'ESP', '#007FC8', '#FFFFFF', 'stripes'],
  ['GET', 'Getafe', 'ESP', '#005999', '#FFFFFF', 'solid'],
  ['LEV', 'Levante', 'ESP', '#004B95', '#A3182C', 'stripes'],
  ['MAL', 'Málaga', 'ESP', '#0094D8', '#FFFFFF', 'stripes'],
  ['OSA', 'Osasuna', 'ESP', '#D91A21', '#0A346F', 'solid'],
  ['RAC', 'Racing Santander', 'ESP', '#007A3D', '#FFFFFF', 'solid'],
  ['RAY', 'Rayo Vallecano', 'ESP', '#FFFFFF', '#E53027', 'sash'],
  ['RMA', 'Real Madrid', 'ESP', '#FFFFFF', '#FEBE10', 'solid'],
  ['RSO', 'Real Sociedad', 'ESP', '#0067B1', '#FFFFFF', 'stripes'],
  ['SEV', 'Sevilla', 'ESP', '#FFFFFF', '#D4021D', 'solid'],
  ['VAL', 'Valencia', 'ESP', '#FFFFFF', '#EE8707', 'solid'],
  ['VIL', 'Villarreal', 'ESP', '#FFE667', '#005187', 'solid'],
  // Serie A
  ['ATA', 'Atalanta', 'ITA', '#1E71B8', '#000000', 'stripes'],
  ['BOL', 'Bologna', 'ITA', '#1A2F48', '#A21C26', 'stripes'],
  ['CAG', 'Cagliari', 'ITA', '#B01E2B', '#1A2A5E', 'halves'],
  ['COM', 'Como', 'ITA', '#0F2E5A', '#FFFFFF', 'solid'],
  ['FIO', 'Fiorentina', 'ITA', '#482E92', '#FFFFFF', 'solid'],
  ['FRO', 'Frosinone', 'ITA', '#FFDD00', '#0033A0', 'solid'],
  ['GEN', 'Genoa', 'ITA', '#AE1A1F', '#1F2E5A', 'halves'],
  ['INT', 'Inter', 'ITA', '#0068A8', '#000000', 'stripes'],
  ['JUV', 'Juventus', 'ITA', '#000000', '#FFFFFF', 'stripes'],
  ['LAZ', 'Lazio', 'ITA', '#87D8F7', '#FFFFFF', 'solid'],
  ['LEC', 'Lecce', 'ITA', '#FFDD00', '#D71920', 'stripes'],
  ['MIL', 'AC Milan', 'ITA', '#FB090B', '#000000', 'stripes'],
  ['MON', 'Monza', 'ITA', '#E30613', '#FFFFFF', 'solid'],
  ['NAP', 'Napoli', 'ITA', '#12A0D7', '#FFFFFF', 'solid'],
  ['PAR', 'Parma', 'ITA', '#FFDC00', '#1B3F8B', 'solid'],
  ['ROM', 'Roma', 'ITA', '#8E1F2F', '#F0BC42', 'solid'],
  ['SAS', 'Sassuolo', 'ITA', '#00A752', '#000000', 'stripes'],
  ['TOR', 'Torino', 'ITA', '#8A1E03', '#FFFFFF', 'solid'],
  ['UDI', 'Udinese', 'ITA', '#000000', '#FFFFFF', 'stripes'],
  ['VEN', 'Venezia', 'ITA', '#000000', '#FF7F00', 'solid'],
  // Bundesliga
  ['FCA', 'Augsburg', 'GER', '#FFFFFF', '#BA3733', 'solid'],
  ['UNB', 'Union Berlin', 'GER', '#EB1923', '#FFFFFF', 'solid'],
  ['SVW', 'Werder Bremen', 'GER', '#1D9053', '#FFFFFF', 'solid'],
  ['BVB', 'Borussia Dortmund', 'GER', '#FDE100', '#000000', 'solid'],
  ['ELV', 'Elversberg', 'GER', '#005CA9', '#FFFFFF', 'stripes'],
  ['SGE', 'Eintracht Frankfurt', 'GER', '#000000', '#E1000F', 'solid'],
  ['SCF', 'Freiburg', 'GER', '#E2001A', '#FFFFFF', 'solid'],
  ['HSV', 'Hamburger SV', 'GER', '#FFFFFF', '#0A3F86', 'solid'],
  ['TSG', 'Hoffenheim', 'GER', '#1C63B7', '#FFFFFF', 'solid'],
  ['KOE', 'Köln', 'GER', '#FFFFFF', '#ED1C24', 'solid'],
  ['RBL', 'RB Leipzig', 'GER', '#FFFFFF', '#DD0741', 'solid'],
  ['B04', 'Bayer Leverkusen', 'GER', '#E32221', '#000000', 'solid'],
  ['M05', 'Mainz 05', 'GER', '#C3141E', '#FFFFFF', 'solid'],
  ['BMG', 'Borussia Mönchengladbach', 'GER', '#FFFFFF', '#000000', 'solid'],
  ['FCB', 'Bayern Munich', 'GER', '#DC052D', '#FFFFFF', 'solid'],
  ['SCP', 'Paderborn', 'GER', '#005CA9', '#000000', 'solid'],
  ['S04', 'Schalke 04', 'GER', '#004D9D', '#FFFFFF', 'solid'],
  ['VFB', 'Stuttgart', 'GER', '#FFFFFF', '#E32219', 'hoops'],
  // Ligue 1
  ['SCO', 'Angers', 'FRA', '#000000', '#FFFFFF', 'stripes'],
  ['AJA', 'Auxerre', 'FRA', '#FFFFFF', '#1D4596', 'solid'],
  ['BRS', 'Brest', 'FRA', '#FF0000', '#FFFFFF', 'stripes'],
  ['HAC', 'Le Havre', 'FRA', '#8CCBF4', '#17408B', 'halves'],
  ['LEM', 'Le Mans', 'FRA', '#C8102E', '#F6B21D', 'solid'],
  ['RCL', 'Lens', 'FRA', '#FFD200', '#E30613', 'solid'],
  ['LOS', 'Lille', 'FRA', '#E01E13', '#FFFFFF', 'solid'],
  ['FCL', 'Lorient', 'FRA', '#FF6600', '#000000', 'solid'],
  ['LYO', 'Lyon', 'FRA', '#FFFFFF', '#1B2A7B', 'solid'],
  ['MAR', 'Marseille', 'FRA', '#FFFFFF', '#2FAEE0', 'solid'],
  ['ASM', 'Monaco', 'FRA', '#E51B22', '#FFFFFF', 'sash'],
  ['OGC', 'Nice', 'FRA', '#ED1C24', '#000000', 'stripes'],
  ['PFC', 'Paris FC', 'FRA', '#0E2A6F', '#FFFFFF', 'solid'],
  ['PSG', 'Paris Saint-Germain', 'FRA', '#004170', '#DA291C', 'solid'],
  ['REN', 'Rennes', 'FRA', '#E4002B', '#000000', 'solid'],
  ['STR', 'Strasbourg', 'FRA', '#009FE3', '#FFFFFF', 'solid'],
  ['TOU', 'Toulouse', 'FRA', '#4B2E83', '#FFFFFF', 'solid'],
  ['EST', 'Troyes', 'FRA', '#1A3C8E', '#FFFFFF', 'solid'],
  // Championship
  ['BIR', 'Birmingham City', 'EFL', '#0000FF', '#FFFFFF', 'solid'],
  ['BLB', 'Blackburn Rovers', 'EFL', '#009EE0', '#FFFFFF', 'halves'],
  ['BWN', 'Bolton Wanderers', 'EFL', '#FFFFFF', '#263C7E', 'solid'],
  ['BRC', 'Bristol City', 'EFL', '#E21C38', '#FFFFFF', 'solid'],
  ['BUR', 'Burnley', 'EFL', '#6C1D45', '#99D6EA', 'solid'],
  ['CAR', 'Cardiff City', 'EFL', '#0070B5', '#FFFFFF', 'solid'],
  ['CHA', 'Charlton Athletic', 'EFL', '#D4021D', '#FFFFFF', 'solid'],
  ['DER', 'Derby County', 'EFL', '#FFFFFF', '#000000', 'solid'],
  ['LIN', 'Lincoln City', 'EFL', '#E31B23', '#FFFFFF', 'stripes'],
  ['MID', 'Middlesbrough', 'EFL', '#E11B22', '#FFFFFF', 'solid'],
  ['MLW', 'Millwall', 'EFL', '#001D5E', '#FFFFFF', 'solid'],
  ['NOR', 'Norwich City', 'EFL', '#FFF200', '#00A650', 'solid'],
  ['POR', 'Portsmouth', 'EFL', '#001489', '#FFFFFF', 'solid'],
  ['PNE', 'Preston North End', 'EFL', '#FFFFFF', '#1B2A4B', 'solid'],
  ['QPR', 'Queens Park Rangers', 'EFL', '#005CAB', '#FFFFFF', 'hoops'],
  ['SHU', 'Sheffield United', 'EFL', '#EE2737', '#FFFFFF', 'stripes'],
  ['SOU', 'Southampton', 'EFL', '#D71920', '#FFFFFF', 'stripes'],
  ['STK', 'Stoke City', 'EFL', '#E03A3E', '#FFFFFF', 'stripes'],
  ['SWA', 'Swansea City', 'EFL', '#FFFFFF', '#000000', 'solid'],
  ['WAT', 'Watford', 'EFL', '#FBEE23', '#000000', 'solid'],
  ['WBA', 'West Bromwich Albion', 'EFL', '#122F67', '#FFFFFF', 'stripes'],
  ['WHU', 'West Ham United', 'EFL', '#7A263A', '#1BB1E7', 'solid'],
  ['WOL', 'Wolverhampton Wanderers', 'EFL', '#FDB913', '#231F20', 'solid'],
  ['WRX', 'Wrexham', 'EFL', '#CE1126', '#FFFFFF', 'solid'],
];

export const CLUBS = LIST.map(([code, name, league, a, b, pattern]) => ({ code, name, league, a, b, pattern }));

const byCode = Object.fromEntries(CLUBS.map((c) => [c.code, c]));

export function clubOf(code) {
  return (code && byCode[code]) || null;
}

// A saved code that is not a club (a typo in a hand-edited file, or a club that has
// since dropped out of the list) is read as no club at all.
export function cleanClub(code) {
  return typeof code === 'string' && byCode[code] ? code : null;
}

// One group per league, clubs A–Z within it, for a picker.
export function clubGroups() {
  return LEAGUES.map(([id, label]) => ({
    id,
    label,
    clubs: CLUBS.filter((c) => c.league === id).sort((x, y) => x.name.localeCompare(y.name)),
  }));
}
