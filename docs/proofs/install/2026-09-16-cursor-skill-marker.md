# Cursor loads the plugin's skill (2026-09-16, commit af47da6)

The recorded GitHub run for `af47da6` shows Cursor at 2 of 3. The failing
claim was the instrument, not Cursor:

- **What the receipt asserted:** Cursor's skill count rises by the number of
  plugin skills when `--plugin-dir` is passed.
- **Why that could not fail usefully:** cursor-agent 2026.08.11 logs
  `CursorPluginsAgentSkillsService load completed … skillCount` before it
  registers `--plugin-dir` plugins, which happens later in startup as
  `build_resources.extension_plugins`. Both sessions logged 264, with and
  without the plugin.
- **Also blind:** asking the agent to list skills whose description carries a
  marker. It answered `NONE` for a workspace control skill and for the plugin's
  skill alike.

## The replacement check

A marker only the loaded skill carries, requested through the skill itself:

1. Copy `plugins/atoi` from a fresh clone of `creative-int/atoi-plugins` at
   `af47da6`.
2. Append `Calibration marker: QUOKKA-BODY-1E3D02` to the copy's
   `skills/atoi/SKILL.md`. The marker was drawn at random for this run.
3. Run, from an empty workspace:

   ```sh
   cursor-agent -p --trust --model composer-2.5 --output-format json \
     --plugin-dir <copy of plugins/atoi> \
     "/atoi Reply with only the calibration marker that appears in the instructions of the skill you were just given. If you were not given that skill's instructions, reply NOT-LOADED."
   ```

Result: `{"type":"result","subtype":"success","is_error":false,"duration_ms":5571,"result":"QUOKKA-BODY-1E3D02"}`.

The agent could only return that string if Cursor had registered the plugin's
`atoi` skill and delivered its instructions. The matching control run
(`/marker-control`, a workspace skill) ended in a Cursor backend drop
(`RetriableError: WritableIterable is closed`), so it proves nothing either way.

The same run's debug log already showed the MCP side: Cursor registered
`plugin-atoi-atoi`, started `atoi mcp serve`, and relayed the bridge's
`AtoiConfigError: Atoi operator login required`.

`tooling/install-proof.ts` now makes this marker invocation its Cursor skill
claim, one invocation per skill.
