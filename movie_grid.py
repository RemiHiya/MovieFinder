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

# Resize in case the given list is too big for the grid
movie_ids = list(movie_details.keys())[:TOTAL_MOVIES]

print("Text preparation (title + genres + keywords)...")
texts = []
for m_id in movie_ids:
    details = movie_details[m_id]
    title_str = details['title']
    genres_str = " ".join(details.get('genres', []))
    keywords_str = " ".join(details.get('keywords', []))
    # Combine them to calculate the similarity
    combined_text = f"{title_str} {genres_str} {keywords_str}"
    texts.append(combined_text)

print("\nTF-IDF Vectorization...")
vectorizer = TfidfVectorizer(stop_words='english')
tfidf_matrix = vectorizer.fit_transform(texts)

print("Dimensionality reduction (2D T-SNE)...")
tsne = TSNE(n_components=2, perplexity=30, random_state=42, init='pca')
coords_2d = tsne.fit_transform(tfidf_matrix.toarray())

# Normalize the coordinates
coords_2d -= coords_2d.min(axis=0)
coords_2d /= coords_2d.max(axis=0)
coords_2d *= (GRID_SIZE - 1)

print("Calculating toroidal distances...")
def get_toroidal_distance_matrix(coords_1, coords_2, grid_size):
    # coords_1: t-SNE projection, coords_2: grid coordinates
    # We use numpy broadcasting to compare each point with each cell
    diff = np.abs(coords_1[:, np.newaxis, :] - coords_2[np.newaxis, :, :])

    # Torus formula: d = min(|x1 - x2|, GridSize - |x1 - x2|)
    diff = np.minimum(diff, grid_size - diff)

    # Squared Euclidean distance
    return np.sum(diff ** 2, axis=2)


grid_coords = np.array([[x, y] for x in range(GRID_SIZE) for y in range(GRID_SIZE)])
distance_matrix = get_toroidal_distance_matrix(coords_2d, grid_coords, GRID_SIZE)

print("Alignment on the infinite grid (Linear Sum Assignment)...")
row_ind, col_ind = linear_sum_assignment(distance_matrix)

print("Generating the movie_grid.json file...")
final_grid_data = []
for i, m_id in enumerate(movie_ids):
    grid_index = col_ind[i]
    grid_pos = grid_coords[grid_index]

    final_grid_data.append({
        "id": int(m_id),
        "x": int(grid_pos[0]),
        "y": int(grid_pos[1])
    })

save_to_json('data/movie_grid.json', final_grid_data)
print("\nSuccess: 'movie_grid.json' has been generated with X/Y positions.")