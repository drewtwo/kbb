import { getEmptyLeaguesMessage } from '../lib/teamstable-empty-state';

describe('getEmptyLeaguesMessage', () => {
  it('returns a sport-specific empty state message for MLB', () => {
    expect(getEmptyLeaguesMessage('mlb')).toBe("You don't have any MLB leagues");
  });

  it('returns a generic message for the all-sports view', () => {
    expect(getEmptyLeaguesMessage('all')).toBe("You don't have any leagues in any sport");
  });
});
