import { useId } from 'react';

export function GlassBackdrop() {
  const id = useId();
  return (
    <svg
      className="glass-backdrop"
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-line`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#b8b5d7" stopOpacity="0" />
          <stop offset=".3" stopColor="#cab7f0" stopOpacity=".25" />
          <stop offset=".6" stopColor="#e5dcff" stopOpacity=".55" />
          <stop offset="1" stopColor="#a6bfd5" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        className="glass-light-beam"
        d="M-80 580L1080 40"
        fill="none"
        stroke={`url(#${id}-line)`}
        strokeWidth="110"
        opacity=".12"
      />
      <g fill="none" stroke={`url(#${id}-line)`} strokeWidth=".7">
        <path
          d="M-80 160H1080M-80 430H1080M180-80V680M780-80V680"
          opacity=".5"
        />
        <path d="M-80 580L1080 40" strokeWidth="1.2" />
        <path d="M-80 592L1080 52" strokeWidth=".5" opacity=".4" />
      </g>
      <path
        className="graphic-flow"
        d="M-80 580L1080 40"
        fill="none"
        stroke="#cbb6ff"
        strokeWidth="2"
        strokeDasharray="2 196"
        opacity=".45"
      />
      <g fill="#d2bdff" className="graphic-pulse">
        <circle cx="180" cy="160" r="1.7" />
        <circle cx="780" cy="430" r="1.7" />
      </g>
    </svg>
  );
}

export function ExperienceGraphic({ kind }) {
  const id = useId();

  return (
    <svg
      className={`experience-graphic graphic-${kind}`}
      viewBox="0 0 420 240"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-glass`} x1=".15" y1="0" x2=".8" y2="1">
          <stop stopColor="#effbff" stopOpacity=".24" />
          <stop offset=".42" stopColor="#bac8fa" stopOpacity=".07" />
          <stop offset="1" stopColor="#91c9ed" stopOpacity=".02" />
        </linearGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ecfbff" stopOpacity=".85" />
          <stop offset=".4" stopColor="#b3d4ef" stopOpacity=".3" />
          <stop offset=".7" stopColor="#b9a2ed" stopOpacity=".6" />
          <stop offset="1" stopColor="#d0faff" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#6d7fa5" stopOpacity=".08" />
          <stop offset="1" stopColor="#b8dfff" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id={`${id}-light`} x1="0" y1="1" x2="1" y2="0">
          <stop stopColor="#8b9bfd" stopOpacity=".2" />
          <stop offset=".5" stopColor="#c2f8ff" />
          <stop offset="1" stopColor="#e5d5ff" stopOpacity=".3" />
        </linearGradient>
        <radialGradient id={`${id}-sphere`} cx=".3" cy=".2" r=".85">
          <stop stopColor="#e5faff" stopOpacity=".3" />
          <stop offset=".26" stopColor="#a8cbea" stopOpacity=".11" />
          <stop offset=".62" stopColor="#59748f" stopOpacity=".025" />
          <stop offset=".86" stopColor="#b2b5f6" stopOpacity=".09" />
          <stop offset="1" stopColor="#a3d7ed" stopOpacity=".3" />
        </radialGradient>
        <radialGradient id={`${id}-pearl`} cx=".3" cy=".25" r=".8">
          <stop stopColor="#f6ffff" />
          <stop offset=".18" stopColor="#b5e1ed" />
          <stop offset=".54" stopColor="#627790" />
          <stop offset=".85" stopColor="#222738" />
          <stop offset="1" stopColor="#929dc0" />
        </radialGradient>
        <filter
          id={`${id}-glow`}
          x="-100%"
          y="-100%"
          width="300%"
          height="300%"
        >
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {kind === 'purpose' ? (
        <>
          <path
            d="m210 39 173 99-173 99L37 138Z"
            fill={`url(#${id}-glass)`}
            opacity=".5"
          />
          <g stroke="#a9cbe8" strokeWidth=".65" opacity=".15">
            <path d="m37 138 173 99 173-99M80 113l173 99M124 89l173 99M167 64l173 99M80 163l173-99M124 188l173-99M167 212l173-99" />
          </g>
          <path
            d="m64 147 66 38 80-46 78 45 67-39M209 139v-33M130 185v-43M288 184v-47"
            stroke={`url(#${id}-light)`}
            strokeWidth="5"
            opacity=".22"
            filter={`url(#${id}-glow)`}
          />
          <path
            className="graphic-flow"
            d="m64 147 66 38 80-46 78 45 67-39M209 139v-33M130 185v-43M288 184v-47"
            stroke={`url(#${id}-light)`}
            strokeWidth="1.15"
            strokeDasharray="170 12 4 12"
          />
          <g
            stroke={`url(#${id}-edge)`}
            strokeWidth=".85"
            strokeLinejoin="round"
          >
            <path
              d="m89 109 37 21 36-21v51l-36 21-37-21Z"
              fill={`url(#${id}-side)`}
            />
            <path d="m89 109 37-21 36 21-36 21Z" fill={`url(#${id}-glass)`} />
            <path d="M126 130v51" />
            <path
              d="m174 69 36 21 37-21v73l-37 21-36-21Z"
              fill={`url(#${id}-side)`}
            />
            <path d="m174 69 36-21 37 21-37 21Z" fill={`url(#${id}-glass)`} />
            <path d="M210 90v73" />
            <path
              d="m256 111 32 18 32-18v45l-32 19-32-19Z"
              fill={`url(#${id}-side)`}
            />
            <path d="m256 111 32-19 32 19-32 18Z" fill={`url(#${id}-glass)`} />
            <path d="M288 129v46" />
          </g>
          <g stroke="#d5efff" strokeWidth="1" opacity=".36">
            <path d="m97 126 20 12m-20 0 20 12m-20 0 20 12m21-26 16-9m-16 20 16-9m-16 20 16-9M182 86l19 11m-19 3 19 11m-19 3 19 11m-19 3 19 11m18-41 20-12m-20 26 20-12m-20 26 20-12m-20 26 20-12m25-1 17 10m-17 2 17 10m15-12 17-10m-17 23 17-10" />
          </g>
          <path d="m199 68 11-6 11 6-11 6Z" fill="#d7f6ff" opacity=".7" />
          <g className="graphic-pulse" fill="#d8faff">
            <circle cx="64" cy="147" r="2.5" />
            <circle cx="130" cy="185" r="2.5" />
            <circle cx="210" cy="139" r="2" />
            <circle cx="288" cy="184" r="2.5" />
            <circle cx="355" cy="145" r="2.5" />
          </g>
          <g stroke="#bde4f1" opacity=".45">
            <path d="m62 91 6-3 6 3v8l-6 4-6-4Zm278 13 6-3 6 3v8l-6 4-6-4Z" />
            <path d="M68 102v18m278-5v15" strokeDasharray="2 4" opacity=".4" />
          </g>
        </>
      ) : kind === 'community' ? (
        <>
          <g stroke={`url(#${id}-edge)`} strokeWidth=".7">
            <ellipse
              cx="210"
              cy="122"
              rx="158"
              ry="60"
              transform="rotate(-20 210 122)"
              opacity=".6"
            />
            <ellipse
              cx="210"
              cy="122"
              rx="143"
              ry="66"
              transform="rotate(28 210 122)"
              opacity=".3"
            />
            <ellipse
              cx="210"
              cy="122"
              rx="116"
              ry="86"
              transform="rotate(-42 210 122)"
              opacity=".2"
            />
          </g>
          <g stroke={`url(#${id}-light)`} strokeWidth=".8" opacity=".42">
            <path d="m92 133 118-15 110-32M154 58l56 60 62 77M105 181l105-63 102 44M210 118l21-85" />
          </g>
          <g className="graphic-float">
            <circle
              cx="210"
              cy="118"
              r="49"
              fill={`url(#${id}-sphere)`}
              stroke={`url(#${id}-edge)`}
              strokeWidth=".9"
            />
            <ellipse
              cx="210"
              cy="118"
              rx="48"
              ry="16"
              transform="rotate(-24 210 118)"
              stroke="#c9e3f3"
              strokeWidth=".65"
              opacity=".22"
            />
            <path
              d="M173 104a39 39 0 0 1 44-25"
              stroke="#e3faff"
              strokeWidth="2.6"
              strokeLinecap="round"
              opacity=".58"
            />
            <path
              d="M176 108a35 35 0 0 1 11-16M228 156a39 39 0 0 0 22-30"
              stroke="#d4d9ff"
              strokeWidth=".8"
              strokeLinecap="round"
              opacity=".56"
            />
            <circle cx="210" cy="118" r="10" fill={`url(#${id}-pearl)`} />
            <circle cx="207" cy="115" r="2" fill="#efffff" opacity=".7" />
          </g>
          <g
            fill={`url(#${id}-sphere)`}
            stroke={`url(#${id}-edge)`}
            strokeWidth=".8"
          >
            <circle cx="92" cy="133" r="23" />
            <circle cx="154" cy="58" r="16" />
            <circle cx="320" cy="86" r="27" />
            <circle cx="272" cy="195" r="19" />
            <circle cx="105" cy="181" r="10" />
            <circle cx="312" cy="162" r="12" />
          </g>
          <g stroke="#edfcff" strokeLinecap="round" opacity=".65">
            <path
              d="M76 128a17 17 0 0 1 20-11M143 55a11 11 0 0 1 13-8M301 80a20 20 0 0 1 23-14M259 190a13 13 0 0 1 16-8"
              strokeWidth="1.6"
            />
            <path d="M99 179a7 7 0 0 1 8-4m198-15a7 7 0 0 1 9-4" />
          </g>
          <g fill={`url(#${id}-pearl)`}>
            <circle cx="92" cy="133" r="4" />
            <circle cx="154" cy="58" r="3" />
            <circle cx="320" cy="86" r="5" />
            <circle cx="272" cy="195" r="3" />
          </g>
          <g className="graphic-pulse" fill="#cceeff">
            <circle cx="231" cy="33" r="2.6" />
            <circle cx="359" cy="130" r="2" />
            <circle cx="168" cy="204" r="1.5" />
            <circle cx="59" cy="97" r="1.6" />
          </g>
          <g stroke="#cceeff" strokeWidth=".7" opacity=".6">
            <path d="M226 33h10m-5-5v10M354 130h10m-5-5v10" />
          </g>
        </>
      ) : (
        <>
          <g
            stroke={`url(#${id}-edge)`}
            strokeWidth=".8"
            strokeLinejoin="round"
          >
            <path
              d="m210 65 143 82-143 82-143-82Z"
              fill={`url(#${id}-glass)`}
              opacity=".45"
            />
            <path
              d="m210 43 143 82-143 82-143-82Z"
              fill={`url(#${id}-glass)`}
              opacity=".65"
            />
            <path
              d="M67 103v44m286-44v44m-143 38v44"
              strokeDasharray="2 5"
              opacity=".36"
            />
          </g>
          <g className="graphic-float" strokeLinejoin="round">
            <path
              d="m210 21 143 82-143 82-143-82Z"
              fill={`url(#${id}-glass)`}
              stroke={`url(#${id}-edge)`}
            />
            <path
              d="m77 103 133 76 133-76"
              stroke="#b9dcf8"
              strokeWidth=".65"
              opacity=".4"
            />
            <g stroke={`url(#${id}-light)`} strokeWidth="1" opacity=".6">
              <path d="m112 103 44-25 28 16m-45 25 27-15m-5 28 31-18m38-25 25-14 42 24m-66 15 27 15 28-16m-78 28 28 16 32-18" />
              <path d="m193 64 17-10 17 10m-34 89 17 10 17-10" opacity=".45" />
            </g>
            <path
              d="m160 100 50 29 50-29v14l-50 29-50-29Z"
              fill={`url(#${id}-side)`}
              stroke={`url(#${id}-edge)`}
              strokeWidth=".75"
            />
            <path
              d="m210 71 50 29-50 29-50-29Z"
              fill={`url(#${id}-glass)`}
              stroke={`url(#${id}-edge)`}
            />
            <path
              d="m210 79 36 21-36 21-36-21Z"
              fill="#c5e9ff"
              fillOpacity=".045"
              stroke="#cfedff"
              strokeWidth=".55"
              strokeOpacity=".3"
            />
            <path
              d="m201 91-12 7 12 7m18-10 12 7-12 7m-5-21-8 24"
              stroke="#d4efff"
              strokeWidth="1.35"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity=".85"
            />
            <g fill="#d7f6ff" className="graphic-pulse">
              <circle cx="112" cy="103" r="2" />
              <circle cx="139" cy="119" r="1.5" />
              <circle cx="161" cy="132" r="1.5" />
              <circle cx="297" cy="99" r="2" />
              <circle cx="286" cy="113" r="1.5" />
              <circle cx="268" cy="139" r="1.5" />
            </g>
          </g>
          <g stroke="#c6e7fc" strokeWidth=".65" opacity=".25">
            <path d="m124 147 25-14m7 33 20-12m69 15 32-19M210 207v-14m-24 0 24 14 24-14" />
          </g>
          <path
            d="m67 147 143 82 143-82"
            stroke={`url(#${id}-light)`}
            strokeWidth="1.2"
            opacity=".55"
          />
        </>
      )}
    </svg>
  );
}
