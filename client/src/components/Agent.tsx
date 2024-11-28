import SpeakerBox from "@/components/SpeakerBox";
import { useAudioPlaybackContext } from "@/context/AudioPlaybackContext";
import { useWebsocketContext } from "@/context/WebsocketContext";
import BotIcon from "@/icons/Bot";
import { useCallback, useEffect } from "react";

export default function Agent({ active }: { active?: boolean }) {
    const { addMessageCallback } = useWebsocketContext();
    const { enqueueAudioChunk } = useAudioPlaybackContext();

    const processWebsocketMessage = useCallback(
        async (event: MessageEvent) => {
            console.log("Websocket message:", event.data);
            if (event.data instanceof ArrayBuffer) {
                // Handle audio chunk (ArrayBuffer)
                console.log("Received audio ArrayBuffer");
                enqueueAudioChunk(event.data);
            } else if (event.data instanceof Blob) {
                // Handle audio chunk (Blob)
                console.log("Received audio Blob");
                const arrayBuffer = await event.data.arrayBuffer();
                console.log("ArrayBuffer:", arrayBuffer);
                enqueueAudioChunk(arrayBuffer);
            } else {
                console.warn("Unknown data type received:", event.data);
            }
        },
        [enqueueAudioChunk]
    );

    useEffect(() => {
        addMessageCallback(processWebsocketMessage);
    }, [addMessageCallback, processWebsocketMessage]);
    return (
        <SpeakerBox active={active}>
            <BotIcon
                style={{
                    width: "50%",
                    height: "50%",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "rgba(255, 255, 255, 0.8)",
                }}
            />
        </SpeakerBox>
    );
}
