# Brand, voice and wording

Decided 24 Nov 2026: the product makes invitations for **any event** (wedding, birthday, baby shower, anniversary,
housewarming, corporate), for hosts anywhere. "Shagun" and "wedding" can no longer be in the product's name or in
wording that every host sees. A wedding is the first occasion type, not the product.

## The name

Working name since 24 Nov 2026: **Gatherbell**, kept in one place, `web/lib/brand.ts` (the API has no copy: the web app sends the one line of text the API needs); a test fails if the name is written anywhere else. It is **not cleared**: the trademark registers and a domain check are still to do. Left on the old name on purpose: the local database's project id in `supabase/config.toml` (it names the Docker containers and volumes; renaming wipes the local data), the repository folder and the Jira project name.

Checked on 24 Nov 2026 with a plain web search. **This is not a trademark clearance.** Before choosing, search the
trademark registers (WIPO Global Brand Database, USPTO, India IPO) and a domain registrar.

| Candidate | What the search found | Verdict |
| --- | --- | --- |
| Invitely | No company; a student GitHub project. The "Invit-" space is crowded (InvitiApp, Invite, Invitd, Invito, Invitify) | Too close to many |
| Joinly | No hit, but "Joynly", an event planning platform, is one letter away | Too close |
| Saveday | No hit, but "save the date" is wedding wording | Wedding-leaning |
| Nimantra | Near "Nimantran" (Hindi for invitation): many Indian wedding invitation businesses | Indian-wedding specific |
| Hostwell | No hit | Open, needs a real check |
| Togetha | No hit; close to "together" used by Evite and others | Open, weak |

### Second round (names from a ChatGPT planning conversation, checked 24 Nov 2026)

Same limits: a plain web search, not a trademark clearance.

| Candidate | What the search found | Verdict |
| --- | --- | --- |
| Gatherbell | No hits for the name. The "Gather-" family is crowded (Gather, Gatherwell, GatherBoard, Gather.town) | Leading candidate: warm, easy to say, calls people together. Risk is search and trademark crowding around "Gather" |
| Hostwell | No hits (also in round one) | Fallback: plain, a little dull |
| Occanote | No hits; near Coconote, OktoNote, Ocean Notes | Drop: sounds like "ocean note" on a call, reads as a notes app |
| Occafold | No hits | Drop: hard to say and spell |
| Aavo ("come" in Gujarati) | No exact hit; "Ahvaan", an Indian invitation and event planner app, means nearly the same | Drop: too easy to confuse |
| DearGather, Meetletter, Guestory, Daynote, KindlyCome, DearDate, Gatherpost, OpenEnvelope | Not searched | Weaker; not pursued |

Before choosing: search the WIPO, USPTO and India trademark registers (software classes 9 and 42, event services 41) and
check `.com`, `.in` and `.app`. Say the name aloud on a phone call and spell it back.

A name should be short, plain, not wedding-specific, easy to say aloud on a phone call, and not end in "-ly" or "-ify".

## Voice

One host talking to another, in plain words. Short sentences. Say what the thing does, with a real example.

1. **Name the thing, not the benefit.** "Send one link. Guests reply on their phone." not "Seamlessly streamline your guest experience."
2. **No filler adjectives.** Cut: seamless, effortless, beautiful, stunning, magical, unforgettable, perfect, elevate, unlock, curated, tailored, crafted, journey (as a feature name), "all-in-one", "in minutes".
3. **No stock lines.** Cut "Say goodbye to...", "Whether you are... or...", "Look no further", "Make memories", "Your special day" in product wording.
4. **Numbers and objects over claims.** "Guests need no app" is fine because it is checkable. "Loved by thousands" is not allowed.
5. **Second person for the host ("your guests"), third person only inside an invitation's own text.**
6. **Errors say what to do next.** "Enter your name." not "Oops! Something went wrong."
7. **No exclamation marks, no emoji in product wording.** An invitation's text may use them if the host types them.
8. **Money wording is plain:** "gift", "contribution" or the host's own word, never a euphemism.

## Words that change with the occasion

The product's own screens use neutral words. The occasion type fills the rest. (`occasion` is a new field; see Jira.)

| Neutral word | Wedding | Birthday | Baby shower | Anniversary | Corporate |
| --- | --- | --- | --- | --- | --- |
| Invitation | wedding invitation | birthday invitation | baby shower invitation | anniversary invitation | event invitation |
| Hosts field | The couple (two names) | Host (one name) | Parents-to-be (one or two) | The couple | Organiser |
| Schedule | Events (mehendi, sangeet, pheras, reception) | Party | Shower | Celebration | Sessions |
| Guest reply | RSVP per event | RSVP | RSVP | RSVP | Register |
| Gifts (optional page) | Small link to a gift page, on by default | Not mentioned | Not mentioned | Not mentioned | Not mentioned |
| Guestbook | Messages | Messages | Messages | Messages | Messages |
| Sides | Bride's side, groom's side (optional) | none | none | none | none |
| Story section | Our story, Our journey | About | The news | Our story | About |

Rules for the table: the gift module and the two sides are switches the host turns on; nothing about them shows for an
occasion that does not use them. A wedding keeps every feature it has today.

## Existing wording to change (first pass)

| Where | Now | Problem |
| --- | --- | --- |
| Home h1 | Digital wedding invitations for Indian families | One occasion, one community |
| Home sub | One WhatsApp link with your events, replies and blessings | "blessings" is wedding-only |
| Home steps | "Try it with your names", "Add each event ... mehendi, sangeet, pheras" | Wedding-only examples |
| Login | "There is no password to remember" | Filler |
| Footer | "Shagun goes straight from guest to family. We never hold it." | Wedding and gift specific; belongs on the gifts screen only |
| Create | "Create your wedding", Bride and Groom fields, "Choose your side" | Wedding-only form |
| Editor | "Couple and story", "Wishes and UPI", "Replies" | "Couple", UPI-only |
| Guest form | "Will you come?" | Fine; keep |

## Check before shipping a screen

- Read it aloud. If it sounds like an advert, rewrite it.
- Search the file for the banned words above.
- Could this sentence appear on any other product's site? If yes, make it specific or cut it.
