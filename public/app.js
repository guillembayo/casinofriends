const socket=io();let myId=null,room=null,admin=false,ch={active:false,amount:0,step:0,multiplier:1};
const $=x=>document.getElementById(x), money=n=>new Intl.NumberFormat("es-ES",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
function toast(x){$("toast").textContent=x;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2200)}
function enter(d){myId=d.id||myId;room=d.room;admin=d.admin;$("landing").hidden=true;$("app").hidden=false;$("roomLabel").textContent=room;$("roomInfo").textContent="Sala "+room}
$("create").onclick=()=>socket.emit("createRoom",{name:$("createName").value});
$("join").onclick=()=>socket.emit("joinRoom",{name:$("joinName").value,room:$("roomCode").value});
$("roomCode").addEventListener("keydown",e=>{if(e.key==="Enter")$("join").click()});
socket.on("joined",d=>{room=d.room;myId=socket.id;admin=d.admin;enter(d)});
socket.on("errorMsg",toast);
socket.on("state",s=>{
  $("count").textContent=s.players.length;
  $("players").innerHTML=s.players.map(p=>`<div class="player ${p.id===myId?"me":""}"><span>${esc(p.name)}${p.id===s.adminId?'<span class="admin">👑 ADMIN</span>':""}</span><span class="bal">${money(p.balance)}</span></div>`).join("");
  const me=s.players.find(p=>p.id===myId);if(me)$("me").textContent=`${esc(me.name)} · ${money(me.balance)}`;
  $("adminControls").innerHTML=s.adminId===myId?'<button class="adminbtn" id="reset">↻ REINICIAR TODOS</button>':"";
  if($("reset"))$("reset").onclick=()=>confirm("¿Todos vuelven a 1.000 €?")&&socket.emit("reset");
});
$("copy").onclick=async()=>{const url=location.origin+location.pathname+"?room="+room;try{await navigator.clipboard.writeText(url);toast("Enlace copiado")}catch{prompt("Copia este enlace:",url)}};
const urlRoom=new URLSearchParams(location.search).get("room");if(urlRoom)$("roomCode").value=urlRoom;
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".game").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.game).classList.add("active")});
$("spin").onclick=()=>socket.emit("roulette",{bet:$("rBet").value,amount:$("rAmount").value});
socket.on("rouletteResult",r=>{$("wheel").textContent=r.number;$("rResult").textContent=r.win?"🎉 ¡Has ganado "+money(r.profit)+"!":"❌ Has perdido "+money(Math.abs(r.profit))});
$("slotsBtn").onclick=()=>socket.emit("slots",{amount:$("sAmount").value});
socket.on("slotsResult",r=>{$("reels").textContent=r.reels.join(" ");$("sResult").textContent=r.win?"🎉 Premio: "+money(r.profit):"❌ Sin premio: "+money(Math.abs(r.profit))});
$("blackjackBtn").onclick=()=>socket.emit("blackjack",{amount:$("bAmount").value});
socket.on("blackjackResult",r=>{$("bResult").textContent=`Tú ${r.player} · Banca ${r.dealer} → ${r.result==="win"?"🎉 GANAS":r.result==="push"?"🤝 EMPATE":"❌ PIERDES"}`});
$("cStart").onclick=()=>{let a=Number($("cAmount").value);if(!a)return toast("Introduce una cantidad.");ch={active:true,amount:a,step:0,multiplier:1};$("cStart").disabled=true;$("cStep").disabled=false;$("cCash").disabled=false;$("road").innerHTML="<span>🐔</span>";$("mult").textContent="x1.00";socket.emit("chickenStart",{amount:a})};
$("cStep").onclick=()=>socket.emit("chickenStep");
$("cCash").onclick=()=>socket.emit("chickenCashout");
socket.on("chickenAlive",c=>{ch=c;$("mult").textContent="x"+c.multiplier.toFixed(2);$("road").innerHTML="<span style='transform:translateX("+Math.min(c.step*65,750)+"px);display:block'>🐔</span>";$("cResult").textContent="Paso "+c.step+" · Sigue vivo. Puedes cobrar "+money(c.amount*c.multiplier)});
socket.on("chickenDead",()=>{endChicken();$("cResult").textContent="💥 El pollo ha muerto. Apuesta perdida."});
socket.on("chickenCashoutResult",r=>{endChicken();$("cResult").textContent="💰 Has cobrado "+money(r.winnings)});
function endChicken(){$("cStart").disabled=false;$("cStep").disabled=true;$("cCash").disabled=true}
socket.on("resetDone",()=>toast("Partida reiniciada: todos tienen 1.000 €"));
function esc(s){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}