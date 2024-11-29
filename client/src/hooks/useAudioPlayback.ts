import { useCallback, useRef, useState } from "react";

export default function useAudioPlayback() {
    const [context, setContext] = useState<AudioContext | null>(null);
    const workletNode = useRef<AudioWorkletNode | null>(null);

    const setupPlayBack = useCallback(async () => {
        if (context) return; // Prevent multiple setups
        const audioContext = new AudioContext({
            sampleRate: 24000,
        });
        setContext(audioContext);
        console.log("Audio context created", audioContext.sampleRate);

        try {
            await audioContext.audioWorklet.addModule(
                "playback-audio-processor.js" // Update the path
            );
            const node = new AudioWorkletNode(audioContext, "audio-processor");
            node.connect(audioContext.destination);
            workletNode.current = node;
        } catch (error) {
            console.error("Failed to load audio processor:", error);
        }
    }, [context]);

    const enqueueAudioChunk = useCallback(
        async (audioChunk: ArrayBuffer) => {
            if (!context || !workletNode.current) {
                return;
            }

            // const audioBuffer = await context.decodeAudioData(audioChunk);
            const audioBuffer = new Int16Array(audioChunk);
            if (!audioBuffer) {
                return;
            }

            // Convert AudioBuffer to Float32Array maybe inside the AudioWorklet
            // const channelData = audioBuffer.getChannelData(0);
            workletNode.current.port.postMessage({
                type: "enqueue",
                chunk: audioBuffer,
            });
        },
        [context]
    );

    const stopAndClearAudio = useCallback(() => {
        if (workletNode.current) {
            workletNode.current.port.postMessage({ type: "clear" });
        }
    }, []);

    return { enqueueAudioChunk, stopAndClearAudio, setupPlayBack, context };
}
