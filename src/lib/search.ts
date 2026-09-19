import type { Game } from '../types/game';

/** Returns games whose titles contain the query, ignoring case and surrounding whitespace. */
export function filterGamesByTitle(games: Game[], query: string): Game[] {
    return games.filter((game) => gameTitleMatches(game.title, query));
}

/** Returns whether a title matches a search query, ignoring case and whitespace. */
export function gameTitleMatches(title: string, query: string): boolean {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return normalizedQuery === '' || title.toLocaleLowerCase().includes(normalizedQuery);
}
