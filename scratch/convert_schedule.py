import csv
import json
from datetime import datetime, timedelta

translation_dict = {
    'Algeria': 'Argelia',
    'Argentina': 'Argentina',
    'Australia': 'Australia',
    'Austria': 'Austria',
    'BOL/SUR/IRQ': 'Irak',
    'Belgium': 'Bélgica',
    'Brazil': 'Brasil',
    'Cabo Verde': 'Cabo Verde',
    'Canada': 'Canadá',
    'Colombia': 'Colombia',
    'Croatia': 'Croacia',
    'Curaçao': 'Curazao',
    'Curaao': 'Curazao',
    "Côte d'Ivoire": "Costa de Marfil",
    "Cte d'Ivoire": "Costa de Marfil",
    'DEN/MKD/CZE/IRL': 'República Checa',
    'Ecuador': 'Ecuador',
    'Egypt': 'Egipto',
    'England': 'Inglaterra',
    'France': 'Francia',
    'Germany': 'Alemania',
    'Ghana': 'Ghana',
    'Haiti': 'Haití',
    'IR Iran': 'Irán',
    'ITA/NIR/WAL/BIH': 'Bosnia y Herzegovina',
    'Japan': 'Japón',
    'Jordan': 'Jordania',
    'Korea Republic': 'Corea del Sur',
    'Mexico': 'México',
    'Morocco': 'Marruecos',
    'NCL/JAM/COD': 'República Democrática del Congo',
    'Netherlands': 'Países Bajos',
    'New Zealand': 'Nueva Zelanda',
    'Norway': 'Noruega',
    'Panama': 'Panamá',
    'Paraguay': 'Paraguay',
    'Portugal': 'Portugal',
    'Qatar': 'Catar',
    'Saudi Arabia': 'Arabia Saudita',
    'Scotland': 'Escocia',
    'Senegal': 'Senegal',
    'South Africa': 'Sudáfrica',
    'Spain': 'España',
    'Switzerland': 'Suiza',
    'TUR/ROU/SVK/KOS': 'Turquía',
    'To be announced': 'Por definir',
    'Tunisia': 'Túnez',
    'UKR/SWE/POL/ALB': 'Suecia',
    'USA': 'Estados Unidos',
    'Uruguay': 'Uruguay',
    'Uzbekistan': 'Uzbekistán',
    '1A': '1° Grupo A', '1B': '1° Grupo B', '1C': '1° Grupo C', '1D': '1° Grupo D', '1E': '1° Grupo E', '1F': '1° Grupo F',
    '1G': '1° Grupo G', '1H': '1° Grupo H', '1I': '1° Grupo I', '1J': '1° Grupo J', '1K': '1° Grupo K', '1L': '1° Grupo L',
    '2A': '2° Grupo A', '2B': '2° Grupo B', '2C': '2° Grupo C', '2D': '2° Grupo D', '2E': '2° Grupo E', '2F': '2° Grupo F',
    '2G': '2° Grupo G', '2H': '2° Grupo H', '2I': '2° Grupo I', '2J': '2° Grupo J', '2K': '2° Grupo K', '2L': '2° Grupo L',
    '3ABCDF': '3° Grupo A/B/C/D/F', '3AEHIJ': '3° Grupo A/E/H/I/J', '3BEFIJ': '3° Grupo B/E/F/I/J',
    '3CDFGH': '3° Grupo C/D/F/G/H', '3CEFHI': '3° Grupo C/E/F/H/I', '3DEIJL': '3° Grupo D/E/I/J/L',
    '3EFGIJ': '3° Grupo E/F/G/I/J', '3EHIJK': '3° Grupo E/H/I/J/K'
}

knockout_mappings = {
    89: ("Ganador Partido 74", "Ganador Partido 77"),
    90: ("Ganador Partido 73", "Ganador Partido 75"),
    91: ("Ganador Partido 76", "Ganador Partido 78"),
    92: ("Ganador Partido 79", "Ganador Partido 80"),
    93: ("Ganador Partido 83", "Ganador Partido 84"),
    94: ("Ganador Partido 81", "Ganador Partido 82"),
    95: ("Ganador Partido 86", "Ganador Partido 88"),
    96: ("Ganador Partido 85", "Ganador Partido 87"),
    97: ("Ganador Partido 89", "Ganador Partido 90"),
    98: ("Ganador Partido 93", "Ganador Partido 94"),
    99: ("Ganador Partido 91", "Ganador Partido 92"),
    100: ("Ganador Partido 95", "Ganador Partido 96"),
    101: ("Ganador Partido 97", "Ganador Partido 98"),
    102: ("Ganador Partido 99", "Ganador Partido 100"),
    103: ("Perdedor Partido 101", "Perdedor Partido 102"),
    104: ("Ganador Partido 101", "Ganador Partido 102"),
}

def translate_team(name):
    return translation_dict.get(name, name)

def main():
    games = []
    with open('scratch/fifa-world-cup-2026-UTC.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            match_num = int(row['Match Number'])
            round_num = row['Round Number']
            date_str = row['Date']
            location = row['Location']
            home_team_en = row['Home Team']
            away_team_en = row['Away Team']
            group_col = row['Group']

            # Timezone conversion: UTC to Colombia Time (UTC-5)
            # Input format: DD/MM/YYYY HH:MM
            dt = datetime.strptime(date_str, "%d/%m/%Y %H:%M")
            colombia_dt = dt - timedelta(hours=5)

            # Output format: MM/DD/YYYY HH:MM (expected by Code.gs parsing logic)
            local_date_colombia = colombia_dt.strftime("%m/%d/%Y %H:%M")

            # Determine teams
            if match_num >= 89:
                home_team_es, away_team_es = knockout_mappings[match_num]
            else:
                home_team_es = translate_team(home_team_en)
                away_team_es = translate_team(away_team_en)

            # Determine group and matchType
            if group_col.startswith('Group'):
                group = group_col.replace('Group ', '').strip()
                match_type = 'group'
            elif round_num == 'Round of 32':
                group = 'R32'
                match_type = 'r32'
            elif round_num == 'Round of 16':
                group = 'R16'
                match_type = 'r16'
            elif round_num == 'Quarter Finals':
                group = 'QF'
                match_type = 'qf'
            elif round_num == 'Semi Finals':
                group = 'SF'
                match_type = 'sf'
            elif match_num == 103:
                group = '3RD'
                match_type = 'third'
            elif match_num == 104:
                group = 'FINAL'
                match_type = 'final'
            else:
                group = 'A'
                match_type = 'group'

            game = {
                "id": str(match_num),
                "group": group,
                "local_date": local_date_colombia,
                "type": match_type,
                "finished": "FALSE",
                "time_elapsed": "notstarted",
                "home_score": "0",
                "away_score": "0",
                "home_team_name_en": home_team_es,
                "away_team_name_en": away_team_es
            }
            games.append(game)

    # Sort games by Match Number to keep it ordered
    games.sort(key=lambda x: int(x['id']))

    # Write as formatted JSON file
    with open('scratch/games_colombia.json', 'w', encoding='utf-8') as f:
        json.dump(games, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(games)} games in scratch/games_colombia.json!")
    
    # Print a sample of some matches to verify
    print("\nSAMPLE GROUP STAGE:")
    for g in games[:3]:
        print(f"Match {g['id']} ({g['group']}): {g['home_team_name_en']} vs {g['away_team_name_en']} @ {g['local_date']}")
    
    print("\nSAMPLE KNOCKOUT STAGE (R32):")
    for g in games[72:75]:
        print(f"Match {g['id']} ({g['group']}): {g['home_team_name_en']} vs {g['away_team_name_en']} @ {g['local_date']}")

    print("\nSAMPLE FINAL STAGE:")
    for g in games[102:]:
        print(f"Match {g['id']} ({g['group']}): {g['home_team_name_en']} vs {g['away_team_name_en']} @ {g['local_date']}")

if __name__ == "__main__":
    main()
