import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.manifold import TSNE
from scipy.optimize import linear_sum_assignment
from constants import GRID_SIZE
from utils import save_to_json

TOTAL_MOVIES = GRID_SIZE * GRID_SIZE

print("Loading details...")
with open('data/movie_details.json', 'r', encoding='utf-8') as f:
    movie_details = json.load(f)


def get_toroidal_distance_matrix(coords_1, coords_2, grid_size):
    diff = np.abs(coords_1[:, np.newaxis, :] - coords_2[np.newaxis, :, :])
    diff = np.minimum(diff, grid_size - diff)
    return np.sum(diff ** 2, axis=2)


def generate_grid_for_movies(selected_movie_ids, output_filename):
    print(f"\n--- Generating {output_filename} ({len(selected_movie_ids)} movies) ---")

    movie_ids = selected_movie_ids[:TOTAL_MOVIES]

    texts = []
    for m_id in movie_ids:
        details = movie_details[m_id]
        title_str = details['title']
        genres_str = " ".join(details.get('genres', []))
        keywords_str = " ".join(details.get('keywords', []))
        combined_text = f"{title_str} {genres_str} {keywords_str}"
        texts.append(combined_text)

    print("TF-IDF Vectorization...")
    vectorizer = TfidfVectorizer(stop_words='english')
    tfidf_matrix = vectorizer.fit_transform(texts)

    print("Dimensionality reduction (2D T-SNE)...")
    tsne = TSNE(n_components=2, perplexity=30, random_state=42, init='pca')
    coords_2d = tsne.fit_transform(tfidf_matrix.toarray())

    coords_2d -= coords_2d.min(axis=0)
    coords_2d /= coords_2d.max(axis=0)
    coords_2d *= (GRID_SIZE - 1)

    grid_coords = np.array([[x, y] for x in range(GRID_SIZE) for y in range(GRID_SIZE)])
    distance_matrix = get_toroidal_distance_matrix(coords_2d, grid_coords, GRID_SIZE)

    print("Alignment on the infinite grid (Linear Sum Assignment)...")
    row_ind, col_ind = linear_sum_assignment(distance_matrix)

    final_grid_data = []
    for i, m_id in enumerate(movie_ids):
        grid_index = col_ind[i]
        grid_pos = grid_coords[grid_index]

        final_grid_data.append({
            "id": int(m_id),
            "x": int(grid_pos[0]),
            "y": int(grid_pos[1])
        })

    save_to_json(f'data/{output_filename}', final_grid_data)
    print(f"Success: '{output_filename}' generated.")


# Non-adult movies
non_adult_ids = [m_id for m_id, d in movie_details.items() if not d.get('adult', False)]
generate_grid_for_movies(non_adult_ids, 'movie_grid.json')

# 2. All movies (adult included)
all_ids = list(movie_details.keys())
generate_grid_for_movies(all_ids, 'movie_grid_adult.json')