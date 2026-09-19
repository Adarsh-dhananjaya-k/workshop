import { createServer } from "node:http";
import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";

const servers = new Map();
const boards = new Map();

const SAMPLE_ISSUES = [
    { id: 1, title: "Add keyboard navigation to game cards", body: "Improve keyboard support for browsing the game catalogue.", labels: ["accessibility"], priority: "high", status: "todo", assignee: "Unassigned" },
    { id: 2, title: "Refresh publisher seed data", body: "Add the latest publisher entries to the seed CSV.", labels: ["data"], priority: "medium", status: "in-progress", assignee: "Unassigned" },
    { id: 3, title: "Document local database setup", body: "Clarify the database setup workflow for new contributors.", labels: ["documentation"], priority: "low", status: "done", assignee: "Unassigned" },
];

function cloneIssues(issues) {
    return issues.map((issue) => ({
        id: Number(issue.id),
        title: String(issue.title),
        body: String(issue.body ?? ""),
        labels: Array.isArray(issue.labels) ? issue.labels.map(String) : [],
        priority: ["low", "medium", "high", "critical"].includes(issue.priority) ? issue.priority : "medium",
        status: ["todo", "in-progress", "blocked", "done"].includes(issue.status) ? issue.status : "todo",
        assignee: String(issue.assignee ?? "Unassigned"),
    }));
}

function getBoard(instanceId, input = {}) {
    let board = boards.get(instanceId);
    if (!board) {
        board = {
            repo: String(input.repo ?? "Tailspin Toys"),
            issues: cloneIssues(Array.isArray(input.issues) && input.issues.length ? input.issues : SAMPLE_ISSUES),
        };
        boards.set(instanceId, board);
    }
    return board;
}

function json(response, status, value) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(value));
}

function renderHtml() {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Triage Issues</title>
    <style>
      :root { color-scheme: light dark; --surface: color-mix(in srgb, var(--background-color-default, #fff) 94%, var(--text-color-default, #1f2328) 6%); --strong: color-mix(in srgb, var(--background-color-default, #fff) 87%, var(--text-color-default, #1f2328) 13%); }
      * { box-sizing: border-box; } body { margin: 0; background: var(--background-color-default, #fff); color: var(--text-color-default, #1f2328); font: var(--text-body-medium, 14px)/var(--leading-body-medium, 20px) var(--font-sans, system-ui, sans-serif); }
      main { max-width: 1280px; margin: auto; padding: clamp(16px, 3vw, 32px); } header { border-bottom: 1px solid var(--border-color-default, #d0d7de); margin-bottom: 20px; padding-bottom: 18px; } h1 { margin: 0; font-size: clamp(26px, 4vw, 38px); line-height: 1.1; } .lede { color: var(--text-color-muted, #59636e); margin: 8px 0 0; }
      .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; } select, input { background: var(--background-color-default, #fff); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 7px; color: inherit; font: inherit; min-height: 36px; padding: 6px 10px; } button { background: var(--true-color-blue, #0969da); border: 1px solid var(--true-color-blue, #0969da); border-radius: 7px; color: #fff; cursor: pointer; font: inherit; font-weight: 600; min-height: 36px; padding: 6px 12px; } button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--color-focus-outline, #0969da); outline-offset: 2px; }
      .summary { display: grid; gap: 10px; grid-template-columns: repeat(4, minmax(100px, 1fr)); margin-bottom: 22px; } .metric, .issue { background: var(--surface); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; padding: 14px; } .metric strong { display: block; font-size: 24px; } .metric span { color: var(--text-color-muted, #59636e); font-size: 12px; }
      .board { display: grid; gap: 14px; grid-template-columns: repeat(4, minmax(220px, 1fr)); } .column { background: var(--strong); border: 1px solid var(--border-color-default, #d0d7de); border-radius: 10px; min-height: 180px; padding: 12px; } .column h2 { font-size: 14px; margin: 0 0 10px; } .issues { display: grid; gap: 10px; } .issue h3 { font-size: 14px; line-height: 1.35; margin: 0 0 7px; } .issue p { color: var(--text-color-muted, #59636e); font-size: 12px; margin: 0 0 10px; } .meta { align-items: center; display: flex; flex-wrap: wrap; gap: 6px; } .pill { border-radius: 999px; font-size: 11px; padding: 2px 7px; } .priority-critical, .priority-high { background: var(--true-color-red-muted, #ffebe9); color: var(--true-color-red, #cf222e); } .priority-medium { background: var(--true-color-yellow-muted, #fff8c5); color: var(--true-color-yellow, #9a6700); } .priority-low { background: var(--canvas-surface-strong, #ddf4ff); color: var(--true-color-blue, #0969da); } .label { background: var(--canvas-surface-strong, #eaeef2); color: var(--text-color-muted, #59636e); } .empty { color: var(--text-color-muted, #59636e); font-size: 12px; padding: 12px 2px; } #status { color: var(--text-color-muted, #59636e); min-height: 20px; }
      @media (max-width: 900px) { .board { grid-template-columns: repeat(2, minmax(220px, 1fr)); } } @media (max-width: 560px) { .summary, .board { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <header><h1>Triage Issues</h1><p class="lede">Prioritize and organize issues for <strong id="repo"></strong>.</p></header>
      <div class="toolbar"><input id="search" type="search" placeholder="Search issues" aria-label="Search issues" /><select id="priority" aria-label="Filter by priority"><option value="all">All priorities</option><option>critical</option><option>high</option><option>medium</option><option>low</option></select><select id="assignee" aria-label="Filter by assignee"><option value="all">All assignees</option></select><button id="refresh" type="button">Refresh</button><span id="status" role="status" aria-live="polite"></span></div>
      <section class="summary" aria-label="Issue summary"><div class="metric"><strong id="total">0</strong><span>Total issues</span></div><div class="metric"><strong id="open">0</strong><span>Open issues</span></div><div class="metric"><strong id="blocked">0</strong><span>Blocked</span></div><div class="metric"><strong id="critical">0</strong><span>Critical priority</span></div></section>
      <section id="board" class="board" aria-label="Issue board"></section>
    </main>
    <script>
      const board = document.querySelector("#board"), search = document.querySelector("#search"), priority = document.querySelector("#priority"), assignee = document.querySelector("#assignee"), status = document.querySelector("#status");
      let data = { repo: "", issues: [] };
      const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
      const load = async () => { const response = await fetch("/api/state"); data = await response.json(); document.querySelector("#repo").textContent = data.repo; updateAssignees(); render(); };
      const updateAssignees = () => { const current = assignee.value; assignee.innerHTML = '<option value="all">All assignees</option>' + [...new Set(data.issues.map((issue) => issue.assignee))].sort().map((name) => '<option>' + escapeHtml(name) + '</option>').join(""); assignee.value = [...assignee.options].some((option) => option.value === current) ? current : "all"; };
      const render = () => { const text = search.value.toLowerCase(); const selectedPriority = priority.value; const selectedAssignee = assignee.value; const filtered = data.issues.filter((issue) => (!text || (issue.title + " " + issue.body + " " + issue.labels.join(" ")).toLowerCase().includes(text)) && (selectedPriority === "all" || issue.priority === selectedPriority) && (selectedAssignee === "all" || issue.assignee === selectedAssignee)); document.querySelector("#total").textContent = data.issues.length; document.querySelector("#open").textContent = data.issues.filter((issue) => issue.status !== "done").length; document.querySelector("#blocked").textContent = data.issues.filter((issue) => issue.status === "blocked").length; document.querySelector("#critical").textContent = data.issues.filter((issue) => issue.priority === "critical").length; const columns = [["todo", "Todo"], ["in-progress", "In progress"], ["blocked", "Blocked"], ["done", "Done"]]; board.innerHTML = columns.map(([key, label]) => '<section class="column"><h2>' + label + ' (' + filtered.filter((issue) => issue.status === key).length + ')</h2><div class="issues">' + filtered.filter((issue) => issue.status === key).map((issue) => '<article class="issue"><h3>#' + issue.id + ' ' + escapeHtml(issue.title) + '</h3><p>' + escapeHtml(issue.body) + '</p><div class="meta"><span class="pill priority-' + issue.priority + '">' + issue.priority + '</span>' + issue.labels.map((label) => '<span class="pill label">' + escapeHtml(label) + '</span>').join("") + '<span class="pill label">' + escapeHtml(issue.assignee) + '</span></div></article>').join("") + (filtered.some((issue) => issue.status === key) ? "" : '<div class="empty">No matching issues</div>') + '</div></section>').join(""); };
      [search, priority, assignee].forEach((element) => element.addEventListener("input", render)); document.querySelector("#refresh").addEventListener("click", async () => { status.textContent = "Refreshing…"; await load(); status.textContent = ""; }); load().catch((error) => { status.textContent = error.message; });
    </script>
  </body>
</html>`;
}

async function startServer(instanceId, board) {
    const server = createServer(async (request, response) => {
        try {
            if (request.url === "/api/state" && request.method === "GET") {
                json(response, 200, board);
                return;
            }
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(renderHtml());
        } catch (error) {
            json(response, 400, { error: error instanceof Error ? error.message : "The request failed." });
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    return { server, url: `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/` };
}

function findIssue(board, id) {
    const issue = board.issues.find((candidate) => candidate.id === Number(id));
    if (!issue) throw new CanvasError("issue_not_found", `Issue #${id} was not found.`);
    return issue;
}

await joinSession({
    canvases: [
        createCanvas({
            id: "triage-issues",
            displayName: "Triage Issues",
            description: "Review and organize GitHub issues by priority, status, and assignee.",
            inputSchema: {
                type: "object",
                properties: {
                    repo: { type: "string" },
                    issues: { type: "array" },
                },
                additionalProperties: false,
            },
            actions: [
                {
                    name: "set_issues",
                    description: "Replace the issue board with a list of issues.",
                    inputSchema: { type: "object", properties: { repo: { type: "string" }, issues: { type: "array", minItems: 1 } }, required: ["issues"], additionalProperties: false },
                    handler: async (ctx) => {
                        const board = getBoard(ctx.instanceId);
                        board.repo = String(ctx.input.repo ?? board.repo);
                        board.issues = cloneIssues(ctx.input.issues);
                        return board;
                    },
                },
                {
                    name: "update_issue",
                    description: "Update an issue's priority, status, assignee, or labels.",
                    inputSchema: { type: "object", properties: { id: { type: "integer" }, priority: { type: "string", enum: ["low", "medium", "high", "critical"] }, status: { type: "string", enum: ["todo", "in-progress", "blocked", "done"] }, assignee: { type: "string" }, labels: { type: "array" } }, required: ["id"], additionalProperties: false },
                    handler: async (ctx) => {
                        const issue = findIssue(getBoard(ctx.instanceId), ctx.input.id);
                        for (const field of ["priority", "status", "assignee", "labels"]) if (ctx.input[field] !== undefined) issue[field] = field === "labels" ? ctx.input[field].map(String) : String(ctx.input[field]);
                        return issue;
                    },
                },
                {
                    name: "get_state",
                    description: "Return the current issue board state and summary counts.",
                    handler: async (ctx) => {
                        const board = getBoard(ctx.instanceId);
                        return { ...board, summary: { total: board.issues.length, open: board.issues.filter((issue) => issue.status !== "done").length, blocked: board.issues.filter((issue) => issue.status === "blocked").length, critical: board.issues.filter((issue) => issue.priority === "critical").length } };
                    },
                },
            ],
            open: async (ctx) => {
                const board = getBoard(ctx.instanceId, ctx.input);
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, board);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Triage Issues", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    boards.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(resolve));
                }
            },
        }),
    ],
});
