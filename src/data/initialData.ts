import { Comic, Chapter, User, Banner, ActivityLog, SystemSettings, ComicPage, DriveAccount, Comment, AdItem, AdSettings } from '../types';

// Helper to generate dynamic SVG comic page panels for genuine visual reading experience
export const generateComicPageSvg = (
  theme: 'romance_18' | 'drama_dewasa' | 'ntr' | 'harem' | 'noona' | string,
  pageNum: number,
  title: string
): string => {
  const bgGrad: Record<string, string[]> = {
    romance_18: ['#1a0b16', '#2b1024', '#150612'],
    drama_dewasa: ['#16101f', '#261735', '#0f0a17'],
    ntr: ['#1f0a0a', '#331212', '#140606'],
    harem: ['#1c1306', '#31210a', '#140e04'],
    noona: ['#0d1726', '#14273d', '#08101c']
  };

  const accentColors: Record<string, string> = {
    romance_18: '#ff2a85',
    drama_dewasa: '#a855f7',
    ntr: '#ef4444',
    harem: '#f59e0b',
    noona: '#38bdf8'
  };

  const selectedBg = bgGrad[theme] || ['#1a0b16', '#2b1024', '#150612'];
  const accentColor = accentColors[theme] || '#ff2a85';

  const dialogues: Record<string, string[][]> = {
    romance_18: [
      ['Hana:', '"Pintu kamar sudah kamu kunci rapat kan, Mas...? Jangan sampai ada yang dengar..."'],
      ['Reza:', '"Tenang saja, malam ini hanya ada kita berdua di sini."'],
      ['Hana:', '"...Detak jantungmu berdegup kencang sekali, Reza."'],
      ['SFX:', '💓 DOKI... DOKI... 💓 Sentuhan lembut di keheningan malam']
    ],
    drama_dewasa: [
      ['Direktur Lisa:', '"Lembur malam ini bukan sekadar mengecek dokumen kantor, Reza..."'],
      ['Reza:', '"Bu Lisa... kalau rekan kerja tahu hubungan rahasia kita..."'],
      ['Direktur Lisa:', '"Tutup gorden ruang kerjaku sekarang. Ini perintah langsung dariku."'],
      ['SFX:', '👠 *KLIK-KLOK...* Pintu ruang direktur terkunci rapat.']
    ],
    ntr: [
      ['Rian:', '"Kenapa lampu kamar tetangga sebelah masih menyala selarut ini...?"'],
      ['Suara Lirih:', '"...Tolong jangan bersuara keras, nanti suamiku di seberang bisa curiga..."'],
      ['Rian:', '"(Sial... bayangan di balik jendela itu... tidak mungkin!)"'],
      ['SFX:', '⚡ *DEG!* ⚡ Rahasia terlarang yang tak boleh terbongkar']
    ],
    harem: [
      ['Mika:', '"Kakak lebih suka ditemani aku atau Kak Yuna malam ini?"'],
      ['Yuna:', '"Mika, jangan curang! Giliranku yang menemani Kakak!"'],
      ['Rian:', '"Tolong jangan berebut di ruang tamu, tetangga kosan bisa salah paham!"'],
      ['SFX:', '✨ Senyuman manis dan tatapan menggoda di rumah kos ✨']
    ],
    noona: [
      ['Mbak Maya:', '"Kamu sudah tumbuh jadi pria dewasa ya sekarang, Dik..."'],
      ['Bima:', '"Mbak Maya jangan menggoda terus, aku bukan anak kecil lagi."'],
      ['Mbak Maya:', '"Buktikan kalau kamu memang sudah berani mendekat..."'],
      ['SFX:', '💋 *Bisikan pelan yang membuat nafas tertahan...*']
    ]
  };

  const currentThemeDialogues = dialogues[theme] || dialogues['romance_18'];
  const currentDialogue = currentThemeDialogues[(pageNum - 1) % currentThemeDialogues.length] || ['Cerita berlanjut...', 'Momen mendebarkan!'];

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="100%" height="100%">
    <defs>
      <linearGradient id="bg-${theme}-${pageNum}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${selectedBg[0]}" />
        <stop offset="50%" stop-color="${selectedBg[1]}" />
        <stop offset="100%" stop-color="${selectedBg[2]}" />
      </linearGradient>
      <linearGradient id="neon-${theme}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.8"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.9"/>
      </linearGradient>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${accentColor}" stroke-width="0.4" stroke-opacity="0.15"/>
      </pattern>
    </defs>
    
    <!-- Background Canvas -->
    <rect width="800" height="1200" fill="url(#bg-${theme}-${pageNum})" />
    <rect width="800" height="1200" fill="url(#grid)" />

    <!-- Top Comic Header Strip -->
    <rect x="20" y="20" width="760" height="45" rx="8" fill="#000000" fill-opacity="0.6" stroke="${accentColor}" stroke-width="1.5" />
    <text x="40" y="50" font-family="'Plus Jakarta Sans', sans-serif" font-weight="bold" font-size="18" fill="#ffffff">ANTITIMPA EXCLUSIVE</text>
    <text x="400" y="50" font-family="'Plus Jakarta Sans', sans-serif" font-weight="600" font-size="15" fill="${accentColor}" text-anchor="middle">${title.toUpperCase()}</text>
    <text x="750" y="50" font-family="'Plus Jakarta Sans', sans-serif" font-weight="bold" font-size="16" fill="#ff9900" text-anchor="end">PAGE ${pageNum}</text>

    <!-- Panel 1: Dynamic Top Action Scene -->
    <g transform="translate(30, 85)">
      <rect width="740" height="340" rx="12" fill="#0b0b10" stroke="${accentColor}" stroke-width="2.5" stroke-opacity="0.7"/>
      <!-- Decorative Action Silhouettes & Geometric Art -->
      <circle cx="370" cy="170" r="130" fill="${accentColor}" fill-opacity="0.08" />
      <polygon points="50,300 370,50 690,300" fill="${accentColor}" fill-opacity="0.04" />
      
      <!-- Dialogue Bubble 1 -->
      <rect x="40" y="30" width="440" height="75" rx="16" fill="#ffffff" fill-opacity="0.95" stroke="#111111" stroke-width="2"/>
      <polygon points="120,105 135,130 160,105" fill="#ffffff" stroke="#111111" stroke-width="2"/>
      <text x="55" y="56" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="15" fill="#ff4d00">${currentDialogue[0]}</text>
      <text x="55" y="80" font-family="'Plus Jakarta Sans', sans-serif" font-weight="500" font-size="14" fill="#111111">${currentDialogue[1]}</text>

      <!-- Center Action Callout -->
      <text x="370" y="230" font-family="'Impact', sans-serif" font-size="42" fill="url(#neon-${theme})" text-anchor="middle" letter-spacing="2">
        ${pageNum % 2 === 0 ? 'CRASSSHH!' : 'ZOOM IN!'}
      </text>
    </g>

    <!-- Panel 2 & 3: Split Drama Panels -->
    <g transform="translate(30, 445)">
      <!-- Left Panel -->
      <rect x="0" y="0" width="355" height="340" rx="12" fill="#09090e" stroke="#444455" stroke-width="2" />
      <path d="M 0 170 Q 177 50 355 170" fill="none" stroke="${accentColor}" stroke-width="3" stroke-dasharray="6,4" stroke-opacity="0.6"/>
      
      <rect x="20" y="20" width="315" height="65" rx="12" fill="#1a1a24" stroke="${accentColor}" stroke-width="1.5"/>
      <text x="35" y="44" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="13" fill="${accentColor}">[ INTERNAL MONOLOGUE ]</text>
      <text x="35" y="65" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" fill="#e2e8f0">"If we fail here, the entire network goes dark..."</text>

      <text x="177" y="250" font-family="'Impact', sans-serif" font-size="28" fill="#ffcc00" text-anchor="middle">⚡ TENSE MOMENT ⚡</text>

      <!-- Right Panel -->
      <rect x="385" y="0" width="355" height="340" rx="12" fill="#09090e" stroke="#444455" stroke-width="2" />
      <rect x="405" y="20" width="315" height="75" rx="12" fill="#ffffff" fill-opacity="0.95" stroke="#111111" stroke-width="2"/>
      <text x="420" y="46" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="14" fill="#0066cc">Commander:</text>
      <text x="420" y="70" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" fill="#111111">"Engage full thrusters! Don't let them escape!"</text>
      
      <circle cx="562" cy="220" r="60" fill="${accentColor}" fill-opacity="0.15" />
      <text x="562" y="225" font-family="'Impact', sans-serif" font-size="24" fill="#ffffff" text-anchor="middle">TARGET LOCKED</text>
    </g>

    <!-- Panel 4: Large Climax Bottom Panel -->
    <g transform="translate(30, 805)">
      <rect width="740" height="325" rx="12" fill="#08080c" stroke="${accentColor}" stroke-width="2.5" />
      
      <!-- Big Impact Graphic -->
      <path d="M 50 160 L 250 50 L 500 120 L 700 40 L 600 280 L 350 220 Z" fill="${accentColor}" fill-opacity="0.07" stroke="${accentColor}" stroke-width="1.5"/>
      
      <!-- Climax Sound Effect & Bubble -->
      <text x="370" y="110" font-family="'Impact', sans-serif" font-size="54" fill="#ff3300" text-anchor="middle" stroke="#ffffff" stroke-width="1.5">
        ${pageNum === 1 ? 'THE ADVENTURE BEGINS!' : '⚡ KAAA-BOOOOOM! ⚡'}
      </text>

      <rect x="120" y="160" width="500" height="70" rx="14" fill="#ffffff" stroke="#111111" stroke-width="2"/>
      <text x="140" y="190" font-family="'Plus Jakarta Sans', sans-serif" font-weight="700" font-size="15" fill="#111111">
        "Everything changes from this very breath..."
      </text>
      <text x="140" y="212" font-family="'Plus Jakarta Sans', sans-serif" font-size="13" fill="#555555">
        - AntiTimpa Digital Readers Edition • To be continued next page...
      </text>
    </g>

    <!-- Footer Watermark -->
    <text x="400" y="1170" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" fill="#718096" text-anchor="middle">
      AntiTimpa Webtoon Reader • Hak Cipta Dilindungi Undang-Undang
    </text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

// Generate realistic chapter pages
const createPages = (theme: 'romance_18' | 'drama_dewasa' | 'ntr' | 'harem' | 'noona' | string, comicTitle: string, count: number = 8): ComicPage[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `page-${i + 1}`,
    pageNumber: i + 1,
    imageUrl: generateComicPageSvg(theme, i + 1, comicTitle),
    caption: `Halaman ${i + 1} - ${comicTitle}`
  }));
};

export const initialComics: Comic[] = [
  {
    id: 'comic-1',
    title: 'Secret Stepmother: Room Next Door',
    slug: 'secret-stepmother-room-next-door',
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Setelah ayahnya bertugas keluar kota untuk waktu yang lama, Reza tinggal serumah bersama ibu tirinya yang anggun dan mempesona, Maya. Batasan yang seharusnya dijaga perlahan memudar ketika malam-malam sepi mulai dipenuhi tatapan yang penuh godaan.',
    genres: ['Romance 18+', 'Drama Dewasa', 'Milf / Noona', 'Mother', 'Big Tits', 'Vanilla'],
    status: 'ongoing',
    storyWriter: 'Kim Min-Woo',
    artist: 'Park Jin-Ah',
    rating: 4.9,
    ratingCount: 18450,
    totalChapters: 46,
    totalReaders: 68920,
    createdAt: '2024-10-18',
    updatedAt: '2024-10-18',
    isTrending: true,
    isFeatured: true,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true,
    tiktokPromoNote: 'Promo TikTok @anti.timpa - Viral Chapter 24'
  },
  {
    id: 'comic-2',
    title: 'Office Affair: Secret Overtime',
    slug: 'office-affair-secret-overtime',
    coverImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Direktur Lisa dikenal sangat dingin dan perfeksionis di kantor. Namun di balik pintu ruang kerjanya saat jam lembur larut malam, ia memiliki sisi liar dan rahasia yang hanya diketahui oleh asisten pribadinya.',
    genres: ['Milf', 'Cheating', 'School Uniform', 'Creampy', 'Dark Skin', 'Romance 18+'],
    status: 'ongoing',
    storyWriter: 'Lee Sung-Hoon',
    artist: 'Han Ye-Seul',
    rating: 4.8,
    ratingCount: 14200,
    totalChapters: 38,
    totalReaders: 52100,
    createdAt: '2024-10-17',
    updatedAt: '2024-10-17',
    isTrending: true,
    isFeatured: true,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true
  },
  {
    id: 'comic-3',
    title: 'Boarding House: Secret Agreement',
    slug: 'boarding-house-secret-agreement',
    coverImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Menjadi satu-satunya mahasiswa pria di sebuah rumah kos khusus wanita yang dihuni oleh 3 mahasiswi cantik dan ibu kos yang menawan. Sebuah perjanjian rahasia mengubah kehidupan sehari-harinya menjadi petualangan dewasa yang tak terlupakan.',
    genres: ['Threesome', 'Group', 'Bikini', 'Vanilla', 'Big Breast', 'Drama Dewasa'],
    status: 'ongoing',
    storyWriter: 'Kang Dong-Hyuk',
    artist: 'Jung Soo-Jin',
    rating: 4.9,
    ratingCount: 22400,
    totalChapters: 34,
    totalReaders: 74200,
    createdAt: '2024-10-16',
    updatedAt: '2024-10-16',
    isTrending: true,
    isFeatured: true,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true
  },
  {
    id: 'comic-4',
    title: 'Silent War: Neighbor\'s Secret',
    slug: 'silent-war-neighbors-secret',
    coverImage: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Dinding apartemen yang tipis membuat Rian sering mendengar suara-suara mendesah misterius dari unit sebelah. Ketika ia tanpa sengaja melihat siapa tamu rahasia di kamar tetangganya, sebuah permainan teka-teki perselingkuhan dan hasrat terlarang pun dimulai.',
    genres: ['Netorare', 'Cheating', 'Netorase', 'Bondage', 'Ahegao'],
    status: 'ongoing',
    storyWriter: 'Choi Won-Sik',
    artist: 'Song Ji-Hyun',
    rating: 4.7,
    ratingCount: 16800,
    totalChapters: 29,
    totalReaders: 48400,
    createdAt: '2024-10-15',
    updatedAt: '2024-10-15',
    isTrending: false,
    isFeatured: false,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true
  },
  {
    id: 'comic-5',
    title: 'Landlady Noona: Private Lesson',
    slug: 'landlady-noona-private-lesson',
    coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Mbak Eun-Ji, pemilik kontrakan yang ramah dan mempesona, menawarkan potongan uang sewa dengan satu syarat khusus: membantu memberikan bimbingan les privat kepada adik perempuannya sekaligus menemani dirinya di saat kesepian.',
    genres: ['Sister', 'Milf', 'Small Tits', 'Romance', 'Pregnant', 'Milf / Noona'],
    status: 'ongoing',
    storyWriter: 'Park Sang-Min',
    artist: 'Oh Seung-Hee',
    rating: 4.8,
    ratingCount: 19400,
    totalChapters: 42,
    totalReaders: 61900,
    createdAt: '2024-10-14',
    updatedAt: '2024-10-14',
    isTrending: true,
    isFeatured: false
  },
  {
    id: 'comic-6',
    title: 'Sweet Guy: The Golden Touch',
    slug: 'sweet-guy-golden-touch',
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Akibat insiden sengatan listrik misterius, Ho-Sang mendapatkan kemampuan magis di mana setiap sentuhan tangannya mampu membuat wanita mana pun merasakan kenikmatan dan jatuh cinta tak berdaya.',
    genres: ['Solo Male', 'Group', 'Big Penis', 'Ahegao', 'Elf', 'Anal'],
    status: 'completed',
    storyWriter: 'Shin Hyung-Wook',
    artist: 'Yoon Jae-Ho',
    rating: 4.9,
    ratingCount: 31200,
    totalChapters: 78,
    totalReaders: 98000,
    createdAt: '2024-10-12',
    updatedAt: '2024-10-12',
    isTrending: true,
    isFeatured: false
  },
  {
    id: 'comic-7',
    title: 'The Perfect Roommate',
    slug: 'the-perfect-roommate',
    coverImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Tinggal bersama teman masa kecil yang kini telah berubah menjadi wanita dewasa yang sangat menawan. Kebiasaan berpakaian santai di dalam rumah membuat batas pertemanan mereka perlahan terlewati.',
    genres: ['Vanilla', 'Romance 18+', 'Slice of Life 18+'],
    status: 'ongoing',
    storyWriter: 'Bae Yoo-Jung',
    artist: 'Kwon Bo-Ram',
    rating: 4.7,
    ratingCount: 8900,
    totalChapters: 26,
    totalReaders: 28400,
    createdAt: '2024-10-10',
    updatedAt: '2024-10-10',
    isTrending: false,
    isFeatured: false
  },
  {
    id: 'comic-8',
    title: 'Queen Bee: Danger Zone',
    slug: 'queen-bee-danger-zone',
    coverImage: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Pyo terjerat dalam lingkaran drama kelam dan manipulasi seksual para wanita paling berkuasa di kotanya. Di dunia di mana nafsu dan kekuasaan saling bertabrakan, hanya yang terkuat yang bisa bertahan.',
    genres: ['Drama Dewasa', 'School Life 18+', 'Manhwa 18+'],
    status: 'ongoing',
    storyWriter: 'Kim Chul-Soo',
    artist: 'Kim Chul-Soo',
    rating: 4.6,
    ratingCount: 15300,
    totalChapters: 54,
    totalReaders: 42000,
    createdAt: '2024-10-08',
    updatedAt: '2024-10-08',
    isTrending: false,
    isFeatured: false,
    contentType: '18plus',
    comicType: 'webtoon',
    isFree: false,
    isVisibleOnHome: true,
    isPublished: true
  },
  {
    id: 'comic-norm-1',
    title: 'Solo Leveling: Ragnarok',
    slug: 'solo-leveling-ragnarok',
    coverImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Bumi kembali terancam oleh monster gerbang dimensi baru. Sung Su-Ho, putra dari Hunter Terkuat Sung Jin-Woo, membangkitkan kekuatan bayangan misterius dalam darahnya dan memulai perjalanan solo hunter berikutnya.',
    genres: ['Action', 'Fantasy', 'Dungeon', 'Leveling', 'Superpower'],
    status: 'ongoing',
    storyWriter: 'Chugong & Daul',
    artist: 'REDICE Studio',
    rating: 4.9,
    ratingCount: 42100,
    totalChapters: 30,
    totalReaders: 125000,
    createdAt: '2024-10-19',
    updatedAt: '2024-10-19',
    isTrending: true,
    isFeatured: true,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'KakaoPage Direct Feed'
  },
  {
    id: 'comic-norm-2',
    title: 'Eleceed: Awakening Lightning',
    slug: 'eleceed-awakening-lightning',
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Jiwoo adalah pemuda yang memiliki kekuatan kecepatan super namun menyembunyikannya. Hidupnya berubah 180 derajat setelah ia menyelamatkan kucing gemuk jalanan yang ternyata adalah Kayden, buronan ranker terkuat di dunia awakeners!',
    genres: ['Action', 'Comedy', 'Superpower', 'Martial Arts', 'Shounen'],
    status: 'ongoing',
    storyWriter: 'Son Je-Ho',
    artist: 'ZHENA',
    rating: 4.9,
    ratingCount: 38900,
    totalChapters: 65,
    totalReaders: 94000,
    createdAt: '2024-10-18',
    updatedAt: '2024-10-18',
    isTrending: true,
    isFeatured: true,
    contentType: 'normal',
    comicType: 'manhwa',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Naver Webtoon API'
  },
  {
    id: 'comic-norm-3',
    title: 'Jujutsu Kaisen: Shinjuku Final',
    slug: 'jujutsu-kaisen-shinjuku-final',
    coverImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1569705460033-cfaa4bf9f822?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Pertarungan puncak penentuan nasib dunia antara Gojo Satoru dan Raja Kutukan Ryomen Sukuna di reruntuhan Shinjuku. Siapakah penyihir terkuat sepanjang sejarah?',
    genres: ['Action', 'Supernatural', 'Dark Fantasy', 'Shounen'],
    status: 'ongoing',
    storyWriter: 'Gege Akutami',
    artist: 'Gege Akutami',
    rating: 4.9,
    ratingCount: 52000,
    totalChapters: 72,
    totalReaders: 154000,
    createdAt: '2024-10-16',
    updatedAt: '2024-10-16',
    isTrending: true,
    isFeatured: true,
    contentType: 'normal',
    comicType: 'manga',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Shueisha MangaPlus'
  },
  {
    id: 'comic-norm-4',
    title: 'Tales of Demons and Gods (Yao Shen Ji)',
    slug: 'tales-of-demons-and-gods',
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80',
    synopsis: 'Nie Li, spiritualis iblis terkuat yang terbunuh dalam pertempuran melawan Sage Emperor, terbangun kembali di masa mudanya saat berusia 13 tahun dengan seluruh ingatan kehidupan masa lalunya.',
    genres: ['Action', 'Cultivation', 'Martial Arts', 'Reincarnation', 'Fantasy'],
    status: 'ongoing',
    storyWriter: 'Mad Snail',
    artist: 'Jiang Ruotai',
    rating: 4.8,
    ratingCount: 29800,
    totalChapters: 120,
    totalReaders: 82000,
    createdAt: '2024-10-14',
    updatedAt: '2024-10-14',
    isTrending: false,
    isFeatured: true,
    contentType: 'normal',
    comicType: 'manhua',
    isFree: true,
    isVisibleOnHome: true,
    isPublished: true,
    sourceApi: 'Bilibili Comics Feed'
  }
];

export const initialChapters: Record<string, Chapter[]> = {
  'comic-1': [
    {
      id: 'ch-1-46',
      comicId: 'comic-1',
      chapterNumber: 46,
      title: 'Malam Yang Tak Boleh Diceritakan',
      releaseDate: 'Hari ini',
      isNew: true,
      isLocked: false,
      sourceType: 'drive',
      driveAccountId: 'drive-acc-1',
      driveUrl: 'https://drive.google.com/file/d/1SecretStepmotherCh46AntiTimpa/view?usp=sharing',
      driveEmbedUrl: 'https://drive.google.com/file/d/1SecretStepmotherCh46AntiTimpa/preview',
      pages: createPages('noona', 'Secret Stepmother - Ch. 46', 8),
      viewsCount: 1420
    },
    {
      id: 'ch-1-45',
      comicId: 'comic-1',
      chapterNumber: 45,
      title: 'Bisikan di Balik Pintu Kamar',
      releaseDate: '16 Okt 2024',
      isNew: false,
      isLocked: false,
      sourceType: 'drive',
      driveAccountId: 'drive-acc-1',
      driveUrl: 'https://drive.google.com/file/d/1SecretStepmotherCh45AntiTimpa/view?usp=sharing',
      driveEmbedUrl: 'https://drive.google.com/file/d/1SecretStepmotherCh45AntiTimpa/preview',
      pages: createPages('noona', 'Secret Stepmother - Ch. 45', 8),
      viewsCount: 3890
    },
    {
      id: 'ch-1-1',
      comicId: 'comic-1',
      chapterNumber: 1,
      title: 'Pertemuan Pertama Ibu Sambung',
      releaseDate: '15 Jan 2024',
      isNew: false,
      isLocked: false,
      pages: createPages('noona', 'Secret Stepmother - Ch. 1', 10),
      viewsCount: 48900
    }
  ],
  'comic-2': [
    {
      id: 'ch-2-38',
      comicId: 'comic-2',
      chapterNumber: 38,
      title: 'Pintu Direktur Terkunci Rapat',
      releaseDate: '15 Okt 2024',
      isNew: true,
      isLocked: false,
      sourceType: 'drive',
      driveAccountId: 'drive-acc-1',
      driveUrl: 'https://drive.google.com/file/d/1OfficeAffairCh38AntiTimpa/view?usp=sharing',
      driveEmbedUrl: 'https://drive.google.com/file/d/1OfficeAffairCh38AntiTimpa/preview',
      pages: createPages('drama_dewasa', 'Office Affair - Ch. 38', 8),
      viewsCount: 2900
    },
    {
      id: 'ch-2-1',
      comicId: 'comic-2',
      chapterNumber: 1,
      title: 'Lembur Rahasia Berdua',
      releaseDate: '10 Mar 2024',
      isNew: false,
      isLocked: false,
      pages: createPages('drama_dewasa', 'Office Affair - Ch. 1', 8),
      viewsCount: 32000
    }
  ],
  'comic-3': [
    {
      id: 'ch-3-34',
      comicId: 'comic-3',
      chapterNumber: 34,
      title: 'Pesta Tengah Malam di Ruang Tamu',
      releaseDate: '14 Okt 2024',
      isNew: true,
      isLocked: false,
      sourceType: 'drive',
      driveAccountId: 'drive-acc-3',
      driveUrl: 'https://drive.google.com/file/d/1BoardingHouseCh34AntiTimpa/view?usp=sharing',
      driveEmbedUrl: 'https://drive.google.com/file/d/1BoardingHouseCh34AntiTimpa/preview',
      pages: createPages('harem', 'Boarding House - Ch. 34', 8),
      viewsCount: 5400
    },
    {
      id: 'ch-3-1',
      comicId: 'comic-3',
      chapterNumber: 1,
      title: 'Perjanjian Kontrak Anak Kos',
      releaseDate: '01 Feb 2024',
      isNew: false,
      isLocked: false,
      pages: createPages('harem', 'Boarding House - Ch. 1', 8),
      viewsCount: 51200
    }
  ],
  'comic-4': [
    {
      id: 'ch-4-29',
      comicId: 'comic-4',
      chapterNumber: 29,
      title: 'Kamar Sebelah yang Selalu Terang',
      releaseDate: '12 Okt 2024',
      isNew: true,
      isLocked: false,
      sourceType: 'drive',
      driveAccountId: 'drive-acc-2',
      driveUrl: 'https://drive.google.com/file/d/1SilentWarCh29AntiTimpa/view?usp=sharing',
      driveEmbedUrl: 'https://drive.google.com/file/d/1SilentWarCh29AntiTimpa/preview',
      pages: createPages('ntr', 'Silent War - Ch. 29', 8),
      viewsCount: 1800
    }
  ],
  'comic-5': [
    {
      id: 'ch-5-42',
      comicId: 'comic-5',
      chapterNumber: 42,
      title: 'Les Privat Tengah Malam',
      releaseDate: '10 Okt 2024',
      isNew: true,
      isLocked: false,
      pages: createPages('noona', 'Landlady Noona - Ch. 42', 8),
      viewsCount: 3100
    }
  ],
  'comic-norm-1': [
    {
      id: 'ch-norm-1-30',
      comicId: 'comic-norm-1',
      chapterNumber: 30,
      title: 'Pewaris Takhta Bayangan (Shadow Monarch)',
      releaseDate: 'Hari ini',
      isNew: true,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Solo Leveling - Ch. 30', 8),
      viewsCount: 15400
    },
    {
      id: 'ch-norm-1-29',
      comicId: 'comic-norm-1',
      chapterNumber: 29,
      title: 'Gerbang Merah Danau Es',
      releaseDate: '12 Okt 2024',
      isNew: false,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Solo Leveling - Ch. 29', 8),
      viewsCount: 19800
    },
    {
      id: 'ch-norm-1-1',
      comicId: 'comic-norm-1',
      chapterNumber: 1,
      title: 'Kebangkitan Su-Ho',
      releaseDate: '01 Mei 2024',
      isNew: false,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Solo Leveling - Ch. 1', 8),
      viewsCount: 48000
    }
  ],
  'comic-norm-2': [
    {
      id: 'ch-norm-2-65',
      comicId: 'comic-norm-2',
      chapterNumber: 65,
      title: 'Kecepatan Cahaya & Cakar Kucing',
      releaseDate: 'Hari ini',
      isNew: true,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Eleceed - Ch. 65', 8),
      viewsCount: 12400
    },
    {
      id: 'ch-norm-2-1',
      comicId: 'comic-norm-2',
      chapterNumber: 1,
      title: 'Kucing Pemarah Bernama Kayden',
      releaseDate: '10 Apr 2024',
      isNew: false,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Eleceed - Ch. 1', 8),
      viewsCount: 35000
    }
  ],
  'comic-norm-3': [
    {
      id: 'ch-norm-3-72',
      comicId: 'comic-norm-3',
      chapterNumber: 72,
      title: 'Hollow Purple 200% Output',
      releaseDate: '16 Okt 2024',
      isNew: true,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Jujutsu Kaisen - Ch. 72', 8),
      viewsCount: 28400
    },
    {
      id: 'ch-norm-3-1',
      comicId: 'comic-norm-3',
      chapterNumber: 1,
      title: 'Awal Pertarungan Terkuat',
      releaseDate: '01 Mar 2024',
      isNew: false,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Jujutsu Kaisen - Ch. 1', 8),
      viewsCount: 56000
    }
  ],
  'comic-norm-4': [
    {
      id: 'ch-norm-4-120',
      comicId: 'comic-norm-4',
      chapterNumber: 120,
      title: 'Domain Spiritualis Tingkat Surgawi',
      releaseDate: '14 Okt 2024',
      isNew: true,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Tales of Demons and Gods - Ch. 120', 8),
      viewsCount: 9200
    },
    {
      id: 'ch-norm-4-1',
      comicId: 'comic-norm-4',
      chapterNumber: 1,
      title: 'Reinkarnasi Nie Li',
      releaseDate: '01 Jan 2024',
      isNew: false,
      isLocked: false,
      sourceType: 'images',
      pages: createPages('action', 'Tales of Demons and Gods - Ch. 1', 8),
      viewsCount: 31000
    }
  ]
};

export const initialUsers: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    passwordHash: 'admin123',
    role: 'admin',
    status: 'active',
    createdAt: '2023-01-01T00:00:00.000Z',
    firstLoginAt: '2023-01-01T00:00:00.000Z',
    expiresAt: null, // Admin does not expire
    durationType: '1_year',
    failedAttempts: 0,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    tier: 'Premium',
    planType: 'plan_15k_all',
    accessType: 'all',
    priceNote: 'Super Admin Lifetime Access',
    bio: 'AntiTimpa Super Administrator',
    stats: {
      comicsRead: 250,
      chaptersRead: 2400,
      daysActive: 620
    }
  },
  {
    id: 'user-1',
    username: 'CyberReader_01',
    passwordHash: 'reader123',
    role: 'reader',
    status: 'active',
    createdAt: '2022-06-15T10:00:00.000Z',
    firstLoginAt: '2024-09-24T14:30:00.000Z',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    durationType: '30_days',
    failedAttempts: 0,
    avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80',
    tier: 'Pro Member',
    planType: 'plan_15k_all',
    accessType: 'all',
    priceNote: 'Rp 15.000 / VIP All Access',
    bio: 'Joined 2022 • Cyberpunk Aficionado',
    stats: {
      comicsRead: 142,
      chaptersRead: 1240,
      daysActive: 45
    }
  },
  {
    id: 'user-2',
    username: 'shadow_reader_99',
    passwordHash: 'reader123',
    role: 'reader',
    status: 'active',
    createdAt: '2024-08-01T08:00:00.000Z',
    firstLoginAt: '2024-10-14T09:00:00.000Z',
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    durationType: '3_days',
    failedAttempts: 0,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    tier: 'Free Tier',
    planType: 'plan_5k_single',
    accessType: 'specific',
    allowedComicIds: ['comic-1'],
    priceNote: 'Rp 5.000 / 1 Judul (Secret Stepmother)',
    bio: 'Comic Enthusiast',
    stats: {
      comicsRead: 28,
      chaptersRead: 190,
      daysActive: 12
    }
  },
  {
    id: 'user-3',
    username: 'manga_queen_xx',
    passwordHash: 'reader123',
    role: 'reader',
    status: 'active',
    createdAt: '2024-05-10T12:00:00.000Z',
    firstLoginAt: '2024-10-14T11:45:00.000Z',
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    durationType: '1_year',
    failedAttempts: 0,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    tier: 'Premium',
    planType: 'plan_15k_all',
    accessType: 'all',
    priceNote: 'VIP All-Access 1 Tahun',
    bio: 'Manga & Manhwa Collector',
    stats: {
      comicsRead: 94,
      chaptersRead: 820,
      daysActive: 110
    }
  },
  {
    id: 'user-4',
    username: 'zero_x_hero',
    passwordHash: 'reader123',
    role: 'reader',
    status: 'expired',
    createdAt: '2024-09-01T10:00:00.000Z',
    firstLoginAt: '2024-09-01T10:05:00.000Z',
    expiresAt: '2024-09-02T10:05:00.000Z', // 1 day expired
    durationType: '1_day',
    failedAttempts: 0,
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    tier: 'Free Tier',
    planType: 'plan_5k_single',
    accessType: 'specific',
    allowedComicIds: ['comic-2'],
    priceNote: 'Rp 5.000 / 1 Hari (Kadaluarsa)',
    bio: 'Occasional reader',
    stats: {
      comicsRead: 6,
      chaptersRead: 34,
      daysActive: 1
    }
  },
  {
    id: 'user-5',
    username: 'bot_scraper_882',
    passwordHash: 'wrongpass',
    role: 'reader',
    status: 'locked',
    createdAt: '2024-10-01T04:00:00.000Z',
    firstLoginAt: null,
    expiresAt: null,
    durationType: '3_days',
    failedAttempts: 3,
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
    tier: 'Free Tier',
    planType: 'plan_5k_single',
    accessType: 'specific',
    allowedComicIds: [],
    priceNote: 'Rp 5.000 (Terkunci)',
    bio: 'Suspicious actor',
    stats: {
      comicsRead: 0,
      chaptersRead: 0,
      daysActive: 0
    }
  }
];

export const initialBanners: Banner[] = [
  {
    id: 'banner-1',
    title: 'Secret Stepmother: Room Next Door',
    subtitle: 'Batasan terlarang antara ibu tiri dan anak sambung yang penuh godaan dan rahasia mendalam...',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=1200&auto=format&fit=crop&q=80',
    targetComicId: 'comic-1',
    badgeText: 'TRENDING 18+',
    order: 1,
    isActive: true
  },
  {
    id: 'banner-2',
    title: 'Office Affair: Secret Overtime',
    subtitle: 'Lembur malam bersama direktur cantik yang memiliki pesona liar di balik pintu ruang kerjanya.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    targetComicId: 'comic-2',
    badgeText: 'HOT MANHWA',
    order: 2,
    isActive: true
  },
  {
    id: 'banner-3',
    title: 'Boarding House: Secret Agreement',
    subtitle: 'Perjanjian rahasia anak kos bersama para penghuni cantik dan ibu kos yang menawan.',
    imageUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=1200&auto=format&fit=crop&q=80',
    targetComicId: 'comic-3',
    badgeText: 'POPULAR HAREM',
    order: 3,
    isActive: true
  }
];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    username: 'shadow_reader_99',
    ipAddress: '180.252.12.89',
    action: 'Login Berhasil (User)',
    type: 'login_success',
    status: 'success',
    details: 'Login berhasil via Mobile Chrome'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    username: 'manga_queen_xx',
    ipAddress: '114.122.8.201',
    action: 'Login Berhasil (User)',
    type: 'login_success',
    status: 'success',
    details: 'Masa aktif Premium 1 Tahun'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    username: 'zero_x_hero',
    ipAddress: '36.88.204.15',
    action: 'Login Ditolak: Masa Aktif Habis',
    type: 'login_failed',
    status: 'warning',
    details: 'Akun 1 Hari telah kadaluarsa pada 02 Sep'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    username: 'bot_scraper_882',
    ipAddress: '103.145.22.14',
    action: 'Akun Terkunci: 3x Gagal Password',
    type: 'login_failed',
    status: 'failed',
    details: 'Percobaan password salah berturut-turut. Akun dibekukan otomatis.'
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    username: 'unknown_guest',
    ipAddress: '194.26.29.112',
    action: 'Percobaan Akses Admin Ilegal (/admin)',
    type: 'unauthorized_attempt',
    status: 'failed',
    details: 'Upaya akses direct URL dashboard admin tanpa token sesi'
  },
  {
    id: 'log-6',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    username: 'admin',
    ipAddress: '127.0.0.1 (Localhost)',
    action: 'Upload Chapter Baru',
    type: 'chapter_create',
    status: 'info',
    details: 'Menambahkan Ch. 46 pada komik Neon Shadows: Zero'
  }
];

export const initialDriveAccounts: DriveAccount[] = [
  {
    id: 'drive-acc-1',
    name: 'Google Drive Utama #1 (Romance & Milf)',
    email: 'antitimpa.storage01@gmail.com',
    folderUrl: 'https://drive.google.com/drive/folders/1AntiTimpaRomanceMilfVault2024',
    status: 'active',
    storageUsedGb: 11.2,
    storageTotalGb: 15.0,
    colorTag: '#ff5b14',
    notes: 'Penyimpanan utama komik romance 18+, milf/noona, dan office affair yang dipromosikan di TikTok @anti.timpa.',
    createdAt: '2024-09-01'
  },
  {
    id: 'drive-acc-2',
    name: 'Google Drive #2 (Manhwa NTR & Drama)',
    email: 'antitimpa.storage02@gmail.com',
    folderUrl: 'https://drive.google.com/drive/folders/2AntiTimpaNTRDramaCollection',
    status: 'active',
    storageUsedGb: 8.5,
    storageTotalGb: 15.0,
    colorTag: '#ef4444',
    notes: 'Akun drive khusus komik tema perselingkuhan, netorare (NTR), dan dark drama dewasa.',
    createdAt: '2024-09-15'
  },
  {
    id: 'drive-acc-3',
    name: 'Google Drive #3 (Harem & Roommate)',
    email: 'antitimpa.storage03@gmail.com',
    folderUrl: 'https://drive.google.com/drive/folders/3AntiTimpaHaremRoommateVault',
    status: 'active',
    storageUsedGb: 6.8,
    storageTotalGb: 15.0,
    colorTag: '#a855f7',
    notes: 'Penyimpanan komik tema anak kos, tetangga seksi, dan harem.',
    createdAt: '2024-10-01'
  },
  {
    id: 'drive-acc-4',
    name: 'Google Drive #4 (Backup & VIP Uncensored)',
    email: 'antitimpa.backup01@gmail.com',
    folderUrl: 'https://drive.google.com/drive/folders/4AntiTimpaBackupVIPVault',
    status: 'backup',
    storageUsedGb: 4.1,
    storageTotalGb: 15.0,
    colorTag: '#10b981',
    notes: 'Drive mirror cadangan untuk antisipasi jika akun utama terkena pembatasan kuota Google.',
    createdAt: '2024-10-10'
  }
];

export const initialSystemSettings: SystemSettings = {
  siteName: 'AntiTimpa',
  siteLogo: '',
  siteFavicon: '',
  tiktokUrl: 'https://www.tiktok.com/@anti.timpa',
  tiktokHandle: '@anti.timpa',
  adminPhone: '089514441988',
  maxLoginAttempts: 3,
  lockoutDurationMinutes: 15,
  sessionTimeout: '24 Hours',
  defaultComicSorting: 'newest',
  defaultReaderMode: 'vertical',
  ageGating18Plus: true,
  adminNotifications: {
    newReaderRegistration: false,
    contentReviewReminders: true,
    systemErrorAlerts: true
  }
};

export const initialComments: Comment[] = [
  // Top-Level Parent Comment #1
  {
    id: 'comm-1',
    comicId: 'comic-1',
    chapterNumber: 24,
    userId: 'google-usr-1',
    userName: 'Dimas Aditya',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    authProvider: 'google',
    userRole: 'google_user',
    userEmail: 'dimas.aditya.comic@gmail.com',
    content: 'Art di chapter 24 ini bener-bener gila detailnya! Visual Maya pas adegan di dapur bener-bener dapet banget suasananya. Mantap mimin AntiTimpa gercep banget uploadnya! 🔥',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    likesCount: 28,
    likedBy: ['admin-1', 'reader-1'],
    spoiler: false
  },
  // Child Reply to Comment #1 (Level 1 Nesting)
  {
    id: 'comm-1-1',
    comicId: 'comic-1',
    chapterNumber: 24,
    userId: 'reader-user-andi',
    userName: 'Andi_VIP',
    userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
    authProvider: 'admin_account',
    userRole: 'reader',
    content: '@Dimas Aditya Setuju banget bro! Apalagi pas panel terakhir si Reza mulai berani pegang tangannya. Bikin deg-degan parah wkwk 😆',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    likesCount: 14,
    likedBy: ['google-usr-1'],
    spoiler: false,
    replyToId: 'comm-1'
  },
  // Deep Child Reply to Reply #1-1 (Level 2 Nesting)
  {
    id: 'comm-1-1-1',
    comicId: 'comic-1',
    chapterNumber: 24,
    userId: 'reader-user-bayu',
    userName: 'Bayu_NoonaHunter',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    authProvider: 'google',
    userRole: 'google_user',
    content: '@Andi_VIP Next chapter pasti bapaknya pulang tiba-tiba nih, tebakan gue selalu bener di manhwa genre begini wkwk',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    likesCount: 9,
    likedBy: [],
    spoiler: true,
    replyToId: 'comm-1-1'
  },
  // Another Child Reply to Comment #1
  {
    id: 'comm-1-2',
    comicId: 'comic-1',
    chapterNumber: 24,
    userId: 'admin-1',
    userName: 'AntiTimpa Official (Admin)',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    authProvider: 'admin_account',
    userRole: 'admin',
    content: 'Terima kasih atas dukungannya kawan-kawan pembaca! Chapter 25 malam ini jam 21.00 WIB rilis eksklusif ya, stay tuned! 🚀',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    likesCount: 42,
    likedBy: ['google-usr-1', 'reader-user-andi'],
    spoiler: false,
    replyToId: 'comm-1'
  },

  // Top-Level Parent Comment #2
  {
    id: 'comm-2',
    comicId: 'comic-1',
    chapterNumber: 1,
    userId: 'google-usr-2',
    userName: 'Siti Rahma',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    authProvider: 'google',
    userRole: 'google_user',
    userEmail: 'siti.rahma99@gmail.com',
    content: 'Baru tau ada web baca komik seringan ini tanpa pop-up iklan mengganggu. Langsung beli paket VIP tadi via WhatsApp admin, proses cepat banget!',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    likesCount: 19,
    likedBy: ['admin-1'],
    spoiler: false
  },
  // Reply to Comment #2
  {
    id: 'comm-2-1',
    comicId: 'comic-1',
    userId: 'reader-user-bima',
    userName: 'Bima_Kolektor',
    userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    authProvider: 'google',
    userRole: 'google_user',
    content: '@Siti Rahma beneran kak, player bacaannya juga smooth banget scrollingnya.',
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    likesCount: 6,
    likedBy: [],
    spoiler: false,
    replyToId: 'comm-2'
  }
];

export const initialAdSettings: AdSettings = {
  adsEnabled: true,
  hideAdsForVip: true,
  popunderEnabled: true,
  popunderCooldownHours: 12,
  floatingBottomEnabled: true
};

export const initialAds: AdItem[] = [
  {
    id: 'ad-home-bottom-vip',
    title: 'Banner Upgrade Member VIP AntiTimpa',
    type: 'banner_image',
    position: 'home_bottom',
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80',
    targetUrl: 'https://wa.me/6289514441988?text=Halo%20Admin%20AntiTimpa,%20saya%20mau%20order%20paket%20VIP%20Uncensored',
    altText: 'Beli Akses VIP 15rb Semua Judul Uncensored',
    badgeLabel: 'PROMO VIP',
    showForVip: false,
    notes: 'Banner promosi pembelian paket VIP via WhatsApp di bagian bawah beranda.',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    clickCount: 142,
    viewCount: 2890
  },
  {
    id: 'ad-detail-bottom-sponsor',
    title: 'Banner Rekomendasi Sponsor (Detail Komik)',
    type: 'banner_image',
    position: 'comic_detail_bottom',
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    targetUrl: 'https://wa.me/6289514441988?text=Halo%20Admin,%20saya%20tertarik%20dengan%20komik%20eksklusif%20AntiTimpa',
    altText: 'Baca Ribuan Chapter Tanpa Batas',
    badgeLabel: 'SPONSOR',
    showForVip: false,
    notes: 'Ditempatkan di bawah daftar chapter komik, tidak mengganggu sinopsis.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    clickCount: 88,
    viewCount: 1740
  },
  {
    id: 'ad-reader-end-sponsor',
    title: 'Banner Akhir Chapter Komik',
    type: 'banner_image',
    position: 'reader_end',
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
    targetUrl: 'https://wa.me/6289514441988?text=Halo%20Admin,%20mau%20tanya%20jadwal%20update%20chapter%20selanjutnya',
    altText: 'Dukung Komik Favoritmu & Dapatkan Update Lebih Cepat',
    badgeLabel: 'SUPPORT TRANSLATOR',
    showForVip: false,
    notes: 'Hanya muncul setelah semua gambar komik selesai dibaca (sebelum tombol Next Chapter).',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    clickCount: 215,
    viewCount: 4320
  },
  {
    id: 'ad-floating-bottom-bar',
    title: 'Sticky Floating Mini Bar',
    type: 'banner_image',
    position: 'floating_bottom',
    isActive: true,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    targetUrl: 'https://wa.me/6289514441988?text=Halo%20Admin,%20mau%20daftar%20member%20VIP',
    altText: 'Diskon Spesial VIP AntiTimpa',
    badgeLabel: 'HOT DEAL',
    showForVip: false,
    notes: 'Banner melayang di bawah layar dengan tombol close (X).',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    clickCount: 95,
    viewCount: 2100
  },
  {
    id: 'ad-popunder-safe',
    title: 'Direct Link Popunder (Anti-Spam Capping)',
    type: 'popunder_direct',
    position: 'popunder_global',
    isActive: false, // Default false for safe UX, can be turned on by admin anytime
    popunderUrl: 'https://wa.me/6289514441988?text=Halo%20Admin%20AntiTimpa',
    frequencyHours: 12, // Hanya muncul 1x per 12 jam per perangkat
    showForVip: false,
    notes: 'Popunder ramah pembaca: hanya aktif 1x per 12 jam menggunakan proteksi browser storage.',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    clickCount: 30,
    viewCount: 420
  }
];
