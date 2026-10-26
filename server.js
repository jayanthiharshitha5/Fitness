const express=require("express"),webpush=require("web-push"),cors=require("cors"),cron=require("node-cron");require("dotenv").config();
const app=express();app.use(cors({origin:(process.env.ALLOWED_ORIGINS||"").split(",").filter(Boolean)}));app.use(express.json({limit:"100kb"}));
const pub=process.env.VAPID_PUBLIC_KEY,priv=process.env.VAPID_PRIVATE_KEY;
if(pub&&priv)webpush.setVapidDetails(process.env.VAPID_SUBJECT||"mailto:admin@example.com",pub,priv);
const subs=new Map(),sent=new Set();
const reminders=[
["07:30","A little breakfast hug for Maa 🍫","Good morning, Maa 💗 Your YogaBar chocolate oats are waiting. Have your breakfast gently and start your day knowing you are loved.","breakfast"],
["10:30","A tiny snack, Maa 💛","Maa, a little snack break 🍌 A banana with peanuts or some roasted chana would be lovely. Sending you a tiny hug and lots of love.","morning-snack"],
["13:00","Lunch break, Maa 🍛","Maa, take a gentle lunch break 🌼 Have a proper meal with some protein if you can. You deserve nourishment and care.","lunch"],
["16:30","A little afternoon love for Maa 🍌","A little note from me, Maa 💌 Grab a quick snack and give your body some energy. I am cheering for you.","evening-snack"],
["18:55","Maa, dinner decision date 💗","Maa, take just 2 minutes to choose tonight’s dinner. Pick what sounds good and check what ingredients you have at home. No rush, my love.","choose-dinner"],
["19:30","Dinner, Maa 🍲","You made it through another day, Maa 🫶 Make a quick, fresh dinner when you can. I hope you eat well and feel cared for.","dinner"],
["22:15","A tiny favour for tomorrow, Maa 🥣","Just two little minutes, Maa 💛 Set out tomorrow’s dry ingredients if you can, so your morning feels a bit easier.","prep"],
["22:45","Soft landing time, Maa 🌙","You have done enough for today, Maa 💗 When you can, put the screen aside, take a slow breath, and let yourself rest. You deserve gentleness.","sleep"]];
app.get("/",(q,s)=>s.json({service:"Fuel & Love",status:"ok"}));app.get("/health",(q,s)=>s.json({status:"ok",subscribers:subs.size}));
app.get("/vapid-public-key",(q,s)=>pub?s.json({publicKey:pub}):s.status(503).json({error:"VAPID keys are not configured"}));
app.post("/subscribe",(q,s)=>{const {subscription,device,timezone}=q.body||{};if(!subscription?.endpoint||!subscription?.keys)return s.status(400).json({error:"Valid subscription required"});subs.set(subscription.endpoint,{subscription,device,timezone});s.json({ok:true})});
app.post("/unsubscribe",(q,s)=>{if(q.body?.endpoint)subs.delete(q.body.endpoint);s.json({ok:true})});
cron.schedule("* * * * *",async()=>{if(!pub||!priv)return;const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kolkata",hour:"2-digit",minute:"2-digit",hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).reduce((o,p)=>(o[p.type]=p.value,o),{});const day=`${parts.year}-${parts.month}-${parts.day}`,time=`${parts.hour}:${parts.minute}`,r=reminders.find(x=>x[0]===time);if(!r)return;const k=day+":"+r[3];if(sent.has(k))return;sent.add(k);for(const [ep,x] of subs)try{await webpush.sendNotification(x.subscription,JSON.stringify({title:r[1],body:r[2],tag:r[3],url:"/"}))}catch(e){if([404,410].includes(e.statusCode))subs.delete(ep);console.error("push:",e.message)}for(const x of sent)if(!x.startsWith(day+":"))sent.delete(x)});
app.listen(process.env.PORT||3000,()=>console.log("Reminder API running"));
