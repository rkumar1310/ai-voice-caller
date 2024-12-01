import { useCallback, useEffect, useRef, useState } from "react";

export default function useAudioPlayback() {
    const [context, setContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const workletNode = useRef<AudioWorkletNode | null>(null);

    const setupPlayBack = useCallback(async () => {
        if (context) return; // Prevent multiple setups
        console.log("Setting up audio playback");
        const audioContext = new AudioContext({
            sampleRate: 16000,
        });
        setContext(audioContext);
        const analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 2048;
        setAnalyser(analyserNode);

        try {
            await audioContext.audioWorklet.addModule(
                "playback-audio-processor.js" // Update the path
            );
            const node = new AudioWorkletNode(audioContext, "audio-processor");
            node.connect(audioContext.destination);
            node.connect(analyserNode);
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

    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!analyser) return;

        const detectAudio = () => {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const hasAudio = dataArray.some((value) => value > 0);
            setIsPlaying(hasAudio);
        };

        const interval = setInterval(detectAudio, 100);

        return () => clearInterval(interval);
    }, [analyser]);

    return {
        enqueueAudioChunk,
        stopAndClearAudio,
        setupPlayBack,
        context,
        isPlaying,
    };
}
