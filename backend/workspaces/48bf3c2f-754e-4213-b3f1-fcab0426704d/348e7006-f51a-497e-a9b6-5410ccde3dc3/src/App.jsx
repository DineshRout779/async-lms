import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1>Hello, React!</h1>
      <p>Edit <code>src/App.jsx</code> to get started.</p>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', cursor: 'pointer' }}
      >
        Count: {count}
      </button>
    </div>
  )
}
