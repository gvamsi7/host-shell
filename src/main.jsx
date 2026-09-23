import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const css = `
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:#07101f;color:#edf3ff}
button{font:inherit}.app{min-height:100vh}.top{height:64px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #22304b;background:#0a1426}
.brand{font-weight:800;letter-spacing:.06em;cursor:pointer}.sub{color:#8292ad;font-size:12px}.page{max-width:1180px;margin:auto;padding:32px 24px}.hero{margin:18px 0 28px}
.hero h1{font-size:42px;margin:8px 0}.hero p{color:#95a4bd;max-width:700px;line-height:1.6}.tag{font-size:11px;color:#7ca0ff;text-transform:uppercase;letter-spacing:.14em;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{border:1px solid #263654;border-radius:18px;padding:20px;background:#0d1930;min-height:210px;display:flex;flex-direction:column;justify-content:space-between}
.card h2{margin:12px 0 8px}.card p{color:#91a0ba;line-height:1.5}.id{font:12px ui-monospace,monospace;color:#7384a2}.btn{border:0;border-radius:10px;padding:11px 14px;cursor:pointer;font-weight:800;background:#eef4ff;color:#07101f}
.btn:disabled{opacity:.45;cursor:not-allowed}.back{background:#172744;color:#d9e4f8;border:1px solid #31476e;margin-bottom:18px}.error{color:#ff9aaa;font-size:12px;margin-top:8px}.mount{min-height:520px}
.toast-wrap{position:fixed;right:20px;bottom:20px;display:grid;gap:10px}.toast{width:320px;max-width:calc(100vw - 40px);padding:13px 14px;border:1px solid #31476e;border-radius:12px;background:#101d34;box-shadow:0 15px 40px #0008}.toast span{display:block;color:#9aabc6;font-size:12px;margin-top:4px}
@media(max-width:800px){.grid{grid-template-columns:1fr}.hero h1{font-size:34px}}
`

const style = document.createElement('style')
style.textContent = css
document.head.appendChild(style)

window.__REMOTE_OFFERS__ = window.__REMOTE_OFFERS__ || {}
const remoteLoads = new Map()

function routeOfferId() {
  const match = window.location.pathname.match(/^\/offers\/([^/]+)\/?$/)
  return match ? decodeURIComponent(match[1]) : null
}

function navigate(path) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
}

async function getManifest() {
  const url = window.__OFFER_MANIFEST_URL__ || '/offers.manifest.json'
  const response = await fetch(url, { cache: 'no-store' })

  if (!response.ok) {
    throw new Error('Unable to load offer manifest: ' + response.status)
  }

  const payload = await response.json()

  if (!Array.isArray(payload?.offers)) {
    throw new Error('Manifest must contain offers[]')
  }

  return payload.offers
}

function loadRemote(entry) {
  if (window.__REMOTE_OFFERS__[entry.id]) {
    return Promise.resolve(window.__REMOTE_OFFERS__[entry.id])
  }

  if (remoteLoads.has(entry.id)) {
    return remoteLoads.get(entry.id)
  }

  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = entry.remoteUrl
    script.async = true
    script.dataset.remoteOffer = entry.id

    script.onload = () => {
      const remote = window.__REMOTE_OFFERS__[entry.id]

      if (!remote?.config || typeof remote.mount !== 'function') {
        reject(new Error(entry.id + ' did not register config + mount()'))
        return
      }

      resolve(remote)
    }

    script.onerror = () => reject(new Error('Unable to load ' + entry.remoteUrl))
    document.head.appendChild(script)
  }).finally(() => remoteLoads.delete(entry.id))

  remoteLoads.set(entry.id, promise)
  return promise
}

function MountedOffer({ entry, remote, notify }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return undefined

    const instance = remote.mount({
      element: ref.current,
      route: entry.route,
      host: {
        shellName: 'host-shell',
        notify,
        navigate,
        navigateHome: () => navigate('/'),
      },
    })

    return () => {
      instance?.unmount?.()
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [entry.id, remote])

  return (
    <main className="page">
      <button className="btn back" onClick={() => navigate('/')}>← All offers</button>
      <div className="tag">{entry.route} · {entry.remoteUrl}</div>
      <h1>{remote.config.name}</h1>
      <div ref={ref} className="mount" />
    </main>
  )
}

function App() {
  const [entries, setEntries] = useState([])
  const [remotes, setRemotes] = useState({})
  const [errors, setErrors] = useState({})
  const [activeId, setActiveId] = useState(routeOfferId)
  const [loading, setLoading] = useState(true)
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const syncRoute = () => setActiveId(routeOfferId())
    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  useEffect(() => {
    let alive = true

    getManifest()
      .then(async (manifest) => {
        if (!alive) return
        setEntries(manifest)

        const results = await Promise.all(
          manifest.map(async (entry) => {
            try {
              return { id: entry.id, remote: await loadRemote(entry) }
            } catch (error) {
              return { id: entry.id, error: error.message }
            }
          }),
        )

        if (!alive) return

        const nextRemotes = {}
        const nextErrors = {}

        results.forEach((item) => {
          if (item.remote) nextRemotes[item.id] = item.remote
          if (item.error) nextErrors[item.id] = item.error
        })

        setRemotes(nextRemotes)
        setErrors(nextErrors)
      })
      .catch((error) => alive && setErrors({ manifest: error.message }))
      .finally(() => alive && setLoading(false))

    return () => {
      alive = false
    }
  }, [])

  const notify = (title, message) => {
    const id = Date.now() + Math.random()

    setToasts((items) => [...items.slice(-2), { id, title, message }])

    window.setTimeout(() => {
      setToasts((items) => items.filter((item) => item.id !== id))
    }, 3500)
  }

  const activeEntry = entries.find((entry) => entry.id === activeId)
  const activeRemote = activeEntry ? remotes[activeEntry.id] : null

  const openOffer = (entry) => {
    navigate(entry.route || '/offers/' + entry.id)
  }

  return (
    <div className="app">
      <header className="top">
        <div onClick={() => navigate('/')}>
          <div className="brand">HOST / SHELL</div>
          <div className="sub">Webpack · one port · route-based offers</div>
        </div>
        <div className="sub">http://localhost:3000</div>
      </header>

      {activeEntry && activeRemote ? (
        <MountedOffer
          entry={activeEntry}
          remote={activeRemote}
          notify={notify}
        />
      ) : activeId && !loading ? (
        <main className="page">
          <button className="btn back" onClick={() => navigate('/')}>← Home</button>
          <div className="error">
            {errors[activeId] || 'Unknown offer route: /offers/' + activeId}
          </div>
        </main>
      ) : (
        <main className="page">
          <section className="hero">
            <div className="tag">Independent repositories · one host port</div>
            <h1>Runtime Offer Registry</h1>
            <p>
              Payments, Trading and Analytics are independent repositories,
              but the browser stays on the Shell origin. Opening an offer changes
              only the Shell route.
            </p>
          </section>

          {loading && <p className="sub">Loading offers.manifest.json…</p>}
          {errors.manifest && <p className="error">{errors.manifest}</p>}

          <section className="grid">
            {entries.map((entry) => {
              const remote = remotes[entry.id]

              return (
                <article className="card" key={entry.id}>
                  <div>
                    <div className="id">{entry.route}</div>
                    <h2>{remote?.config?.name || entry.id}</h2>
                    <p>{remote?.config?.description || 'Independent runtime offer.'}</p>
                    <div className="sub">{entry.remoteUrl}</div>
                    {errors[entry.id] && <div className="error">{errors[entry.id]}</div>}
                  </div>

                  <button
                    className="btn"
                    disabled={!remote}
                    onClick={() => openOffer(entry)}
                  >
                    {remote ? 'Open offer' : 'Remote unavailable'}
                  </button>
                </article>
              )
            })}
          </section>
        </main>
      )}

      <div className="toast-wrap">
        {toasts.map((toast) => (
          <div className="toast" key={toast.id}>
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
