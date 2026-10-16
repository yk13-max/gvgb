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

// [code, name, league, first colour, second colour, pattern, Wikipedia article]
// The article title is how the real badge is found (see logos.js); Wikipedia's own
// redirects forgive most spellings of a club's name.
const LIST = [
  // Premier League
  ['ARS', 'Arsenal', 'ENG', '#EF0107', '#FFFFFF', 'solid', 'Arsenal F.C.'],
  ['AVL', 'Aston Villa', 'ENG', '#670E36', '#95BFE5', 'solid', 'Aston Villa F.C.'],
  ['BOU', 'Bournemouth', 'ENG', '#DA291C', '#000000', 'stripes', 'A.F.C. Bournemouth'],
  ['BRE', 'Brentford', 'ENG', '#E30613', '#FFFFFF', 'stripes', 'Brentford F.C.'],
  ['BHA', 'Brighton & Hove Albion', 'ENG', '#0057B8', '#FFFFFF', 'stripes', 'Brighton & Hove Albion F.C.'],
  ['CHE', 'Chelsea', 'ENG', '#034694', '#FFFFFF', 'solid', 'Chelsea F.C.'],
  ['COV', 'Coventry City', 'ENG', '#78D0F0', '#FFFFFF', 'solid', 'Coventry City F.C.'],
  ['CRY', 'Crystal Palace', 'ENG', '#1B458F', '#C4122E', 'stripes', 'Crystal Palace F.C.'],
  ['EVE', 'Everton', 'ENG', '#003399', '#FFFFFF', 'solid', 'Everton F.C.'],
  ['FUL', 'Fulham', 'ENG', '#FFFFFF', '#000000', 'solid', 'Fulham F.C.'],
  ['HUL', 'Hull City', 'ENG', '#F5A12D', '#000000', 'stripes', 'Hull City A.F.C.'],
  ['IPS', 'Ipswich Town', 'ENG', '#0044AA', '#FFFFFF', 'solid', 'Ipswich Town F.C.'],
  ['LEE', 'Leeds United', 'ENG', '#FFFFFF', '#1D428A', 'solid', 'Leeds United F.C.'],
  ['LIV', 'Liverpool', 'ENG', '#C8102E', '#FFFFFF', 'solid', 'Liverpool F.C.'],
  ['MCI', 'Manchester City', 'ENG', '#6CABDD', '#FFFFFF', 'solid', 'Manchester City F.C.'],
  ['MUN', 'Manchester United', 'ENG', '#DA291C', '#000000', 'solid', 'Manchester United F.C.'],
  ['NEW', 'Newcastle United', 'ENG', '#241F20', '#FFFFFF', 'stripes', 'Newcastle United F.C.'],
  ['NFO', 'Nottingham Forest', 'ENG', '#DD0000', '#FFFFFF', 'solid', 'Nottingham Forest F.C.'],
  ['SUN', 'Sunderland', 'ENG', '#EB172B', '#FFFFFF', 'stripes', 'Sunderland A.F.C.'],
  ['TOT', 'Tottenham Hotspur', 'ENG', '#FFFFFF', '#132257', 'solid', 'Tottenham Hotspur F.C.'],
  // La Liga
  ['ALA', 'Alavés', 'ESP', '#0761AF', '#FFFFFF', 'stripes', 'Deportivo Alavés'],
  ['ATH', 'Athletic Club', 'ESP', '#EE2523', '#FFFFFF', 'stripes', 'Athletic Bilbao'],
  ['ATM', 'Atlético Madrid', 'ESP', '#CB3524', '#FFFFFF', 'stripes', 'Atlético Madrid'],
  ['BAR', 'Barcelona', 'ESP', '#A50044', '#004D98', 'stripes', 'FC Barcelona'],
  ['BET', 'Real Betis', 'ESP', '#0BB363', '#FFFFFF', 'stripes', 'Real Betis'],
  ['CEL', 'Celta Vigo', 'ESP', '#8AC3EE', '#FFFFFF', 'solid', 'RC Celta de Vigo'],
  ['DEP', 'Deportivo La Coruña', 'ESP', '#005BAC', '#FFFFFF', 'stripes', 'Deportivo de La Coruña'],
  ['ELC', 'Elche', 'ESP', '#FFFFFF', '#00843D', 'solid', 'Elche CF'],
  ['ESP', 'Espanyol', 'ESP', '#007FC8', '#FFFFFF', 'stripes', 'RCD Espanyol'],
  ['GET', 'Getafe', 'ESP', '#005999', '#FFFFFF', 'solid', 'Getafe CF'],
  ['LEV', 'Levante', 'ESP', '#004B95', '#A3182C', 'stripes', 'Levante UD'],
  ['MAL', 'Málaga', 'ESP', '#0094D8', '#FFFFFF', 'stripes', 'Málaga CF'],
  ['OSA', 'Osasuna', 'ESP', '#D91A21', '#0A346F', 'solid', 'CA Osasuna'],
  ['RAC', 'Racing Santander', 'ESP', '#007A3D', '#FFFFFF', 'solid', 'Racing de Santander'],
  ['RAY', 'Rayo Vallecano', 'ESP', '#FFFFFF', '#E53027', 'sash', 'Rayo Vallecano'],
  ['RMA', 'Real Madrid', 'ESP', '#FFFFFF', '#FEBE10', 'solid', 'Real Madrid CF'],
  ['RSO', 'Real Sociedad', 'ESP', '#0067B1', '#FFFFFF', 'stripes', 'Real Sociedad'],
  ['SEV', 'Sevilla', 'ESP', '#FFFFFF', '#D4021D', 'solid', 'Sevilla FC'],
  ['VAL', 'Valencia', 'ESP', '#FFFFFF', '#EE8707', 'solid', 'Valencia CF'],
  ['VIL', 'Villarreal', 'ESP', '#FFE667', '#005187', 'solid', 'Villarreal CF'],
  // Serie A
  ['ATA', 'Atalanta', 'ITA', '#1E71B8', '#000000', 'stripes', 'Atalanta BC'],
  ['BOL', 'Bologna', 'ITA', '#1A2F48', '#A21C26', 'stripes', 'Bologna FC 1909'],
  ['CAG', 'Cagliari', 'ITA', '#B01E2B', '#1A2A5E', 'halves', 'Cagliari Calcio'],
  ['COM', 'Como', 'ITA', '#0F2E5A', '#FFFFFF', 'solid', 'Como 1907'],
  ['FIO', 'Fiorentina', 'ITA', '#482E92', '#FFFFFF', 'solid', 'ACF Fiorentina'],
  ['FRO', 'Frosinone', 'ITA', '#FFDD00', '#0033A0', 'solid', 'Frosinone Calcio'],
  ['GEN', 'Genoa', 'ITA', '#AE1A1F', '#1F2E5A', 'halves', 'Genoa CFC'],
  ['INT', 'Inter', 'ITA', '#0068A8', '#000000', 'stripes', 'Inter Milan'],
  ['JUV', 'Juventus', 'ITA', '#000000', '#FFFFFF', 'stripes', 'Juventus FC'],
  ['LAZ', 'Lazio', 'ITA', '#87D8F7', '#FFFFFF', 'solid', 'SS Lazio'],
  ['LEC', 'Lecce', 'ITA', '#FFDD00', '#D71920', 'stripes', 'US Lecce'],
  ['MIL', 'AC Milan', 'ITA', '#FB090B', '#000000', 'stripes', 'AC Milan'],
  ['MON', 'Monza', 'ITA', '#E30613', '#FFFFFF', 'solid', 'AC Monza'],
  ['NAP', 'Napoli', 'ITA', '#12A0D7', '#FFFFFF', 'solid', 'SSC Napoli'],
  ['PAR', 'Parma', 'ITA', '#FFDC00', '#1B3F8B', 'solid', 'Parma Calcio 1913'],
  ['ROM', 'Roma', 'ITA', '#8E1F2F', '#F0BC42', 'solid', 'AS Roma'],
  ['SAS', 'Sassuolo', 'ITA', '#00A752', '#000000', 'stripes', 'US Sassuolo Calcio'],
  ['TOR', 'Torino', 'ITA', '#8A1E03', '#FFFFFF', 'solid', 'Torino FC'],
  ['UDI', 'Udinese', 'ITA', '#000000', '#FFFFFF', 'stripes', 'Udinese Calcio'],
  ['VEN', 'Venezia', 'ITA', '#000000', '#FF7F00', 'solid', 'Venezia FC'],
  // Bundesliga
  ['FCA', 'Augsburg', 'GER', '#FFFFFF', '#BA3733', 'solid', 'FC Augsburg'],
  ['UNB', 'Union Berlin', 'GER', '#EB1923', '#FFFFFF', 'solid', '1. FC Union Berlin'],
  ['SVW', 'Werder Bremen', 'GER', '#1D9053', '#FFFFFF', 'solid', 'SV Werder Bremen'],
  ['BVB', 'Borussia Dortmund', 'GER', '#FDE100', '#000000', 'solid', 'Borussia Dortmund'],
  ['ELV', 'Elversberg', 'GER', '#005CA9', '#FFFFFF', 'stripes', 'SV Elversberg'],
  ['SGE', 'Eintracht Frankfurt', 'GER', '#000000', '#E1000F', 'solid', 'Eintracht Frankfurt'],
  ['SCF', 'Freiburg', 'GER', '#E2001A', '#FFFFFF', 'solid', 'SC Freiburg'],
  ['HSV', 'Hamburger SV', 'GER', '#FFFFFF', '#0A3F86', 'solid', 'Hamburger SV'],
  ['TSG', 'Hoffenheim', 'GER', '#1C63B7', '#FFFFFF', 'solid', 'TSG 1899 Hoffenheim'],
  ['KOE', 'Köln', 'GER', '#FFFFFF', '#ED1C24', 'solid', '1. FC Köln'],
  ['RBL', 'RB Leipzig', 'GER', '#FFFFFF', '#DD0741', 'solid', 'RB Leipzig'],
  ['B04', 'Bayer Leverkusen', 'GER', '#E32221', '#000000', 'solid', 'Bayer 04 Leverkusen'],
  ['M05', 'Mainz 05', 'GER', '#C3141E', '#FFFFFF', 'solid', '1. FSV Mainz 05'],
  ['BMG', 'Borussia Mönchengladbach', 'GER', '#FFFFFF', '#000000', 'solid', 'Borussia Mönchengladbach'],
  ['FCB', 'Bayern Munich', 'GER', '#DC052D', '#FFFFFF', 'solid', 'FC Bayern Munich'],
  ['SCP', 'Paderborn', 'GER', '#005CA9', '#000000', 'solid', 'SC Paderborn 07'],
  ['S04', 'Schalke 04', 'GER', '#004D9D', '#FFFFFF', 'solid', 'FC Schalke 04'],
  ['VFB', 'Stuttgart', 'GER', '#FFFFFF', '#E32219', 'hoops', 'VfB Stuttgart'],
  // Ligue 1
  ['SCO', 'Angers', 'FRA', '#000000', '#FFFFFF', 'stripes', 'Angers SCO'],
  ['AJA', 'Auxerre', 'FRA', '#FFFFFF', '#1D4596', 'solid', 'AJ Auxerre'],
  ['BRS', 'Brest', 'FRA', '#FF0000', '#FFFFFF', 'stripes', 'Stade Brestois 29'],
  ['HAC', 'Le Havre', 'FRA', '#8CCBF4', '#17408B', 'halves', 'Le Havre AC'],
  ['LEM', 'Le Mans', 'FRA', '#C8102E', '#F6B21D', 'solid', 'Le Mans FC'],
  ['RCL', 'Lens', 'FRA', '#FFD200', '#E30613', 'solid', 'RC Lens'],
  ['LOS', 'Lille', 'FRA', '#E01E13', '#FFFFFF', 'solid', 'Lille OSC'],
  ['FCL', 'Lorient', 'FRA', '#FF6600', '#000000', 'solid', 'FC Lorient'],
  ['LYO', 'Lyon', 'FRA', '#FFFFFF', '#1B2A7B', 'solid', 'Olympique Lyonnais'],
  ['MAR', 'Marseille', 'FRA', '#FFFFFF', '#2FAEE0', 'solid', 'Olympique de Marseille'],
  ['ASM', 'Monaco', 'FRA', '#E51B22', '#FFFFFF', 'sash', 'AS Monaco FC'],
  ['OGC', 'Nice', 'FRA', '#ED1C24', '#000000', 'stripes', 'OGC Nice'],
  ['PFC', 'Paris FC', 'FRA', '#0E2A6F', '#FFFFFF', 'solid', 'Paris FC'],
  ['PSG', 'Paris Saint-Germain', 'FRA', '#004170', '#DA291C', 'solid', 'Paris Saint-Germain F.C.'],
  ['REN', 'Rennes', 'FRA', '#E4002B', '#000000', 'solid', 'Stade Rennais F.C.'],
  ['STR', 'Strasbourg', 'FRA', '#009FE3', '#FFFFFF', 'solid', 'RC Strasbourg Alsace'],
  ['TOU', 'Toulouse', 'FRA', '#4B2E83', '#FFFFFF', 'solid', 'Toulouse FC'],
  ['EST', 'Troyes', 'FRA', '#1A3C8E', '#FFFFFF', 'solid', 'ES Troyes AC'],
  // Championship
  ['BIR', 'Birmingham City', 'EFL', '#0000FF', '#FFFFFF', 'solid', 'Birmingham City F.C.'],
  ['BLB', 'Blackburn Rovers', 'EFL', '#009EE0', '#FFFFFF', 'halves', 'Blackburn Rovers F.C.'],
  ['BWN', 'Bolton Wanderers', 'EFL', '#FFFFFF', '#263C7E', 'solid', 'Bolton Wanderers F.C.'],
  ['BRC', 'Bristol City', 'EFL', '#E21C38', '#FFFFFF', 'solid', 'Bristol City F.C.'],
  ['BUR', 'Burnley', 'EFL', '#6C1D45', '#99D6EA', 'solid', 'Burnley F.C.'],
  ['CAR', 'Cardiff City', 'EFL', '#0070B5', '#FFFFFF', 'solid', 'Cardiff City F.C.'],
  ['CHA', 'Charlton Athletic', 'EFL', '#D4021D', '#FFFFFF', 'solid', 'Charlton Athletic F.C.'],
  ['DER', 'Derby County', 'EFL', '#FFFFFF', '#000000', 'solid', 'Derby County F.C.'],
  ['LIN', 'Lincoln City', 'EFL', '#E31B23', '#FFFFFF', 'stripes', 'Lincoln City F.C.'],
  ['MID', 'Middlesbrough', 'EFL', '#E11B22', '#FFFFFF', 'solid', 'Middlesbrough F.C.'],
  ['MLW', 'Millwall', 'EFL', '#001D5E', '#FFFFFF', 'solid', 'Millwall F.C.'],
  ['NOR', 'Norwich City', 'EFL', '#FFF200', '#00A650', 'solid', 'Norwich City F.C.'],
  ['POR', 'Portsmouth', 'EFL', '#001489', '#FFFFFF', 'solid', 'Portsmouth F.C.'],
  ['PNE', 'Preston North End', 'EFL', '#FFFFFF', '#1B2A4B', 'solid', 'Preston North End F.C.'],
  ['QPR', 'Queens Park Rangers', 'EFL', '#005CAB', '#FFFFFF', 'hoops', 'Queens Park Rangers F.C.'],
  ['SHU', 'Sheffield United', 'EFL', '#EE2737', '#FFFFFF', 'stripes', 'Sheffield United F.C.'],
  ['SOU', 'Southampton', 'EFL', '#D71920', '#FFFFFF', 'stripes', 'Southampton F.C.'],
  ['STK', 'Stoke City', 'EFL', '#E03A3E', '#FFFFFF', 'stripes', 'Stoke City F.C.'],
  ['SWA', 'Swansea City', 'EFL', '#FFFFFF', '#000000', 'solid', 'Swansea City A.F.C.'],
  ['WAT', 'Watford', 'EFL', '#FBEE23', '#000000', 'solid', 'Watford F.C.'],
  ['WBA', 'West Bromwich Albion', 'EFL', '#122F67', '#FFFFFF', 'stripes', 'West Bromwich Albion F.C.'],
  ['WHU', 'West Ham United', 'EFL', '#7A263A', '#1BB1E7', 'solid', 'West Ham United F.C.'],
  ['WOL', 'Wolverhampton Wanderers', 'EFL', '#FDB913', '#231F20', 'solid', 'Wolverhampton Wanderers F.C.'],
  ['WRX', 'Wrexham', 'EFL', '#CE1126', '#FFFFFF', 'solid', 'Wrexham A.F.C.'],
];

export const CLUBS = LIST.map(([code, name, league, a, b, pattern, wiki]) => ({ code, name, league, a, b, pattern, wiki }));

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
