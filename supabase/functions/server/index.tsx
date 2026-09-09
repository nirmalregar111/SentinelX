import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-3d5271d2/health", (c) => {
  return c.json({ status: "ok" });
});

// Camera sender page — served publicly so phone browsers can access without auth
app.get("/make-server-3d5271d2/camera-sender", (c) => {
  const peerId = c.req.query("peer") ?? "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<title>SentinelX Camera</title>
<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#040709;color:#E8F4FD;font-family:'Courier New',monospace;overflow:hidden}
#app{display:flex;flex-direction:column;height:100vh;height:100dvh}
header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #152030;background:#080E15;flex-shrink:0}
.logo{font-size:11px;font-weight:700;letter-spacing:.15em;color:#22D3EE}
.logo-sub{font-size:9px;letter-spacing:.12em;color:#4A6580;margin-top:2px}
.status{display:flex;align-items:center;gap:6px;font-size:11px}
.dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.dot-y{background:#F59E0B;animation:pulse 1s infinite}
.dot-g{background:#22C55E;animation:pulse 1s infinite}
.dot-c{background:#22D3EE}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
#preview{flex:1;position:relative;background:#000;overflow:hidden}
video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.mirror{transform:scaleX(-1)}
.corner{position:absolute;width:22px;height:22px;z-index:5}
.tl{top:14px;left:14px;border-top:2px solid rgba(34,211,238,.6);border-left:2px solid rgba(34,211,238,.6)}
.tr{top:14px;right:14px;border-top:2px solid rgba(34,211,238,.6);border-right:2px solid rgba(34,211,238,.6)}
.bl{bottom:14px;left:14px;border-bottom:2px solid rgba(34,211,238,.6);border-left:2px solid rgba(34,211,238,.6)}
.br{bottom:14px;right:14px;border-bottom:2px solid rgba(34,211,238,.6);border-right:2px solid rgba(34,211,238,.6)}
.live-badge{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:999px;background:rgba(34,197,94,.15);border:1px solid rgba(34,197,94,.4);font-size:11px;color:#22C55E;letter-spacing:.1em;white-space:nowrap}
.overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px;text-align:center;background:rgba(4,7,9,.9)}
.overlay h2{font-size:15px;font-weight:700;color:#FF2D2D;letter-spacing:.1em}
.overlay p{font-size:11px;color:#4A6580;max-width:280px;line-height:1.6}
footer{flex-shrink:0;padding:14px 16px;background:#080E15;border-top:1px solid #152030}
.cam-info{display:flex;align-items:center;gap:8px;margin-bottom:12px}
.cam-box{flex:1;padding:8px 12px;border-radius:8px;background:#0D1520;border:1px solid #1E2D3D}
.cam-box label{display:block;font-size:9px;letter-spacing:.12em;color:#2E4560;text-transform:uppercase;margin-bottom:3px}
.cam-box span{font-size:11px;color:#94B4CC}
button{display:block;width:100%;padding:14px;border-radius:10px;border:none;font-family:inherit;font-size:13px;font-weight:700;letter-spacing:.12em;cursor:pointer;text-transform:uppercase;transition:opacity .15s}
button:disabled{opacity:.4;cursor:not-allowed}
button:active:not(:disabled){opacity:.8}
.btn-connect{background:linear-gradient(135deg,#0d3a4a,#0a2a38);color:#22D3EE;border:1px solid rgba(34,211,238,.3)}
.btn-stop{background:#200808;color:#FF2D2D;border:1px solid rgba(255,45,45,.3)}
.btn-flip{width:auto;padding:8px 14px;background:#0D1520;color:#4A6580;border:1px solid #1E2D3D;border-radius:8px;font-size:11px}
.btn-connecting{background:#0D1520;color:#F59E0B;border:1px solid rgba(245,158,11,.3);opacity:1!important;cursor:default}
.footer-note{text-align:center;font-size:9px;color:#2E4560;letter-spacing:.1em;margin-top:10px;text-transform:uppercase}
#no-peer-msg{color:#FF2D2D;font-size:12px;text-align:center;padding:12px}
</style>
</head>
<body>
<div id="app">
<header>
  <div><div class="logo">SENTINELX</div><div class="logo-sub">CAMERA SENDER</div></div>
  <div class="status" id="status-bar">
    <div class="dot dot-c" id="status-dot"></div>
    <span id="status-text" style="color:#22D3EE">READY</span>
  </div>
</header>
<div id="preview">
  <video id="cam-video" autoplay muted playsinline></video>
  <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
  <div class="live-badge" id="live-badge" style="display:none">
    <div class="dot dot-g"></div>LIVE · STREAMING TO SENTINELX
  </div>
  <div class="overlay" id="error-overlay" style="display:none">
    <h2 id="err-title">ERROR</h2>
    <p id="err-body"></p>
    <button style="width:auto;padding:10px 20px;background:#200808;color:#FF2D2D;border:1px solid rgba(255,45,45,.3);border-radius:8px" onclick="location.reload()">TRY AGAIN</button>
  </div>
</div>
<footer>
  <div class="cam-info">
    <div class="cam-box">
      <label>Camera</label><span id="cam-label">Rear Camera · 720p</span>
    </div>
    <button class="btn-flip" onclick="flipCamera()">🔄 Flip</button>
  </div>
  <div id="no-peer-msg" style="display:none">⚠ No peer ID in URL. Open via QR code from SentinelX desktop.</div>
  <button class="btn-connect" id="main-btn" onclick="startStream()" disabled>▶ START STREAMING</button>
  <div class="footer-note">SentinelX AI Monitoring · WebRTC Camera Sender</div>
</footer>
</div>
<script>
const peerId="${peerId}";
let stream=null,peer=null,call=null,facing="environment";
const video=document.getElementById("cam-video");
const mainBtn=document.getElementById("main-btn");
const statusText=document.getElementById("status-text");
const statusDot=document.getElementById("status-dot");
const liveBadge=document.getElementById("live-badge");
const errOverlay=document.getElementById("error-overlay");
const camLabel=document.getElementById("cam-label");
const noPeerMsg=document.getElementById("no-peer-msg");

function setStatus(text,color){statusText.textContent=text;statusText.style.color=color;statusDot.style.background=color;statusDot.style.animation=color==="#22C55E"||color==="#F59E0B"?"pulse 1s infinite":"none"}
function showError(title,body){document.getElementById("err-title").textContent=title;document.getElementById("err-body").textContent=body;errOverlay.style.display="flex"}

async function startCamera(facingMode){
  try{
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode,width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=stream;
    video.classList.toggle("mirror",facingMode==="user");
    camLabel.textContent=(facingMode==="environment"?"Rear":"Front")+" Camera · 720p";
    mainBtn.disabled=!peerId;
    setStatus("READY","#22D3EE");
  }catch(e){
    if(e.name==="NotAllowedError")showError("CAMERA ACCESS DENIED","Allow camera permission in your browser settings, then reload.");
    else showError("CAMERA ERROR",e.message||"Could not start camera.");
  }
}

function flipCamera(){facing=facing==="environment"?"user":"environment";startCamera(facing)}

function startStream(){
  if(!peerId||!stream)return;
  mainBtn.textContent="Connecting…";mainBtn.className="btn-connecting";mainBtn.disabled=true;
  setStatus("CONNECTING…","#F59E0B");
  peer=new Peer({debug:0});
  peer.on("open",()=>{
    call=peer.call(peerId,stream);
    const activate=()=>{
      liveBadge.style.display="flex";
      mainBtn.textContent="⏹ STOP STREAM";mainBtn.className="btn-stop";mainBtn.disabled=false;mainBtn.onclick=stopStream;
      setStatus("STREAMING","#22C55E");
    };
    call.on("stream",activate);
    setTimeout(()=>{if(statusText.textContent==="CONNECTING…")activate();},2000);
    call.on("error",e=>{setStatus("ERROR","#EF4444");showError("CALL FAILED",e.message||"WebRTC call error.");});
  });
  peer.on("error",e=>{
    setStatus("ERROR","#EF4444");
    let msg=e.message||e.type||"Connection failed.";
    if(e.type==="peer-unavailable")msg="Desktop is not waiting. Make sure SentinelX is open and showing the QR code.";
    showError("CONNECTION FAILED",msg);
  });
}

function stopStream(){
  call?.close();peer?.destroy();stream?.getTracks().forEach(t=>t.stop());
  stream=null;peer=null;call=null;
  liveBadge.style.display="none";
  mainBtn.textContent="▶ START STREAMING";mainBtn.className="btn-connect";mainBtn.onclick=startStream;
  setStatus("READY","#22D3EE");startCamera(facing);
}

if(!peerId){noPeerMsg.style.display="block";mainBtn.textContent="⚠ OPEN VIA QR CODE";mainBtn.className="btn-connect";}
else{startCamera(facing);mainBtn.onclick=startStream;}
</script>
</body>
</html>`;
  return c.html(html);
});

Deno.serve(app.fetch);