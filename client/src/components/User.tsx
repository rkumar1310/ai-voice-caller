import MicIcon from "@/icons/Mic";
import SpeakerBox from "@/components/SpeakerBox";
import { useApplicationState } from "@/context/ApplicationStateContext";
import { useEffect } from "react";
import { useMicrophoneContext } from "@/context/MicrophoneContext";
import useAudioInputProcessor from "@/hooks/useAudioInputProcessor";
import { useWebsocketContext } from "@/context/WebsocketContext";

export default function User({ active }: { active?: boolean }) {
    const { sendWebsocketMessage } = useWebsocketContext();

    const { addAudioCallback, startRecording, stopRecording, context } =
        useMicrophoneContext();

    const { processAudio } = useAudioInputProcessor({
        context,
        sendWebsocketMessage,
    });

    const { applicationState } = useApplicationState();

    useEffect(() => {
        addAudioCallback(processAudio);
    }, [addAudioCallback, processAudio]);

    useEffect(() => {
        if (applicationState.isConnected) {
            startRecording();
        }

        return () => {
            stopRecording();
        };
    }, [applicationState, startRecording, stopRecording]);

    return (
        <SpeakerBox active={active}>
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
