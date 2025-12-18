import { useSyncExternalStore } from 'react';

// --- Types ---
export type State = Record<string | number | symbol, any>;
export type PartialState<T> = Partial<T> | ((state: T) => Partial<T>);
export type Listener<T> = (state: T, prevState: T) => void;
export type StateCreator<T> = (
  set: (updater: PartialState<T>, replace?: boolean) => void,
  get: () => T,
  api: StoreApi<T>
) => T;

export interface StoreApi<T> {
  getState: () => T;
  setState: (updater: PartialState<T>, replace?: boolean) => void;
  subscribe: (listener: Listener<T>) => () => void;
  destroy: () => void;
  dispatch?: (action: any) => void;
}

// --- Vanilla Core ---
export const createStore = <T extends State>(createState: StateCreator<T>): StoreApi<T> => {
  let state: T;
  const listeners = new Set<Listener<T>>();

  const setState: StoreApi<T>['setState'] = (updater, replace) => {
    const nextState = typeof updater === 'function' ? (updater as Function)(state) : updater;
    
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = replace ? (nextState as T) : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };

  const getState = () => state;
  const subscribe = (listener: Listener<T>) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const destroy = () => listeners.clear();

  const api = { setState, getState, subscribe, destroy };
  state = createState(setState, getState, api);

  return api;
};

// --- React Integration ---
export const create = <T extends State>(createState: StateCreator<T>) => {
  const api = createStore(createState);

  const useStore = <U>(selector: (state: T) => U = (s) => s as any): U => {
    return useSyncExternalStore(
      api.subscribe,
      () => selector(api.getState()),
      () => selector(api.getState()) // SSR handle
    );
  };

  return Object.assign(useStore, api);
};

// --- Middlewares ---

/**
 * Persist middleware for LocalStorage synchronization
 */
export const persist = <T extends State>(
  config: StateCreator<T>,
  options: { name: string; storage?: Storage }
) => {
  const storage = options.storage || (typeof window !== 'undefined' ? window.localStorage : null);
  
  return (set: any, get: any, api: any): T => {
    const initialState = config(
      (updater: any, replace: any) => {
        set(updater, replace);
        if (storage) storage.setItem(options.name, JSON.stringify(get()));
      },
      get,
      api
    );

    // Hydrate
    if (storage) {
      const saved = storage.getItem(options.name);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Use timeout to ensure hydration happens after initial render cycle if needed
          setTimeout(() => set(parsed, true), 0);
        } catch (e) {
          console.error("zflux: failed to hydrate", e);
        }
      }
    }

    return initialState;
  };
};

/**
 * Redux middleware for Dispatch/Reducer patterns
 */
export const redux = <T extends State>(
  reducer: (state: T, action: any) => T,
  initialState: T
) => {
  return (set: any, get: any, api: any): T & { dispatch: (action: any) => void } => {
    api.dispatch = (action: any) => {
      set((state: T) => reducer(state, action), true);
    };
    return { ...initialState, dispatch: api.dispatch };
  };
};

/**
 * Devtools middleware (Simple console logger version)
 */
export const logger = <T extends State>(config: StateCreator<T>) => {
  return (set: any, get: any, api: any): T => {
    const loggedSet: typeof set = (updater: any, replace: any) => {
      console.log("  prev state", get());
      set(updater, replace);
      console.log("  next state", get());
    };
    return config(loggedSet, get, api);
  };
};