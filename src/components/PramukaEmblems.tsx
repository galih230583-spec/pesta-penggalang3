import React from 'react';

/**
 * Vector illustration of Lambang Gerakan Pramuka (Tunas Kelapa)
 * Matches the silhouette of the sprouting coconut emblem uploaded by the user.
 */
export const TunasKelapaLogo: React.FC<{ className?: string; color?: string }> = ({
  className = 'w-12 h-12',
  color = 'currentColor',
}) => (
  <svg
    viewBox="0 0 120 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
     role="img"
    aria-label="Lambang Tunas Kelapa Gerakan Pramuka"
  >
    {/* Coconut Fruit Body */}
    <path
      d="M14 114C14 114 22 86 52 86C78 86 90 105 90 118C90 134 76 149 52 149C26 149 14 123 14 114Z"
      fill={color}
    />
    {/* Coconut Pointed Tip Left */}
    <path
      d="M11 114C11 110 18 102 25 97C20 108 20 120 25 131C18 126 11 118 11 114Z"
      fill={color}
    />
    {/* Tall Main Shoot & Twin Leaf Blades */}
    <path
      d="M84 112C88 94 78 76 70 58C63 42 66 26 71 17C74 28 77 38 78 46C80 30 82 14 87 4C89 20 98 38 99 56C100 72 93 86 95 104C96 112 94 119 88 123L84 112Z"
      fill={color}
    />
    {/* Downward Root Shoot */}
    <path
      d="M86 119C91 128 96 141 101 153C102 156 99 158 96 156C88 150 84 137 80 125L86 119Z"
      fill={color}
    />
  </svg>
);

/**
 * Vector illustration of Lambang WOSM (World Organization of the Scout Movement)
 * Purple circular rope with reef knot at the bottom and fleur-de-lis with two 5-pointed stars.
 */
export const WosmLogo: React.FC<{ className?: string }> = ({
  className = 'w-12 h-12',
}) => (
  <svg
    viewBox="0 0 140 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Lambang WOSM Kepanduan Dunia"
  >
    {/* Outer Rope Circle */}
    <circle
      cx="70"
      cy="68"
      r="58"
      stroke="#4B1E78"
      strokeWidth="6.5"
      strokeDasharray="10 4"
    />
    <circle
      cx="70"
      cy="68"
      r="55"
      stroke="#4B1E78"
      strokeWidth="2"
    />

    {/* Center Petal of Fleur-de-lis */}
    <path
      d="M70 18C70 18 89 35 88 57C87 68 81 76 78 81H62C59 76 53 68 52 57C51 35 70 18 70 18Z"
      fill="#4B1E78"
    />
    {/* Center White Needle Line */}
    <path d="M70 32V81" stroke="#FAF7F2" strokeWidth="2.5" strokeLinecap="round" />

    {/* Left Petal */}
    <path
      d="M60 80C55 71 48 63 37 64C27 65 21 73 25 82C27 77 33 75 37 78C42 81 44 88 49 81"
      fill="#4B1E78"
    />
    <path
      d="M62 79C56 64 46 50 32 51C20 52 14 63 17 75C20 84 29 88 35 83C31 80 30 74 35 71C40 68 48 73 53 81H62Z"
      fill="#4B1E78"
    />

    {/* Right Petal */}
    <path
      d="M78 79C84 64 94 50 108 51C120 52 126 63 123 75C120 84 111 88 105 83C109 80 110 74 105 71C100 68 92 73 87 81H78Z"
      fill="#4B1E78"
    />

    {/* Left 5-Point Star */}
    <polygon
      points="31,61 32.8,65 37,65.5 33.8,68.3 34.8,72.5 31,70.2 27.2,72.5 28.2,68.3 25,65.5 29.2,65"
      fill="#FAF7F2"
    />

    {/* Right 5-Point Star */}
    <polygon
      points="109,61 110.8,65 115,65.5 111.8,68.3 112.8,72.5 109,70.2 105.2,72.5 106.2,68.3 103,65.5 107.2,65"
      fill="#FAF7F2"
    />

    {/* Horizontal Binding Band */}
    <rect
      x="48"
      y="81"
      width="44"
      height="7"
      rx="3.5"
      fill="#4B1E78"
      stroke="#FAF7F2"
      strokeWidth="2"
    />

    {/* Lower Base of Fleur-de-lis */}
    <path
      d="M63 89H77L82 104L70 116L58 104L63 89Z"
      fill="#4B1E78"
    />
    <path
      d="M55 89H62C61 98 56 105 47 107C43 108 40 104 42 100C46 102 52 97 55 89Z"
      fill="#4B1E78"
    />
    <path
      d="M85 89H78C79 98 84 105 93 107C97 108 100 104 98 100C94 102 88 97 85 89Z"
      fill="#4B1E78"
    />
    <path d="M70 89V111" stroke="#FAF7F2" strokeWidth="2" />

    {/* Reef Knot (Simpul Mati) at Bottom */}
    <path
      d="M52 125C56 119 66 119 72 125C78 131 86 131 90 125"
      stroke="#4B1E78"
      strokeWidth="6.5"
      strokeLinecap="round"
    />
    <path
      d="M52 131C56 137 66 137 72 131C78 125 86 125 90 131"
      stroke="#4B1E78"
      strokeWidth="6.5"
      strokeLinecap="round"
    />
    <path
      d="M53 129L43 142M87 129L97 142"
      stroke="#4B1E78"
      strokeWidth="6"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Vector illustration of Official Scout Round Stamp (Stempel Gerakan Pramuka Kwarran Muara Kaman)
 * Classic purple ink with double circle border, stars, and central Tunas Kelapa emblem.
 */
export const StempelPramukaMuaraKaman: React.FC<{ className?: string }> = ({
  className = 'w-32 h-32',
}) => (
  <svg
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Stempel Resmi Kwartir Ranting Gerakan Pramuka Muara Kaman"
  >
    {/* Outer Dotted/Serrated Rim & Double Ring */}
    <circle cx="100" cy="100" r="95" stroke="#581C87" strokeWidth="4" strokeDasharray="3 2" opacity="0.85" />
    <circle cx="100" cy="100" r="90" stroke="#581C87" strokeWidth="3" opacity="0.9" />
    <circle cx="100" cy="100" r="64" stroke="#581C87" strokeWidth="2" opacity="0.85" />

    {/* Top Curved Text: GERAKAN PRAMUKA */}
    <path id="stamp-top-arc" d="M 28 100 A 72 72 0 0 1 172 100" fill="none" />
    <text fill="#581C87" fontSize="11.5" fontWeight="900" letterSpacing="2.5" opacity="0.92">
      <textPath href="#stamp-top-arc" startOffset="50%" textAnchor="middle">
        GERAKAN PRAMUKA
      </textPath>
    </text>

    {/* Bottom Curved Text: KWARRAN MUARA KAMAN */}
    <path id="stamp-bottom-arc" d="M 172 100 A 72 72 0 0 1 28 100" fill="none" />
    <text fill="#581C87" fontSize="10" fontWeight="900" letterSpacing="2" opacity="0.92">
      <textPath href="#stamp-bottom-arc" startOffset="50%" textAnchor="middle">
        KWARRAN MUARA KAMAN
      </textPath>
    </text>

    {/* Left and Right Star Badges */}
    <polygon points="26,100 28.5,104 33,104.5 29.5,108 30.5,112.5 26,110 21.5,112.5 22.5,108 19,104.5 23.5,104" fill="#581C87" opacity="0.9" />
    <polygon points="174,100 176.5,104 181,104.5 177.5,108 178.5,112.5 174,110 169.5,112.5 170.5,108 167,104.5 171.5,104" fill="#581C87" opacity="0.9" />

    {/* Center Core: PANITIA & Tunas Kelapa Silhouette */}
    <rect x="36" y="88" width="128" height="24" rx="4" fill="#F3E8FF" opacity="0.3" />
    <text x="100" y="80" textAnchor="middle" fill="#581C87" fontSize="9" fontWeight="800" letterSpacing="1.5" opacity="0.9">
      PANITIA PESTA
    </text>
    <text x="100" y="126" textAnchor="middle" fill="#581C87" fontSize="9" fontWeight="800" letterSpacing="1.5" opacity="0.9">
      PENGGALANG 2026
    </text>

    {/* Center Mini Tunas Kelapa */}
    <g transform="translate(85, 87) scale(0.25)" opacity="0.88">
      <path d="M14 114C14 114 22 86 52 86C78 86 90 105 90 118C90 134 76 149 52 149C26 149 14 123 14 114Z" fill="#581C87" />
      <path d="M11 114C11 110 18 102 25 97C20 108 20 120 25 131C18 126 11 118 11 114Z" fill="#581C87" />
      <path d="M84 112C88 94 78 76 70 58C63 42 66 26 71 17C74 28 77 38 78 46C80 30 82 14 87 4C89 20 98 38 99 56C100 72 93 86 95 104C96 112 94 119 88 123L84 112Z" fill="#581C87" />
      <path d="M86 119C91 128 96 141 101 153C102 156 99 158 96 156C88 150 84 137 80 125L86 119Z" fill="#581C87" />
    </g>
  </svg>
);

/**
 * Vector illustration of the Official Signature of Treasurer Susilawati, S.Pd.
 * Rendered in dark blue fountain pen ink with natural calligraphic curves and flourish.
 */
export const TandaTanganBendahara: React.FC<{ className?: string }> = ({
  className = 'w-48 h-20',
}) => (
  <svg
    viewBox="0 0 280 110"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Tanda Tangan Bendahara Susilawati, S.Pd."
  >
    {/* Initial 'S' large flourish and upper loop */}
    <path
      d="M24 75 C 20 45, 38 18, 62 14 C 78 12, 92 24, 88 42 C 84 62, 52 74, 42 84 C 36 90, 48 94, 68 88 C 88 82, 108 64, 118 52"
      stroke="#1E3A8A"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Middle looping letters 'usi' and peaks */}
    <path
      d="M112 60 C 118 48, 126 44, 132 56 C 136 64, 142 64, 148 52 C 154 42, 160 44, 164 58 C 168 70, 178 72, 186 54 C 192 42, 198 48, 202 62"
      stroke="#1E3A8A"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Extended finishing loop & cross strike */}
    <path
      d="M198 62 C 210 50, 224 44, 238 48 C 248 52, 252 64, 244 74 C 232 86, 210 90, 180 92 C 140 94, 70 96, 32 94"
      stroke="#1E3A8A"
      strokeWidth="2.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Dot flourishes */}
    <circle cx="134" cy="38" r="2.2" fill="#1E3A8A" />
    <circle cx="166" cy="36" r="2.2" fill="#1E3A8A" />
    <circle cx="254" cy="56" r="2.5" fill="#1E3A8A" />
  </svg>
);

/**
 * Tanda Tangan Resmi & Stempel Panitia Pelaksana Pesta Penggalang Muara Kaman Tahun 2026
 * Diperbarui sesuai dokumen 'ttd penggalang.jpg' yang diunggah pengguna.
 */
export const TandaTanganPenggalangBaru: React.FC<{ className?: string }> = ({
  className = 'w-48 h-20',
}) => (
  <svg
    viewBox="0 0 325 380"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Tanda Tangan dan Stempel Resmi Panitia Pelaksana Pesta Penggalang Muara Kaman 2026"
  >
    <defs>
      <path id="arcPramukaComp" d="M 48 160 A 70 70 0 0 0 166 160" fill="none" />
    </defs>

    {/* STEMPEL RESMI (Tinta Biru Tua / Navy Blue #0E1F4B) */}
    <g stroke="#0E1F4B" fill="#0E1F4B">
      <rect x="14" y="14" width="186" height="352" rx="24" ry="24" fill="none" stroke="#0E1F4B" strokeWidth="4.5" />
      <rect x="21" y="21" width="172" height="338" rx="17" ry="17" fill="none" stroke="#0E1F4B" strokeWidth="1.8" />
      <circle cx="107" cy="122" r="64" fill="none" stroke="#0E1F4B" strokeWidth="3.8" />

      <g transform="translate(62, 54) scale(0.75)" fill="#110B05" stroke="none">
        <path d="M14 114C14 114 22 86 52 86C78 86 90 105 90 118C90 134 76 149 52 149C26 149 14 123 14 114Z" />
        <path d="M11 114C11 110 18 102 25 97C20 108 20 120 25 131C18 126 11 118 11 114Z" />
        <path d="M84 112C88 94 78 76 70 58C63 42 66 26 71 17C74 28 77 38 78 46C80 30 82 14 87 4C89 20 98 38 99 56C100 72 93 86 95 104C96 112 94 119 88 123L84 112Z" />
        <path d="M86 119C91 128 96 141 101 153C102 156 99 158 96 156C88 150 84 137 80 125L86 119Z" />
      </g>

      <text fontFamily="'Arial Black', 'Plus Jakarta Sans', sans-serif" fontSize="14.5" fontWeight="900" letterSpacing="2" stroke="none" fill="#0E1F4B">
        <textPath href="#arcPramukaComp" startOffset="50%" textAnchor="middle">
          GERAKAN PRAMUKA
        </textPath>
      </text>

      <g fontFamily="'Arial Black', 'Plus Jakarta Sans', sans-serif" textAnchor="middle" stroke="none" fill="#0E1F4B">
        <text x="107" y="235" fontSize="16" fontWeight="900" letterSpacing="0.3">
          PANITIA PELAKSANA
        </text>
        <text x="107" y="267" fontSize="16.5" fontWeight="900" letterSpacing="0.3">
          PESTA PENGGALANG
        </text>
        <text x="107" y="297" fontSize="12.8" fontWeight="800" letterSpacing="0.2">
          KECAMATAN MUARA KAMAN
        </text>
        <text x="107" y="326" fontSize="14.5" fontWeight="900" letterSpacing="1">
          TAHUN 2026
        </text>
      </g>
    </g>

    {/* TANDA TANGAN BASAH (Tinta Hitam Pekat #0A0A0A) */}
    <g stroke="#0A0A0A" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M188 152 C 176 156, 172 168, 184 175 C 196 182, 203 186, 200 196 C 196 204, 185 204, 178 198" strokeWidth="4.8" />
      <path d="M178 198 C 188 194, 205 180, 218 174 C 228 168, 238 180, 226 195 C 218 204, 210 205, 224 199 C 238 193, 248 177, 252 173 C 258 168, 266 179, 256 194 C 248 204, 243 206, 254 200" strokeWidth="4.5" />
      <path d="M254 200 C 265 192, 276 178, 280 164 C 284 152, 292 150, 292 163 C 291 183, 287 218, 287 246 C 286 261, 285 273, 287 275 C 289 276, 294 271, 294 260" strokeWidth="5" />
      <path d="M273 207 C 285 205, 299 204, 309 206" strokeWidth="4.6" />
    </g>
  </svg>
);
