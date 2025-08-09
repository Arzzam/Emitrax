import { Models } from '@rematch/core';
import { userModel, lastUpdateAt } from './models';

export interface RootModel extends Models<RootModel> {
    userModel: typeof userModel;
    lastUpdateAt: typeof lastUpdateAt;
}

export const models: RootModel = {
    userModel,
    lastUpdateAt,
};
