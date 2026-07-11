import json
import tmdbsimple as tmdb
import time
from constants import USER_API_KEY
from utils import save_to_json

tmdb.API_KEY = USER_API_KEY

print("Loading movie_details.json...")
try:
    with open('data/movie_details.json', 'r', encoding='utf-8') as f:
        movie_details = json.load(f)
except FileNotFoundError:
    print("Error: The file 'movie_details.json' cannot be found. Run movie_list.py first.")
    exit()

print("Enriching movie details (Keywords, Runtime, Trailer, Date, Adult)...")

total_movies = len(movie_details)
processed = 0

for movie_id_str, details in movie_details.items():
    if 'keywords' in details:
        processed += 1
        continue

    try:
        info = tmdb.Movies(int(movie_id_str)).info(append_to_response='videos,keywords')

        details['runtime'] = info.get('runtime', 0)
        details['release_date'] = info.get('release_date', '')
        details['adult'] = details.get('adult', info.get('adult', False))

        # Trailer extraction
        trailer_url = None
        videos = info.get('videos', {}).get('results', [])
        for video in videos:
            if video.get('site') == 'YouTube' and video.get('type') == 'Trailer':
                trailer_url = f"https://www.youtube.com/watch?v={video.get('key')}"
                break
        details['trailer'] = trailer_url

        # Keyword extraction
        keywords_data = info.get('keywords', {}).get('keywords', [])
        details['keywords'] = [k['name'] for k in keywords_data]

        processed += 1
        if processed % 100 == 0:
            print(f"Progress: {processed}/{total_movies} movies enriched...")
            save_to_json('data/movie_details.json', movie_details)

    except Exception as e:
        print(f"Error on movie ID {movie_id_str}: {e}")
        time.sleep(1)

save_to_json('data/movie_details.json', movie_details)
print("\nSuccess: 'movie_details.json' has been updated with all required information.")