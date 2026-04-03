import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'

const CATS = [
  { id:'food',          label:'Food & Dining',    color:'#10b981' },
  { id:'transport',     label:'Transport',         color:'#60a5fa' },
  { id:'entertainment', label:'Entertainment',     color:'#a78bfa' },
  { id:'shopping',      label:'Shopping',          color:'#f59e0b' },
  { id:'health',        label:'Health',            color:'#f87171' },
  { id:'bills',         label:'Bills & Utilities', color:'#34d399' },
  { id:'other',         label:'Other',             color:'#94a3b8' },
]
const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]))
const fmt  = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtD = d => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })

export default function App() {
  const [session,  setSession]  = useState(null)
  const [expenses, setExpenses] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [view,     setView]     = useState('dashboard')
  const [modal,    setModal]    = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [filterCat,   setFilterCat]   = useState('')
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0,7))
  const [search,   setSearch]   = useState('')
  const [form, setForm] = useState({ amount:'', category:'food', description:'', date: new Date().toISOString().slice(0,10) })
  const [toast, setToast] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_e, session) => setSession(session))
  }, [])

  useEffect(() => {
    if (!session) return
    setLoading(true)
    supabase.from('expenses').select('*').order('date', { ascending: false })
      .then(({ data }) => { setExpenses(data || []); setLoading(false) })
  }, [session])

  const flash = msg => { setToast(msg); setTimeout(() => setToast(''), 2200) }

  const openAdd = () => {
    setEditing(null)
    setForm({ amount:'', category:'food', description:'', date: new Date().toISOString().slice(0,10) })
    setModal(true)
  }
  const openEdit = e => {
    setEditing(e)
    setForm({ amount: String(e.amount), category: e.category, description: e.description, date: e.date })
    setModal(true)
  }

  const handleSubmit = async () => {
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) return
    const payload = {
      amount: +parseFloat(form.amount).toFixed(2),
      category: form.category,
      description: form.description.trim() || CAT_MAP[form.category]?.label,
      date: form.date,
      user_id: session.user.id,
    }
    if (editing) {
      const { data } = await supabase.from('expenses').update(payload).eq('id', editing.id).select()
      setExpenses(prev => prev.map(e => e.id === editing.id ? data[0] : e))
      flash('Expense updated ✓')
    } else {
      const { data } = await supabase.from('expenses').insert(payload).select()
      setExpenses(prev => [data[0], ...prev])
      flash('Expense added ✓')
    }
    setModal(false)
  }

  const handleDelete = async id => {
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
    flash('Deleted')
  }

  const handleLogout = () => supabase.auth.signOut()

  if (!session) return <Auth />

  const monthExps  = expenses.filter(e => e.date.startsWith(filterMonth))
  const monthTotal = monthExps.reduce((s,e) => s + e.amount, 0)
  const catTotals  = CATS.map(c => ({ ...c, value: monthExps.filter(e=>e.category===c.id).reduce((s,e)=>s+e.amount,0) })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value)
  const filtered   = expenses.filter(e => (!filterCat||e.category===filterCat) && e.date.startsWith(filterMonth) && (!search||e.description?.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date))

  const s = {
    app:   { minHeight:'100vh', background:'#0a0f1e', color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif" },
    hdr:   { background:'#0d1424', borderBottom:'1px solid #1e293b', padding:'0 20px', display:'flex', alignItems:'center', gap:'10px', height:'58px', position:'sticky', top:0, zIndex:50 },
    logo:  { fontSize:'17px', fontWeight:'700', color:'#10b981', letterSpacing:'-0.3px', marginRight:'auto', fontFamily:'Georgia,serif' },
    navBtn:a => ({ background: a?'#10b981':'transparent', color: a?'#fff':'#64748b', border:'none', borderRadius:'8px', padding:'6px 15px', cursor:'pointer', fontSize:'13px', fontWeight:'500' }),
    addBtn:{ background:'#10b981', color:'#fff', border:'none', borderRadius:'9px', padding:'8px 18px', cursor:'pointer', fontSize:'13px', fontWeight:'600' },
    main:  { maxWidth:'920px', margin:'0 auto', padding:'20px 16px 40px' },
    card:  { background:'#0d1424', borderRadius:'14px', padding:'20px', border:'1px solid #1e293b', marginBottom:'16px' },
    row:   { display:'flex', alignItems:'center', gap:'12px', padding:'10px 0', borderBottom:'1px solid #1e293b' },
    input: { width:'100%', background:'#111827', border:'1px solid #1e293b', borderRadius:'8px', padding:'9px 12px', color:'#f1f5f9', fontSize:'14px', boxSizing:'border-box', fontFamily:'inherit', outline:'none' },
    lbl:   { fontSize:'11px', color:'#64748b', display:'block', marginBottom:'4px', fontWeight:'500' },
  }

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap'); input[type=month],input[type=date],select{color-scheme:dark}`}</style>
      <div style={s.app}>
        <header style={s.hdr}>
          <div style={s.logo}>₹ Expenso</div>
          <button style={s.navBtn(view==='dashboard')} onClick={()=>setView('dashboard')}>Dashboard</button>
          <button style={s.navBtn(view==='expenses')}  onClick={()=>setView('expenses')}>All Expenses</button>
          <input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}
            style={{ ...s.input, width:'140px', fontSize:'12px' }} />
          <button style={s.addBtn} onClick={openAdd}>+ Add</button>
          <button onClick={handleLogout}
            style={{ background:'none', border:'1px solid #1e293b', borderRadius:'8px', padding:'6px 12px', color:'#475569', cursor:'pointer', fontSize:'12px' }}>
            Logout
          </button>
        </header>

        <main style={s.main}>
          {loading ? (
            <div style={{ textAlign:'center', color:'#334155', padding:'60px' }}>Loading your expenses…</div>
          ) : view === 'dashboard' ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'16px' }}>
                {[
                  { l:'Month Total',   v: fmt(monthTotal) },
                  { l:'Transactions',  v: monthExps.length },
                  { l:'Top Category',  v: catTotals[0]?.label?.split(' ')[0] || '—' },
                ].map((c,i) => (
                  <div key={i} style={{ ...s.card, marginBottom:0 }}>
                    <div style={{ fontSize:'10px', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px' }}>{c.l}</div>
                    <div style={{ fontSize:'21px', fontWeight:'600', fontFamily:"'DM Mono',monospace", color:'#f1f5f9' }}>{c.v}</div>
                  </div>
                ))}
              </div>
              <div style={s.card}>
                <div style={{ fontSize:'11px', fontWeight:'600', color:'#475569', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'14px' }}>Recent Transactions</div>
                {monthExps.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'36px 0' }}>
                    <div style={{ color:'#334155', fontSize:'14px', marginBottom:'16px' }}>No expenses this month</div>
                    <button style={s.addBtn} onClick={openAdd}>Add first expense</button>
                  </div>
                ) : [...monthExps].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(e => {
                  const cat = CAT_MAP[e.category] || CATS[6]
                  return (
                    <div key={e.id} style={s.row}>
                      <div style={{ width:'34px',height:'34px',borderRadius:'9px',background:cat.color+'1a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                        <div style={{ width:'8px',height:'8px',borderRadius:'50%',background:cat.color }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:'13px',color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{e.description}</div>
                        <div style={{ fontSize:'11px',color:'#475569' }}>{cat.label} · {fmtD(e.date)}</div>
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:'14px',fontWeight:'600',color:'#f87171' }}>{fmt(e.amount)}</div>
                    </div>
                  )
                })}
              </div>
              {catTotals.length > 0 && (
                <div style={s.card}>
                  <div style={{ fontSize:'11px',fontWeight:'600',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:'14px' }}>By Category</div>
                  {catTotals.map(c => (
                    <div key={c.id} style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px' }}>
                      <div style={{ width:'8px',height:'8px',borderRadius:'50%',background:c.color,flexShrink:0 }} />
                      <div style={{ flex:1,fontSize:'13px',color:'#94a3b8' }}>{c.label}</div>
                      <div style={{ width:'120px',height:'6px',background:'#1e293b',borderRadius:'4px',overflow:'hidden' }}>
                        <div style={{ height:'100%',background:c.color,width:`${(c.value/monthTotal*100).toFixed(0)}%`,borderRadius:'4px' }} />
                      </div>
                      <div style={{ fontFamily:"'DM Mono',monospace",fontSize:'12px',color:'#e2e8f0',width:'64px',textAlign:'right' }}>{fmt(c.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={s.card}>
              <div style={{ display:'flex',gap:'10px',marginBottom:'18px',flexWrap:'wrap' }}>
                <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...s.input,flex:1,minWidth:'160px' }} />
                <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} style={{ ...s.input,width:'170px',cursor:'pointer' }}>
                  <option value="">All categories</option>
                  {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px' }}>
                <div style={{ fontSize:'11px',fontWeight:'600',color:'#475569',textTransform:'uppercase',letterSpacing:'0.1em' }}>{filtered.length} transactions</div>
                <div style={{ fontFamily:"'DM Mono',monospace",fontSize:'14px',color:'#10b981',fontWeight:'600' }}>{fmt(filtered.reduce((s,e)=>s+e.amount,0))}</div>
              </div>
              {filtered.map(e => {
                const cat = CAT_MAP[e.category] || CATS[6]
                return (
                  <div key={e.id} style={s.row}>
                    <div style={{ width:'34px',height:'34px',borderRadius:'9px',background:cat.color+'1a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                      <div style={{ width:'8px',height:'8px',borderRadius:'50%',background:cat.color }} />
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:'13px',color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{e.description}</div>
                      <div style={{ fontSize:'11px',color:'#475569' }}>{cat.label} · {fmtD(e.date)}</div>
                    </div>
                    <div style={{ fontFamily:"'DM Mono',monospace",fontSize:'14px',fontWeight:'600',color:'#f87171',flexShrink:0,marginRight:'4px' }}>{fmt(e.amount)}</div>
                    <button onClick={()=>openEdit(e)} style={{ background:'none',border:'1px solid #1e3a2f',borderRadius:'6px',cursor:'pointer',color:'#10b981',fontSize:'12px',padding:'4px 10px' }}>Edit</button>
                    <button onClick={()=>handleDelete(e.id)} style={{ background:'none',border:'none',cursor:'pointer',color:'#374151',fontSize:'16px',padding:'4px 6px',lineHeight:1 }}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </main>

        {/* ── Footer ── */}
        <footer style={{ borderTop:'1px solid #1e293b', padding:'24px 20px', textAlign:'center' }}>
          <p style={{ margin:'0 0 12px', fontSize:'13px', color:'#475569' }}>
            Designed & Developed by{' '}
            <span style={{ color:'#10b981', fontWeight:'600' }}>Chandru SK</span>
            {' '}· B.Tech CSE
          </p>
          <a
            href="https://www.linkedin.com/in/chandru-sk-999077384/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display:'inline-flex', alignItems:'center', gap:'7px', textDecoration:'none',
              background:'#0a66c2', color:'#fff', padding:'8px 18px',
              borderRadius:'8px', fontSize:'13px', fontWeight:'600' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Connect on LinkedIn
          </a>
        </footer>

      </div>

      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,padding:'16px' }}
          onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div style={{ background:'#0d1424',borderRadius:'18px',padding:'28px 24px',width:'400px',maxWidth:'100%',border:'1px solid #1e293b' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'22px' }}>
              <h2 style={{ margin:0,fontSize:'17px',fontWeight:'600',fontFamily:'Georgia,serif' }}>{editing?'Edit Expense':'New Expense'}</h2>
              <button onClick={()=>setModal(false)} style={{ background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'22px',lineHeight:1 }}>×</button>
            </div>
            <label style={s.lbl}>Amount (₹) *</label>
            <input type="number" min="0" step="0.01" placeholder="0.00" value={form.amount}
              onChange={e=>setForm(f=>({...f,amount:e.target.value}))}
              style={{ ...s.input,marginBottom:'14px',fontFamily:"'DM Mono',monospace",fontSize:'20px',fontWeight:'600' }} autoFocus />
            <label style={s.lbl}>Category</label>
            <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}
              style={{ ...s.input,marginBottom:'14px',cursor:'pointer' }}>
              {CATS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <label style={s.lbl}>Description</label>
            <input type="text" placeholder="What did you spend on?" value={form.description}
              onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              style={{ ...s.input,marginBottom:'14px' }} />
            <label style={s.lbl}>Date</label>
            <input type="date" value={form.date}
              onChange={e=>setForm(f=>({...f,date:e.target.value}))}
              style={{ ...s.input,marginBottom:'22px' }} />
            <div style={{ display:'flex',gap:'10px' }}>
              <button onClick={()=>setModal(false)} style={{ flex:1,background:'#1e293b',border:'none',borderRadius:'10px',padding:'11px',color:'#94a3b8',cursor:'pointer',fontSize:'14px' }}>Cancel</button>
              <button onClick={handleSubmit} style={{ flex:1,background:'#10b981',border:'none',borderRadius:'10px',padding:'11px',color:'#fff',cursor:'pointer',fontSize:'14px',fontWeight:'600' }}>{editing?'Update':'Add Expense'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed',bottom:'24px',left:'50%',transform:'translateX(-50%)',background:'#10b981',color:'#fff',padding:'10px 22px',borderRadius:'30px',fontSize:'13px',fontWeight:'500',zIndex:200 }}>
          {toast}
        </div>
      )}
    </>
  )
}