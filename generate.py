import json
import numpy as np
import tmdbsimple as tmdb
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.manifold import TSNE
from scipy.spatial.distance import cdist
from scipy.optimize import linear_sum_assignment
import time

tmdb.API_KEY = ''

GRID_SIZE = 10
TOTAL_MOVIES = GRID_SIZE * GRID_SIZE
FULL_DETAILS = True

print("Starting the program.")
genres_dict = {g['id']: g['name'] for g in tmdb.Genres().movie_list()['genres']}
movies_data = []
seen_movie_ids = set()

def process_and_add_movies(movies_list):
    added_count = 0
    for m in movies_list:
        if len(movies_data) >= TOTAL_MOVIES:
            break

        if m.get('poster_path') and m.get('overview') and m['id'] not in seen_movie_ids:
            try:
                runtime = "0"
                release_date = "0"
                trailer_url = None

                if FULL_DETAILS:
                    movie_details = tmdb.Movies(m['id']).info(append_to_response='videos')

                    runtime = movie_details.get('runtime', 0)
                    release_date = movie_details.get('release_date', '')

                    videos = movie_details.get('videos', {}).get('results', [])
                    for video in videos:
                        if video.get('site') == 'YouTube' and video.get('type') == 'Trailer':
                            trailer_url = f"https://www.youtube.com/watch?v={video.get('key')}"
                            break


                seen_movie_ids.add(m['id'])
                m_genres = [genres_dict[g_id] for g_id in m['genre_ids'] if g_id in genres_dict]
                combined_text = f"{' '.join(m_genres)} {m['overview']}"

                movies_data.append({
                    "id": m['id'],
                    "title": m['title'],
                    "poster": f"https://image.tmdb.org/t/p/w185{m['poster_path']}",
                    "text": combined_text,
                    "genres": m_genres,
                    "overview": m['overview'],
                    "release_date": release_date,
                    "runtime": runtime,
                    "trailer": trailer_url
                })
                added_count += 1

                #time.sleep(0.05)

            except Exception:
                continue

    return added_count

# Get up to 500 pages of popular movies
print("Extracting popular movies...")
page = 1
while len(movies_data) < TOTAL_MOVIES and page <= 500:
    try:
        popular_res = tmdb.Movies().popular(page=page)
        results = popular_res.get('results', [])
        if not results:
            break

        added = process_and_add_movies(results)
        print(f"Page {page} processed. Movies : {len(movies_data)}/{TOTAL_MOVIES}")
        page += 1
    except Exception as e:
        print(f"\nCould not find anymore popular movie at page {page}: {e}")
        break

# Fallback to broad discover
if len(movies_data) < TOTAL_MOVIES:
    print(f"\nBroad movie discover...")
    start_year, end_year = 1970, 2026
    years_pool = list(range(start_year, end_year + 1))
    year_page_pointers = {year: 1 for year in years_pool}

    while len(movies_data) < TOTAL_MOVIES and years_pool:
        for year in list(years_pool):
            if len(movies_data) >= TOTAL_MOVIES:
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

                if not movie_details or current_page >= total_pages or current_page >= 500:
                    years_pool.remove(year)
                    continue

                process_and_add_movies(results)
                year_page_pointers[year] += 1

            except Exception as e:
                time.sleep(1)

        print(f"Movies : {len(movies_data)}/{TOTAL_MOVIES}")

# Vectorize movies
print("\nVectorizing...")
texts = [m['text'] for m in movies_data]
vectorizer = TfidfVectorizer(stop_words='english')
tfidf_matrix = vectorizer.fit_transform(texts)

# Reduce to 2D
print("Reducing to 2D...")
tsne = TSNE(n_components=2, perplexity=30, random_state=42, init='pca')
coords_2d = tsne.fit_transform(tfidf_matrix.toarray())

coords_2d -= coords_2d.min(axis=0)
coords_2d /= coords_2d.max(axis=0)
coords_2d *= (GRID_SIZE - 1)

# Align on a grid
print("Converting to grid position...")
grid_coords = np.array([[x, y] for x in range(GRID_SIZE) for y in range(GRID_SIZE)])
distance_matrix = cdist(coords_2d, grid_coords, 'sqeuclidean')
row_ind, col_ind = linear_sum_assignment(distance_matrix)

# Construct the JSON
final_grid_data = []
for i, movie in enumerate(movies_data):
    grid_index = col_ind[i]
    grid_pos = grid_coords[grid_index]

    final_grid_data.append({
        "id": movie["id"],
        "title": movie["title"],
        "poster": movie["poster"],
        "x": int(grid_pos[0]),
        "y": int(grid_pos[1]),
        "genres": movie["genres"],
        "overview": movie["overview"],
        "release_date": movie["release_date"],
        "runtime": movie["runtime"],
        "trailer": movie["trailer"]
    })

with open('movies_grid.json', 'w', encoding='utf-8') as f:
    json.dump(final_grid_data, f, ensure_ascii=False, indent=4)

print("\nSuccess : 'movies_grid.json' has been generated.")