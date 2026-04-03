import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin]   = useState(true)
  const [msg, setMsg]           = useState('')
  const [loading, setLoading]   = useState(false)

  const handle = async () => {
    setLoading(true); setMsg('')
    const fn = isLogin
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password })
    const { error } = await fn
    if (error) setMsg('❌ ' + error.message)
    else if (!isLogin) setMsg('✅ Account created! You can now log in.')
    setLoading(false)
  }

  const inp = { width:'100%', padding:'10px 12px', background:'#111827',
    border:'1px solid #1e293b', borderRadius:'8px', color:'#f1f5f9',
    fontSize:'14px', boxSizing:'border-box', marginBottom:'12px', fontFamily:'inherit', outline:'none' }

  return (
    <div style={{ minHeight:'100vh', background:'#0a0f1e', display:'flex',
      alignItems:'center', justifyContent:'center', fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ background:'#0d1424', border:'1px solid #1e293b',
        borderRadius:'18px', padding:'36px 32px', width:'360px' }}>
        <div style={{ fontSize:'22px', fontWeight:'700', color:'#10b981',
          fontFamily:'Georgia,serif', marginBottom:'6px' }}>₹ Expenso</div>
        <div style={{ color:'#475569', fontSize:'13px', marginBottom:'28px' }}>
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </div>

        <label style={{ fontSize:'11px', color:'#64748b', display:'block', marginBottom:'4px' }}>Email</label>
        <input type="email" placeholder="you@example.com" value={email}
          onChange={e => setEmail(e.target.value)} style={inp} />

        <label style={{ fontSize:'11px', color:'#64748b', display:'block', marginBottom:'4px' }}>Password</label>
        <input type="password" placeholder="••••••••" value={password}
          onChange={e => setPassword(e.target.value)} style={inp}
          onKeyDown={e => e.key === 'Enter' && handle()} />

        {msg && <div style={{ fontSize:'13px', marginBottom:'12px', color: msg.startsWith('✅') ? '#10b981' : '#f87171' }}>{msg}</div>}

        <button onClick={handle} disabled={loading}
          style={{ width:'100%', background:'#10b981', border:'none', borderRadius:'10px',
            padding:'12px', color:'#fff', fontSize:'14px', fontWeight:'600', cursor:'pointer', marginBottom:'14px' }}>
          {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{ textAlign:'center', fontSize:'13px', color:'#475569' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setIsLogin(!isLogin); setMsg('') }}
            style={{ color:'#10b981', cursor:'pointer' }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  )
}