import { useCallback, useEffect, useRef, useState } from "react";

export default function useAudioPlayback() {
    const [context, setContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const workletNode = useRef<AudioWorkletNode | null>(null);
    const [audioLevel, setAudioLevel] = useState<number>(0);

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

            const audioBuffer = new Int16Array(audioChunk);
            if (!audioBuffer) {
                return;
            }

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
            const average =
                dataArray.reduce((sum, value) => sum + value, 0) /
                dataArray.length;
            const normalizedLevel = Math.min(100, (average / 255) * 100);
            setAudioLevel(normalizedLevel);
            setIsPlaying(normalizedLevel > 0);
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
        audioLevel,
    };
}
