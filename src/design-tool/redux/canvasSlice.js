import { createSlice } from '@reduxjs/toolkit';

const MAX_HISTORY = 50;

const initialState = {
  past: [],
  present: [],
  future: [],
  clipboard: [],
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    // 1. Initial Load (Used when fetching from DB or first initializing)
    setCanvasObjects: (state, action) => {
      state.present = action.payload; // Just set the present, don't flood history
      state.past = [];
      state.future = [];
    },

   // 2. THE DELTA ENGINE (Now supports Batching!)
    dispatchDelta: (state, action) => {
      const payload = action.payload;
      
      // Save the exact payload to history (whether it's a single object or an Array)
      state.past.push(payload);
      if (state.past.length > MAX_HISTORY) state.past.shift();

      // Convert to array to process uniformly
      const deltas = Array.isArray(payload) ? payload : [payload];

      deltas.forEach(delta => {
        if (delta.type === 'UPDATE') {
          const objIndex = state.present.findIndex(o => o.id === delta.targetId);
          if (objIndex !== -1) {
            state.present[objIndex].props = { ...state.present[objIndex].props, ...delta.after };
          }
        } 
        else if (delta.type === 'ADD') {
          state.present.push(delta.after);
        } 
        else if (delta.type === 'REMOVE') {
          state.present = state.present.filter(o => o.id !== delta.targetId);
        }
        else if (delta.type === 'REORDER') {
          state.present = delta.after;
        }
      });

      state.future = []; // Clear future
    },

    // 3. THE NEW UNDO
    undo: (state) => {
      if (state.past.length === 0) return;
      
      const lastPayload = state.past.pop();
      state.future.unshift(lastPayload); 
      if (state.future.length > MAX_HISTORY) state.future.pop();

      const deltas = Array.isArray(lastPayload) ? lastPayload : [lastPayload];
      
      // Reverse array when undoing so layered objects undo in perfect order
      [...deltas].reverse().forEach(delta => {
        if (delta.type === 'UPDATE') {
          const objIndex = state.present.findIndex(o => o.id === delta.targetId);
          if (objIndex !== -1) {
            state.present[objIndex].props = { ...state.present[objIndex].props, ...delta.before };
          }
        } 
        else if (delta.type === 'ADD') {
          state.present = state.present.filter(o => o.id !== delta.targetId);
        } 
        else if (delta.type === 'REMOVE') {
          state.present.push(delta.before);
        }
        else if (delta.type === 'REORDER') {
          state.present = delta.before;
        }
      });
    },

    // 4. THE NEW REDO
    redo: (state) => {
      if (state.future.length === 0) return;
      
      const nextPayload = state.future.shift();
      state.past.push(nextPayload);
      if (state.past.length > MAX_HISTORY) state.past.shift();

      const deltas = Array.isArray(nextPayload) ? nextPayload : [nextPayload];

      deltas.forEach(delta => {
        if (delta.type === 'UPDATE') {
          const objIndex = state.present.findIndex(o => o.id === delta.targetId);
          if (objIndex !== -1) {
            state.present[objIndex].props = { ...state.present[objIndex].props, ...delta.after };
          }
        } 
        else if (delta.type === 'ADD') {
          state.present.push(delta.after);
        } 
        else if (delta.type === 'REMOVE') {
          state.present = state.present.filter(o => o.id !== delta.targetId);
        }
        else if (delta.type === 'REORDER') {
          state.present = delta.after;
        }
      });
    },

    // (Kept for your other logic)
    setHistory: (state, action) => {
      const { past, present, future } = action.payload;
      state.past = past ? past.slice(-MAX_HISTORY) : []; 
      state.present = present || [];
      state.future = future ? future.slice(0, MAX_HISTORY) : [];
    },
    
    setClipboard: (state, action) => {
      state.clipboard = action.payload.map(obj => JSON.parse(JSON.stringify(obj)));
    }
  },
});

export const { setCanvasObjects, dispatchDelta, undo, redo, setHistory, setClipboard } = canvasSlice.actions;
export default canvasSlice.reducer;