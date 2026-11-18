import { describe, expect, it } from 'vitest';
import { addReview, allCards, dayStart, getSettings, putCard, reviewsSince, saveSettings, DEFAULT_SETTINGS } from './db';
import { Rating, SOUND_CARDS, newCard, rate } from './deck';

describe('IndexedDB store', () => {
  it('round-trips cards, reviews and settings', async () => {
    const now = new Date();
    const row = rate(newCard(SOUND_CARDS[0], now), Rating.Good, now);
    await putCard(row);
    const [stored] = await allCards();
    expect(stored.id).toBe(row.id);
    expect(new Date(stored.fsrs.due).getTime()).toBe(new Date(row.fsrs.due).getTime());

    await addReview({ cardId: row.id, rating: Rating.Good, ts: now.getTime(), state: 0, elapsedMs: 1200 });
    expect(await reviewsSince(dayStart(now.getTime()))).toHaveLength(1);
    expect(await reviewsSince(now.getTime() + 1)).toHaveLength(0);

    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    await saveSettings({ ...DEFAULT_SETTINGS, newPerDay: 15 });
    expect((await getSettings()).newPerDay).toBe(15);
  });
});
