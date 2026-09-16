# Atoi MCP tools

Generated from Atoi's shipped MCP reference (`apps/docs/src/generated/mcp-reference.json` at product commit `fda0b6635a1a`, reference verified 2026-08-29). Do not edit by hand; see `tooling/reference/SOURCE.json`.

Every tool takes JSON arguments and returns JSON as text content. A tool with an `action` argument runs one operation per call.

## `atoi_projects`

List, get, create, update, archive, or restore governed Atoi Projects. A list answers one Workspace: workspace_id, or your Personal Workspace when none is given.

**Actions:** `list`, `get`, `create`, `update`, `archive`, `restore`

| Argument | Type | Description |
| --- | --- | --- |
| `project_id` | string | Select the Project by id. Required when action is get, update, archive, or restore. |
| `workspace_id` | string | List the Projects of one Workspace; without it, your Personal Workspace. |
| `name` | string | Set the Project name. Required when action is create. |
| `description` | string | Set the Project description. |
| `instructions` | string | Set the instructions applied to work in the Project. |
| `kind` | chat, code | Choose whether the Project is for chat or code work. |
| `repo_url` | string | Set the source repository URL. |
| `repo_branch` | string | Set the source repository branch. |
| `directory_path` | string | Set the directory path inside the source repository. |
| `include_archived` | boolean | Include archived Projects in list results. |
| `default_task_profile` | safe, workspace-write | Choose the default safety profile for new Tasks. |
| `confirmation` | boolean | Confirm the consequential Project action. Required when action is archive. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is create, update, archive, or restore. |

- When action is update, provide at least one of name, description, instructions, or default_task_profile.
- When action is create and directory_path is provided, also provide repo_url.
- When action is create and repo_branch is provided, also provide repo_url.
- When action is create and repo_url is provided, also provide repo_branch.

Example:

```json
{"action":"get","project_id":"prj_8k2v"}
```

Returns a Project list or a Project, source, and receipt projection as JSON text content.

## `atoi_workspace`

Create or list your Atoi Workspaces, or show and bind the stable source associated with an Atoi Project.

**Actions:** `create`, `update`, `list`, `show`, `bind`, `status`, `report`, `changes`

| Argument | Type | Description |
| --- | --- | --- |
| `name` | string | Name the Workspace to create, or rename it. Required when action is create. |
| `description` | string | Describe what the Workspace is for. |
| `emoji` | string | Mark the Workspace with an emoji. |
| `color` | string | Mark the Workspace with one of the ten colors, or color an icon. |
| `icon` | string | Mark the Workspace with an icon on a color. |
| `clear_mark` | boolean | Return the Workspace to its letter mark. |
| `workspace_id` | string | Select the Workspace to update. Required when action is update. |
| `project_id` | string | Select the Project by id. Required when action is show, bind, status, report, or changes. |
| `repo_url` | string | Set the source repository URL. Required when action is bind. |
| `repo_branch` | string | Set the source repository branch. Required when action is bind. |
| `directory_path` | string | Set the local directory that supplies source status. |
| `task_id` | string | Select the Task whose change set you want to read. |
| `base_revision` | string | Report the source revision used as the comparison base. |
| `current_revision` | string | Report the current source revision. |
| `dirty` | boolean | Report whether the source has uncommitted changes. |
| `ahead` | number | Report how many commits the source is ahead. |
| `behind` | number | Report how many commits the source is behind. |
| `sync_state` | unknown, in-sync, ahead, behind, diverged | Report the source synchronization state. |
| `preview_status` | unknown, ready, unavailable | Report whether a preview is ready. |
| `preview_url` | string | Set the URL for the ready preview. |
| `supplied_by` | connected-host, cloud, operator | Identify the surface that supplied the source status. |
| `observed_at` | number | Set the source observation time as a Unix timestamp in milliseconds. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is bind. |

Example:

```json
{"action":"show","project_id":"prj_8k2v"}
```

Returns Project source binding, source state, change sets, and mutation receipts as JSON text content.

## `atoi_tasks`

List, get, start, cancel, continue, inspect, apply, or publish authoritative Atoi Task change sets. Poll get for wait semantics.

**Actions:** `list`, `get`, `start`, `cancel`, `continue`, `changes`, `apply`, `draft-pr`

| Argument | Type | Description |
| --- | --- | --- |
| `task_id` | string | Select the Task by id. |
| `project_id` | string | Select the Project that owns the Task. |
| `prompt` | string | Describe the work to start or continue. |
| `brief` | string | Provide an alternate brief when you start the Task. |
| `title` | string | Set the Task title. |
| `model_id` | string | Choose the model for the Task. |
| `safety_profile` | safe, workspace-write | Choose how much workspace access the Task receives. |
| `limit` | number | Limit the number of Tasks returned. |
| `confirmation` | boolean | Confirm the consequential Task action. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. |
| `change_set_id` | string | Select the change set to apply. |
| `change_set_fingerprint` | string | Provide the verified change set fingerprint. |
| `applied_revision` | string | Record the source revision produced by the applied change set. |
| `head_branch` | string | Set the branch used for the draft pull request. |
| `pull_request_title` | string | Set the draft pull request title. |
| `pull_request_body` | string | Set the draft pull request body. |

Example:

```json
{"action":"start","project_id":"prj_8k2v","prompt":"Audit the release state and return evidence.","safety_profile":"safe"}
```

Returns Task state, change sets, placement requests, or action receipts as JSON text content.

## `atoi_threads`

Drive a workspace Thread the way the app does: resolve a workspace to its one Thread, list, inspect pending decisions, send, reply, steer, attach a file to the turn that carries it, retry, stop, react, approve or deny, launch a Task, pin, unpin, or read where the wait after each send went, through the authenticated operator surface.

**Actions:** `list`, `get`, `resolve`, `send`, `reply`, `steer`, `attach`, `retry`, `stop`, `react`, `approve`, `deny`, `launch`, `pin`, `unpin`, `timings`

| Argument | Type | Description |
| --- | --- | --- |
| `thread_id` | string | Select the Thread by id. |
| `workspace_id` | string | Select the Workspace whose one Thread to act on, instead of a Thread id. |
| `project_id` | string | Limit list results to one Project. |
| `prompt` | string | Write the message to send to the Thread. Required when action is send, reply, steer, or launch. |
| `attachments` | array | Send files with this message. Reserve each one first with the attach action, put the bytes at the URL it returns, then name the keys here. |
| `reply_to_message_id` | string | Answer one message in the Thread by id. Required when action is reply. |
| `message_id` | string | Select the message to act on. Required when action is react. |
| `emoji` | string | Set the emoji to apply to the message. Required when action is react. |
| `reaction` | add, remove, toggle | Choose whether the reaction is added, removed, or toggled. |
| `request_id` | string | Select the Ask to answer. Required when action is approve or deny. |
| `always` | boolean | Approve this kind of action from now on. |
| `confirmation` | boolean | Confirm the consequential action after you read what it will do. Required when action is approve or deny. |
| `title` | string | Name the Task this Thread launches. |
| `safety_profile` | safe, workspace-write | Choose the safety profile the Task runs under. |
| `place` | none, cloud, host | Choose where the Task runs. |
| `computer_id` | string | Name the computer the Task runs on. |
| `required_identity` | string | Name the account identity this call must run as. |
| `required_capability` | string | Name the capability this call requires before it runs. |
| `model_id` | string | Choose the model for this message. |
| `reasoning_strength` | default, none, minimal, low, medium, high, xhigh, max | Choose the reasoning strength for this message. |
| `context_refs` | array | Attach structured context references to this message. |
| `delivery_id` | string | Set the durable delivery identity for this message. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is react, pin, or unpin. |
| `limit` | number | Limit the number of Threads or messages returned. |

- When action is get, send, reply, steer, attach, retry, stop, react, approve, deny, launch, pin, or unpin, provide at least one of thread_id or workspace_id.
- When action is send, reply, or steer, provide at least one of delivery_id or idempotency_key.

Example:

```json
{"action":"send","thread_id":"thr_9c4k","prompt":"Summarize the release blockers.","delivery_id":"msg_release_1"}
```

Returns Thread state, messages, and send or mutation receipts as JSON text content.

## `atoi_search`

Search accessible Atoi threads, messages, projects, Tasks, files, and outputs.

| Argument | Type | Description |
| --- | --- | --- |
| `query` (required) | string | Enter the text to search for. |
| `scope` | string | Limit search to one accessible record scope. |
| `limit` | number | Limit the number of matches returned. |

Example:

```json
{"query":"release evidence","limit":10}
```

Returns the matched accessible records as JSON text content.

## `atoi_inbox`

List Inbox cards and answer each in its own words: keep, edit, or dismiss a memory card; approve or deny an approval; snooze any card.

**Actions:** `list`, `keep`, `edit`, `dismiss`, `approve`, `deny`, `snooze`

| Argument | Type | Description |
| --- | --- | --- |
| `item_id` | string | Select the Inbox item by id. |
| `request_id` | string | Select the approval request by id. |
| `text` | string | Set the new words when action is edit on a memory card. |
| `status` | unread, read, snoozed, resolved | Limit list results to one Inbox status. |
| `snoozed_until` | number | Set the snooze deadline as a Unix timestamp in milliseconds. |
| `confirmation` | boolean | Confirm the consequential Inbox decision. |
| `limit` | number | Limit the number of Inbox items returned. |

Example:

```json
{"action":"list","status":"unread","limit":10}
```

Returns Inbox items or decision readback as JSON text content.

## `atoi_ideas`

Read the Ideas the agent wrote for this account, refresh them, answer the current ask, or dismiss a connection suggestion.

**Actions:** `list`, `refresh`, `answer`, `dismiss`

| Argument | Type | Description |
| --- | --- | --- |
| `delivery_id` | string | Select the current ask by delivery id. |
| `option_id` | string | The option id to choose for the ask. |
| `connection_id` | github, slack, linear, google-workspace | The connection suggestion to dismiss. |
| `workspace_id` | string | Read Ideas inside one Workspace by id. Personal when omitted. |

Example:

```json
{"action":"list"}
```

Returns the Ideas sections, tiles, and current ask, or a refresh, answer, or dismiss receipt as JSON text content.

## `atoi_usage`

Read what this person's turns cost: today, the last days, and the models that spent it, from the model-decision receipts.

**Actions:** `get`

| Argument | Type | Description |
| --- | --- | --- |
| `days` | number | How many days back to read. Seven when omitted. |
| `from` | string | Read from this time, as an ISO time or a millisecond timestamp. The answer names the range it read. |
| `to` | string | Read up to this time; now when omitted. |
| `workspace_id` | string | Read one Workspace by id. Personal when omitted. |

Example:

```json
{"action":"get","days":7}
```

Returns the usage summary for the scope read: today, the window, a row per day, and a row per model, as JSON text content.

## `atoi_plan`

List the plans in one Workspace or Project with their ids, titles, status and progress, or retire or restore one of the person's plans.

**Actions:** `list`, `archive`, `restore`

| Argument | Type | Description |
| --- | --- | --- |
| `plan_id` | string | Select the plan to retire or restore, by the id list returns. |
| `project_id` | string | Read one Project instead of the whole Workspace. |
| `workspace_id` | string | Read or act inside one Workspace by id. Personal when omitted. |
| `include_archived` | boolean | Include retired plans in the list. |
| `limit` | number | Limit the number of plans returned. |

Example:

```json
{"action":"archive","plan_id":"pln_3k8d","workspace_id":"wsp_7m4c"}
```

Returns the plans in the scope read with their ids, status and progress, or the retired or restored plan with its receipt, as JSON text content.

## `atoi_automations`

List, inspect, create, update, toggle, trigger, or remove Atoi Automations with schedule and receipt readback.

**Actions:** `list`, `get`, `create`, `update`, `toggle`, `trigger`, `remove`

| Argument | Type | Description |
| --- | --- | --- |
| `automation_id` | string | Select the Automation by id. |
| `project_id` | string \| null | Attach the Automation to a Project, or use null to clear it. |
| `name` | string | Set the Automation name. |
| `description` | string | Set the Automation description. |
| `prompt` | string | Set the instructions the Automation runs. |
| `model_id` | string | Choose the model for Automation runs. |
| `enabled` | boolean | Enable or disable the Automation. |
| `enabled_only` | boolean | Return only enabled Automations. |
| `input_message` | string | Provide the message used for this manual run. |
| `confirmation` | boolean | Confirm the consequential Automation action. |
| `idempotency_key` | string | Reuse the same identity when you retry a create or a trigger, so a retry does not make a second automation or run it twice. |
| `limit` | number | Limit the number of Automations returned. |
| `schedule` | object | Configure when the Automation runs. |

Example:

```json
{"action":"trigger","automation_id":"aut_5k1m","input_message":"Check the candidate tag."}
```

Returns Automation records, run receipts, or mutation readback as JSON text content.

## `atoi_channels`

List and inspect user-owned Atoi Channels, open browser-native connection flows, revoke links, or send a receipt-backed test.

**Actions:** `list`, `get`, `authorize`, `revoke`, `test`

| Argument | Type | Description |
| --- | --- | --- |
| `channel_id` | string | Select the Channel by id. |
| `link_id` | string | Select the connected Channel link by id. Required when action is test. |
| `channel_kind` | telegram, slack, push | Choose the Channel provider to connect. Allowed values: telegram, slack, push. Required when action is authorize. |
| `confirmation` | boolean | Confirm the consequential Channel action. Required when action is revoke. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is revoke or test. |

- When action is get or revoke, provide at least one of channel_id or link_id.

Example:

```json
{"action":"test","link_id":"lnk_8s3d","idempotency_key":"test_release_1"}
```

Returns Channel state, authorization data, delivery receipts, or revocation readback as JSON text content.

## `atoi_skills`

List, inspect, enable, disable, or remove user-owned Atoi Skills with durable skill receipts.

**Actions:** `list`, `get`, `enable`, `disable`, `remove`

| Argument | Type | Description |
| --- | --- | --- |
| `skill_id` | string | Select the Skill by id. Required when action is get, enable, disable, or remove. |
| `confirmation` | boolean | Confirm the consequential Skill action. Required when action is remove. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is enable, disable, or remove. |

Example:

```json
{"action":"get","skill_id":"skl_6h2n"}
```

Returns Skill state and durable Skill receipts as JSON text content.

## `atoi_plugins`

List, inspect, install, enable, disable, or remove the pinned first-party Atoi plugin release with durable plugin receipts.

**Actions:** `list`, `get`, `install`, `enable`, `disable`, `remove`

| Argument | Type | Description |
| --- | --- | --- |
| `plugin_id` | string | Select the plugin by id. |
| `confirmation` | boolean | Confirm the consequential plugin action. Required when action is remove. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is install, enable, disable, or remove. |

Example:

```json
{"action":"get","plugin_id":"atoi"}
```

Returns plugin state and durable plugin receipts as JSON text content.

## `atoi_settings`

Read canonical settings and connector state from the settings registry, set any writable non-secret setting by key, return one setting to the default it came from, or connect and disconnect browser-owned Atoi connections.

**Actions:** `get`, `set`, `unset`, `authorize`, `disconnect`

| Argument | Type | Description |
| --- | --- | --- |
| `key` | string | Select the setting by key. Required when action is set or unset. |
| `value` | unknown | Set the value to write. Required when action is set. |
| `client` | web, ios, macos, tui, cli, all | Limit settings to one client surface. |
| `connection` | openai, anthropic, google, openrouter, github, slack, linear, google-workspace | Choose the connection to authorize or disconnect. Allowed values: openai, anthropic, google, openrouter, github, slack, linear, google-workspace. Required when action is authorize or disconnect. |
| `confirmation` | boolean | Confirm the consequential disconnect action. Required when action is disconnect. |
| `idempotency_key` | string | Reuse the same mutation identity when you retry this action. Required when action is set, unset, or disconnect. |

Example:

```json
{"action":"get"}
```

Returns account setting and connector state, authorization data, or disconnect readback as JSON text content.

## `atoi_doctor`

Return the canonical Atoi runtime readiness ledger and compact receipt without promoting unobserved checks to ready.

**Actions:** `status`

Example:

```json
{"action":"status"}
```

Returns the canonical runtime readiness ledger and compact readiness receipt as JSON text content.
