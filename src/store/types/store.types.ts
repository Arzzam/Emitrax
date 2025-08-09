import { RematchDispatch, RematchRootState } from '@rematch/core';
import store from '../../store/store';
import { RootModel } from '@/store/IModels';

export type IStore = typeof store;
export type IDispatch = RematchDispatch<RootModel>;
export type IRootState = RematchRootState<RootModel>;
