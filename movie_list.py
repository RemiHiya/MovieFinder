import tmdbsimple as tmdb
import time
from utils import save_to_json
from constants import *

tmdb.API_KEY = USER_API_KEY

TOTAL_MOVIES = GRID_SIZE * GRID_SIZE

print("Starting the retrieval of the movie list...")
genres_dict = {g['id']: g['name'] for g in tmdb.Genres().movie_list()['genres']}

movie_ids = []
movie_details = {}
seen_movie_ids = set()


def process_and_add_movies(movies_list):
    added_count = 0
    for m in movies_list:
        if len(movie_ids) >= TOTAL_MOVIES:
            break

        if m.get('poster_path') and m.get('overview') and m['id'] not in seen_movie_ids:
            seen_movie_ids.add(m['id'])
            m_genres = [genres_dict[g_id] for g_id in m['genre_ids'] if g_id in genres_dict]

            movie_ids.append(m['id'])
            movie_details[m['id']] = {
                "title": m['title'],
                "poster": f"https://image.tmdb.org/t/p/w185{m['poster_path']}",
                "genres": m_genres,
                "overview": m['overview']
            }
            added_count += 1
    return added_count


print("Extracting popular movies...")
page = 1
while len(movie_ids) < TOTAL_MOVIES and page <= 500:
    try:
        popular_res = tmdb.Movies().popular(page=page)
        results = popular_res.get('results', [])
        if not results:
            break

        process_and_add_movies(results)
        print(f"Page {page} processed. Movies: {len(movie_ids)}/{TOTAL_MOVIES}")
        page += 1
    except Exception as e:
        print(f"\nError or end of popular movies at page {page}: {e}")
        break

if len(movie_ids) < TOTAL_MOVIES:
    print(f"\nBroad search (Discover)...")
    start_year, end_year = 1970, 2026
    years_pool = list(range(start_year, end_year + 1))
    year_page_pointers = {year: 1 for year in years_pool}

    while len(movie_ids) < TOTAL_MOVIES and years_pool:
        for year in list(years_pool):
            if len(movie_ids) >= TOTAL_MOVIES:
                break

            current_page = year_page_pointers[year]
            try:
                discover_query = tmdb.Discover().movie(
                    primary_release_year=year,
                    sort_by='popularity.desc',
                    page=current_page
                )
                results = discover_query.get('results', [])
                total_pages = discover_query.get('total_pages', 0)

                if current_page >= total_pages or current_page >= 500:
                    if year in years_pool:
                        years_pool.remove(year)
                    continue

                process_and_add_movies(results)
                year_page_pointers[year] += 1
            except Exception as e:
                print(e)
                time.sleep(1)
        print(f"Movies: {len(movie_ids)}/{TOTAL_MOVIES}")

save_to_json('data/movies.json', movie_ids)
save_to_json('data/movie_details.json', movie_details)

print("\nSuccess: 'movies.json' and a pre-filled 'movie_details.json' have been generated.")