import { convertFromGpsEpoch } from './gps-epoch';

describe('convertFromGpsEpoch', () => {
  it('converts GPS epoch seconds to Unix epoch seconds', () => {
    expect(convertFromGpsEpoch(0)).toBe(315964800);
    expect(convertFromGpsEpoch(60)).toBe(315964860);
  });
});
