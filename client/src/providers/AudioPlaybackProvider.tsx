// src/providers/AudioPlaybackProvider.tsx

import { AudioPlaybackContext } from "@/context/AudioPlaybackContext";
import useAudioPlayback from "@/hooks/useAudioPlayback";

export default function AudioPlaybackProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { context, enqueueAudioChunk, setupPlayBack, stopAndClearAudio } =
        useAudioPlayback();
    return (
        <AudioPlaybackContext.Provider
            value={{
                context,
                enqueueAudioChunk,
                setupPlayBack,
                stopAndClearAudio,
            }}
        >
            {children}
        </AudioPlaybackContext.Provider>
    );
}
