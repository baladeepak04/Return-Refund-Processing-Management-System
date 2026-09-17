import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listRefunds, getRefund } from '../lib/api.js';

export const fetchRefunds = createAsyncThunk('refunds/fetchRefunds', async (params, { rejectWithValue }) => {
  try {
    const res = await listRefunds(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch refunds');
  }
});

export const fetchRefundById = createAsyncThunk('refunds/fetchRefundById', async (id, { rejectWithValue }) => {
  try {
    const res = await getRefund(id);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch refund details');
  }
});

const refundSlice = createSlice({
  name: 'refunds',
  initialState: {
    items: [],
    selectedRefund: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedRefund: (state, action) => {
      state.selectedRefund = action.payload;
    },
    clearSelectedRefund: (state) => {
      state.selectedRefund = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRefunds.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefunds.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRefunds.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchRefundById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRefundById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedRefund = action.payload;
      })
      .addCase(fetchRefundById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedRefund, clearSelectedRefund } = refundSlice.actions;
export default refundSlice.reducer;
