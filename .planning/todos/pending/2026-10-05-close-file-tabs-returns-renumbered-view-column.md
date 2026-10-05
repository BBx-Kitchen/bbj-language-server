---
created: 2026-10-05
title: closeTabsOnFiles can return a view column that now names a different editor group
area: vscode
source: phase 130.1 code review (IN-02)
files: bbj-vscode/src/close-file-tabs.ts
audit_acknowledged:
  milestone: v4.9
  at: 2026-10-05
---

## Problem

`closeTabsOnFiles` (`close-file-tabs.ts:125-128`) returns the view column of the group the tabs
were closed in, after checking that some group still has that column. Removing a middle group
renumbers the remaining groups, so the column can now name a different group than the one the
tabs were in, and the reopened file lands in the wrong group.

## What to do

Capture the `TabGroup` object before closing and look it up afterwards (is it still in
`tabGroups.all`, and what is its `viewColumn` now), or return `undefined` when the number of
groups changed. Add a test with a fake `tabGroups` that drops a middle group on close.
