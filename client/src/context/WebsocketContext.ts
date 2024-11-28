import { createContext, useContext } from "react";

export const WebsocketContext = createContext<{
    websocket: WebSocket | null;
    connected: boolean;
    addMessageCallback: (callback: (event: MessageEvent) => void) => void;
    startWebsocket: () => void;
    closeWebsocket: () => void;
    sendWebsocketMessage: (message: ArrayBufferLike | string) => void;
} | null>(null);

export const useWebsocketContext = () => {
    const context = useContext(WebsocketContext);
    if (!context) {
        throw new Error(
            "useWebsocketContext must be used within a WebsocketProvider"
        );
    }
    return context;
};
