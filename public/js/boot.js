// Holds the paint until the agency's design is applied.
//
// Without this the page renders with the kit's FALLBACK design -- the colours and the name of
// config.js -- and repaints a moment later, when `design` and `settings-v2` answer with the real
// palette, logo and typography. That flash is what the owner reported: "muestra un diseño primero y
// luego lo cambia y queda feo".
//
// 🔴 It is a FILE and not an inline <script> on purpose: the kit ships `script-src 'self'`, so an
// inline block is blocked by the CSP -- and blocked silently, which is the worst version of this.
//
// It is also a CLASSIC script in <head>, not a module: a module is deferred, so the body would
// paint before the class was ever added and the flash would survive the fix.
(function () {
  var root = document.documentElement;
  root.classList.add('is-booting');

  // Safety net, and it is not optional: whoever removes the class is a module that may fail to
  // load, and the API may hang. A site that stays blank because a request is slow is worse than
  // one that repaints, so after this the page appears no matter what.
  window.setTimeout(function () { root.classList.remove('is-booting'); }, 2500);
})();
