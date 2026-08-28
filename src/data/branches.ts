// TELPSAM church branches, grouped by region.
// Sourced from the TLPCI church website branch network (198 branches).
// Members pick their branch from this list, or choose "Other" to type their own.

export type BranchRegion = { region: string; branches: string[] };

export const branchRegions: BranchRegion[] = [
  {
    region: "Accra West",
    branches: ["Ablekuma", "Alajo", "Amasaman", "Ashalaja", "Ashongman", "Comet", "Glefe", "Haatso", "Hobor", "Israel", "Joma", "Kofi Kwei", "Kwabenya", "Kwashieman", "Manhja", "New Mamprobi", "Omanjor", "Oshuman", "Peace Village", "Pokuase", "Sapeiman", "Techiman", "Tetegu"],
  },
  {
    region: "Accra East",
    branches: ["Apollonia", "Ashaiman Central", "Baatsona", "Dawhenya", "Dodowa", "Gbetsile", "Gbetsile Fire -Service down", "Gbetsile Samco", "Israel", "Katamanso", "Lakeside", "Legon Madina", "Mataheko", "Mexico Assembly", "Miotso", "Nana Krom", "New Jerusalem", "New Ningo", "New land", "Official Town", "Oyibi", "Panthang", "Peace land", "Police Assembly", "Prampram", "Promise Land", "Santo", "Shai Hills", "ShaiHills", "Sun City", "Tema Newtown", "Teshie Laskala", "Washington", "Zenu"],
  },
  {
    region: "Central",
    branches: ["Abakem", "Adawukwa", "Adom Estate", "Akweyti", "Bantuma", "Bronyibima", "Cape Coast", "Kasoa", "Koklobitey", "Kwaprow", "Nyanyano", "Papase", "Takoradi", "Winneba"],
  },
  {
    region: "Volta East",
    branches: ["Abutia", "Adaklu", "Adaklu Hehekpe", "Adidome", "Ahuda", "Akatsi", "Akoefe", "Atikpui", "Dave", "Denu", "Dovie kope", "Dzolokpuita", "English Assembly", "Ho Central", "Hodzo", "Hofedo", "Kodeabe", "Kplordu", "Mafe Kumase", "Norgbedzi Kofe", "Sikaman", "Sogakope", "Sokode", "Sokpe", "Taviefe", "Tokokoe", "Ziope"],
  },
  {
    region: "Volta West",
    branches: ["Akakpo", "Asikuma", "Dodo Amanfrom", "Dzemeni", "Frankadua", "Gbodokope", "Hohoe", "Juapong", "Kaira", "Kpala", "Kpando", "Kpeve", "Kponkpo", "Kudzra", "New Powmu", "Peki Central", "Peki Dzake", "Sanga", "Toh-Kpalime", "Vedeme", "Wudome"],
  },
  {
    region: "Other Areas & International",
    branches: ["Abuvienu", "Adeiso", "Agbetikor", "Agor Kope", "Agou Nyogbo", "Agripa Tadzi", "Ahodwo", "Ahodwo Ketewa", "Ahuu, Maluul Centre", "Akim Oda", "Akpadafe", "Akpalebu", "Akrade", "Akuse", "Alabo", "Amou Oblo", "Andover", "Asamankese", "Asutsuare", "Aweil Town", "Balai", "Bolga", "Dedukope", "Dzatsui", "Edgware", "Factory (Estate)", "Fotobi", "Freetown", "GS Road", "Galikope", "Gambia", "Gok Machar", "Klebuse", "Koforidua", "Koklutsu kope", "Kotoku", "Kpalime", "Kpandai", "Kpong", "Kumasi Asabi", "Kunkunde", "LadeKope", "Lartei", "Liberia", "Logah Kope", "Lolonya", "Lome", "Mabior Rit", "Malual Loch", "Maluil Ariath", "Mehan Mekshan", "Nsawam", "Nyamlel", "Obotwere", "Opare-Krom", "Pakro", "Prang", "Sakyikrom", "Sege", "Seme-Nigeria", "Siera Leone", "Sokobang", "Somanya", "South Africa", "South Sudan", "Suhum", "Sunyani", "Tamale", "Teacher Mante", "Teponi", "Tomegbe", "Tonka", "Tothenham", "Trowbridge", "Volivo", "Wa", "Yeji", "Zabzugu", "Zankara"],
  },
];

export const OTHER_BRANCH = "Other (not listed)";

/** Flat list of every branch name. */
export const allBranches: string[] = branchRegions.flatMap((r) => r.branches);

