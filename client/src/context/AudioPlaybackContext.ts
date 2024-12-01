import { createContext, useContext } from "react";

export const AudioPlaybackContext = createContext<{
    context: AudioContext | null;
    enqueueAudioChunk: (audioChunk: ArrayBuffer) => void;
    setupPlayBack: () => void;
    stopAndClearAudio: () => void;
    isPlaying: boolean;
} | null>(null);

export const useAudioPlaybackContext = () => {
    const context = useContext(AudioPlaybackContext);
    if (!context) {
        throw new Error(
            "useAudioPlaybackContext must be used within an AudioPlaybackProvider"
        );
    }
    return context;
};
