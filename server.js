
const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const path = require("path");
const crypto = require("crypto");

const app=express(), server=http.createServer(app), io=new Server(server);
const PORT=process.env.PORT||3000;
app.use(express.static(path.join(__dirname,"public")));

const rooms=new Map();

function code(){return crypto.randomBytes(3).toString("hex").toUpperCase();}
function roomState(r){
  return {
    code:r.code, adminId:r.adminId,
    players:[...r.players.values()].map(p=>({id:p.id,name:p.name,balance:p.balance,connected:p.connected}))
  };
}
function emitRoom(r){io.to(r.code).emit("state",roomState(r));}
function validAmount(p,a){return Number.isFinite(a)&&a>0&&a<=p.balance;}

io.on("connection",socket=>{
  socket.on("createRoom",({name})=>{
    name=String(name||"").trim().slice(0,18);
    if(!name)return socket.emit("errorMsg","Escribe tu nombre.");
    let c; do c=code(); while(rooms.has(c));
    const r={code:c,adminId:socket.id,players:new Map()};
    r.players.set(socket.id,{id:socket.id,name,balance:1000,connected:true});
    rooms.set(c,r); socket.join(c);
    socket.data.room=c;
    socket.emit("joined",{room:c,admin:true});
    emitRoom(r);
  });

  socket.on("joinRoom",({name,room})=>{
    name=String(name||"").trim().slice(0,18);
    room=String(room||"").trim().toUpperCase();
    const r=rooms.get(room);
    if(!name)return socket.emit("errorMsg","Escribe tu nombre.");
    if(!r)return socket.emit("errorMsg","No existe esa sala.");
    if([...r.players.values()].some(p=>p.name.toLowerCase()===name.toLowerCase()&&p.connected))
      return socket.emit("errorMsg","Ese nombre ya está ocupado.");
    r.players.set(socket.id,{id:socket.id,name,balance:1000,connected:true});
    socket.join(room); socket.data.room=room;
    socket.emit("joined",{room,admin:r.adminId===socket.id});
    emitRoom(r);
  });

  function get(){
    const r=rooms.get(socket.data.room);
    const p=r?.players.get(socket.id);
    return {r,p};
  }

  socket.on("roulette",({bet,amount})=>{
    const {r,p}=get(); amount=Number(amount); if(!r||!validAmount(p,amount))return socket.emit("errorMsg","Apuesta no válida.");
    const n=Math.floor(Math.random()*37), reds=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
    let win=false,m=0;
    if(/^\d+$/.test(String(bet))&&+bet>=0&&+bet<=36){win=+bet===n;m=36}
    else if(["rojo","negro"].includes(bet)){win=n!==0&&(reds.has(n)?"rojo":"negro")===bet;m=2}
    else if(["par","impar"].includes(bet)){win=n!==0&&(n%2?"impar":"par")===bet;m=2}
    else if(["bajo","alto"].includes(bet)){win=n!==0&&(n<=18?"bajo":"alto")===bet;m=2}
    else return socket.emit("errorMsg","Apuesta no válida.");
    p.balance-=amount;if(win)p.balance+=amount*m;
    socket.emit("rouletteResult",{number:n,win,profit:win?amount*(m-1):-amount});
    emitRoom(r);
  });

  socket.on("slots",({amount})=>{
    const {r,p}=get(); amount=Number(amount); if(!r||!validAmount(p,amount))return socket.emit("errorMsg","Apuesta no válida.");
    const s=["🍒","🍋","🔔","⭐","7️⃣"], reels=[0,1,2].map(()=>s[Math.floor(Math.random()*s.length)]);
    p.balance-=amount; let m=0;
    if(reels[0]===reels[1]&&reels[1]===reels[2])m=reels[0]==="7️⃣"?12:6;
    else if(reels[0]===reels[1]||reels[1]===reels[2]||reels[0]===reels[2])m=2;
    if(m)p.balance+=amount*m;
    socket.emit("slotsResult",{reels,win:!!m,profit:m?amount*(m-1):-amount});emitRoom(r);
  });

  socket.on("blackjack",({amount})=>{
    const {r,p}=get(); amount=Number(amount); if(!r||!validAmount(p,amount))return socket.emit("errorMsg","Apuesta no válida.");
    const card=()=>Math.floor(Math.random()*13)+1;
    const hand=()=>{let a=card(),b=card();return [a,b,a+b>21?Math.min(a,b):a+b]};
    const ph=hand(),dh=hand(),ps=ph[2],ds=dh[2];p.balance-=amount;
    const result=ps>21?"lose":ds>21||ps>ds?"win":ps===ds?"push":"lose";
    if(result==="win")p.balance+=amount*2;if(result==="push")p.balance+=amount;
    socket.emit("blackjackResult",{player:ps,dealer:ds,result});emitRoom(r);
  });

  socket.on("chickenStart",({amount})=>{
    const {r,p}=get();amount=Number(amount);if(!r||!validAmount(p,amount))return socket.emit("errorMsg","Apuesta no válida.");
    p.balance-=amount;socket.data.chicken={amount,step:0,multiplier:1};
    socket.emit("chickenStarted");emitRoom(r);
  });
  socket.on("chickenStep",()=>{
    const {r,p}=get(),c=socket.data.chicken;if(!r||!c)return;
    if(Math.random()<.72){socket.emit("chickenDead");delete socket.data.chicken;emitRoom(r);return}
    c.step++;c.multiplier=+(1+c.step*.25).toFixed(2);socket.emit("chickenAlive",c);
  });
  socket.on("chickenCashout",()=>{
    const {r,p}=get(),c=socket.data.chicken;if(!r||!c)return;
    const winnings=+(c.amount*c.multiplier).toFixed(2);p.balance+=winnings;delete socket.data.chicken;
    socket.emit("chickenCashoutResult",{winnings});emitRoom(r);
  });

  socket.on("reset",()=>{
    const {r}=get();if(!r||r.adminId!==socket.id)return socket.emit("errorMsg","Solo el admin puede reiniciar.");
    for(const p of r.players.values())p.balance=1000;
    io.to(r.code).emit("resetDone");emitRoom(r);
  });

  socket.on("disconnect",()=>{
    const r=rooms.get(socket.data.room);if(!r)return;
    const p=r.players.get(socket.id);if(p)p.connected=false;
    if(r.adminId===socket.id){
      const next=[...r.players.values()].find(x=>x.connected);
      if(next)r.adminId=next.id;
    }
    emitRoom(r);
  });
});
server.listen(PORT,"0.0.0.0",()=>console.log("Casino Friends en puerto "+PORT));
