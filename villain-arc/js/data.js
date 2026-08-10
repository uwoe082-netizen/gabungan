// ============================================================
// VILLAIN ARC — Static data: schedule, quotes, ranks, achievements
// ============================================================

const WORKOUT_SCHEDULE_DEFAULT = {
  monday: {
    type: "PUSH", label: "PUSH DAY", color: "push", emoji: "🔴",
    exercises: [
      { id: "pushup-failure", name: "Push-Up", target: "Failure (catat jumlah reps)", sets: 3, inputType: "reps", muscleGroup: "Chest, Triceps, Shoulders", notes: "Form sempurna. Turun pelan, naik eksplosif. Catat reps setiap set." },
      { id: "db-floor-press", name: "Dumbbell Floor Press (Tempo Lambat)", target: "12-15 reps", sets: 3, inputType: "reps", muscleGroup: "Chest, Triceps", notes: "Tempo 3-1-2. Dumbbell 3kg." },
      { id: "half-kneel-shoulder-press", name: "Half-Kneeling Shoulder Press", target: "10-12 reps per sisi", sets: 2, inputType: "reps", muscleGroup: "Shoulders, Core", notes: "Berlutut satu kaki. Ganti sisi setiap set. Dumbbell 3kg." }
    ]
  },
  tuesday: { type: "REST", label: "ISTIRAHAT TOTAL", color: "rest", emoji: "⚫", exercises: [] },
  wednesday: {
    type: "PULL_CORE", label: "PULL & CORE", color: "pull", emoji: "🟣",
    exercises: [
      { id: "db-bent-over-row", name: "Dumbbell Bent-Over Row", target: "12-15 reps", sets: 3, inputType: "reps", muscleGroup: "Back, Biceps", notes: "Punggung lurus, tarik ke pinggul. Dumbbell 3kg." },
      { id: "bicep-curls", name: "Bicep Curls", target: "12-15 reps", sets: 3, inputType: "reps", muscleGroup: "Biceps", notes: "Kontrol penuh. Jangan swing. Dumbbell 3kg." },
      { id: "plank", name: "Plank Hold", target: "45-60 detik", sets: 2, inputType: "duration", muscleGroup: "Core", notes: "Tubuh lurus seperti papan. Kencangkan abs dan glutes." }
    ]
  },
  thursday: { type: "REST", label: "ISTIRAHAT TOTAL", color: "rest", emoji: "⚫", exercises: [] },
  friday: {
    type: "LEGS", label: "LEG DAY", color: "legs", emoji: "🔵",
    exercises: [
      { id: "goblet-squat", name: "Goblet Squat", target: "12-15 reps", sets: 3, inputType: "reps", muscleGroup: "Quads, Glutes, Core", notes: "Pegang dumbbell di dada. Turun dalam. Dumbbell 3kg." },
      { id: "reverse-lunges", name: "Reverse Lunges", target: "10-12 reps per kaki", sets: 3, inputType: "reps", muscleGroup: "Quads, Glutes, Hamstrings", notes: "Langkah ke belakang. Lutut depan 90 derajat. Dumbbell 3kg (optional)." }
    ]
  },
  saturday: {
    type: "HEARTBREAK", label: "THE HEARTBREAK SESSION", color: "heartbreak", emoji: "🔥",
    exercises: [
      { id: "kai-pushup-test", name: "⏱️ Push-Up Test (1 Menit)", target: "MAX reps dalam 60 detik", sets: 1, inputType: "reps", muscleGroup: "Full Upper Body", notes: "SIMULASI TES KAI. Timer 60 detik. Catat jumlah tepat. Ini benchmark mingguan.", isTest: true, hasTimer: true },
      { id: "kai-situp-test", name: "⏱️ Sit-Up Test (1 Menit)", target: "MAX reps dalam 60 detik", sets: 1, inputType: "reps", muscleGroup: "Core", notes: "SIMULASI TES KAI. Timer 60 detik. Catat jumlah tepat. Ini benchmark mingguan.", isTest: true, hasTimer: true },
      { id: "rage-pushup", name: "💀 Rage Push-Up (Pelampiasan)", target: "Failure TOTAL", sets: 2, inputType: "reps", muscleGroup: "Chest, Triceps, Shoulders, SOUL", notes: "TIDAK ADA TEKNIK. TIDAK ADA TEMPO. HANYA AMARAH MURNI SAMPAI TUBUHMU MENOLAK." },
      { id: "rage-situp", name: "💀 Rage Sit-Up (Pelampiasan)", target: "Failure TOTAL", sets: 2, inputType: "reps", muscleGroup: "Core, WILL", notes: "Bayangkan setiap sit-up adalah satu alasan untuk bangkit." }
    ]
  },
  sunday: { type: "REST", label: "ISTIRAHAT TOTAL", color: "rest", emoji: "⚫", exercises: [] }
};

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

// Daftar unik template hari (dipakai fitur "Edit Jadwal" di Command Center) —
// diturunkan dari WORKOUT_SCHEDULE_DEFAULT, satu entri per `type` unik
// (PUSH, REST, PULL_CORE, LEGS, HEARTBREAK). User memilih tipe hari untuk
// tiap hari-dalam-minggu; isi exercise-nya ikut template yang dipilih.
const SCHEDULE_TEMPLATES = Object.values(WORKOUT_SCHEDULE_DEFAULT).filter(
  (day, i, arr) => arr.findIndex((d) => d.type === day.type) === i
);
const DAY_LABELS_ID = ["MINGGU", "SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];
const MONTH_LABELS_ID = ["JANUARI","FEBRUARI","MARET","APRIL","MEI","JUNI","JULI","AGUSTUS","SEPTEMBER","OKTOBER","NOVEMBER","DESEMBER"];

const QUOTES_DB = {
  heartbreak: [
    "Dia bilang 'just friend'. Sekarang buktikan kamu bukan 'just average'.",
    "Setiap push-up adalah jawaban untuk setiap pesan yang tidak dibalas.",
    "Kamu ditolak bukan karena kurang baik. Tapi mulai sekarang, kamu akan jadi terlalu baik untuk mereka.",
    "Mereka memilih orang lain. Kamu? Kamu memilih dirimu sendiri. Dan itu lebih kuat.",
    "Rasa sakit hati itu sementara. Tapi tubuh yang kamu bangun? Itu permanen.",
    "Suatu hari dia akan melihatmu dan bertanya 'sejak kapan dia berubah?'. Jawabannya: sejak kamu membuangnya.",
    "Yang menolakmu menciptakan monster. Dan monster ini sedang berlatih.",
    "Mereka tidur nyenyak malam ini. Kamu? Kamu bangun jam 5 pagi membangun dirimu kembali.",
    "Jangan berharap mereka kembali. Harapkan dirimu menjadi seseorang yang tidak akan pernah mereka dapatkan lagi.",
    "Plot twist: penolakan itu bukan akhir ceritamu. Itu adalah origin story villain-mu."
  ],
  discipline: [
    "Kamu tidak butuh motivasi. Kamu butuh disiplin. Motivasi itu tamu, disiplin itu penghuni tetap.",
    "5 pagi. Gelap. Dingin. Sempurna. Ini adalah jam di mana legenda dibuat dan rata-rata masih bermimpi.",
    "15 menit. Hanya 1% dari harimu. Tidak ada alasan.",
    "Otot tidak peduli perasaanmu. Rep tetap rep. Angkat.",
    "Tubuhmu ingin berhenti. Otakmu ingin berhenti. Tapi kamu? Kamu bukan tubuh dan otakmu. Kamu adalah kehendak.",
    "Yang membedakan kamu dengan mereka bukan bakat. Tapi kamu muncul setiap hari, bahkan saat tidak ingin.",
    "Hari ini berat? Bagus. Hari yang mudah tidak membangun apa-apa.",
    "Rasa malas itu alarm palsu. Override. Sekarang.",
    "Kamu tidak akan pernah menyesal sudah olahraga. Tapi kamu SELALU menyesal kalau skip.",
    "Comfort zone adalah penjara mewah. Keluarlah."
  ],
  villain: [
    "Kamu bukan protagonis yang cengeng. Kamu villain yang sedang leveling up.",
    "Tidak perlu balas dendam. Cukup berubah sampai mereka tidak mengenalimu lagi.",
    "Mereka akan bilang 'kamu berubah'. Jawab: 'itu tujuannya'.",
    "Villain tidak menjelaskan motivasinya. Dia cukup menunjukkan hasilnya.",
    "Masa depanmu sedang menonton. Jangan permalukan dia.",
    "Di setiap anime, villain punya training arc paling brutal. Ini milikmu.",
    "Kamu sedang membuat plot twist terbesar dalam hidupmu. Jangan rusak dengan skip hari ini.",
    "Orang yang menolakmu memberimu hadiah terbesar: alasan untuk berubah total.",
    "Satu tahun dari sekarang, kamu akan berterima kasih pada dirimu yang bangun jam 5 pagi ini.",
    "The glow-up is silent. The results are loud."
  ],
  antipmo: [
    "Energi itu bisa membangun atau menghancurkan. Pilih push-up, bukan layar.",
    "Setiap kali godaan datang, itu sinyal: kamu punya energi yang belum dipakai. Gunakan. Sekarang.",
    "Otakmu mencari dopamine? Berikan lewat satu set lagi sampai failure.",
    "Kekuatan sejati dimulai dari mengendalikan diri sendiri.",
    "Disiplin di satu area hidupmu akan menyebar ke area lainnya. Mulai dari sini.",
    "Bukan tentang sempurna. Tapi tentang bangkit setiap kali jatuh dan tetap latihan.",
    "Transmute. Convert. Redirect. Kamu punya energi — jangan buang untuk hal yang membuatmu menyesal.",
    "Setiap hari kamu menahan diri, otakmu sedang rewiring. Setiap push-up mempercepat prosesnya.",
    "Mereka yang menguasai tubuhnya, menguasai hidupnya.",
    "Keringat lebih berharga dari penyesalan."
  ]
};

const ALL_QUOTES = [
  ...QUOTES_DB.heartbreak,
  ...QUOTES_DB.discipline,
  ...QUOTES_DB.villain,
  ...QUOTES_DB.antipmo
];

const NOTIFICATION_PRESETS = [
  "Dia sedang tidur nyenyak. Kamu? Bangun dan angkat beban.",
  "Setiap push-up adalah satu langkah lebih jauh dari versi lemahmu.",
  "Mereka bilang 'just friend'. Kamu bilang 'just watch'."
];

const RANKS = [
  { level: 1, name: "Broken Soul", xpRequired: 0 },
  { level: 2, name: "Crawling Shadow", xpRequired: 500 },
  { level: 3, name: "Rising Phantom", xpRequired: 1200 },
  { level: 4, name: "Night Stalker", xpRequired: 2500 },
  { level: 5, name: "Iron Ghost", xpRequired: 4000 },
  { level: 6, name: "Silent Predator", xpRequired: 6000 },
  { level: 7, name: "Shadow Knight", xpRequired: 8500 },
  { level: 8, name: "Dark Berserker", xpRequired: 12000 },
  { level: 9, name: "Crimson Warlord", xpRequired: 16000 },
  { level: 10, name: "Apex Villain", xpRequired: 21000 },
  { level: 11, name: "Shadow Monarch", xpRequired: 27000 },
  { level: 12, name: "THE MAIN CHARACTER", xpRequired: 35000 }
];

const XP_RULES = {
  EXERCISE_CHECK: 25,
  DAY_COMPLETE_BONUS: 100,
  HEARTBREAK_COMPLETE_BONUS: 200,
  EARLY_RISER_BONUS: 50,
  STREAK_MILESTONE: 500,
  ACHIEVEMENT_UNLOCK: 300,
  NEW_PR: 150
};

const STREAK_MILESTONES = [7, 14, 21, 30, 60, 90, 100, 150, 200, 365];

const ACHIEVEMENTS = [
  { id: "first-blood", name: "FIRST BLOOD", icon: "🩸", desc: "Selesaikan workout pertama" },
  { id: "7-day-siege", name: "7-DAY SIEGE", icon: "🏰", desc: "Streak 7 hari" },
  { id: "30-day-war", name: "30-DAY WAR", icon: "⚔️", desc: "Streak 30 hari" },
  { id: "iron-will", name: "IRON WILL", icon: "🔩", desc: "Streak 60 hari" },
  { id: "unbreakable", name: "UNBREAKABLE", icon: "🛡️", desc: "Streak 100 hari" },
  { id: "century-club", name: "CENTURY CLUB", icon: "💯", desc: "Push-up 100 reps (kumulatif dalam 1 sesi failure)" },
  { id: "heartbreak-alchemist", name: "HEARTBREAK ALCHEMIST", icon: "⚗️", desc: "Selesaikan 10 Heartbreak Session (Sabtu)" },
  { id: "pain-converter", name: "PAIN CONVERTER", icon: "🔥", desc: "Selesaikan workout di hari yang sangat berat" },
  { id: "dawn-warrior", name: "DAWN WARRIOR", icon: "🌅", desc: "Selesaikan workout sebelum jam 05:30 sebanyak 20 kali" },
  { id: "5am-club", name: "5AM CLUB", icon: "⏰", desc: "Selesaikan workout sebelum jam 05:15 sebanyak 50 kali" },
  { id: "silent-grinder", name: "SILENT GRINDER", icon: "🥷", desc: "Selesaikan workout di SEMUA hari latihan dalam 1 bulan penuh" },
  { id: "rep-machine", name: "REP MACHINE", icon: "⚙️", desc: "Catat total 1,000 reps push-up (kumulatif)" },
  { id: "v-taper-initiate", name: "V-TAPER INITIATE", icon: "🔺", desc: "Selesaikan 20 sesi Pull & Core" },
  { id: "leg-day-loyalist", name: "LEG DAY LOYALIST", icon: "🦵", desc: "Selesaikan 15 sesi Leg Day" },
  { id: "zero-excuses", name: "ZERO EXCUSES", icon: "🚫", desc: "Tidak ada workout skip selama 2 minggu berturut-turut" },
  { id: "the-transformation", name: "THE TRANSFORMATION", icon: "🦋", desc: "Mencapai target berat badan bulking" },
  { id: "kai-ready", name: "KAI READY", icon: "✅", desc: "Push-up ≥ target KAI dalam tes 1 menit" },
  { id: "shadow-monarch", name: "SHADOW MONARCH", icon: "👑", desc: "Mencapai rank tertinggi" },
  { id: "villain-complete", name: "VILLAIN COMPLETE", icon: "🏆", desc: "Unlock semua achievement lainnya" },
  { id: "no-fap-warrior", name: "NO FAP WARRIOR", icon: "🧘", desc: "Streak anti-PMO 30 hari" }
];

const DEFAULT_TARGETS = { weight_kg: null, pushup_target: 40, situp_target: 40 };
