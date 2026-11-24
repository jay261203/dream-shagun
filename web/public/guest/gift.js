/* The gift page's two small helpers: "Copy UPI ID" buttons, and the optional "I sent a gift" note form.
   Nothing here asks for an amount before paying, and the note is only a note: the hosts check their own account.
   Everything is built with createElement and textContent, never with HTML strings. */
(function () {
  "use strict";
  var doc = document;

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

  // Copy buttons stay hidden in the page until this script runs, so nobody sees a button that does nothing.
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var box = el("textarea", { readonly: "readonly", "aria-hidden": "true" });
      box.value = text;
      box.style.position = "fixed"; box.style.opacity = "0";
      doc.body.appendChild(box);
      box.select();
      var ok = false;
      try { ok = doc.execCommand("copy"); } catch (e) { ok = false; }
      doc.body.removeChild(box);
      ok ? resolve() : reject(new Error("copy failed"));
    });
  }

  Array.prototype.forEach.call(doc.querySelectorAll("[data-copy]"), function (button) {
    var label = button.textContent;
    button.hidden = false;
    button.addEventListener("click", function () {
      copyText(button.getAttribute("data-copy") || "").then(function () { button.textContent = "Copied"; }, function () { button.textContent = "Select the ID above and copy it"; });
      setTimeout(function () { button.textContent = label; }, 2500);
    });
  });

  var slot = doc.querySelector('[data-slot="gift-note"]');
  if (!slot) return;
  var cfg;
  try { cfg = JSON.parse(slot.getAttribute("data-config") || ""); } catch (e) { return; }
  if (!cfg || !cfg.slug || !cfg.sides || !cfg.sides.length) return;

  var NOTE_MAX = 300;
  var side = null;
  var fields = [];
  if (cfg.sides.length > 1) {
    side = el("select", { id: "gift-side", required: "required" });
    cfg.sides.forEach(function (s) { side.appendChild(el("option", { value: s.side, text: s.host + "'s side" })); });
    fields.push(el("div", { class: "gbook__field" }, [el("label", { for: "gift-side", text: "Which side did you send it to?" }), side]));
  }
  var name = el("input", { type: "text", maxlength: "80", autocomplete: "name", required: "required", id: "gift-name" });
  var amount = el("input", { type: "text", inputmode: "numeric", autocomplete: "off", id: "gift-amount", placeholder: "For example 1100" });
  var note = el("textarea", { maxlength: String(NOTE_MAX), rows: "3", id: "gift-text" });
  fields.push(el("div", { class: "gbook__field" }, [el("label", { for: "gift-name", text: "Your name" }), name]));
  fields.push(el("div", { class: "gbook__field" }, [el("label", { for: "gift-amount", text: "Amount in rupees (optional)" }), amount]));
  fields.push(el("div", { class: "gbook__field" }, [el("label", { for: "gift-text", text: "A note (optional)" }), note]));

  var status = el("p", { class: "gbook__msg", role: "status", "aria-live": "polite" });
  var send = el("button", { type: "submit", class: "btn gbook__send", text: "Send note" });
  var form = el("form", { class: "gbook", novalidate: "novalidate" }, fields.concat([status, send]));
  var done = el("div", { class: "gbook gbook--done", hidden: "hidden" });

  function say(text, bad) { status.textContent = text; status.className = "gbook__msg" + (bad ? " gbook__msg--bad" : ""); }

  function thanks(who) {
    done.textContent = "";
    done.appendChild(el("h3", { text: "Thank you, " + who }));
    done.appendChild(el("p", { class: "gbook__thanks", text: "The hosts have your note." }));
    form.hidden = true;
    done.hidden = false;
    done.setAttribute("tabindex", "-1");
    done.focus();
  }

  var busy = false;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) return;
    var who = name.value.trim();
    if (!who) { say("Please enter your name.", true); name.focus(); return; }
    var raw = amount.value.replace(/[,\s]/g, "");
    if (raw && !/^[0-9]{1,6}$/.test(raw)) { say("Write the amount as whole rupees, for example 1100, or leave it empty.", true); amount.focus(); return; }
    var body = { side: side ? side.value : cfg.sides[0].side, name: who };
    if (raw) body.amount_rupees = Number(raw);
    var text = note.value.trim();
    if (text) body.note = text;
    busy = true; send.disabled = true; say("Sending...", false);
    fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/gift-note", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (b) { return { ok: res.ok, body: b }; });
    }).then(function (r) {
      if (r.ok) { thanks(who); return; }
      var d = r.body && r.body.detail;
      say(typeof d === "string" ? d : "We could not send your note. Please check it and try again.", true);
    }).catch(function () {
      say("We could not reach the server. Check your connection and try again.", true);
    }).then(function () { busy = false; send.disabled = false; });
  });

  slot.textContent = "";
  slot.appendChild(form);
  slot.appendChild(done);
})();
