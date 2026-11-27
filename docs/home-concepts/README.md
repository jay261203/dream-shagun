# Home page directions (DS-35), 28 Nov 2026

Three directions for the new home page, for the owner to pick one. Each shows the real product: Meera and Dev's
demo invitation as the app renders it (Marigold, Rose and Forest presets), real screenshots of the editor, the reply
form, the Replies screen and the gift page, and real reply counts from the local demo (13 guests). Same words in all
three, so only the design differs. Built with the taste-skill kit; the pages live in `design/home-concepts/` (ignored
by git, 37 MB of kit each).

| | A: Stationery | B: Replies first | C: Gallery |
|---|---|---|---|
| Hero | Split: the live invitation in a phone, a count card | Collage: the replies window cut by its frame, a count card | Triptych: headline, a collage of invitation parts that changes every 2.8 s, one big button |
| Colours and type | Your own idea: ivory #F7F4EC, forest #243D32, Fraunces + Figtree | Linen and harbour blue, Chivo | Three stones (stone and sage), Onest |
| Sections | Replies window, 3 steps (a line reveals the band), the invitation in 3 colourways, questions | A statement that greys in word by word, 3 steps, colourways, questions | Replies window, 3 steps with a moving row of event names, questions (shortest) |
| Footer | Sage slab, the name set wide | Sand slab, the name set wide | Dark, the name set wide |
| Gate | OPEN 3 (see below) | OPEN 1 | PASS |

Open findings: A, the colourways section reads as empty to the checker (it does not measure iframes; waived) and the
footer logo's left edge; B, the statement counts as a second heading on 6.6% of scroll positions. Every page passes
the layout check at 1440, 1024, 820, 768 and 390.

All three include `try.html`: pick the occasion, type two names, and the real invitation opens with them (the two-tap
preview in DS-35's "done when"). Only Wedding can be picked; the others say "next".

Screenshots: `concept-{a,b,c}-1440.png` and `concept-{a,b,c}-390.png`.
