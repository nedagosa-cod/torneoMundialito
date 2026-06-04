import urllib.request

def main():
    url = "https://raw.githubusercontent.com/murilofarias10/world-cup-2026/main/fifa-world-cup-2026-UTC.csv"
    output_path = "scratch/fifa-world-cup-2026-UTC.csv"
    try:
        print(f"Downloading {url}...")
        urllib.request.urlretrieve(url, output_path)
        with open(output_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        print(f"Successfully downloaded! Total lines: {len(lines)}")
        for line in lines[:15]:
            print(line.strip())
    except Exception as e:
        print("Error downloading:", e)

if __name__ == "__main__":
    main()
