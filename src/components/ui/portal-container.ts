import * as React from 'react';

/**
 * The element of the nearest open modal surface (sheet or dialog), for
 * popups that portal themselves.
 *
 * Radix modals lock scrolling outside their own DOM subtree (react-remove-scroll
 * swallows wheel and touch-move events there). A base-ui popup portaled to
 * <body> is outside that subtree, so its list cannot scroll and the wheel
 * scrolls the sheet behind it instead. Portaling into the modal's element puts
 * the popup back inside the allowed subtree.
 *
 * Null outside a modal: popups keep their default <body> portal.
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | null {
    return React.useContext(PortalContainerContext);
}
