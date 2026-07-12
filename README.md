# Movie Finder
A web application that makes it easy to discover movies similar to others. 
It displays films on a grid, positioning them closer together or further apart based on how similar they are to each other.

## Demo
Todo

## Usage
To generate your own data, you need to supply 2 values in `constants.py` : your [TMDB API key](https://themoviedb.org/login) 
and the grid size you want.

Generating a dataset is a 3 step process :
- `movie_list.py` creates a list of GRID_SIZE² movies.
- `movie_details.py` adds details for every movie found.
- `movie_grid.py` generates a grid based on the movie details.

Run the 3 scripts in order and 4 json files should be generated in the data folder :
- `movies.json` a simple list of movies ids.
- `movie_details.json` a dictionnary associating a movie to its details.
- `movie_grid.json` the coordinates on a grid calculated for each movie.
- `movie_grid_adult.json` the same as the previous one but the grid also contains adult movies.

You can then simply open `index.html` in your favorite browser to display **the movie sorting grid**.
> Note : The browser can sometimes block the read access to the different json files. Simply open `index.html` in a small server.
> (ex: run `python3 -m http.server 8000` in the project folder, then open the web app.)


## Credits
This product uses the TMDB API but is not endorsed or certified by [TMDB](https://www.themoviedb.org/).

<img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_1-8ba2ac31f354005783fab473602c34c3f4fd207150182061e425d366e4f34596.svg" 
  alt="TMDB Logo" width="200"/>
