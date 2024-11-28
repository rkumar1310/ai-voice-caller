import { useApplicationState } from "@/context/ApplicationStateContext";
import { useAudioPlaybackContext } from "@/context/AudioPlaybackContext";
import { useMicrophoneContext } from "@/context/MicrophoneContext";
import { useWebsocketContext } from "@/context/WebsocketContext";
import { useCallback } from "react";

export default function StartButton() {
    const { startWebsocket } = useWebsocketContext();
    const { context: audioPlayBackContext, setupPlayBack } =
        useAudioPlaybackContext();
    const { context: microphoneContext } = useMicrophoneContext();

    const {
        applicationState: { isConnected },
    } = useApplicationState();

    const handleClick = useCallback(() => {
        // Start the websocket connection
        startWebsocket();
        // Start the audio playback
        microphoneContext?.resume();
        audioPlayBackContext?.resume();
        setupPlayBack();
    }, [
        startWebsocket,
        microphoneContext,
        audioPlayBackContext,
        setupPlayBack,
    ]);

    return (
        <div
            style={{
                position: "absolute",
                width: "100vw",
                height: "100dvh",
            }}
        >
            <button
                onClick={handleClick}
                style={{
                    padding: "1rem 3rem",
                    background: "transparent",
                    color: "white",
                    border: "10px solid white",
                    borderRadius: "0.5rem",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textTransform: "uppercase",
                    fontFamily: "sans-serif",
                    fontSize: "10rem",
                    display: isConnected ? "none" : "block",
                    fontWeight: 900,
                }}
            >
                Start
            </button>
        </div>
    );
}
