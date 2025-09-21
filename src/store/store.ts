import { Dispatch } from 'redux';
import { useDispatch } from 'react-redux';
import { Action, init } from '@rematch/core';
import storage from 'redux-persist/lib/storage';
import loadingPlugin from '@rematch/loading';
import persistPlugin from '@rematch/persist';

import { models } from './IModels';
import { IDispatch } from './types/store.types';

const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['userModel', 'lastUpdateAt', 'filterModel'],
};

// const persistedConfig: Plugin<IRootModel, Models<IRootModel>, Partial<Models<IRootModel>>> = persistPlugin(persistConfig);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const persistedConfig = persistPlugin(persistConfig) as any;

const store = init({
    models,
    plugins: [loadingPlugin(), persistedConfig],
});

export default store;

export const useAppDispatch = () => useDispatch<IDispatch>();

export const useRematchDispatch = <D extends Dispatch<Action>, MD>(selector: (dispatch: D) => MD) => {
    const dispatch = useDispatch<D>();
    return selector(dispatch);
};
