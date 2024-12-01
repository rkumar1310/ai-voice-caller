import { useCallback, useEffect, useState } from "react";

export default function useWebsocket({
    address,
    onMessageCallbacks,
}: {
    address: string;
    onMessageCallbacks: ((event: MessageEvent) => void)[];
}) {
    const [websocket, setWebsocket] = useState<WebSocket | null>(null);
    const [connected, setConnected] = useState<boolean>(false);

    const startWebsocket = useCallback(() => {
        const ws = new WebSocket(address);
        setWebsocket(ws);

        ws.onopen = () => {
            setConnected(true);
        };

        ws.onclose = () => {
            setConnected(false);
        };
        return () => {
            ws.close();
        };
    }, [address]);

    const closeWebsocket = useCallback(() => {
        if (websocket) {
            websocket.close();
        }
    }, [websocket]);

    useEffect(() => {
        if (!websocket) {
            return;
        }

        onMessageCallbacks.forEach((callback) => {
            websocket.addEventListener("message", callback);
        });
    }, [websocket, onMessageCallbacks]);

    const sendWebsocketMessage = useCallback(
        (message: ArrayBufferLike | string) => {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(message);
            }
        },
        [websocket]
    );

    return {
        websocket,
        connected,
        startWebsocket,
        closeWebsocket,
        sendWebsocketMessage,
    };
}
