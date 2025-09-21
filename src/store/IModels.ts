import { Models } from '@rematch/core';
import { userModel, lastUpdateAt, filterModel } from './models';

export interface RootModel extends Models<RootModel> {
    userModel: typeof userModel;
    lastUpdateAt: typeof lastUpdateAt;
    filterModel: typeof filterModel;
}

export const models: RootModel = {
    userModel,
    lastUpdateAt,
    filterModel,
};
