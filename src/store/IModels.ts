import { Models } from '@rematch/core';

import { advancedFilterModel, currencyPreferencesModel, filterModel, lastUpdateAt, userModel } from './models';

export interface RootModel extends Models<RootModel> {
    userModel: typeof userModel;
    lastUpdateAt: typeof lastUpdateAt;
    filterModel: typeof filterModel;
    advancedFilterModel: typeof advancedFilterModel;
    currencyPreferencesModel: typeof currencyPreferencesModel;
}

export const models: RootModel = {
    userModel,
    lastUpdateAt,
    filterModel,
    advancedFilterModel,
    currencyPreferencesModel,
};
