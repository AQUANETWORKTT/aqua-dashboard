export const MANAGERS = ["All", "Lewis", "Harry", "Haz", "Ellie", "Alfie", "James"] as const;
export type ManagerName = (typeof MANAGERS)[number];

export const CREATOR_TO_MANAGER: Record<string, Exclude<ManagerName, "All">> = {
  "xoxorubexoxo": "Lewis",
  "official.dems": "Lewis",
  "a.b_cooke14": "Lewis",
  "lolasky03": "Lewis",
  "x_ruby_x3": "Lewis",
  "official_millls": "Lewis",
  "papatrenaqua": "Lewis",
  "smokez066": "Lewis",
  "keeleylouisex2": "Lewis",
  "bdttp3": "Lewis",
  "harriet_stephxo": "Lewis",
  "kello.music": "Lewis",
  "laniifielderx": "Lewis",
  "wezncam": "Lewis",
  "ben_welshdj_": "Lewis",
  "caseybedford3": "Lewis",

  "1sclassified": "Haz",
  "mylispams.xo": "Haz",
  "bethany65.0": "Haz",
  "frozenearth1": "Haz",
  "femboytickler33": "Haz",

  "g_streamz1": "Harry",
  "extr4ctshorts": "Harry",
  "rs145_s": "Harry",
  "nojus1391": "Harry",
  "kurr_x": "Harry",
  "jordan.new23": "Harry",
  "brooke_main20": "Harry",
  "tt_moko": "Harry",
  "sum.cxx": "Harry",
  "xx._leah._xxx": "Harry",

  "tolsf.21xx": "Ellie",
  "l.aylafirth": "Ellie",
  "blueeyedblondie_": "Ellie",
  "littleeloves": "Ellie",

  "liam......1": "Alfie",
  "cunningwhoreofvenice": "Alfie",
  "rubesmalley": "Alfie",
  "hisfav_leo18": "Alfie",
  "mais_lou9": "Alfie",
};
