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

    // 2. 🆕 THE DELTA ENGINE: Handles tiny property changes instead of full arrays
    dispatchDelta: (state, action) => {
      const delta = action.payload; // Shape: { type: 'ADD'|'REMOVE'|'UPDATE', targetId, before, after }

      // A. Save the receipt to the past (and enforce the 50-step memory limit)
      state.past.push(delta);
      if (state.past.length > MAX_HISTORY) {
        state.past.shift();
      }

      // B. Apply the change directly to the present state
      if (delta.type === 'UPDATE') {
        const objIndex = state.present.findIndex(o => o.id === delta.targetId);
        if (objIndex !== -1) {
          // Merge the new properties onto the existing object's props
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
        state.present = delta.after; // After is the newly sorted array
      }

      // C. Clear future whenever a new action is taken
      state.future = [];
    },

    // 3. 🆕 THE NEW UNDO: Reads the receipt backwards
    undo: (state) => {
      if (state.past.length === 0) return;
      
      const lastDelta = state.past.pop();
      state.future.unshift(lastDelta); // Move receipt to future for Redo
      if (state.future.length > MAX_HISTORY) state.future.pop();

      if (lastDelta.type === 'UPDATE') {
        const objIndex = state.present.findIndex(o => o.id === lastDelta.targetId);
        if (objIndex !== -1) {
          // Apply the BEFORE properties back to the object
          state.present[objIndex].props = { ...state.present[objIndex].props, ...lastDelta.before };
        }
      } 
      else if (lastDelta.type === 'ADD') {
        // Undoing an ADD means we REMOVE it
        state.present = state.present.filter(o => o.id !== lastDelta.targetId);
      } 
      else if (lastDelta.type === 'REMOVE') {
        // Undoing a REMOVE means we ADD IT BACK using the `before` state
        state.present.push(lastDelta.before);
      }
      else if (lastDelta.type === 'REORDER') {
        state.present = lastDelta.before; // Revert to the old sort order
      }
    },

    // 4. 🆕 THE NEW REDO: Reads the receipt forwards
    redo: (state) => {
      if (state.future.length === 0) return;
      
      const nextDelta = state.future.shift();
      state.past.push(nextDelta);
      if (state.past.length > MAX_HISTORY) state.past.shift();

      if (nextDelta.type === 'UPDATE') {
        const objIndex = state.present.findIndex(o => o.id === nextDelta.targetId);
        if (objIndex !== -1) {
          // Apply the AFTER properties again
          state.present[objIndex].props = { ...state.present[objIndex].props, ...nextDelta.after };
        }
      } 
      else if (nextDelta.type === 'ADD') {
        // Redoing an ADD means we add it again
        state.present.push(nextDelta.after);
      } 
      else if (nextDelta.type === 'REMOVE') {
        // Redoing a REMOVE means we remove it again
        state.present = state.present.filter(o => o.id !== nextDelta.targetId);
      }
      else if (nextDelta.type === 'REORDER') {
        state.present = nextDelta.after; 
      }
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