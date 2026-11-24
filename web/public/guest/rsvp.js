/* The reply form on the guest page. It fills the [data-slot="rsvp"] box, so every template gets the same behaviour.
   Runs only on our own origin and talks only to our own address (/api/w/...). Everything is built with createElement
   and textContent, never with HTML strings, so a name or an event title can never become markup.
   Without this script the reply section stays hidden and the rest of the invitation works as before. */
(function () {
  "use strict";
  var doc = document;
  var SVG = "http://www.w3.org/2000/svg";
  var slot = doc.querySelector('[data-slot="rsvp"]');
  if (!slot) return;

  var cfg;
  try { cfg = JSON.parse(slot.getAttribute("data-config") || ""); } catch (e) { return; }
  if (!cfg || !cfg.slug || !cfg.events || !cfg.events.length) return;

  var preview = cfg.events.some(function (e) { return !e.id; });
  var storeKey = "shagun-rsvp:" + cfg.slug;

  function remembered() { try { return window.localStorage.getItem(storeKey); } catch (e) { return null; } }
  function remember(code) { try { window.localStorage.setItem(storeKey, code); } catch (e) { /* private mode: the reply still saves */ } }
  function forget() { try { window.localStorage.removeItem(storeKey); } catch (e) { /* ignore */ } }

  // Today's date in India, so "closed" matches what the server decides.
  function indiaToday() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }
  var closed = Boolean(cfg.deadline) && indiaToday() > cfg.deadline;

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

  function icon(path, size) {
    var svg = doc.createElementNS(SVG, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", String(size || 20));
    svg.setAttribute("height", String(size || 20));
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.4");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    var p = doc.createElementNS(SVG, "path");
    p.setAttribute("d", path);
    svg.appendChild(p);
    return svg;
  }

  var uid = 0;
  function field(labelText, input, hint) {
    var id = "rsvp-f" + (++uid);
    input.id = id;
    return el("div", { class: "rsvp__field" }, [el("label", { for: id, text: labelText }), input, hint ? el("small", { text: hint }) : null]);
  }

  var RESPONSES = [["yes", "Coming"], ["maybe", "Maybe"], ["no", "Can’t come"]];
  var FOODS = [["veg", "Vegetarian"], ["jain", "Jain"], ["other", "Other"]];
  var MAX_PARTY = 20;

  var name = el("input", { type: "text", maxlength: "80", autocomplete: "name", required: "required", placeholder: "For example, Rohan Shah" });
  var phone = el("input", { type: "tel", maxlength: "20", autocomplete: "tel", inputmode: "tel" });
  var allergies = el("textarea", { maxlength: "300", rows: "2" });
  var status = el("p", { class: "rsvp__msg", role: "status", "aria-live": "polite" });
  var submit = el("button", { type: "submit", class: "btn rsvp__send", text: "Send my reply" });

  // One card per event: a three-way choice, and when someone is coming, how many of them.
  var rows = cfg.events.map(function (event, index) {
    var group = "rsvp-r" + index;
    var count = 1;
    var number = el("output", { class: "rsvp__count", text: "1" });
    var minus = el("button", { type: "button", class: "rsvp__step", "aria-label": "One fewer person for " + event.name }, [icon("M5 12h14")]);
    var plus = el("button", { type: "button", class: "rsvp__step", "aria-label": "One more person for " + event.name }, [icon("M12 5v14M5 12h14")]);
    var party = el("div", { class: "rsvp__party" }, [el("span", { class: "rsvp__party-label", text: "How many of you?" }), el("div", { class: "rsvp__stepper" }, [minus, number, plus])]);
    party.hidden = true;

    function setCount(n) {
      count = Math.max(1, Math.min(MAX_PARTY, n));
      number.textContent = String(count);
      minus.disabled = count <= 1;
      plus.disabled = count >= MAX_PARTY;
    }
    minus.addEventListener("click", function () { setCount(count - 1); });
    plus.addEventListener("click", function () { setCount(count + 1); });
    setCount(1);

    var radios = RESPONSES.map(function (r) {
      var input = el("input", { type: "radio", name: group, value: r[0] });
      input.addEventListener("change", function () { party.hidden = r[0] === "no"; });
      return { value: r[0], input: input, node: el("label", { class: "rsvp__option" }, [input, el("span", { text: r[1] })]) };
    });

    var head = el("div", { class: "rsvp__event-head" }, [el("span", { class: "rsvp__event-name", text: event.name }), event.date ? el("span", { class: "rsvp__event-date", text: event.date }) : null]);
    var legend = el("legend", { class: "sr-only", text: "Will you come to " + event.name + "?" });
    var fieldset = el("fieldset", { class: "rsvp__event" }, [legend, head, el("div", { class: "rsvp__segmented" }, radios.map(function (r) { return r.node; })), party]);
    return { event: event, radios: radios, setCount: setCount, getCount: function () { return count; }, party: party, node: fieldset };
  });

  var foodRadios = FOODS.map(function (f) {
    var input = el("input", { type: "radio", name: "rsvp-food", value: f[0] });
    return { value: f[0], input: input, node: el("label", { class: "rsvp__chip" }, [input, el("span", { text: f[1] })]) };
  });

  var form = el("form", { class: "rsvp", novalidate: "novalidate" }, [
    el("div", { class: "rsvp__who" }, [field("Your name", name), field("Phone number (optional)", phone, "Only the family sees this.")]),
    el("div", { class: "rsvp__events" }, rows.map(function (r) { return r.node; })),
    el("fieldset", { class: "rsvp__group" }, [el("legend", { text: "Food for your group (optional)" }), el("div", { class: "rsvp__chips" }, foodRadios.map(function (f) { return f.node; }))]),
    field("Any allergies? (optional)", allergies),
    status,
    submit,
  ]);
  var done = el("div", { class: "rsvp rsvp--done", hidden: "hidden" });

  function say(text, bad) {
    status.textContent = text;
    status.className = "rsvp__msg" + (bad ? " rsvp__msg--bad" : "");
  }

  function fill(saved) {
    name.value = saved.name || "";
    phone.value = saved.phone || "";
    allergies.value = saved.allergies || "";
    foodRadios.forEach(function (f) { f.input.checked = f.value === saved.food_choice; });
    rows.forEach(function (row) {
      var mine = (saved.replies || []).filter(function (r) { return r.event_id === row.event.id; })[0];
      row.radios.forEach(function (r) { r.input.checked = Boolean(mine) && r.value === mine.response; });
      row.party.hidden = !mine || mine.response === "no";
      row.setCount(mine && mine.party_size > 0 ? mine.party_size : 1);
    });
  }

  function collect() {
    var replies = [];
    rows.forEach(function (row) {
      var chosen = row.radios.filter(function (r) { return r.input.checked; })[0];
      if (chosen) replies.push({ event_id: row.event.id, response: chosen.value, party_size: chosen.value === "no" ? 0 : row.getCount() });
    });
    var food = foodRadios.filter(function (f) { return f.input.checked; })[0];
    return { name: name.value.trim(), phone: phone.value.trim() || null, replies: replies, food_choice: food ? food.value : null, allergies: allergies.value.trim() || null };
  }

  function words(body) {
    var d = body && body.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d.length) {
      var f = String((d[0].loc || [])[d[0].loc.length - 1] || "");
      if (f === "name") return "Please enter your name.";
      if (f === "phone") return "Please check the phone number.";
      return "Please check your answers and try again.";
    }
    return "We could not save your reply. Please try again.";
  }

  function answerText(r) {
    if (r.response === "no") return "Can’t come";
    return (r.response === "maybe" ? "Maybe" : "Coming") + " · " + r.party_size + (r.party_size === 1 ? " person" : " people");
  }

  function summary(saved) {
    done.textContent = "";
    done.appendChild(el("span", { class: "rsvp__tick" }, [icon("M5 12.5l4.5 4.5L19 7.5", 28)]));
    done.appendChild(el("h3", { text: "Thank you, " + saved.name }));
    done.appendChild(el("p", { class: "rsvp__thanks", text: "We have your reply. You can change it any time before the family closes replies." }));
    var list = el("ul", { class: "rsvp__summary" });
    // In the order of the invitation, whatever order the server saved them in.
    cfg.events.forEach(function (event) {
      var r = saved.replies.filter(function (x) { return x.event_id === event.id; })[0];
      if (!r) return;
      list.appendChild(el("li", {}, [el("span", { class: "rsvp__summary-event", text: event.name }), el("span", { class: "rsvp__pill rsvp__pill--" + r.response, text: answerText(r) })]));
    });
    done.appendChild(list);
    var change = el("button", { type: "button", class: "rsvp__change", text: "Change my reply" });
    change.addEventListener("click", function () { done.hidden = true; form.hidden = false; submit.textContent = "Update my reply"; say("", false); name.focus(); });
    done.appendChild(change);
    form.hidden = true;
    done.hidden = false;
    done.setAttribute("tabindex", "-1");
    done.focus();
  }

  var busy = false;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy || preview) return;
    var data = collect();
    if (!data.name) { say("Please enter your name.", true); name.focus(); return; }
    if (!data.replies.length) { say("Please choose Coming, Maybe or Can’t come for at least one event.", true); return; }
    var code = remembered();
    busy = true;
    submit.disabled = true;
    say("Sending...", false);
    fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/rsvp" + (code ? "/" + encodeURIComponent(code) : ""), {
      method: code ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) { return { ok: res.ok, status: res.status, body: body }; });
    }).then(function (r) {
      if (r.ok) { remember(r.body.edit_code); summary(r.body); return; }
      // A saved code the server no longer knows (for example after the family cleared the list): start a fresh reply.
      if (code && r.status === 404) { forget(); say("We could not find your earlier reply. Press the button again to send a new one.", true); return; }
      say(words(r.body), true);
    }).catch(function () {
      say("We could not reach the server. Check your connection and try again.", true);
    }).then(function () { busy = false; submit.disabled = false; });
  });

  slot.textContent = "";
  if (closed) {
    slot.appendChild(el("div", { class: "rsvp rsvp--closed" }, [el("p", { class: "rsvp__msg", text: "Replies are closed" + (cfg.deadline_label ? " (they closed on " + cfg.deadline_label + ")" : "") + ". Please contact the family." })]));
    return;
  }
  if (preview) {
    submit.disabled = true;
    say("This is a preview. Replies start working when the invitation is published.", false);
  }
  slot.appendChild(form);
  slot.appendChild(done);

  var code = remembered();
  if (code && !preview) {
    fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/rsvp/" + encodeURIComponent(code))
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (saved) { if (saved) { fill(saved); submit.textContent = "Update my reply"; summary(saved); } })
      .catch(function () { /* no earlier reply to show */ });
  }
})();
