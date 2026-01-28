# Introduction to React Hooks

Hooks are a new addition in React 16.8. They let you use state and other React features without writing a class.

## Why Hooks?

Hooks solve a wide variety of seemingly unconnected problems in React that we’ve encountered over five years of writing and maintaining tens of thousands of components.

### 1. The `useState` Hook

`useState` is a Hook that lets you add React state to function components.

```javascript
import React, { useState } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
    </div>
  );
}
```
