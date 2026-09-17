import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listReturns, getReturn } from '../lib/api.js';

export const fetchReturns = createAsyncThunk('returns/fetchReturns', async (params, { rejectWithValue }) => {
  try {
    const res = await listReturns(params);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch returns');
  }
});

export const fetchReturnById = createAsyncThunk('returns/fetchReturnById', async (id, { rejectWithValue }) => {
  try {
    const res = await getReturn(id);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.detail || 'Failed to fetch return details');
  }
});

const returnSlice = createSlice({
  name: 'returns',
  initialState: {
    items: [],
    selectedReturn: null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedReturn: (state, action) => {
      state.selectedReturn = action.payload;
    },
    clearSelectedReturn: (state) => {
      state.selectedReturn = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReturns.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReturns.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReturns.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchReturnById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReturnById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedReturn = action.payload;
      })
      .addCase(fetchReturnById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setSelectedReturn, clearSelectedReturn } = returnSlice.actions;
export default returnSlice.reducer;
