import { RematchDispatch, RematchRootState } from '@rematch/core';

import { RootModel } from '@/store/IModels';

import store from '../../store/store';

export type IStore = typeof store;
export type IDispatch = RematchDispatch<RootModel>;
export type IRootState = RematchRootState<RootModel>;
