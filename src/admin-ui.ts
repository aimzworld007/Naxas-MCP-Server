export const adminHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Naxas MCP Gateway</title>
  <meta name="color-scheme" content="light dark" />
  <link rel="stylesheet" href="/admin/app.css" />
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <div>
        <p class="eyebrow">NAXAS</p>
        <h1>MCP Gateway</h1>
        <p class="sub">Secure PostgreSQL access for ChatGPT and MCP clients.</p>
      </div>
      <div class="top-actions">
        <button id="copyEndpoint" class="button ghost">Copy MCP URL</button>
        <button id="refresh" class="button">Refresh</button>
      </div>
    </header>

    <section id="loginPanel" class="panel login-panel">
      <div>
        <h2>Admin access</h2>
        <p>Enter the MCP bearer token to view operational status. The token is never displayed by the server.</p>
      </div>
      <form id="loginForm" class="login-form">
        <input id="token" type="password" autocomplete="current-password" placeholder="Bearer token" required />
        <button class="button" type="submit">Open dashboard</button>
      </form>
      <p id="loginError" class="error hidden"></p>
    </section>

    <section id="dashboard" class="hidden">
      <div class="stats">
        <article class="stat">
          <span class="stat-label">Gateway</span>
          <strong id="gatewayStatus">—</strong>
          <small id="gatewayMeta">Checking status</small>
        </article>
        <article class="stat">
          <span class="stat-label">Projects</span>
          <strong id="projectCount">—</strong>
          <small>Configured server-side</small>
        </article>
        <article class="stat">
          <span class="stat-label">MCP endpoint</span>
          <strong>/mcp</strong>
          <small>Streamable HTTP</small>
        </article>
        <article class="stat">
          <span class="stat-label">Security</span>
          <strong>Protected</strong>
          <small>Bearer auth + policy guards</small>
        </article>
      </div>

      <section class="panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">PROJECTS</p>
            <h2>Connection & policy status</h2>
          </div>
          <button id="logout" class="button ghost small">Lock dashboard</button>
        </div>
        <div id="projects" class="project-grid"></div>
      </section>

      <section class="panel">
        <div class="section-head">
          <div>
            <p class="eyebrow">ACTIVITY</p>
            <h2>Recent MCP operations</h2>
          </div>
          <span class="muted">In-memory operational metadata only</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Project</th>
                <th>Tool</th>
                <th>Status</th>
                <th>Rows</th>
                <th>Request</th>
              </tr>
            </thead>
            <tbody id="activity"></tbody>
          </table>
        </div>
      </section>
    </section>
  </main>
  <script src="/admin/app.js" defer></script>
</body>
</html>`;

export const adminCss = `
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827;background:#f5f7fb}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#f8fafc 0,#eef2f7 100%);min-height:100vh}
button,input{font:inherit}.shell{max-width:1180px;margin:0 auto;padding:32px 20px 56px}
.topbar{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:24px}
h1,h2,p{margin-top:0}h1{font-size:34px;letter-spacing:-.03em;margin-bottom:8px}h2{font-size:20px;margin-bottom:6px}
.sub,.muted{color:#667085}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.18em;color:#475467;margin-bottom:8px}
.top-actions,.login-form{display:flex;gap:10px}.button{border:0;border-radius:12px;background:#111827;color:white;padding:11px 16px;font-weight:700;cursor:pointer;box-shadow:0 1px 2px rgba(16,24,40,.08)}
.button:hover{opacity:.92}.button.ghost{background:white;color:#344054;border:1px solid #d0d5dd;box-shadow:none}.button.small{padding:9px 12px;font-size:13px}
.panel{background:rgba(255,255,255,.92);border:1px solid #e4e7ec;border-radius:18px;padding:22px;box-shadow:0 8px 30px rgba(16,24,40,.05);margin-bottom:20px}
.login-panel{display:flex;justify-content:space-between;gap:24px;align-items:center}.login-form{min-width:420px}
input{width:100%;border:1px solid #d0d5dd;background:#fff;border-radius:12px;padding:11px 13px;outline:none}input:focus{border-color:#98a2b3;box-shadow:0 0 0 3px rgba(152,162,179,.15)}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px}.stat{background:#fff;border:1px solid #e4e7ec;border-radius:16px;padding:18px;box-shadow:0 4px 18px rgba(16,24,40,.04)}
.stat-label{display:block;color:#667085;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.stat strong{display:block;font-size:24px;margin:9px 0 5px}.stat small{color:#667085}
.section-head{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px}.section-head h2{margin-bottom:0}
.project-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.project-card{border:1px solid #e4e7ec;border-radius:16px;padding:18px;background:#fcfcfd}
.project-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.project-name{font-size:18px;font-weight:800}.health{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:700}
.dot{width:8px;height:8px;border-radius:50%;background:#98a2b3}.dot.ok{background:#12b76a}.dot.bad{background:#f04438}
.policy{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.policy-item{background:#fff;border:1px solid #eaecf0;border-radius:12px;padding:12px}.policy-item span{display:block;font-size:12px;color:#667085;margin-bottom:5px}.policy-item strong{font-size:14px}
.badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:800}.badge.on{background:#ecfdf3;color:#027a48}.badge.off{background:#f2f4f7;color:#475467}.badge.warn{background:#fff6ed;color:#b54708}
.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #eaecf0;font-size:13px}th{color:#667085;font-weight:700}td{color:#344054}
.hidden{display:none!important}.error{color:#b42318;margin:10px 0 0;font-size:13px}.empty{color:#667085;padding:16px 0}
@media(max-width:850px){.topbar,.login-panel{flex-direction:column}.top-actions,.login-form{width:100%;min-width:0}.stats{grid-template-columns:repeat(2,1fr)}.project-grid{grid-template-columns:1fr}}
@media(max-width:560px){.shell{padding:22px 14px 40px}.stats{grid-template-columns:1fr}.top-actions,.login-form{flex-direction:column}.panel{padding:16px}h1{font-size:28px}}
`;

export const adminJs = `
const state={token:sessionStorage.getItem("naxas_mcp_admin_token")||""};
const $=id=>document.getElementById(id);
const loginPanel=$("loginPanel"),dashboard=$("dashboard"),loginError=$("loginError");

function esc(value){
  return String(value??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\\"":"&quot;","'":"&#039;"}[m]));
}
function badge(value,on="Enabled",off="Disabled"){
  return '<span class="badge '+(value?'on':'off')+'">'+(value?on:off)+'</span>';
}
function fmtTime(v){try{return new Date(v).toLocaleString()}catch{return "—"}}

async function api(path){
  const res=await fetch(path,{headers:{Authorization:"Bearer "+state.token}});
  if(res.status===401) throw new Error("Unauthorized");
  if(!res.ok) throw new Error("Request failed");
  return res.json();
}

function renderProject(p){
  return '<article class="project-card">'
    +'<div class="project-top">'
    +'<span class="project-name">'+esc(p.id)+'</span>'
    +'<span class="health"><span class="dot '+(p.database.ok?'ok':'bad')+'"></span>'
    +(p.database.ok?'Connected':'Unavailable')+' · '+esc(p.database.latencyMs)+'ms</span>'
    +'</div>'
    +'<div class="policy">'
    +'<div class="policy-item"><span>Read access</span><strong>'+badge(p.readConfigured)+'</strong></div>'
    +'<div class="policy-item"><span>Write connection</span><strong>'+badge(p.writeConfigured,"Configured","Not configured")+'</strong></div>'
    +'<div class="policy-item"><span>Write execution</span><strong>'+badge(p.writeEnabled)+'</strong></div>'
    +'<div class="policy-item"><span>DELETE</span><strong>'+(p.allowDelete?'<span class="badge warn">Enabled</span>':'<span class="badge off">Blocked</span>')+'</strong></div>'
    +'<div class="policy-item"><span>Max write rows</span><strong>'+esc(p.maxWriteRows)+'</strong></div>'
    +'<div class="policy-item"><span>Mode</span><strong>'+(p.writeEnabled?'Read + controlled write':'Read only')+'</strong></div>'
    +'</div></article>';
}

function renderActivity(a){
  return '<tr>'
    +'<td>'+esc(fmtTime(a.ts))+'</td>'
    +'<td>'+esc(a.project||"—")+'</td>'
    +'<td>'+esc(a.tool||"—")+'</td>'
    +'<td>'+esc(a.status||"—")+'</td>'
    +'<td>'+esc(a.rows??"—")+'</td>'
    +'<td>'+esc((a.requestId||"—").slice(0,12))+'</td>'
    +'</tr>';
}

async function load(){
  loginError.classList.add("hidden");
  try{
    const data=await api("/admin/status");
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    $("gatewayStatus").textContent=data.ok?"Online":"Attention";
    $("gatewayMeta").textContent="v"+data.version+" · "+data.uptime;
    $("projectCount").textContent=data.projects.length;
    $("projects").innerHTML=data.projects.map(renderProject).join("");

    const rows=data.activity||[];
    $("activity").innerHTML=rows.length
      ?rows.map(renderActivity).join("")
      :'<tr><td colspan="6" class="empty">No MCP activity recorded since the last server restart.</td></tr>';
  }catch(err){
    sessionStorage.removeItem("naxas_mcp_admin_token");
    state.token="";
    dashboard.classList.add("hidden");
    loginPanel.classList.remove("hidden");
    loginError.textContent=err.message==="Unauthorized"?"Invalid bearer token.":"Could not load dashboard status.";
    loginError.classList.remove("hidden");
  }
}

$("loginForm").addEventListener("submit",e=>{
  e.preventDefault();
  state.token=$("token").value.trim();
  sessionStorage.setItem("naxas_mcp_admin_token",state.token);
  load();
});
$("refresh").addEventListener("click",()=>state.token&&load());
$("logout").addEventListener("click",()=>{
  sessionStorage.removeItem("naxas_mcp_admin_token");
  state.token="";
  dashboard.classList.add("hidden");
  loginPanel.classList.remove("hidden");
  $("token").value="";
});
$("copyEndpoint").addEventListener("click",async()=>{
  const url=location.origin+"/mcp";
  await navigator.clipboard.writeText(url);
  $("copyEndpoint").textContent="Copied";
  setTimeout(()=>$("copyEndpoint").textContent="Copy MCP URL",1200);
});
if(state.token){$("token").value=state.token;load();}
`;
