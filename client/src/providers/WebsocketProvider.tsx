// src/providers/WebsocketProvider.tsx

import { useApplicationState } from "@/context/ApplicationStateContext";
import { WebsocketContext } from "@/context/WebsocketContext";
import useWebsocket from "@/hooks/useWebsocket";
import { useCallback, useEffect, useState } from "react";

export default function WebsocketProvider({
    children,
    address,
}: {
    children: React.ReactNode;
    address: string;
}) {
    const [messageCallbacks, setMessageCallbacks] = useState<
        ((event: MessageEvent) => void)[]
    >([]);
    const {
        websocket,
        connected,
        startWebsocket,
        closeWebsocket,
        sendWebsocketMessage,
    } = useWebsocket({
        address,
        onMessageCallbacks: messageCallbacks,
    });

    const { setApplicationState } = useApplicationState();
    const addMessageCallback = useCallback(
        (callback: (event: MessageEvent) => void) => {
            setMessageCallbacks((prev) => [...prev, callback]);
        },
        [setMessageCallbacks]
    );

    const receiveMessage = useCallback(
        (event: MessageEvent) => {
            console.log("Received message", event);
            if (typeof event.data === "string") {
                const data = JSON.parse(event.data);
                console.log("Received data", data);
                if (data.type === "mic") {
                    setApplicationState((prev) => ({
                        ...prev,
                        micState: data.state,
                    }));
                }
            }
        },
        [setApplicationState]
    );

    useEffect(() => {
        addMessageCallback(receiveMessage);
    }, [addMessageCallback, receiveMessage]);

    useEffect(() => {
        console.log("Connected", connected);
        if (connected) {
            setApplicationState((prev) => ({
                ...prev,
                isConnected: true,
            }));
        } else {
            setApplicationState((prev) => ({
                ...prev,
                isConnected: false,
            }));
        }
    }, [connected, setApplicationState]);

    return (
        <WebsocketContext.Provider
            value={{
                websocket,
                connected,
                addMessageCallback,
                startWebsocket,
                closeWebsocket,
                sendWebsocketMessage,
            }}
        >
            {children}
        </WebsocketContext.Provider>
    );
}
