# zflux ⚡

A powerful, small, fast, and scalable state management solution using simplified Flux principles.

## Features

*   **Tiny Footprint**: < 1kb gzipped.
    
*   **High Performance**: Atomic updates via selectors to prevent unnecessary re-renders.
    
*   **Middleware Support**: Built-in `persist` and `redux` (reducer) support.
    
*   **React-Native Compatible**: Works anywhere JS runs.
    
*   **No Providers**: Zero context-provider nesting.
    

## Installation

```
npm install zflux
```

## Quick Start (Vanilla React)

```
import { create } from 'zflux';

const useStore = create((set) => ({
  count: 0,
  inc: () => set((state) => ({ count: state.count + 1 })),
}));

function Counter() {
  const count = useStore((state) => state.count);
  const inc = useStore((state) => state.inc);
  return <button onClick={inc}>{count}</button>;
}
```

## Advanced: Redux & Persist

```
import { create, redux, persist } from 'zflux';

const reducer = (state, action) => {
  if (action.type === 'ADD') return { count: state.count + 1 };
  return state;
};

const useStore = create(
  persist(
    redux(reducer, { count: 0 }),
    { name: 'my-storage' }
  )
);

function App() {
  const count = useStore(s => s.count);
  const dispatch = useStore(s => s.dispatch);
  // ...
}
```