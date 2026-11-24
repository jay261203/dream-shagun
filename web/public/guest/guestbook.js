/* The guestbook on the guest page. It fills the [data-slot="guestbook"] box with a name, a message and a send button.
   Nothing about money, and nobody can read anyone else's message here: the hosts read them in their own screen.
   Everything is built with createElement and textContent, never with HTML strings. */
(function () {
  "use strict";
  var doc = document;
  var slot = doc.querySelector('[data-slot="guestbook"]');
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

  var MAX = 600;
  var name = el("input", { type: "text", maxlength: "80", autocomplete: "name", required: "required", id: "gbook-name" });
  var message = el("textarea", { maxlength: String(MAX), rows: "5", required: "required", id: "gbook-message" });
  var count = el("small", { class: "gbook__count", "aria-hidden": "true", text: "0 / " + MAX });
  var status = el("p", { class: "gbook__msg", role: "status", "aria-live": "polite" });
  var send = el("button", { type: "submit", class: "btn gbook__send", text: "Send my message" });

  var form = el("form", { class: "gbook", novalidate: "novalidate" }, [
    el("div", { class: "gbook__field" }, [el("label", { for: "gbook-name", text: "Your name" }), name]),
    el("div", { class: "gbook__field" }, [el("label", { for: "gbook-message", text: "Your message" }), message, count]),
    status,
    send,
  ]);
  var done = el("div", { class: "gbook gbook--done", hidden: "hidden" });

  function say(text, bad) { status.textContent = text; status.className = "gbook__msg" + (bad ? " gbook__msg--bad" : ""); }
  message.addEventListener("input", function () { count.textContent = message.value.length + " / " + MAX; });

  function thanks(who) {
    done.textContent = "";
    done.appendChild(el("h3", { text: "Thank you, " + who }));
    done.appendChild(el("p", { class: "gbook__thanks", text: "Your message has gone to the hosts." }));
    var again = el("button", { type: "button", class: "gbook__again", text: "Write another" });
    again.addEventListener("click", function () { message.value = ""; count.textContent = "0 / " + MAX; say("", false); done.hidden = true; form.hidden = false; message.focus(); });
    done.appendChild(again);
    form.hidden = true;
    done.hidden = false;
    done.setAttribute("tabindex", "-1");
    done.focus();
  }

  var busy = false;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy || cfg.preview) return;
    var who = name.value.trim();
    var text = message.value.trim();
    if (!who) { say("Please enter your name.", true); name.focus(); return; }
    if (!text) { say("Please write a message.", true); message.focus(); return; }
    busy = true; send.disabled = true; say("Sending...", false);
    fetch("/api/w/" + encodeURIComponent(cfg.slug) + "/guestbook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: who, message: text }),
    }).then(function (res) {
      return res.json().catch(function () { return null; }).then(function (body) { return { ok: res.ok, body: body }; });
    }).then(function (r) {
      if (r.ok) { thanks(who); return; }
      var d = r.body && r.body.detail;
      say(typeof d === "string" ? d : "We could not send your message. Please check it and try again.", true);
    }).catch(function () {
      say("We could not reach the server. Check your connection and try again.", true);
    }).then(function () { busy = false; send.disabled = Boolean(cfg.preview); });
  });

  if (cfg.preview) { send.disabled = true; say("This is a preview. Messages start working when the invitation is published.", false); }
  slot.textContent = "";
  slot.appendChild(form);
  slot.appendChild(done);
})();
