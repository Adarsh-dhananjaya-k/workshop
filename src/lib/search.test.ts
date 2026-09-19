import { describe, expect, it } from 'vitest';
import type { Game } from '../types/game';
import { filterGamesByTitle, gameTitleMatches } from './search';

const games: Game[] = [
    {
        id: 1,
        title: 'DevOps Dominion',
        description: 'Strategy game',
        starRating: 4.5,
        category: null,
        publisher: null,
    },
    {
        id: 2,
        title: 'Pipeline Conquest',
        description: 'Strategy game',
        starRating: 4.2,
        category: null,
        publisher: null,
    },
];

describe('filterGamesByTitle', () => {
    it('returns all games for an empty query', () => {
        expect(filterGamesByTitle(games, '')).toEqual(games);
    });

    it('matches titles case-insensitively and ignores surrounding whitespace', () => {
        expect(filterGamesByTitle(games, '  DEVOPS  ')).toEqual([games[0]]);
    });

    it('returns an empty collection when no title matches', () => {
        expect(filterGamesByTitle(games, 'unknown')).toEqual([]);
    });

    it('matches an individual title for client-side filtering', () => {
        expect(gameTitleMatches('Pipeline Conquest', 'LINE')).toBe(true);
        expect(gameTitleMatches('Pipeline Conquest', 'unknown')).toBe(false);
    });
});
