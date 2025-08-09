const lastUpdateAtModel = {
    state: <string | null>null,
    reducers: {
        setLastUpdateAt: (_: string | null, lastUpdateAt: string) => {
            return lastUpdateAt;
        },
    },
};

export default lastUpdateAtModel;
