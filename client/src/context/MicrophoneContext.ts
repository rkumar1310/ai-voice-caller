// src/context/MicrophoneContext.ts

import { createContext, useContext } from "react";

export const MicrophoneContext = createContext<{
    context: AudioContext | null;
    startRecording: () => void;
    stopRecording: () => void;
    addAudioCallback: (callback: (event: Float32Array) => void) => void;
    removeAudioCallback: (callback: (event: Float32Array) => void) => void;
} | null>(null);

export const useMicrophoneContext = () => {
    const context = useContext(MicrophoneContext);
    if (!context) {
        throw new Error(
            "useMicrophoneContext must be used within an MicrophoneProvider"
        );
    }
    return context;
};
