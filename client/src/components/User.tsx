import MicIcon from "@/icons/Mic";
import SpeakerBox from "@/components/SpeakerBox";
import { useApplicationState } from "@/context/ApplicationStateContext";
import { useEffect } from "react";
import { useMicrophoneContext } from "@/context/MicrophoneContext";
import useAudioInputProcessor from "@/hooks/useAudioInputProcessor";
import { useWebsocketContext } from "@/context/WebsocketContext";

export default function User() {
    const { sendWebsocketMessage } = useWebsocketContext();

    const {
        addAudioCallback,
        startRecording,
        stopRecording,
        context,
        removeAudioCallback,
        audioLevel,
    } = useMicrophoneContext();

    const { processAudio } = useAudioInputProcessor(
        context,
        sendWebsocketMessage
    );

    const { applicationState } = useApplicationState();

    useEffect(() => {
        addAudioCallback(processAudio);

        return () => {
            removeAudioCallback(processAudio);
        };
    }, [addAudioCallback, context, processAudio, removeAudioCallback]);

    useEffect(() => {
        if (applicationState.isConnected) {
            startRecording();
        }
        // setActive(applicationState.micState === "speaking");

        return () => {
            stopRecording();
        };
    }, [applicationState, startRecording, stopRecording]);

    return (
        <SpeakerBox active={audioLevel > 0.1} audioLevel={audioLevel}>
            <MicIcon
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
