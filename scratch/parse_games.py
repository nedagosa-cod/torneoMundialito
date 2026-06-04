import re
import json

def main():
    # Read Code.gs
    with open('gas/Code.gs', 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the games list inside populateMatchesWithHardcodedData
    # Look for games = [ ... ];
    match = re.search(r'const games = (\[.*?\]);', content, re.DOTALL)
    if not match:
        print("Could not find games list!")
        return

    games_str = match.group(1)
    
    # Parse as JSON
    try:
        games = json.loads(games_str)
        print(f"Successfully parsed {len(games)} games!")
        # Print the first 5 games as a sample
        for g in games[:5]:
            print(g)
    except Exception as e:
        print("Error parsing JSON:", e)

if __name__ == "__main__":
    main()
