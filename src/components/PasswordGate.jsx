import { useState } from 'react'

const SESSION_KEY = 'at_auth'
const PASSWORD    = '4400'

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === '1'
}

export default function PasswordGate({ children }) {
  const [authed, setAuthed]   = useState(isAuthenticated)
  const [value, setValue]     = useState('')
  const [error, setError]     = useState(false)
  const [shake, setShake]     = useState(false)

  if (authed) return children

  function attempt(e) {
    e.preventDefault()
    if (value === PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
    } else {
      setError(true)
      setShake(true)
      setValue('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4" dir="rtl">
      <div className={`bg-white rounded-3xl shadow-lg border border-stone-200 p-8 w-full max-w-xs text-center transition-all ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
        <div className="text-4xl mb-4">🍴</div>
        <h1 className="font-bold text-stone-800 text-xl mb-1">After Taste</h1>
        <p className="text-stone-400 text-sm mb-6">הכנס סיסמה כדי להמשיך</p>

        <form onSubmit={attempt} className="space-y-3">
          <input
            type="password"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false) }}
            placeholder="סיסמה"
            autoFocus
            inputMode="numeric"
            className={`w-full border rounded-xl px-4 py-3 text-center text-lg tracking-widest focus:outline-none transition-colors
              ${error
                ? 'border-red-300 bg-red-50 focus:border-red-400'
                : 'border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'}`}
          />
          {error && (
            <p className="text-red-500 text-sm">סיסמה שגויה, נסה שוב</p>
          )}
          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl py-3 font-medium transition-colors"
          >
            כניסה
          </button>
        </form>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
