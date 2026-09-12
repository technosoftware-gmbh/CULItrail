# Security

## Reporting a vulnerability

**Do not open a public issue for a security problem.**

Use GitHub's private reporting form, which is enabled on this repository:
[Report a vulnerability](https://github.com/technosoftware-gmbh/CULItrail/security/advisories/new).
It is private between you and the maintainers until an advisory is published.

If you would rather use email, <support@technosoftware.com> reaches the same
people. Say CULItrail in the subject.

What helps: the version, what an attacker can do that they should not be able
to, and the smallest reproduction you can manage. A note that triggers it is
worth more than a description of one, with anything private taken out of it.

You can expect an acknowledgement within five working days and an assessment
with a plan or a reason it is not a vulnerability within fifteen. If a fix is
warranted it ships as a release with an advisory naming you, unless you would
rather not be named.

## Supported versions

The newest release is the supported one. There is no long-term support branch.

## What the attack surface actually is

Worth knowing before you look, because it is smaller than most:

**CULItrail makes no network request.** There is no `fetch`, no `requestUrl`,
no XMLHttpRequest and no WebSocket anywhere in the shipped source; the only
URLs in the code are links a user clicks, which open in their browser. Release
notes are compiled into the bundle at build time rather than fetched. Nothing
is sent anywhere, and there is no server, no account and no telemetry.

So the surface is local, and it is these four things:

1. **What the plugin parses.** Vault notes and their frontmatter. A note is the
   untrusted input here, including one written by something else entirely.
2. **What the plugin reads off disk that is not a note.** It reads a sibling
   plugin's `data.json` once, on a fresh install, to adopt folder and property
   names. That file is JSON a user can edit and a sync service moves around, and
   it is treated as untrusted: parse failures are non-events and only folder
   paths, type values and property names are ever adopted, never a behaviour
   toggle.
3. **Badge formulas, which are evaluated without `eval`.** A formula such as
   `(prepTime || 0) + (reheatTime || 0) || null` lives in `data.json`, so it is
   not a place to hand arbitrary code to the JavaScript engine.
   `src/shared/expr-eval.ts` is a hand-written parser that understands five
   operators and named variables from a scope object, and cannot reach anything
   it was not given. A change that makes it reach further is a security change.
4. **What the plugin writes.** It creates and rewrites notes in configured
   folders. A path that escapes the folder it was meant for, or a write that
   destroys content it was meant to leave alone, is a vulnerability in the sense
   that matters most for this project: a vault is somebody's records.

Rendered vault content that could execute rather than display belongs here too.
The `ui-conventions` test forbids `innerHTML`, which is part of why.

Out of scope: Obsidian itself, other plugins installed alongside this one, and
anything that requires an attacker to already have write access to the vault
folder or to the machine. Report those to Obsidian or to the plugin in
question.

Denial of service by feeding the plugin an enormous file is interesting to us
as a bug, not as a vulnerability.
