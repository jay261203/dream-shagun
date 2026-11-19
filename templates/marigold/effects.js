/* Marigold: opening doors, floating petals, scroll reveal and the music button.
   Runs only on our own origin and calls no outside server. Everything is optional: without this file
   the doors stay shut but "Open invitation" still jumps to the details, and nothing is hidden. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cover = doc.querySelector("[data-cover]");
  var open = doc.querySelector("[data-open]");

  // Opening: the doors part, then the inside panel stays until the guest scrolls.
  if (cover && open) {
    open.addEventListener("click", function (event) {
      event.preventDefault();
      if (reduce) {
        cover.classList.add("is-opening", "is-open");
        return;
      }
      cover.classList.add("is-opening");
      window.setTimeout(function () { cover.classList.add("is-open"); }, 1100);
    });
  }

  // Petals on the front of the cover. Skipped for reduced motion.
  var front = doc.querySelector(".cover__front");
  if (front && !reduce) {
    for (var i = 0; i < 9; i++) {
      var petal = doc.createElement("span");
      petal.className = "petal";
      petal.setAttribute("aria-hidden", "true");
      petal.style.left = Math.round(Math.random() * 96) + "%";
      petal.style.animationDuration = 8 + Math.random() * 7 + "s";
      petal.style.animationDelay = -Math.random() * 12 + "s";
      petal.style.setProperty("--drift", Math.round(Math.random() * 80 - 40) + "px");
      front.appendChild(petal);
    }
  }

  // Scroll reveal for headings and cards inside their own sections.
  var items = doc.querySelectorAll("[data-reveal]");
  if (items.length && !reduce && "IntersectionObserver" in window) {
    doc.documentElement.classList.add("js-reveal");
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          seen.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { seen.observe(el); });
  }

  // Music: a button the guest taps. Never plays by itself.
  var button = doc.querySelector("[data-music-button]");
  var audio = doc.querySelector("[data-music]");
  if (button && audio) {
    button.addEventListener("click", function () {
      if (audio.paused) {
        audio.play().then(function () {
          button.setAttribute("aria-pressed", "true");
          button.textContent = "Pause music";
        }, function () { /* the browser said no; leave the button as it is */ });
      } else {
        audio.pause();
        button.setAttribute("aria-pressed", "false");
        button.textContent = "Tap to play music";
      }
    });
  }
})();
