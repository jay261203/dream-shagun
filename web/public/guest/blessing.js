/* The blessing form on the guest page. It fills the [data-slot="blessing"] box.
   Steps: whose side, how much, your name and a note. It asks our own server which sides take blessings and what each
   wrote; it never receives a UPI ID. Everything is built with createElement and textContent, never with HTML strings.
   Nothing here shows a total, a target or anyone else's blessing. */
(function () {
  "use strict";
  var doc = document;
  var slot = doc.querySelector('[data-slot="blessing"]');
  if (!slot) return;

  var cfg;
  try { cfg = JSON.parse(slot.getAttribute("data-config") || ""); } catch (e) { return; }
  if (!cfg || !cfg.slug) return;

  function el(tag, props, children) {
    var node = doc.createElement(tag);
    if (props) Object.keys(props).forEach(function (k) {
      if (k === "text") node.textContent = props[k];
      else if (k === "class") node.className = props[k];
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function rupees(n) { return "₹" + new Intl.NumberFormat("en-IN").format(n); }

  var options = null;
  var state = { side: null, amount: null, custom: false };
  var step = 1;
  var busy = false;
  var finished = false;
  var lastCheck = 0;

  var box = el("div", { class: "bless" });
  var live = el("p", { class: "bless__msg", role: "status", "aria-live": "polite" });

  function say(text, bad) { live.textContent = text; live.className = "bless__msg" + (bad ? " bless__msg--bad" : ""); }
  function clear() { box.textContent = ""; }
  function totalSteps() { return options.sides.length > 1 ? 3 : 2; }
  function position() { return options.sides.length > 1 ? step : step - 1; }
  function currentSide() { return options.sides.filter(function (s) { return s.side === state.side; })[0]; }

  function header(title) {
    return el("div", { class: "bless__head" }, [el("p", { class: "bless__step", text: "Step " + position() + " of " + totalSteps() }), el("h3", { text: title })]);
  }
  function back(to) {
    var b = el("button", { type: "button", class: "bless__back", text: "Back" });
    b.addEventListener("click", function () { step = to; say("", false); render(); });
    return b;
  }

  function stepSide() {
    clear();
    box.appendChild(header("Whose side are you blessing?"));
    var list = el("div", { class: "bless__sides" });
    options.sides.forEach(function (s) {
      var b = el("button", { type: "button", class: "bless__side" }, [el("span", { class: "bless__side-name", text: s.host + "’s side" }), s.wish ? el("span", { class: "bless__side-wish", text: s.wish }) : null]);
      b.addEventListener("click", function () { state.side = s.side; step = 2; render(); });
      list.appendChild(b);
    });
    box.appendChild(list);
  }

  function stepAmount() {
    clear();
    box.appendChild(header("Choose an amount"));
    var side = currentSide();
    if (side && side.wish) box.appendChild(el("p", { class: "bless__wish", text: side.wish }));
    var grid = el("div", { class: "bless__amounts", role: "group", "aria-label": "Amount" });
    var custom = el("input", { type: "number", inputmode: "numeric", min: String(options.min_rupees), max: String(options.max_rupees), step: "1", "aria-label": "Another amount in rupees", placeholder: "Amount in ₹" });
    var customRow = el("div", { class: "bless__custom" }, [el("span", { text: "₹", "aria-hidden": "true" }), custom]);
    customRow.hidden = !state.custom;
    if (state.custom && state.amount) custom.value = String(state.amount);

    function mark() {
      Array.prototype.forEach.call(grid.children, function (b) {
        var on = b.getAttribute("data-kind") === "custom" ? state.custom : !state.custom && Number(b.getAttribute("data-amount")) === state.amount;
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
    options.presets.forEach(function (n) {
      var b = el("button", { type: "button", class: "bless__amount", "data-amount": String(n), text: rupees(n) });
      b.addEventListener("click", function () { state.amount = n; state.custom = false; customRow.hidden = true; say("", false); mark(); });
      grid.appendChild(b);
    });
    var other = el("button", { type: "button", class: "bless__amount", "data-kind": "custom", text: "Another amount" });
    other.addEventListener("click", function () { state.custom = true; state.amount = null; customRow.hidden = false; mark(); custom.focus(); });
    grid.appendChild(other);
    custom.addEventListener("input", function () { state.amount = custom.value === "" ? null : Number(custom.value); });
    box.appendChild(grid);
    box.appendChild(customRow);
    mark();

    var next = el("button", { type: "button", class: "btn bless__next", text: "Next" });
    next.addEventListener("click", function () {
      var n = state.amount;
      if (state.custom && custom.value === "") { say("Enter an amount.", true); custom.focus(); return; }
      if (n === null) { say("Choose an amount.", true); return; }
      if (state.custom && (n !== Math.floor(n) || n < options.min_rupees || n > options.max_rupees)) {
        say("Enter a whole amount from " + rupees(options.min_rupees) + " to " + rupees(options.max_rupees) + ".", true);
        custom.focus();
        return;
      }
      step = 3; say("", false); render();
    });
    box.appendChild(live);
    box.appendChild(next);
    if (options.sides.length > 1) box.appendChild(back(1));
  }

  function stepWho() {
    clear();
    box.appendChild(header("Add your name"));
    var name = el("input", { type: "text", maxlength: "80", autocomplete: "name", required: "required", id: "bless-name" });
    var note = el("textarea", { maxlength: "300", rows: "3", id: "bless-note" });
    box.appendChild(el("div", { class: "bless__field" }, [el("label", { for: "bless-name", text: "Your name" }), name]));
    box.appendChild(el("div", { class: "bless__field" }, [el("label", { for: "bless-note", text: "A note for them (optional)" }), note]));
    box.appendChild(el("p", { class: "bless__summary", text: rupees(state.amount) + " · " + (currentSide() ? currentSide().host + "’s side" : "") }));
    box.appendChild(live);
    var send = el("button", { type: "button", class: "btn bless__next", text: "Send my blessing" });
    if (cfg.preview) { send.disabled = true; say("This is a preview. Blessings start working when the invitation is published.", false); }
    send.addEventListener("click", function () {
      if (busy || cfg.preview) return;
      var who = name.value.trim();
      if (!who) { say("Please enter your name.", true); name.focus(); return; }
      busy = true; send.disabled = true; say("Sending...", false);
      fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/blessings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ side: state.side, amount_rupees: state.amount, name: who, note: note.value.trim() || null }),
      }).then(function (res) {
        return res.json().catch(function () { return null; }).then(function (body) { return { ok: res.ok, body: body }; });
      }).then(function (r) {
        if (r.ok) { done(who); return; }
        var d = r.body && r.body.detail;
        say(typeof d === "string" ? d : "We could not send your blessing. Please check your answers and try again.", true);
      }).catch(function () {
        say("We could not reach the server. Check your connection and try again.", true);
      }).then(function () { busy = false; send.disabled = Boolean(cfg.preview); });
    });
    box.appendChild(send);
    box.appendChild(back(2));
  }

  function done(who) {
    finished = true;
    clear();
    box.className = "bless bless--done";
    box.appendChild(el("h3", { text: "Thank you, " + who }));
    box.appendChild(el("p", { class: "bless__thanks", text: "Your blessing is noted. The family confirms it when it reaches them." }));
    box.setAttribute("tabindex", "-1");
    box.focus();
  }

  function render() {
    box.className = "bless";
    if (step === 1 && options.sides.length > 1) stepSide();
    else if (step <= 2) { step = 2; stepAmount(); }
    else stepWho();
  }

  function start(data) {
    if (!data || !data.enabled || !data.sides || !data.sides.length) return; // nothing set up: the section stays hidden
    options = data;
    if (options.sides.length === 1) state.side = options.sides[0].side;
    step = options.sides.length > 1 ? 1 : 2;
    slot.textContent = "";
    slot.appendChild(box);
    render();
  }

  // The family can change who takes blessings while a guest has the page open. Ask again when the guest comes back to the
  // tab (at most every 5 seconds) and update what is showing, without throwing away what they have typed.
  function update(data) {
    var usable = data && data.enabled && data.sides && data.sides.length;
    if (!usable) {
      if (options && !finished) { options = null; slot.textContent = ""; } // nothing set up any more: the section hides itself
      return;
    }
    if (!options) { start(data); return; }
    if (JSON.stringify(options) === JSON.stringify(data) || finished) return;
    options = data;
    var stillThere = options.sides.some(function (x) { return x.side === state.side; });
    if (!stillThere) {
      state.side = options.sides.length === 1 ? options.sides[0].side : null;
      step = options.sides.length > 1 ? 1 : 2;
      render();
      if (state.amount !== null) say("The sides taking blessings changed, so please choose again.", true);
    } else if (step <= 2) {
      render(); // the guest has not typed a name yet: show the new wishes and sides straight away
    }
    // Step 3 (name and note) is left alone; the server checks the side again when the blessing is sent.
  }
  function refresh() {
    if (cfg.preview || busy || doc.visibilityState === "hidden") return;
    var now = Date.now();
    if (now - lastCheck < 5000) return;
    lastCheck = now;
    fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/blessing")
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) { if (data) update(data); })
      .catch(function () { /* keep what is showing */ });
  }
  doc.addEventListener("visibilitychange", refresh);
  window.addEventListener("focus", refresh);

  if (cfg.preview) {
    // The family's preview has no published page to ask, so it shows both sides with a sample amount list.
    start({ enabled: true, presets: [501, 1001, 2100, 5100], min_rupees: 1, max_rupees: 100000, sides: [{ side: "bride", host: (cfg.hosts || {}).bride || "Bride", wish: null }, { side: "groom", host: (cfg.hosts || {}).groom || "Groom", wish: null }] });
    return;
  }
  fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/blessing")
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) { lastCheck = Date.now(); start(data); })
    .catch(function () { /* the section stays hidden if the server cannot be reached */ });
})();
