export type JourneyLevel = {
  level: number;
  diamonds: number;
  validDays: number;
  hours: number;
  matches: number;
  rewardCoins: number;
  rewardCash: number;
};

export const journeyLevels: JourneyLevel[] = [
  { level: 1, diamonds: 1000, validDays: 1, hours: 1, matches: 10, rewardCoins: 0, rewardCash: 0 },
  { level: 2, diamonds: 3000, validDays: 1, hours: 2, matches: 20, rewardCoins: 0, rewardCash: 0 },
  { level: 3, diamonds: 6000, validDays: 2, hours: 4, matches: 30, rewardCoins: 0, rewardCash: 0 },
  { level: 4, diamonds: 10000, validDays: 2, hours: 6, matches: 40, rewardCoins: 0, rewardCash: 0 },
  { level: 5, diamonds: 15000, validDays: 3, hours: 8, matches: 50, rewardCoins: 0, rewardCash: 0 },
  { level: 6, diamonds: 22000, validDays: 4, hours: 10, matches: 60, rewardCoins: 0, rewardCash: 0 },
  { level: 7, diamonds: 30000, validDays: 5, hours: 12, matches: 70, rewardCoins: 0, rewardCash: 0 },
  { level: 8, diamonds: 40000, validDays: 6, hours: 15, matches: 80, rewardCoins: 0, rewardCash: 0 },
  { level: 9, diamonds: 50000, validDays: 7, hours: 17, matches: 90, rewardCoins: 0, rewardCash: 0 },
  { level: 10, diamonds: 60000, validDays: 8, hours: 20, matches: 100, rewardCoins: 0, rewardCash: 0 },
  { level: 11, diamonds: 70000, validDays: 9, hours: 22, matches: 110, rewardCoins: 0, rewardCash: 0 },
  { level: 12, diamonds: 80000, validDays: 10, hours: 24, matches: 120, rewardCoins: 0, rewardCash: 0 },
  { level: 13, diamonds: 90000, validDays: 11, hours: 27, matches: 130, rewardCoins: 0, rewardCash: 0 },
  { level: 14, diamonds: 95000, validDays: 12, hours: 30, matches: 140, rewardCoins: 0, rewardCash: 0 },
  { level: 15, diamonds: 100000, validDays: 13, hours: 33, matches: 150, rewardCoins: 2000, rewardCash: 12 },
  { level: 16, diamonds: 115000, validDays: 14, hours: 36, matches: 160, rewardCoins: 2300, rewardCash: 13.8 },
  { level: 17, diamonds: 130000, validDays: 15, hours: 40, matches: 170, rewardCoins: 2600, rewardCash: 15.6 },
  { level: 18, diamonds: 150000, validDays: 16, hours: 44, matches: 180, rewardCoins: 3000, rewardCash: 18 },
  { level: 19, diamonds: 170000, validDays: 17, hours: 48, matches: 190, rewardCoins: 3400, rewardCash: 20.4 },
  { level: 20, diamonds: 190000, validDays: 18, hours: 52, matches: 200, rewardCoins: 3800, rewardCash: 22.8 },
  { level: 21, diamonds: 210000, validDays: 19, hours: 56, matches: 210, rewardCoins: 4200, rewardCash: 25.2 },
  { level: 22, diamonds: 230000, validDays: 20, hours: 60, matches: 220, rewardCoins: 4600, rewardCash: 27.6 },
  { level: 23, diamonds: 250000, validDays: 20, hours: 64, matches: 230, rewardCoins: 5000, rewardCash: 30 },
  { level: 24, diamonds: 275000, validDays: 21, hours: 68, matches: 240, rewardCoins: 5500, rewardCash: 33 },
  { level: 25, diamonds: 300000, validDays: 21, hours: 72, matches: 250, rewardCoins: 6000, rewardCash: 36 },
  { level: 26, diamonds: 340000, validDays: 21, hours: 74, matches: 260, rewardCoins: 6800, rewardCash: 40.8 },
  { level: 27, diamonds: 380000, validDays: 22, hours: 76, matches: 270, rewardCoins: 7600, rewardCash: 45.6 },
  { level: 28, diamonds: 420000, validDays: 22, hours: 78, matches: 280, rewardCoins: 8400, rewardCash: 50.4 },
  { level: 29, diamonds: 460000, validDays: 22, hours: 79, matches: 290, rewardCoins: 9200, rewardCash: 55.2 },
  { level: 30, diamonds: 500000, validDays: 22, hours: 80, matches: 300, rewardCoins: 10000, rewardCash: 60 },
  { level: 31, diamonds: 550000, validDays: 22, hours: 80, matches: 310, rewardCoins: 11000, rewardCash: 66 },
  { level: 32, diamonds: 600000, validDays: 22, hours: 80, matches: 320, rewardCoins: 12000, rewardCash: 72 },
  { level: 33, diamonds: 650000, validDays: 22, hours: 80, matches: 330, rewardCoins: 13000, rewardCash: 78 },
  { level: 34, diamonds: 700000, validDays: 22, hours: 80, matches: 340, rewardCoins: 14000, rewardCash: 84 },
  { level: 35, diamonds: 760000, validDays: 22, hours: 80, matches: 350, rewardCoins: 15200, rewardCash: 91.2 },
  { level: 36, diamonds: 820000, validDays: 22, hours: 80, matches: 360, rewardCoins: 16400, rewardCash: 98.4 },
  { level: 37, diamonds: 880000, validDays: 22, hours: 80, matches: 370, rewardCoins: 17600, rewardCash: 105.6 },
  { level: 38, diamonds: 930000, validDays: 22, hours: 80, matches: 380, rewardCoins: 18600, rewardCash: 111.6 },
  { level: 39, diamonds: 970000, validDays: 22, hours: 80, matches: 390, rewardCoins: 19400, rewardCash: 116.4 },
  { level: 40, diamonds: 1000000, validDays: 22, hours: 80, matches: 400, rewardCoins: 20000, rewardCash: 120 },
];