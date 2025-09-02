export const getCtrlKey = (lowerKey: string, action: 'keydown' | 'keyup' = 'keydown') => {
    const upperKey = lowerKey?.toUpperCase();
    const isMac = checkIsMac();

    if (isMac) {
        return [
            { sequence: `command+${lowerKey}`, action },
            { sequence: `command+${upperKey}`, action },
        ];
    }
    return [
        { sequence: `ctrl+${lowerKey}`, action },
        { sequence: `ctrl+${upperKey}`, action },
    ];
};
export const getAltKey = (key: string, action: 'keydown' | 'keyup' = 'keydown') => {
    const upperKey = key?.toUpperCase();
    const isMac = checkIsMac();

    if (isMac) {
        return [
            { sequence: `ctrl+${key}`, action },
            { sequence: `ctrl+${upperKey}`, action },
        ];
    }

    return [
        { sequence: `alt+${key}`, action },
        { sequence: `alt+${upperKey}`, action },
    ];
};

export const getCtrlShiftKey = (key: string, action: 'keydown' | 'keyup' = 'keydown') => {
    const upperKey = key?.toUpperCase();
    const isMac = checkIsMac();

    if (isMac) {
        return [
            { sequence: `command+shift+${key}`, action },
            { sequence: `command+shift+${upperKey}`, action },
        ];
    }

    return [
        { sequence: `ctrl+shift+${key}`, action },
        { sequence: `ctrl+shift+${upperKey}`, action },
    ];
};
export const getShiftKey = (key: string) => {
    return { sequence: `shift+${key}`, action: 'keydown' };
};

export const getEnterKey = () => {
    return { sequence: `enter`, action: 'keydown' };
};

export const checkIsMac = (): boolean => {
    return navigator.platform.indexOf('Mac') > -1;
};

export const isCtrlEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    return e.key === 'Enter' && checkIsMac() ? e.metaKey : e.ctrlKey;
};
