import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://nlcbdfceundtcqauoosv.supabase.co";
const SUPABASE_KEY = "sb_publishable_yNlB7W5J29rI_AfAoO5X9w_lVPoDysR";

const db = {
  async get(table, params = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    return res.json();
  },
  async post(table, body) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

const SYSTEMS = {
  Windows:          { icon: "Win", lifespan: 15, cost: [8000,15000],  maintenance: [{ month:4, task:"Clean tracks and lubricate hardware" },{ month:10, task:"Inspect weatherstripping before winter" }], description: "Insulated glass window units" },
  Roof:             { icon: "Roof", lifespan: 25, cost: [15000,30000], maintenance: [{ month:4, task:"Inspect shingles after winter" },{ month:10, task:"Clean gutters, check flashing" }], description: "Asphalt shingle roofing system" },
  HVAC:             { icon: "HVAC", lifespan: 15, cost: [7000,12000],  maintenance: [{ month:3, task:"Replace air filter" },{ month:6, task:"Schedule AC tune-up" },{ month:9, task:"Replace filter + heating tune-up" },{ month:12, task:"Replace air filter" }], description: "Heating, ventilation & air conditioning" },
  "Water Heater":   { icon: "H2O", lifespan: 10, cost: [1500,3500],   maintenance: [{ month:4, task:"Flush tank to remove sediment" },{ month:10, task:"Test pressure relief valve" }], description: "Tank or tankless water heating" },
  "Electrical Panel":{ icon:"Elec", lifespan: 40, cost: [2500,4500],   maintenance: [{ month:6, task:"Test GFCI outlets and smoke detectors" },{ month:12, task:"Visual inspection for corrosion" }], description: "Main electrical service panel" },
  Gutters:          { icon: "Gut", lifespan: 20, cost: [1500,5000],   maintenance: [{ month:4, task:"Clean gutters after spring pollen" },{ month:10, task:"Clean gutters after leaves fall" }], description: "Gutter and downspout system" },
  Insulation:       { icon: "Ins", lifespan: 30, cost: [3000,8000],   maintenance: [{ month:10, task:"Check attic insulation before heating season" }], description: "Attic and wall insulation" },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function getAge(d) { return new Date().getFullYear() - new Date(d).getFullYear(); }
function getReplYear(d, life) { return new Date(d).getFullYear() + life; }
function getYearsLeft(d, life) { return Math.max(0, getReplYear(d,life) - new Date().getFullYear()); }
function fmtCost(a,b) { return `$${(a/1000).toFixed(0)}k - $${(b/1000).toFixed(0)}k`; }

function getHealth(d, life) {
  const pct = getAge(d) / life;
  if (pct < 0.4)  return { label:"Good",        color:"#22c55e", bg:"rgba(34,197,94,0.12)",   pct };
  if (pct < 0.65) return { label:"Aging",        color:"#f59e0b", bg:"rgba(245,158,11,0.12)",  pct };
  if (pct < 0.9)  return { label:"Nearing End",  color:"#ef4444", bg:"rgba(239,68,68,0.12)",   pct };
  return             { label:"Replace Soon", color:"#dc2626", bg:"rgba(220,38,38,0.15)",  pct:1 };
}

function getTotalValue(installations) {
  return installations.reduce((sum,i) => { const s=SYSTEMS[i.system]; return s ? sum+(s.cost[0]+s.cost[1])/2 : sum; }, 0);
}

function getUpcoming(installations) {
  const now = new Date().getMonth()+1;
  const tasks = [];
  installations.forEach(inst => {
    const sys = SYSTEMS[inst.system]; if (!sys) return;
    sys.maintenance.forEach(t => {
      const diff = ((t.month - now) + 12) % 12;
      tasks.push({ system:inst.system, icon:sys.icon, task:t.task, month:t.month, monthName:MONTHS[t.month-1], diff });
    });
  });
  return tasks.sort((a,b) => a.diff-b.diff).slice(0,6);
}

// Design tokens
const G = {
  bg:"#08090f", surface:"rgba(255,255,255,0.03)", border:"rgba(255,255,255,0.07)",
  borderAccent:"rgba(99,102,241,0.35)", text:"#f1f5f9", muted:"#64748b", subtle:"#334155",
  accent:"#6366f1", accentGlow:"rgba(99,102,241,0.22)",
};
const inp = { width:"100%", padding:"13px 16px", borderRadius:10, border:`1px solid ${G.borderAccent}`, background:"rgba(99,102,241,0.06)", color:G.text, fontSize:15, outline:"none", fontFamily:"'DM Sans',sans-serif" };
const lbl = { color:G.muted, fontSize:11, letterSpacing:1.5, textTransform:"uppercase", marginBottom:7, display:"block", fontWeight:600 };

function GS() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700;900&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${G.bg};color:${G.text};font-family:'DM Sans',sans-serif}
    select option{background:#1e293b;color:${G.text}}
    input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.5)}
    input::placeholder{color:${G.subtle}}
    .hov{transition:all .18s}.hov:hover{border-color:rgba(99,102,241,.3)!important;transform:translateY(-1px)}
    .tab{transition:all .15s}.tab:hover{background:rgba(99,102,241,.15)!important}
  `}</style>;
}

function Card({children,style={},glow=false}){
  return <div style={{background:G.surface,border:`1px solid ${glow?G.borderAccent:G.border}`,borderRadius:18,padding:"26px 30px",boxShadow:glow?`0 0 36px ${G.accentGlow}`:"none",...style}}>{children}</div>;
}
function Pill({children,color=G.accent}){
  return <span style={{fontSize:11,background:color+"22",color,padding:"3px 11px",borderRadius:100,fontWeight:700,letterSpacing:.5}}>{children}</span>;
}
function Btn({children,onClick,variant="primary",style={},disabled=false}){
  const v={primary:{background:G.accent,color:"#fff",boxShadow:`0 0 24px ${G.accentGlow}`,opacity:disabled?.6:1},ghost:{background:"rgba(99,102,241,.1)",color:"#818cf8",border:"1px solid rgba(99,102,241,.2)"},danger:{background:"rgba(239,68,68,.12)",color:"#fca5a5",border:"1px solid rgba(239,68,68,.25)"}};
  return <button onClick={disabled?undefined:onClick} style={{padding:"12px 26px",borderRadius:11,border:"none",cursor:disabled?"not-allowed":"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:15,transition:"all .18s",...v[variant],...style}}>{children}</button>;
}
function Nav({setView}){
  return <nav style={{borderBottom:`1px solid ${G.border}`,padding:"0 26px",display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(20px)",position:"sticky",top:0,background:"rgba(8,9,15,.92)",zIndex:100,height:62,flexWrap:"wrap",gap:10}}>
    <button onClick={()=>setView("landing")} style={{fontFamily:"'Playfair Display',serif",fontSize:22,fontWeight:900,color:G.text,background:"none",border:"none",cursor:"pointer"}}>Home<span style={{color:G.accent}}>Passport</span></button>
    <div style={{display:"flex",gap:6}}>
      {[["lookup","My Home"],["self-log","Add My Home"],["contractor","Contractors"]].map(([v,l])=>(
        <button key={v} className="tab" onClick={()=>setView(v)} style={{background:"transparent",border:`1px solid ${G.border}`,color:G.muted,padding:"7px 15px",borderRadius:8,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:500}}>{l}</button>
      ))}
    </div>
  </nav>;
}
function Shell({setView,children,maxWidth=900}){
  return <div style={{minHeight:"100vh",background:G.bg}}><GS/><Nav setView={setView}/><div style={{maxWidth,margin:"0 auto",padding:"48px 24px 80px"}}>{children}</div></div>;
}

//    LANDING                                               
function Landing({setView,stats}){
  return <div style={{minHeight:"100vh",background:G.bg}}><GS/><Nav setView={setView}/>
    <div style={{position:"fixed",inset:0,backgroundImage:`linear-gradient(${G.border} 1px,transparent 1px),linear-gradient(90deg,${G.border} 1px,transparent 1px)`,backgroundSize:"64px 64px",pointerEvents:"none",zIndex:0}}/>
    <div style={{position:"fixed",top:"15%",left:"50%",transform:"translateX(-50%)",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(99,102,241,.12) 0%,transparent 65%)",pointerEvents:"none",zIndex:0}}/>
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px",position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",maxWidth:700}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,background:"rgba(99,102,241,.12)",border:"1px solid rgba(99,102,241,.25)",borderRadius:100,padding:"6px 20px",marginBottom:36}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block"}}/>
          <span style={{fontSize:11,letterSpacing:3,color:"#818cf8",fontWeight:700,textTransform:"uppercase"}}>Live   Maine Beta</span>
        </div>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(46px,8vw,86px)",fontWeight:900,color:G.text,lineHeight:1.0,marginBottom:28,letterSpacing:-2}}>
          Your home<br/><span style={{color:G.accent}}>finally has</span><br/>a record.
        </h1>
        <p style={{fontSize:19,color:G.muted,lineHeight:1.75,marginBottom:52,fontWeight:300,maxWidth:500,margin:"0 auto 52px"}}>
          Track every system in your house. Know what was installed, when it needs replacing, and what it'll cost  -  before it fails.
        </p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn onClick={()=>setView("self-log")} style={{padding:"16px 40px",fontSize:16}}>Add My Home Free  </Btn>
          <Btn onClick={()=>setView("lookup")} variant="ghost" style={{padding:"16px 32px",fontSize:16}}>View My HomePassport</Btn>
        </div>

        {/* Feature pills */}
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginTop:36}}>
          {["Maintenance Calendar","Replacement Cost Estimates","Warranty & Document Storage","End-of-Life Alerts"].map(f=>(
            <span key={f} style={{fontSize:13,background:G.surface,border:`1px solid ${G.border}`,color:G.muted,padding:"7px 16px",borderRadius:100}}>{f}</span>
          ))}
        </div>

        <div style={{marginTop:72,display:"flex",gap:48,justifyContent:"center",flexWrap:"wrap",paddingTop:48,borderTop:`1px solid ${G.border}`}}>
          {[[stats.homes,"Homes Tracked"],[stats.installs,"Systems Logged"],[stats.contractors,"Contractors"]].map(([n,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:40,fontFamily:"'Playfair Display',serif",fontWeight:900,color:G.accent,lineHeight:1}}>{n}</div>
              <div style={{fontSize:12,color:G.muted,letterSpacing:2,textTransform:"uppercase",marginTop:8}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>;
}

//    LOOKUP                                                 
function Lookup({setView,setActiveHome}){
  const [q,setQ]=useState(""); const [res,setRes]=useState([]); const [loading,setLoading]=useState(false);
  useEffect(()=>{
    if(q.length<2){setRes([]);return;}
    const t=setTimeout(async()=>{ setLoading(true); const d=await db.get("homes",`or=(address.ilike.*${q}*,owner_name.ilike.*${q}*,id.ilike.*${q}*)&select=*`); setRes(Array.isArray(d)?d:[]); setLoading(false); },350);
    return ()=>clearTimeout(t);
  },[q]);
  const open=async(home)=>{ const i=await db.get("installations",`home_id=eq.${home.id}&select=*`); setActiveHome({...home,installations:Array.isArray(i)?i:[]}); setView("passport"); };
  return <Shell setView={setView}>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,marginBottom:8,letterSpacing:-1}}>Find Your HomePassport</h1>
    <p style={{color:G.muted,marginBottom:36,fontSize:16}}>Search by address or name.</p>
    <input value={q} onChange={e=>setQ(e.target.value)} placeholder="42 Birchwood Lane or Sarah Mitchell " style={{...inp,fontSize:17,padding:"16px 20px",marginBottom:28,borderRadius:14}} autoFocus/>
    {loading&&<p style={{color:G.muted}}>Searching </p>}
    {!loading&&q.length>1&&res.length===0&&<Card><p style={{color:G.muted}}>No homes found. <button onClick={()=>setView("self-log")} style={{color:G.accent,background:"none",border:"none",cursor:"pointer",fontWeight:600}}>Add your home  </button></p></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {res.map(h=>(
        <button key={h.id} onClick={()=>open(h)} className="hov" style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"22px 26px",textAlign:"left",cursor:"pointer",width:"100%"}}>
          <div style={{fontWeight:700,color:G.text,fontSize:17}}>{h.address}</div>
          <div style={{color:G.muted,fontSize:13,marginTop:4}}>{h.city}, {h.state}   {h.owner_name}   {h.id}</div>
        </button>
      ))}
    </div>
  </Shell>;
}

//    PASSPORT                                               
function Passport({home,setView}){
  const [installations,setInstallations]=useState(home.installations||[]);
  const [showAddSystem,setShowAddSystem]=useState(false);
  const [tab,setTab]=useState("systems");
  const [copied,setCopied]=useState(false);
  const missing=Object.keys(SYSTEMS).filter(s=>!installations.map(i=>i.system).includes(s));
  const urgent=installations.filter(i=>getYearsLeft(i.install_date,i.expected_life||SYSTEMS[i.system]?.lifespan||15)<=4);
  const total=getTotalValue(installations);
  const upcoming=getUpcoming(installations);
  const updatedHome={...home,installations};
  const url=`${window.location.origin}/?home=${home.slug||home.id}`;

  return <Shell setView={setView} maxWidth={960}>
    {/* Header */}
    <div style={{marginBottom:36}}>
      <div style={{fontSize:11,letterSpacing:3,color:G.accent,textTransform:"uppercase",fontWeight:700,marginBottom:10}}>{home.id}</div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(26px,5vw,46px)",fontWeight:900,color:G.text,marginBottom:6,letterSpacing:-1}}>{home.address}</h1>
      <p style={{color:G.muted,fontSize:16,marginBottom:20}}>{home.city}, {home.state} {home.zip}   {home.owner_name}</p>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Pill>{home.installations.length} Systems Logged</Pill>
        {urgent.length>0&&<Pill color="#ef4444">  {urgent.length} Need Attention</Pill>}
        <Pill color="#f59e0b">${(total/1000).toFixed(0)}k Tracked Value</Pill>
        <Pill color="#22c55e">{upcoming.length} Upcoming Tasks</Pill>
      </div>
    </div>

    {/* Share bar */}
    <Card style={{marginBottom:28,padding:"14px 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{color:G.muted,fontSize:12,flex:1,wordBreak:"break-all"}}>  {url}</span>
        <Btn onClick={()=>{navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),2000);}} variant="ghost" style={{padding:"8px 18px",fontSize:13}}>{copied?"Copied!":"Copy Link"}</Btn>
      </div>
    </Card>

    {/* Alerts */}
    {urgent.length>0&&(
      <div style={{background:"rgba(239,68,68,.07)",border:"1px solid rgba(239,68,68,.2)",borderRadius:16,padding:"20px 26px",marginBottom:28}}>
        <div style={{fontWeight:700,color:"#fca5a5",marginBottom:12,fontSize:15}}>  Replacement Alerts</div>
        {urgent.map(i=>{
          const sys=SYSTEMS[i.system]; const life=i.expected_life||sys?.lifespan||15; const yrs=getYearsLeft(i.install_date,life);
          return <div key={i.id} style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:8,paddingBottom:8,borderBottom:"1px solid rgba(239,68,68,.1)"}}>
            <span style={{color:"#fcd34d"}}>{sys?.icon} <strong>{i.system}</strong>  -  {yrs===0?"Past expected life":`~${yrs} yr${yrs!==1?"s":""} remaining`}</span>
            <span style={{color:"#fca5a5",fontWeight:700}}>{sys?fmtCost(sys.cost[0],sys.cost[1]):"N/A"}</span>
          </div>;
        })}
      </div>
    )}

    {/* Summary stats */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:36}}>
      {[{l:"Total Systems",v:home.installations.length,s:`of ${Object.keys(SYSTEMS).length} trackable`},{l:"Est. Replacement Value",v:`$${(total/1000).toFixed(0)}k`,s:"across all systems"},{l:"Upcoming Tasks",v:upcoming.length,s:"next 12 months"},{l:"Not Yet Logged",v:missing.length,s:"systems unknown"}].map(({l,v,s})=>(
        <Card key={l} style={{padding:"18px 22px"}}>
          <div style={{color:G.muted,fontSize:11,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:8}}>{l}</div>
          <div style={{fontSize:30,fontFamily:"'Playfair Display',serif",fontWeight:900,color:G.accent,lineHeight:1}}>{v}</div>
          <div style={{fontSize:12,color:G.subtle,marginTop:6}}>{s}</div>
        </Card>
      ))}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",gap:6,marginBottom:28,borderBottom:`1px solid ${G.border}`}}>
      {[["systems","Systems"],["maintenance","Maintenance"],["documents","Documents"]].map(([t,l])=>(
        <button key={t} className="tab" onClick={()=>setTab(t)} style={{padding:"11px 20px",borderRadius:"10px 10px 0 0",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,background:tab===t?G.surface:"transparent",color:tab===t?G.text:G.muted,borderBottom:tab===t?`2px solid ${G.accent}`:"2px solid transparent"}}>{l}</button>
      ))}
    </div>

    {tab==="systems"&&<SystemsTab home={updatedHome} missing={missing} onAddSystem={()=>setShowAddSystem(true)}/>}
    {tab==="maintenance"&&<MaintenanceTab home={updatedHome} upcoming={upcoming}/>}
    {tab==="documents"&&<DocumentsTab home={updatedHome}/>}
    {showAddSystem&&<AddSystemModal home={home} onClose={()=>setShowAddSystem(false)} onAdded={(inst)=>{setInstallations(prev=>[...prev,inst]);setShowAddSystem(false);}}/>}
  </Shell>;
}

function AddSystemModal({home,onClose,onAdded}){
  const [form,setForm]=useState({system:"Windows",brand:"",installDate:"",warranty:"",known:"yes"});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const normalizeDate=(val)=>{
    if(!val)return null; const s=String(val).trim();
    if(/^\d{4}$/.test(s))return `${s}-06-01`;
    if(/^\d{4}-\d{2}$/.test(s))return `${s}-01`;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
    return null;
  };

  const save=async()=>{
    if(!form.system)return;
    setSaving(true);
    try{
      const date=normalizeDate(form.installDate)||`${new Date().getFullYear()}-06-01`;
      const res=await db.post("installations",{
        id:`inst-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        home_id:home.id, contractor_name:"Self-logged",
        system:form.system, brand:form.brand||"", units:null,
        install_date:date,
        warranty:form.warranty?parseInt(form.warranty):null,
        expected_life:SYSTEMS[form.system]?.lifespan||15
      });
      if(Array.isArray(res)&&res.length>0) onAdded(res[0]);
      onClose();
    }catch(err){alert("Could not save. Please try again.");}
    setSaving(false);
  };

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={onClose}>
    <div style={{background:"#0f172a",border:`1px solid ${G.borderAccent}`,borderRadius:20,padding:"32px",maxWidth:520,width:"100%",boxShadow:`0 0 60px ${G.accentGlow}`}} onClick={e=>e.stopPropagation()}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:900,color:G.text}}>Add a System</h2>
        <button onClick={onClose} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:24}}> </button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>System</label>
          <select style={inp} value={form.system} onChange={e=>set("system",e.target.value)}>
            {Object.keys(SYSTEMS).map(s=><option key={s} value={s}>{SYSTEMS[s].icon} {s}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Do you know when installed?</label>
          <select style={inp} value={form.known} onChange={e=>set("known",e.target.value)}>
            <option value="yes">Yes, I know the date</option>
            <option value="approx">Approximate year only</option>
            <option value="no">Not sure</option>
          </select>
        </div>
        {form.known!=="no"&&<div><label style={lbl}>{form.known==="approx"?"Approx. Year":"Install Date"}</label>
          <input style={inp} type={form.known==="approx"?"text":"date"} value={form.installDate}
            onChange={e=>set("installDate",form.known==="approx"?e.target.value.replace(/\D/g,"").slice(0,4):e.target.value)}
            placeholder={form.known==="approx"?"e.g. 2015":""}/>
        </div>}
        <div><label style={lbl}>Brand (optional)</label>
          <input style={inp} value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder={form.system==="Windows"?"Andersen":"Carrier"}/>
        </div>
        <div><label style={lbl}>Warranty (years)</label>
          <input style={inp} type="number" value={form.warranty} onChange={e=>set("warranty",e.target.value)} placeholder={String(SYSTEMS[form.system]?.lifespan||15)}/>
        </div>
      </div>
      <Btn onClick={save} disabled={saving} style={{width:"100%",padding:"14px"}}>
        {saving?"Saving ":"Add System  "}
      </Btn>
    </div>
  </div>;
}

function SystemsTab({home,missing,onAddSystem}){
  return <>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:16}}>
      <Btn onClick={onAddSystem} variant="ghost" style={{padding:"10px 20px",fontSize:14}}>+ Add System</Btn>
    </div>
    <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:32}}>
      {home.installations.map(inst=>{
        const sys=SYSTEMS[inst.system]||{icon:" ",lifespan:15,cost:[0,0],description:""};
        const life=inst.expected_life||sys.lifespan; const h=getHealth(inst.install_date,life);
        const replY=getReplYear(inst.install_date,life); const yrsLeft=getYearsLeft(inst.install_date,life);
        const instY=new Date(inst.install_date).getFullYear(); const age=getAge(inst.install_date);
        return <Card key={inst.id} className="hov">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14,marginBottom:18}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
                <span style={{fontSize:24}}>{sys.icon}</span>
                <span style={{fontWeight:700,fontSize:20,color:G.text}}>{inst.system}</span>
                <span style={{fontSize:11,background:h.bg,color:h.color,padding:"3px 10px",borderRadius:100,fontWeight:700}}>{h.label}</span>
              </div>
              <div style={{color:G.muted,fontSize:14}}>{inst.brand}{inst.units?`   ${inst.units} units`:""}   {sys.description}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontWeight:700,fontSize:17,color:G.text}}>Installed {instY}</div>
              <div style={{color:G.muted,fontSize:13}}>{age} year{age!==1?"s":""} old</div>
            </div>
          </div>
          <div style={{height:8,background:"rgba(255,255,255,.05)",borderRadius:100,overflow:"hidden",marginBottom:14}}>
            <div style={{height:"100%",width:`${Math.min(100,h.pct*100)}%`,background:`linear-gradient(90deg,${h.color}88,${h.color})`,borderRadius:100}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10}}>
            {[["Est. Replace",`~${replY}`],["Years Left",yrsLeft>0?`~${yrsLeft} yrs`:"Past life"],["Replace Cost",sys.cost[0]>0?fmtCost(sys.cost[0],sys.cost[1]):"N/A"],["Installer",inst.contractor_name||"Self-logged"],...(inst.warranty?[["Warranty Exp.",`${instY+inst.warranty}`]]:[])].map(([l,v])=>(
              <div key={l} style={{background:"rgba(255,255,255,.02)",borderRadius:10,padding:"10px 13px"}}>
                <div style={{fontSize:10,color:G.subtle,letterSpacing:1.5,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>{l}</div>
                <div style={{fontSize:14,fontWeight:600,color:G.text}}>{v}</div>
              </div>
            ))}
          </div>
        </Card>;
      })}
    </div>
    {missing.length>0&&<>
      <h3 style={{color:G.muted,fontSize:12,letterSpacing:2,textTransform:"uppercase",marginBottom:14,fontWeight:700}}>Not Yet Logged</h3>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(175px,1fr))",gap:10}}>
        {missing.map(s=><div key={s} style={{background:"rgba(255,255,255,.02)",border:`1px dashed ${G.border}`,borderRadius:12,padding:"14px 18px",display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:20,opacity:.3}}>{SYSTEMS[s]?.icon}</span>
          <div><div style={{color:G.subtle,fontWeight:600,fontSize:14}}>{s}</div><div style={{fontSize:11,color:G.subtle,opacity:.6}}>Unknown</div></div>
        </div>)}
      </div>
    </>}
  </>;
}

function MaintenanceTab({home,upcoming}){
  const nowMonth=new Date().getMonth()+1;
  return <div>
    <p style={{color:G.muted,marginBottom:28,fontSize:15}}>Recommended tasks based on your logged systems.</p>
    {upcoming.length===0&&<Card><p style={{color:G.muted}}>Log your home systems to see a personalized maintenance calendar.</p></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:40}}>
      {upcoming.map((item,i)=>(
        <Card key={i} style={{padding:"16px 22px"}} className="hov">
          <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
            <div style={{background:G.accentGlow,borderRadius:12,padding:"10px 14px",textAlign:"center",minWidth:58}}>
              <div style={{fontSize:20}}>{item.icon}</div>
              <div style={{fontSize:10,color:G.accent,fontWeight:700,marginTop:2}}>{item.monthName}</div>
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,color:G.text,marginBottom:3}}>{item.task}</div>
              <div style={{fontSize:13,color:G.muted}}>{item.system}   {item.diff===0?"This month":`In ~${item.diff} month${item.diff!==1?"s":""}`}</div>
            </div>
            {item.diff<=1&&<Pill color="#f59e0b">Coming up</Pill>}
          </div>
        </Card>
      ))}
    </div>
    <h3 style={{color:G.muted,fontSize:12,letterSpacing:2,textTransform:"uppercase",marginBottom:14,fontWeight:700}}>Year at a Glance</h3>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
      {MONTHS.map((m,idx)=>{
        const mn=idx+1; const isCur=mn===nowMonth;
        const tasks=home.installations.flatMap(inst=>{ const sys=SYSTEMS[inst.system]; if(!sys)return[]; return sys.maintenance.filter(t=>t.month===mn).map(t=>({...t,icon:sys.icon,system:inst.system})); });
        return <div key={m} style={{background:isCur?"rgba(99,102,241,.1)":"rgba(255,255,255,.02)",border:`1px solid ${isCur?G.borderAccent:G.border}`,borderRadius:12,padding:"12px 14px"}}>
          <div style={{fontWeight:700,color:isCur?G.accent:G.muted,fontSize:12,marginBottom:8}}>{m}</div>
          {tasks.length===0?<div style={{fontSize:11,color:G.subtle}}>No tasks</div>:tasks.map((t,i)=><div key={i} style={{fontSize:11,color:G.text,marginBottom:3}}>{t.icon} {t.system}</div>)}
        </div>;
      })}
    </div>
  </div>;
}

function DocumentsTab({home}){
  const [docs,setDocs]=useState([]); const [uploading,setUploading]=useState(false);
  const [form,setForm]=useState({label:"",system:home.installations[0]?.system||"General",type:"Warranty"});
  const fileRef=useRef();

  useEffect(()=>{ db.get("documents",`home_id=eq.${home.id}&select=*&order=created_at.desc`).then(d=>setDocs(Array.isArray(d)?d:[])); },[home.id]);

  const handleUpload=async(e)=>{
    const file=e.target.files[0]; if(!file||!form.label)return;
    setUploading(true);
    const reader=new FileReader();
    reader.onload=async(ev)=>{
      const r=await db.post("documents",{id:"doc-"+Date.now(),home_id:home.id,label:form.label,system:form.system,doc_type:form.type,filename:file.name,size:file.size,data_url:ev.target.result});
      if(Array.isArray(r))setDocs(d=>[...r,...d]);
      setUploading(false); setForm(f=>({...f,label:""}));
    };
    reader.readAsDataURL(file);
  };

  const docIcon=(type)=>({Warranty:"W",Manual:"M",Receipt:"R",Permit:"P",Photo:"Ph"}[type]||"D");

  return <div>
    <p style={{color:G.muted,marginBottom:24,fontSize:15}}>Store warranties, manuals, receipts, and permits tied to each system.</p>
    <Card glow style={{marginBottom:28}}>
      <h3 style={{fontWeight:700,color:G.text,marginBottom:18}}>Upload Document</h3>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
        <div><label style={lbl}>Document Name</label><input style={inp} value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} placeholder="e.g. Window Warranty"/></div>
        <div><label style={lbl}>System</label><select style={inp} value={form.system} onChange={e=>setForm(f=>({...f,system:e.target.value}))}>
          {["General",...home.installations.map(i=>i.system)].map(s=><option key={s} value={s}>{s}</option>)}
        </select></div>
        <div><label style={lbl}>Type</label><select style={inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
          {["Warranty","Manual","Receipt","Permit","Photo","Other"].map(t=><option key={t} value={t}>{t}</option>)}
        </select></div>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} style={{display:"none"}}/>
      <Btn onClick={()=>form.label?fileRef.current.click():alert("Add a document name first")} disabled={uploading}>
        {uploading?"Uploading ":"Choose File to Upload"}
      </Btn>
      <span style={{color:G.muted,fontSize:12,marginLeft:16}}>PDF, image, or Word doc   Max 5MB</span>
    </Card>
    {docs.length===0?<Card><p style={{color:G.muted,textAlign:"center",padding:"20px 0"}}>No documents yet. Upload your first warranty or manual above.</p></Card>:(
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {docs.map(doc=>(
          <Card key={doc.id} style={{padding:"16px 22px"}} className="hov">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:24}}>{docIcon(doc.doc_type)}</span>
                <div><div style={{fontWeight:600,color:G.text}}>{doc.label}</div><div style={{fontSize:12,color:G.muted}}>{doc.system}   {doc.doc_type}   {doc.filename}</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <Pill color="#818cf8">{doc.doc_type}</Pill>
                {doc.data_url&&<a href={doc.data_url} download={doc.filename} style={{textDecoration:"none"}}><Btn variant="ghost" style={{padding:"6px 14px",fontSize:12}}>Download</Btn></a>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}
  </div>;
}

//    SELF-LOG                                               
function SelfLog({setView,setActiveHome}){
  const [step,setStep]=useState(1);
  const [homeData,setHomeData]=useState({ownerName:"",email:"",address:"",city:"",state:"",zip:""});
  const [systems,setSystems]=useState([]);
  const [cur,setCur]=useState({system:"Windows",brand:"",installDate:"",warranty:"",known:"yes"});
  const [saving,setSaving]=useState(false); const [done,setDone]=useState(null);

  const setH=(k,v)=>setHomeData(f=>({...f,[k]:v}));
  const setC=(k,v)=>setCur(f=>({...f,[k]:v}));

  const addSys=()=>{
    if(!cur.system)return;
    setSystems(s=>[...s,{...cur,id:"s"+Date.now()}]);
    const next=Object.keys(SYSTEMS).find(k=>![...systems.map(x=>x.system),cur.system].includes(k))||"Windows";
    setCur({system:next,brand:"",installDate:"",warranty:"",known:"yes"});
  };

  const normalizeDate=(val)=>{
    if(!val) return null;
    const s=String(val).trim();
    if(/^\d{4}$/.test(s)) return `${s}-06-01`;
    if(/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return null;
  };

  const save=async()=>{
    if(!homeData.ownerName||!homeData.address){alert("Please fill in your name and address.");return;}
    setSaving(true);
    try{
      // Always create a fresh home record with unique ID
      const homeId="HP-"+Date.now();
      const slug=slugify(homeData.address)+"-"+Date.now();
      const homeBody={id:homeId,address:homeData.address,city:homeData.city||"",state:homeData.state||"",zip:homeData.zip||"",owner_name:homeData.ownerName,email:homeData.email||"",slug};
      const hRes=await db.post("homes",homeBody);
      const home=Array.isArray(hRes)&&hRes.length>0?hRes[0]:null;
      if(!home){setSaving(false);alert("Could not create home record. Please try again.");return;}

      // Save each system one at a time
      for(const sys of systems){
        const date=normalizeDate(sys.installDate);
        if(!date) continue;
        const instBody={
          id:`inst-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
          home_id:home.id,
          contractor_name:"Self-logged",
          system:sys.system,
          brand:sys.brand||"",
          units:null,
          install_date:date,
          warranty:sys.warranty?parseInt(sys.warranty):null,
          expected_life:SYSTEMS[sys.system]?.lifespan||15
        };
        await db.post("installations",instBody);
      }

      // Fetch what was saved
      const installs=await db.get("installations",`home_id=eq.${home.id}&select=*`);
      setDone({...home,installations:Array.isArray(installs)?installs:[]});
      setStep(3);
    }catch(err){
      console.error("Save error:",err);
      alert("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  if(step===3&&done) return <Shell setView={setView}>
    <div style={{maxWidth:580,margin:"0 auto",textAlign:"center"}}>
      <div style={{fontSize:64,marginBottom:24}}></div>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,marginBottom:16,letterSpacing:-1}}>Your HomePassport is ready.</h1>
      <p style={{color:G.muted,fontSize:17,lineHeight:1.7,marginBottom:36}}>{done.installations.length} system{done.installations.length!==1?"s":""} logged for {done.address}. You can now track replacement timelines, view maintenance tasks, and store your documents.</p>
      <Btn onClick={()=>{setActiveHome(done);setView("passport");}} style={{fontSize:17,padding:"16px 40px"}}>View My HomePassport  </Btn>
    </div>
  </Shell>;

  return <Shell setView={setView} maxWidth={660}>
    <div style={{display:"flex",gap:8,marginBottom:44,alignItems:"center"}}>
      {["Your Home","Your Systems","Done"].map((l,i)=>(
        <div key={l} style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,borderRadius:"50%",background:step>i+1?G.accent:step===i+1?G.accent:G.border,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:step>=i+1?"#fff":G.muted}}>{step>i+1?" ":i+1}</div>
          <span style={{fontSize:13,color:step===i+1?G.text:G.muted,fontWeight:step===i+1?600:400}}>{l}</span>
          {i<2&&<div style={{width:28,height:1,background:G.border}}/>}
        </div>
      ))}
    </div>

    {step===1&&<>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,marginBottom:8,letterSpacing:-1}}>Add Your Home</h1>
      <p style={{color:G.muted,marginBottom:32}}>Create a free HomePassport for your property.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Your Name *</label><input style={inp} value={homeData.ownerName} onChange={e=>setH("ownerName",e.target.value)} placeholder="Jane Smith"/></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Email</label><input style={inp} value={homeData.email} onChange={e=>setH("email",e.target.value)} placeholder="jane@email.com"/></div>
        <div style={{gridColumn:"1/-1"}}><label style={lbl}>Property Address *</label><input style={inp} value={homeData.address} onChange={e=>setH("address",e.target.value)} placeholder="123 Maple St"/></div>
        <div><label style={lbl}>City</label><input style={inp} value={homeData.city} onChange={e=>setH("city",e.target.value)} placeholder="Portland"/></div>
        <div style={{display:"flex",gap:10}}>
          <div style={{flex:"0 0 80px"}}><label style={lbl}>State</label><input style={inp} value={homeData.state} onChange={e=>setH("state",e.target.value)} placeholder="ME"/></div>
          <div style={{flex:1}}><label style={lbl}>Zip</label><input style={inp} value={homeData.zip} onChange={e=>setH("zip",e.target.value)} placeholder="04101"/></div>
        </div>
      </div>
      <Btn onClick={()=>homeData.ownerName&&homeData.address?setStep(2):null} style={{marginTop:28,width:"100%",padding:"15px"}}>Continue  -  Add Your Systems  </Btn>
    </>}

    {step===2&&<>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:900,marginBottom:8,letterSpacing:-1}}>Your Home Systems</h1>
      <p style={{color:G.muted,marginBottom:28}}>Add what you know. Estimates are fine  -  update anytime.</p>
      {systems.length>0&&<div style={{marginBottom:24,display:"flex",flexDirection:"column",gap:8}}>
        {systems.map(s=><div key={s.id} style={{background:"rgba(34,197,94,.07)",border:"1px solid rgba(34,197,94,.2)",borderRadius:12,padding:"13px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{color:G.text}}>{SYSTEMS[s.system]?.icon} <strong>{s.system}</strong>{s.brand?`   ${s.brand}`:""}{s.installDate?`   ${new Date(s.installDate).getFullYear()}`:" (year unknown)"}</span>
          <button onClick={()=>setSystems(x=>x.filter(y=>y.id!==s.id))} style={{background:"none",border:"none",color:G.muted,cursor:"pointer",fontSize:18}}> </button>
        </div>)}
      </div>}
      <Card glow>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>System</label>
            <select style={inp} value={cur.system} onChange={e=>setC("system",e.target.value)}>
              {Object.keys(SYSTEMS).map(s=><option key={s} value={s}>{SYSTEMS[s].icon} {s}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Do you know when it was installed?</label>
            <select style={inp} value={cur.known} onChange={e=>setC("known",e.target.value)}>
              <option value="yes">Yes, I know the date</option>
              <option value="approx">Approximate year only</option>
              <option value="no">No idea</option>
            </select>
          </div>
          {cur.known!=="no"&&<div><label style={lbl}>{cur.known==="approx"?"Approx. Year (e.g. 2015)":"Install Date"}</label>
            <input style={inp} type={cur.known==="approx"?"text":"date"} value={cur.known==="approx"?(cur.installDate?cur.installDate.substring(0,4):""):cur.installDate}
              onChange={e=>{
                if(cur.known==="approx"){
                  const yr=e.target.value.replace(/\D/g,"").slice(0,4);
                  setC("installDate", yr.length===4?`${yr}-06-01`:yr);
                } else {
                  setC("installDate",e.target.value);
                }
              }} placeholder={cur.known==="approx"?"e.g. 2015":""}/>
          </div>}
          <div><label style={lbl}>Brand (optional)</label><input style={inp} value={cur.brand} onChange={e=>setC("brand",e.target.value)} placeholder={cur.system==="Windows"?"Andersen":"Carrier"}/></div>
          <div><label style={lbl}>Warranty Years (optional)</label><input style={inp} type="number" value={cur.warranty} onChange={e=>setC("warranty",e.target.value)} placeholder={String(SYSTEMS[cur.system]?.lifespan||15)}/></div>
        </div>
        <Btn onClick={addSys} variant="ghost" style={{marginTop:18,width:"100%",padding:"13px"}}>+ Add This System</Btn>
      </Card>
      <div style={{marginTop:22,display:"flex",gap:12}}>
        <Btn onClick={()=>setStep(1)} variant="ghost" style={{flex:"0 0 auto"}}>  Back</Btn>
        <Btn onClick={save} disabled={saving} style={{flex:1,padding:"14px"}}>{saving?"Creating your HomePassport ":`Create HomePassport${systems.length>0?` with ${systems.length} system${systems.length!==1?"s":""}`:""}  `}</Btn>
      </div>
      <p style={{color:G.subtle,fontSize:12,marginTop:10,textAlign:"center"}}>You can add more systems after creating your passport.</p>
    </>}
  </Shell>;
}

//    CONTRACTOR PORTAL                                      
function ContractorPortal({setView}){
  const [tab,setTab]=useState("log"); const [contractors,setContractors]=useState([]);
  const [homes,setHomes]=useState([]); const [success,setSuccess]=useState(null); const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({ownerName:"",email:"",address:"",city:"",state:"",zip:"",system:"Windows",brand:"",units:"",installDate:"",warranty:"",contractorId:""});

  useEffect(()=>{ db.get("contractors","select=*").then(d=>{ if(Array.isArray(d)){setContractors(d);setForm(f=>({...f,contractorId:d[0]?.id||""}));} }); },[]);
  useEffect(()=>{ if(tab==="homes") db.get("homes","select=*&order=created_at.desc").then(d=>setHomes(Array.isArray(d)?d:[])); },[tab]);

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  const submit=async()=>{
    if(!form.ownerName||!form.address||!form.installDate||!form.brand)return;
    setSaving(true);
    const contractor=contractors.find(c=>c.id===form.contractorId);
    const existing=await db.get("homes",`slug=eq.${slugify(form.address)}&select=*`);
    let home=Array.isArray(existing)&&existing.length>0?existing[0]:null;
    if(!home){
      const r=await db.post("homes",{id:"HP-"+Date.now(),address:form.address,city:form.city,state:form.state,zip:form.zip,owner_name:form.ownerName,email:form.email,slug:slugify(form.address)});
      home=Array.isArray(r)?r[0]:null;
    }
    if(home){
      await db.post("installations",{id:"inst-"+Date.now(),home_id:home.id,contractor_name:contractor?.name||"Unknown",system:form.system,brand:form.brand,units:form.units?parseInt(form.units):null,install_date:form.installDate,warranty:form.warranty?parseInt(form.warranty):null,expected_life:SYSTEMS[form.system]?.lifespan||15});
      setSuccess({url:`${window.location.origin}/?home=${home.slug||home.id}`,address:form.address});
    }
    setForm({ownerName:"",email:"",address:"",city:"",state:"ME",zip:"",system:"Windows",brand:"",units:"",installDate:"",warranty:"",contractorId:contractors[0]?.id||""});
    setSaving(false);
  };

  return <Shell setView={setView}>
    <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:40,fontWeight:900,marginBottom:32,letterSpacing:-1}}>Contractor Portal</h1>
    <div style={{display:"flex",gap:8,marginBottom:32}}>
      {[["log","Log Install"],["homes","All Homes"]].map(([t,l])=>(
        <button key={t} className="tab" onClick={()=>setTab(t)} style={{padding:"11px 26px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:14,background:tab===t?G.accent:"rgba(99,102,241,.1)",color:tab===t?"#fff":"#818cf8"}}>{l}</button>
      ))}
    </div>

    {tab==="log"&&<div style={{maxWidth:640}}>
      {success&&<div style={{background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.25)",borderRadius:14,padding:"20px 24px",marginBottom:28}}>
        <div style={{color:"#86efac",fontWeight:700,marginBottom:8}}>  Install logged  -  HomePassport created!</div>
        <div style={{color:G.muted,fontSize:14,marginBottom:10}}>Send this link to your customer at {success.address}:</div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <code style={{color:"#818cf8",fontSize:13,flex:1,wordBreak:"break-all"}}>{success.url}</code>
          <Btn onClick={()=>navigator.clipboard.writeText(success.url)} variant="ghost" style={{padding:"7px 14px",fontSize:12}}>Copy</Btn>
        </div>
      </div>}
      <Card glow>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Your Company</label><select style={inp} value={form.contractorId} onChange={e=>set("contractorId",e.target.value)}>{contractors.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label style={lbl}>Customer Name *</label><input style={inp} value={form.ownerName} onChange={e=>set("ownerName",e.target.value)} placeholder="Jane Smith"/></div>
          <div><label style={lbl}>Customer Email</label><input style={inp} value={form.email} onChange={e=>set("email",e.target.value)} placeholder="jane@email.com"/></div>
          <div style={{gridColumn:"1/-1"}}><label style={lbl}>Property Address *</label><input style={inp} value={form.address} onChange={e=>set("address",e.target.value)} placeholder="123 Maple St"/></div>
          <div><label style={lbl}>City</label><input style={inp} value={form.city} onChange={e=>set("city",e.target.value)} placeholder="Portland"/></div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:"0 0 80px"}}><label style={lbl}>State</label><input style={inp} value={form.state} onChange={e=>set("state",e.target.value)} placeholder="ME"/></div>
            <div style={{flex:1}}><label style={lbl}>Zip</label><input style={inp} value={form.zip} onChange={e=>set("zip",e.target.value)} placeholder="04101"/></div>
          </div>
          <div><label style={lbl}>System *</label><select style={inp} value={form.system} onChange={e=>set("system",e.target.value)}>{Object.keys(SYSTEMS).map(s=><option key={s} value={s}>{SYSTEMS[s].icon} {s}</option>)}</select></div>
          <div><label style={lbl}>Brand *</label><input style={inp} value={form.brand} onChange={e=>set("brand",e.target.value)} placeholder={form.system==="Windows"?"Andersen":"Carrier"}/></div>
          {form.system==="Windows"&&<div><label style={lbl}>Units Installed</label><input style={inp} type="number" value={form.units} onChange={e=>set("units",e.target.value)} placeholder="12"/></div>}
          <div><label style={lbl}>Install Date *</label><input style={inp} type="date" value={form.installDate} onChange={e=>set("installDate",e.target.value)}/></div>
          <div><label style={lbl}>Warranty (years)</label><input style={inp} type="number" value={form.warranty} onChange={e=>set("warranty",e.target.value)} placeholder={String(SYSTEMS[form.system]?.lifespan||15)}/></div>
        </div>
        <Btn onClick={submit} disabled={saving} style={{marginTop:26,width:"100%",padding:"15px",fontSize:16}}>{saving?"Saving ":"Log Install   Create HomePassport"}</Btn>
      </Card>
    </div>}

    {tab==="homes"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {homes.length===0&&<Card><p style={{color:G.muted}}>No homes logged yet.</p></Card>}
      {homes.map(h=><Card key={h.id} className="hov" style={{padding:"18px 24px"}}>
        <div style={{fontWeight:700,color:G.text}}>{h.address}</div>
        <div style={{color:G.muted,fontSize:13,marginTop:4}}>{h.city}, {h.state}   {h.owner_name}   {h.id}</div>
      </Card>)}
    </div>}
  </Shell>;
}

//    ROOT                                                   
export default function App(){
  const [view,setView]=useState("landing"); const [activeHome,setActiveHome]=useState(null);
  const [stats,setStats]=useState({homes:0,installs:0,contractors:0});

  useEffect(()=>{
    Promise.all([db.get("homes","select=id"),db.get("installations","select=id"),db.get("contractors","select=id")])
      .then(([h,i,c])=>setStats({homes:Array.isArray(h)?h.length:0,installs:Array.isArray(i)?i.length:0,contractors:Array.isArray(c)?c.length:0}));
  },[view]);

  if(view==="landing")    return <Landing setView={setView} stats={stats}/>;
  if(view==="lookup")     return <Lookup setView={setView} setActiveHome={setActiveHome}/>;
  if(view==="passport"&&activeHome) return <Passport home={activeHome} setView={setView}/>;
  if(view==="contractor") return <ContractorPortal setView={setView}/>;
  if(view==="self-log")   return <SelfLog setView={setView} setActiveHome={setActiveHome}/>;
  return <Landing setView={setView} stats={stats}/>;
}
