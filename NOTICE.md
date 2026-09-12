# Notice

CULItrail is copyright (c) 2026 Technosoftware GmbH
(<https://technosoftware.com>) and is licensed GPL-3.0-or-later.

CULItrail's meal and meal-planning code descends from one originally
separate Obsidian community plugin:

- **Recipe Box** by Arcane Tech / AdamArcane
  (https://github.com/AdamArcane/obsidian-recipebox), GPL-3.0-or-later.

Recipe Box was integrated as CULItrail's meal module rather than rebuilt from
scratch, so the code that reads, renders and plans a dish descends from it
directly.

Because Recipe Box's code is GPL-3.0-or-later, this plugin is licensed as a
whole under GPL-3.0-or-later (see `LICENSE`).

This is worth stating plainly, because CULItrail's sibling plugins
**APERtrail** and **NODAtrail**
(https://github.com/technosoftware-gmbh/TRAILsuite) ship under the PolyForm
Noncommercial License 1.0.0. They are deliberately licensed differently:
CULItrail carries inherited GPL code and they do not. **Code must not be copied
from CULItrail into either of them.**

Until September 2026 all four packages shared one repository and a test refused
an import that crossed between them. CULItrail lives in its own repository now,
which is the stronger version of the same rule: a file cannot be copied out of
a tree that is not checked out.

What the plugins share is `@technosoftware/trail-core`, which is MIT and flows
outwards into all of them. It never flows back. A file proposed for adoption
into the core has to have its lineage established first, because relicensing
Recipe Box's GPL code as MIT is not Technosoftware's to do.

The source is public and the build is installed by hand, by copying
`main.js`, `manifest.json` and `styles.css` into a vault's
`.obsidian/plugins/culitrail/`. It is not published to the Obsidian community
plugin directory.
