# Contributing

Thank you for wanting to. Two things are worth reading before you write code,
because both can make a pull request unmergeable no matter how good it is: what
the licence rules out, and what a contribution grants Technosoftware GmbH.

## The licence, and the one thing it rules out

**CULItrail is GPL-3.0-or-later, and that is not a preference.** Its meal and
meal-planning code descends from
[Recipe Box](https://github.com/AdamArcane/obsidian-recipebox), which is
GPL-3.0-or-later, so this plugin is GPL as a whole. Technosoftware cannot
relicense it and neither can anybody else. `NOTICE.md` states the lineage.

Its sibling plugins live in
[TRAILsuite](https://github.com/technosoftware-gmbh/TRAILsuite) under PolyForm
Noncommercial 1.0.0. **Code must never be copied from here into either of
them**, because it would relicense that package without anybody meaning to.

That used to be checked by a test, when all four packages shared one
repository. It is now enforced by the thing that enforces it best: they are
different repositories, and you cannot copy out of a tree you have not checked
out. The rule still binds a person working in both.

Cooperation between the plugins is done by **reading the other plugin's
`data.json` off disk** and by reading the notes in the vault. Never through
`app.plugins.getPlugin()`, and never through a shared type.

## What a contribution grants

Code contributions are covered by [`CLA.md`](CLA.md), Technosoftware GmbH's
contributor agreement. In short, and the file itself governs: **you keep your
copyright**, and you grant Technosoftware a licence broad enough to relicense
your contribution, including under terms that differ from this plugin's.

**The reason here is narrower than it looks, and worth stating plainly.** It is
not so that CULItrail can be sold: it cannot be, by anybody, because of the
Recipe Box lineage above. It is so that a contribution which later earns
promotion into
[`@technosoftware/trail-core`](https://www.npmjs.com/package/@technosoftware/trail-core),
which is MIT, can go there. Asking a contributor for that permission a year
afterwards is asking too late, and a useful piece of shared arithmetic stranded
in a plugin helps nobody.

It also grants a patent licence, which terminates for anybody who sues over the
contribution, and it is governed by Swiss law.

**Signing is one comment.** Open your pull request; a bot will notice you have
not signed and post the sentence to reply with:

```
I have read the CLA Document and I hereby sign the CLA
```

Your signature is committed to `.github/cla/signatures.json` in this
repository, so the record is in the open and you are asked once rather than per
pull request. If the bot and that file ever disagree, comment `recheck`.

This covers code, and documentation that ships in the repository. It does not
cover filing an issue or commenting in a discussion, and a bug report that asks
nothing of you is genuinely useful on its own.

Questions about the agreement go to <support@technosoftware.com> before you
write the code rather than after.

## What belongs in the core, and why it is harder from here

`@technosoftware/trail-core` is the shared, Obsidian-free library this plugin
depends on. Three separate tests decide whether something belongs there, and it
matters which one you are invoking:

1. **Behaviour moves on the two-consumer test.** One consumer is a module that
   belongs in its plugin. Two is a contract.
2. **A note format belongs there whatever the number of readers**, because a
   format is a statement about a file, and the notes outlive every view built
   over them.
3. **Arithmetic about the world belongs there** for the same kind of reason. A
   haversine and a solar solve are facts rather than a product's property.

The core may not import `obsidian`, touch the DOM, read the filesystem, or call
`new Date()` without an injectable override. It holds no view, no user-facing
string and no settings object: it throws typed errors and lets the caller
translate.

**A file proposed for the core has to have its lineage established first, and
that matters more here than anywhere else.** The core is MIT. Relicensing
Recipe Box's GPL code as MIT is not Technosoftware's to do, and the meal and
planning code is exactly where that lineage runs. A file whose lineage cannot
be established stays here. Say in the pull request which it is, and expect to
be asked.

The promotion itself is now two pull requests in two repositories rather than
one commit: the core gains it and releases, and this plugin then depends on the
new version. That is slower on purpose. A shared contract is a thing you should
have to mean.

## The change that costs the most

**Anything that changes what gets written into somebody's notes.** A vault is
somebody's records, nothing migrates automatically, and a bad write is
discovered months later as silence rather than as an error.

Renaming a default property name, changing a `type:` value, or changing what a
reader accepts out of a note that already exists is a breaking change even when
no exported signature moves. Say so in the pull request, and say it in the
changelog entry. `CHANGELOG.md` opens by defining what breaking means here.

**The six order settings are a contract with another repository.** NODAtrail
reads the order notes this plugin writes, to price a card statement against
them. Their names and shipped defaults live in the core as `ORDER_CONTRACT` and
are asserted on both sides. Changing one is not a local decision.

## Setting up

```
npm install     # dependencies, including the core from npm
npm run check   # typecheck, lint and the suite
npm run build   # the bundle, which is what actually ships
```

Also `npm run dev` for a watch build, and `npm run test`, `npm run typecheck`
and `npm run lint` on their own.

**A first `npm install` needs npm 11 or later.** npm 10 crashes resolving this
dependency tree, in its own peer-set code rather than on anything stated here.
`npm ci` from the committed lockfile is fine on npm 10, which is why CI does
not pin a version.

**This plugin is built with TypeScript 5, and that is deliberate.** The suite
moved to TypeScript 7; `typescript-eslint` 8 refuses to run against 7 at all,
and TRAILsuite only gets away with it because four packages each nest their own
compiler while the linter's TypeScript 5 sits at the workspace root. One
package has one `node_modules` and no such arrangement, so the choice here is
between TypeScript 7 and having type-aware lint rules at all. The upgrade to 7
needed no source changes when the suite did it, so this costs nothing today and
reverses in one line when typescript-eslint supports 7.

`@technosoftware/trail-core` comes from the registry rather than from a sibling
directory. That is the thing that changed when this plugin left the suite, and
it matters when a change here needs a change there: you cannot edit the core in
this checkout. See **What belongs in the core** above for what that costs.

To try a build in Obsidian, `./scripts/install-into-vault.sh /path/to/Vault`
copies `main.js`, `manifest.json` and `styles.css` into
`.obsidian/plugins/culitrail/`. Obsidian does not watch those files, so reload
the app or toggle the plugin off and on.

## Conventions the tests enforce

A convention with a test behind it is not a preference. These fail the build:

- **No em dashes** anywhere in source, comments or documentation. Use `--`.
  `tests/no-em-dash.test.ts`.
- **Every user-facing string exists in both `en.ts` and `de.ts`.** A key built
  at runtime must be declared in the test's `DYNAMIC_KEYS`, which is the point
  rather than a workaround: a dynamic key is the one that fails silently in the
  other language.
- **Every setting has a settings-page row**, or a stated reason for having
  none.
- **No property-name row that skips the read-only lock.**
- **The defaults may not drift from the core's contracts.** `CRM_CONTRACT` for
  the Person and Company settings all three plugins share, and `ORDER_CONTRACT`
  for the six NODAtrail reads off the order notes this plugin writes. Both are
  asserted here and in the other repository, against one set of values held in
  the core.
- **The stylesheet and the source agree**: no class the source sets and the
  sheet does not style, no rule nothing sets, no physical inline offset.
- **UI conventions**: no view querying the document for DOM it built itself, no
  `innerHTML`, no console logging, no inline style assignment, no bare async
  event listener, no `setIcon()` aimed at a button rather than a slot inside
  one.

And two that no test can check for you:

- **Frontmatter property names are always settings**, never literals in logic.
- **Nothing derived is written back.** Balances, variances and projections are
  recomputed on every render.

## Comments, commits and changelogs

**Comment for reasoning, not mechanics.** Why this approach rather than a
simpler one, what edge case a check guards, what a bug fix was fixing. Never
restate what the next line obviously does. Every `.ts` file opens with a short
JSDoc saying what it is responsible for and any non-obvious constraint. History
belongs in git.

**Commit subjects are prose, not conventional commits.** `nodatrail: five
columns that stand the same height` rather than `fix(ui): column height`. Say
what changed and, in the body, why.

**Changelogs are written by hand** and stay that way. Add your entry under
`## [Unreleased]` in the package you changed, under `### Added`, `### Changed`
or `### Fixed`, and write the vault consequence rather than the diff. They are
release notes a user reads inside Obsidian, not repository bookkeeping: all
three plugins compile their own `CHANGELOG.md` into the What's New panel.

## Reporting a bug

Issues go to
<https://github.com/technosoftware-gmbh/CULItrail/issues>. What helps most:
which plugin and which version (Settings, About), the Obsidian version, what
you expected the note to look like and what it looked like instead, and the
frontmatter of a note that shows the problem with anything private taken out.

**A security issue is not an ordinary issue.** See
[`SECURITY.md`](SECURITY.md).

## Conduct

Taking part here, in issues and in pull requests, means the
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) applies to you and to us. It is
Contributor Covenant 2.1 and reporting goes to <support@technosoftware.com>.

## Questions

Anything the documents do not answer:
<support@technosoftware.com>. `docs/architecture.md` is the design and its
reasoning, each plugin's `docs/design/data-model.md` is every note format field
by field, and each package's `CLAUDE.md` says why the code is shaped the way it
is.
