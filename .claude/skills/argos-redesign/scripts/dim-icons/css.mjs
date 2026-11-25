export const CSS = `app-dim-icon { display: inline-block; flex-shrink: 0; }
app-dim-icon:not(.still) svg { animation: di-in 560ms var(--spring-bounce) both; }
@keyframes di-in { from { opacity: 0; transform: translateY(4px) scale(.86); } }
.dim :is(g, path, rect, circle, polygon) { transform-box: view-box; }
.dim .di-win { transition: fill 280ms var(--ease-standard) var(--d, 0ms); }
.dim :is(.di-accent, .di-pop, .di-shackle) { transform-box: fill-box; transform-origin: center; transition: transform 420ms var(--spring-bounce); }
.dim .di-hand-m { transform-origin: 24px 25.6px; }
.dim .di-ring { transform-origin: 24px 26px; }
.dim .di-hop { transform-origin: 24px 42px; }
.dim .di-wobble { transform-origin: 24px 36px; }
.dim .di-rock { transform-origin: 24px 12px; }
.dim :is(.di-bob, .di-twinkle, .di-wave) { transform-box: fill-box; transform-origin: center; }
.dim .di-dots circle { transform-box: fill-box; transform-origin: center; }
.dim :is(.di-flip, .di-bar) { transform-box: fill-box; transform-origin: center bottom; }
.dim:not(.still) .di-bar { animation: di-grow 700ms var(--ease-enter) both calc(240ms + var(--d, 0ms)); }
.dim :is(.di-bubbles, .di-mist) circle { opacity: 0; }
:is(.dim:hover, .group:hover .dim, .lift:hover .dim):not(.still) {
  & .di-win { fill: #f5c77e; }
  & .di-accent { transform: translateY(-2px) rotate(-6deg); }
  & .di-pop { transform: scale(1.12); }
  & .di-shackle { transform: translateY(-2.5px); }
  & .di-ring { animation: di-ring 620ms ease-in-out; }
  & .di-hand-m { animation: di-spin 900ms var(--ease-standard); }
  & .di-hop { animation: di-hop 620ms var(--ease-standard); }
  & :is(.di-swing, .di-wobble) { animation: di-swing 820ms ease-in-out; }
  & .di-rock { animation: di-rock 1200ms ease-in-out; }
  & .di-flip { animation: di-flip 760ms var(--ease-standard); transform-origin: center; }
  & .di-bar { animation: di-grow 600ms var(--ease-enter) both var(--d, 0ms); }
  & .di-bubbles circle { animation: di-rise 1100ms ease-out infinite; }
  & .di-mist circle { animation: di-puff 900ms ease-out infinite; }
  & .di-spin-slow { animation: di-spin 2.4s linear infinite; }
  & .di-spin-gear { animation: di-spin 1.6s var(--ease-standard); }
  & .di-dots circle { animation: di-dot 900ms ease-in-out infinite; }
  & .di-bob { animation: di-bob 1.4s ease-in-out infinite; }
  & .di-twinkle { animation: di-tw 1.2s ease-in-out infinite; }
  & .di-wave { animation: di-wave 1.2s ease-in-out infinite; }
}
.dim :is(.di-bubbles, .di-mist) circle:nth-child(2) { animation-delay: 220ms; }
.dim :is(.di-bubbles, .di-mist) circle:nth-child(3) { animation-delay: 440ms; }
@keyframes di-ring { 0%, 100% { transform: rotate(0); } 15%, 45%, 75% { transform: rotate(-7deg); } 30%, 60%, 90% { transform: rotate(7deg); } }
@keyframes di-spin { to { transform: rotate(360deg); } }
@keyframes di-hop { 0%, 100% { transform: none; } 20% { transform: scale(1.04, .94); } 50% { transform: translateY(-4px) scale(.98, 1.03); } 80% { transform: scale(1.02, .97); } }
@keyframes di-swing { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(8deg); } 55% { transform: rotate(-5deg); } 80% { transform: rotate(2deg); } }
@keyframes di-rock { 0%, 100% { transform: rotate(0); } 30% { transform: rotate(9deg); } 65% { transform: rotate(-3deg); } }
@keyframes di-dot { 0%, 100% { transform: none; } 40% { transform: translateY(-2px); } }
.dim .di-dots circle:nth-child(2) { animation-delay: 150ms; }
.dim .di-dots circle:nth-child(3) { animation-delay: 300ms; }
@keyframes di-bob { 50% { transform: translateY(-1.5px) rotate(-6deg); } }
@keyframes di-tw { 50% { opacity: .35; transform: scale(.7); } }
@keyframes di-wave { 50% { transform: translateX(2px); } }
@keyframes di-flip { to { transform: rotateY(360deg); } }
@keyframes di-grow { from { transform: scaleY(.15); } }
@keyframes di-rise { 0% { opacity: 0; transform: translateY(2px); } 30% { opacity: .95; } 100% { opacity: 0; transform: translateY(-7px); } }
@keyframes di-puff { 0% { opacity: 0; transform: translate(-2px, 1px) scale(.6); } 40% { opacity: .9; } 100% { opacity: 0; transform: translate(3px, -2px) scale(1.4); } }
@media (prefers-reduced-motion: reduce) { .dim, .dim * { animation: none !important; transition: none !important; } }
`;
