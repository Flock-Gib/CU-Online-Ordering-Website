import { useId } from "react";

function HeroBowl() {
  const id = useId().replace(/:/g, "");
  const paint = (name: string) => `url(#${id}-${name})`;
  return (
    <svg className="food-art hero-art" viewBox="0 0 480 360" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-ceramic`} cx=".4" cy=".2" r=".9">
          <stop stopColor="#fffefb" />
          <stop offset=".65" stopColor="#eee4d5" />
          <stop offset="1" stopColor="#c8b49f" />
        </radialGradient>
        <radialGradient id={`${id}-greens`}>
          <stop stopColor="#809648" />
          <stop offset="1" stopColor="#334e2d" />
        </radialGradient>
        <linearGradient id={`${id}-chicken`} x2=".3" y2="1">
          <stop stopColor="#f5d6a0" />
          <stop offset=".5" stopColor="#d99a51" />
          <stop offset="1" stopColor="#ae632e" />
        </linearGradient>
        <radialGradient id={`${id}-tomato`} cx=".3" cy=".25">
          <stop stopColor="#ff9a67" />
          <stop offset=".5" stopColor="#de4a32" />
          <stop offset="1" stopColor="#9b2e25" />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-.3" y="-.3" width="1.6" height="1.8">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="10"
            floodColor="#53351e"
            floodOpacity=".18"
          />
        </filter>
        <clipPath id={`${id}-inside`}>
          <ellipse cx="240" cy="169" rx="165" ry="105" />
        </clipPath>
      </defs>
      <ellipse cx="243" cy="306" rx="164" ry="20" fill="#6a4634" opacity=".1" />
      <g filter={paint("shadow")}>
        <path
          d="M56 172C60 272 126 326 240 326s180-54 184-154Z"
          fill={paint("ceramic")}
        />
        <path
          d="M79 227c34 73 123 102 217 75"
          fill="none"
          stroke="#fffdf8"
          strokeWidth="5"
          opacity=".55"
        />
        <ellipse cx="240" cy="168" rx="185" ry="124" fill="#fffdf7" />
        <ellipse cx="240" cy="169" rx="170" ry="109" fill="#ded4bf" />
        <g clipPath={paint("inside")}>
          <ellipse cx="240" cy="169" rx="165" ry="105" fill={paint("greens")} />
          {Array.from({ length: 19 }, (_, i) => {
            const x = 95 + ((i * 73) % 290);
            const y = 90 + ((i * 47) % 155);
            return (
              <g key={i} transform={`translate(${x} ${y}) rotate(${i * 37})`}>
                <path
                  d="M-25 0Q-16-26 0-17 19-28 28-5 18 17 0 20-21 17-25 0Z"
                  fill={i % 2 ? "#72984b" : "#47713c"}
                />
                <path
                  d="M-18 2 17-4M-2 0l-7-10M5-1l6 10"
                  stroke="#b1c67c"
                  strokeWidth="1.3"
                  opacity=".55"
                  fill="none"
                />
              </g>
            );
          })}
          <ellipse cx="202" cy="181" rx="91" ry="65" fill="#e1cf9d" />
          {Array.from({ length: 110 }, (_, i) => (
            <ellipse
              key={i}
              cx={127 + ((i * 37) % 146)}
              cy={131 + ((i * 19) % 101)}
              rx="4"
              ry="1.8"
              transform={`rotate(${i * 29} ${127 + ((i * 37) % 146)} ${131 + ((i * 19) % 101)})`}
              fill={i % 3 ? "#fff0cd" : "#bfab77"}
            />
          ))}
          {[
            [118, 144],
            [335, 195],
            [316, 112],
            [145, 231],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${i * 35})`}>
              <ellipse rx="23" ry="18" fill={paint("tomato")} />
              <path
                d="M-15 0Q0-17 15 0 0 16-15 0"
                fill="#ef8a55"
                opacity=".65"
              />
              <path
                d="m-8-4 3 2m9-3 3 2m-5 8 3-2"
                stroke="#ffe0a2"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="m-7-10 7 3 7-5-3 7"
                fill="none"
                stroke="#678145"
                strokeWidth="2"
              />
            </g>
          ))}
          {[
            [340, 149],
            [298, 230],
            [100, 191],
          ].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(-25)`}>
              <ellipse rx="23" ry="16" fill="#416d38" />
              <ellipse rx="19" ry="13" fill="#b9ce7a" />
              <ellipse rx="13" ry="9" fill="#dfebac" />
              <path
                d="m-5-4 2 1m7 0 2 1m-4 5 2-1"
                stroke="#f9f4d0"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          ))}
          <g transform="rotate(-25 220 166)">
            {[0, 1, 2, 3, 4].map((i) => (
              <g
                key={i}
                transform={`translate(${181 + i * 6} ${108 + i * 25})`}
              >
                <path
                  d="M0 0Q37-8 73 2l-4 20Q35 28-4 18Z"
                  fill="#824724"
                  opacity=".3"
                  transform="translate(2 4)"
                />
                <path
                  d="M0 0Q37-8 73 2l-4 20Q35 28-4 18Z"
                  fill={paint("chicken")}
                  stroke="#bf8245"
                  strokeWidth="1.5"
                />
                <path
                  d="m11 1 4 17m17-21 4 23m16-21 3 18"
                  stroke="#75401f"
                  strokeWidth="3"
                  opacity=".65"
                />
                <path
                  d="M4 17q30 6 62 1"
                  stroke="#ffe2b2"
                  strokeWidth="3"
                  fill="none"
                />
              </g>
            ))}
          </g>
          <g transform="translate(288 76) rotate(15)">
            <path
              d="M0 0 57 20 8 63Q-12 30 0 0Z"
              fill="#e5b533"
              stroke="#fff1bc"
              strokeWidth="6"
            />
            <path d="m5 7 43 15L12 52Q0 28 5 7" fill="#f9dd79" />
            <path
              d="m8 13 7 29m-3-24 22 6m-20-2 11 12"
              stroke="#fff0b0"
              strokeWidth="2"
            />
          </g>
          {Array.from({ length: 24 }, (_, i) => (
            <path
              key={i}
              d={`m${105 + ((i * 43) % 265)} ${104 + ((i * 31) % 136)} 5 -2`}
              stroke={i % 3 ? "#325a32" : "#fff3d4"}
              strokeWidth={i % 3 ? 2 : 3}
              strokeLinecap="round"
            />
          ))}
        </g>
        <ellipse
          cx="240"
          cy="168"
          rx="179"
          ry="118"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
          opacity=".65"
        />
      </g>
    </svg>
  );
}

export function FoodArt({
  name,
  hero = false,
}: {
  name: string;
  hero?: boolean;
}) {
  if (hero) return <HeroBowl />;
  const kind = /cookie|brownie|cake/i.test(name)
    ? "cookie"
    : /tea|drink|lemonade|coffee/i.test(name)
      ? "tea"
      : /club|sandwich|burger/i.test(name)
        ? "sandwich"
        : /pasta|penne/i.test(name)
          ? "pasta"
          : /salad/i.test(name)
            ? "salad"
            : "bowl";
  return (
    <svg
      className={`food-art ${hero ? "hero-art" : ""}`}
      viewBox="0 0 320 220"
      aria-hidden="true"
    >
      <defs>
        <filter
          id={`shadow-${hero ? "hero" : kind}`}
          x="-30%"
          y="-30%"
          width="160%"
          height="170%"
        >
          <feDropShadow
            dx="0"
            dy="10"
            stdDeviation="9"
            floodColor="#322712"
            floodOpacity=".13"
          />
        </filter>
      </defs>
      <ellipse
        cx="160"
        cy="184"
        rx="100"
        ry="15"
        fill="#62573b"
        opacity=".08"
      />
      {kind === "cookie" ? (
        <g filter={`url(#shadow-${kind})`}>
          <circle cx="130" cy="123" r="63" fill="#b77437" />
          <circle cx="130" cy="116" r="63" fill="#deb06d" />
          <circle cx="199" cy="133" r="57" fill="#b77437" />
          <circle cx="199" cy="127" r="57" fill="#e7bc7d" />
          {[
            [105, 85],
            [145, 74],
            [91, 124],
            [147, 122],
            [121, 152],
            [179, 105],
            [215, 91],
            [226, 137],
            [184, 155],
          ].map(([x, y], i) => (
            <path
              key={i}
              d={`M${x} ${y}l12 -3 4 11 -10 6 -8 -6z`}
              fill="#5c382c"
            />
          ))}
          <path
            d="M92 101l8 3m55 42 9 2m25-23 8 2m17 29 6-2"
            stroke="#f8dca8"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>
      ) : kind === "tea" ? (
        <g filter={`url(#shadow-${kind})`}>
          <path d="M113 57h96l-12 118q-36 17-72 0z" fill="#fff" opacity=".8" />
          <path d="M119 84h84l-10 86q-32 13-64 0z" fill="#b96c2d" />
          <path d="M123 86h76" stroke="#e4a95c" strokeWidth="6" />
          <g fill="#f3d9b4" opacity=".7">
            <rect
              x="131"
              y="95"
              width="21"
              height="22"
              rx="5"
              transform="rotate(-12 141 106)"
            />
            <rect
              x="164"
              y="111"
              width="23"
              height="22"
              rx="5"
              transform="rotate(15 175 122)"
            />
            <rect x="138" y="139" width="22" height="20" rx="5" />
          </g>
          <path
            d="m177 105 13-75h28"
            fill="none"
            stroke="#365c44"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="114" cy="78" r="25" fill="#f2cc50" />
          <circle cx="114" cy="78" r="19" fill="#fff1a1" />
          <path
            d="M114 60v36m-18-18h36m-30-13 25 26m-26 0 27-26"
            stroke="#e8c548"
            strokeWidth="2"
          />
        </g>
      ) : kind === "sandwich" ? (
        <g filter={`url(#shadow-${kind})`}>
          <path d="m65 129 123-65 76 72-120 51z" fill="#b5763d" />
          <path d="m65 118 123-65 76 72-120 51z" fill="#e6c691" />
          <path d="m68 111 120-64 72 71-117 51z" fill="#507142" />
          <path d="m69 101 119-61 71 69-116 51z" fill="#d3654e" />
          <path d="m71 90 117-60 70 69-114 51z" fill="#f2e3bf" />
          <path d="m66 81 122-61 76 71-120 51z" fill="#ca9355" />
          <path d="m74 79 113-53 68 64-110 43z" fill="#efd4a4" />
          <path
            d="m111 69 43-21m14 26 37-18m-55 45 39-19"
            stroke="#d7ae75"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="m192 27-6 129" stroke="#73563d" strokeWidth="3" />
          <circle cx="192" cy="26" r="6" fill="#b5543d" />
        </g>
      ) : (
        <g filter={`url(#shadow-${hero ? "hero" : kind})`}>
          <ellipse cx="160" cy="123" rx="105" ry="65" fill="#e1dfd1" />
          <path d="M55 120q10 85 105 85t105-85" fill="#faf8ef" />
          <ellipse cx="160" cy="115" rx="106" ry="64" fill="#fffdf5" />
          <ellipse
            cx="160"
            cy="115"
            rx="89"
            ry="50"
            fill={kind === "pasta" ? "#b9aa67" : "#87944d"}
          />
          {kind === "pasta" ? (
            <g
              fill="none"
              stroke="#e2cd82"
              strokeWidth="12"
              strokeLinecap="round"
            >
              <path d="m103 91 23 10m16-20 21 12m21-10 21 14m-105 27 23 11m20-23 22 12m18-15 24 11m-72 21 24 10m24-15 25 9" />
            </g>
          ) : (
            <g>
              <g fill="#496d3d">
                <ellipse
                  cx="109"
                  cy="100"
                  rx="29"
                  ry="14"
                  transform="rotate(-25 109 100)"
                />
                <ellipse
                  cx="203"
                  cy="91"
                  rx="29"
                  ry="15"
                  transform="rotate(25 203 91)"
                />
                <ellipse
                  cx="182"
                  cy="137"
                  rx="31"
                  ry="14"
                  transform="rotate(-18 182 137)"
                />
              </g>
              <g fill="#779447">
                <ellipse cx="100" cy="131" rx="25" ry="14" />
                <ellipse cx="162" cy="84" rx="27" ry="14" />
                <ellipse cx="217" cy="124" rx="22" ry="15" />
              </g>
              <g fill="#e9d8a6">
                <ellipse cx="137" cy="119" rx="30" ry="16" />
                <ellipse cx="158" cy="143" rx="26" ry="10" />
              </g>
              {kind === "bowl" && (
                <g fill="#d4a266" stroke="#aa7748" strokeWidth="2">
                  <path d="m115 80 38-9 13 16-39 11z" />
                  <path d="m121 102 39-9 13 16-39 11z" />
                  <path d="m128 124 39-10 13 16-39 12z" />
                </g>
              )}
            </g>
          )}
          <g fill="#cc5d43">
            <circle cx="205" cy="116" r="12" />
            <circle cx="93" cy="113" r="10" />
            <circle cx="176" cy="90" r="10" />
          </g>
          <g fill="#efb44b">
            <circle cx="114" cy="146" r="5" />
            <circle cx="188" cy="149" r="5" />
            <circle cx="225" cy="106" r="5" />
          </g>
          <path
            d="m188 70 27 17-28 18q-12-17 1-35"
            fill="#f2d470"
            stroke="#f9edb7"
            strokeWidth="3"
          />
          <path
            d="m144 155 6 2m24-34 6-2m-71-25 6 1"
            stroke="#fff5d5"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
      {hero && (
        <g fill="#567247">
          <path d="M43 69q-24-9-17-25 22 0 17 25m0 0q1-25 17-22 8 20-17 22" />
          <path d="M271 163q-5-23 13-26 13 17-13 26m0 0q21-13 28 1-13 18-28-1" />
        </g>
      )}
    </svg>
  );
}
