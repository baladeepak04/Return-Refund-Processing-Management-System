import { configureStore } from '@reduxjs/toolkit';
import returnReducer from './returnSlice.js';
import refundReducer from './refundSlice.js';

// Redux store managing global return state & refund status
export const store = configureStore({
  reducer: {
    returns: returnReducer,
    refunds: refundReducer,
  },
});

export default store;
