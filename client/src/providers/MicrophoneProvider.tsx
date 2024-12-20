// src/providers/MicrophoneProvider.tsx

import { MicrophoneContext } from "@/context/MicrophoneContext";
import useMicrophone from "@/hooks/useMicrophone";
import { useCallback, useState } from "react";

export const MicrophoneProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [audioCallbacks, setAudioCallbacks] = useState<
        ((sampleData: Float32Array) => void)[]
    >([]);
    const { context, startRecording, stopRecording, audioLevel } =
        useMicrophone({
            audioCallbacks,
        });

    const addAudioCallback = useCallback(
        (callback: (event: Float32Array) => void) => {
            setAudioCallbacks((prev) => [...prev, callback]);
        },
        []
    );

    const removeAudioCallback = useCallback(
        (callback: (event: Float32Array) => void) => {
            setAudioCallbacks((prev) => prev.filter((cb) => cb !== callback));
        },
        []
    );

    return (
        <MicrophoneContext.Provider
            value={{
                context,
                startRecording,
                stopRecording,
                addAudioCallback,
                removeAudioCallback,
                audioLevel,
            }}
        >
            {children}
        </MicrophoneContext.Provider>
    );
};
