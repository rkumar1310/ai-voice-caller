import { useCallback, useEffect, useRef, useState } from "react";

export default function useMicrophone({
    audioCallbacks,
}: {
    audioCallbacks: ((sampleData: Float32Array) => void)[];
}) {
    const [context, setContext] = useState<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);
    const [audioLevel, setAudioLevel] = useState<number>(0);

    const setupRecordingWorkletNode = useCallback(async () => {
        try {
            if (!context) {
                throw new Error("Audio context not initialized");
            }
            // Add the worklet module
            await context.audioWorklet.addModule("realtime-audio-processor.js");

            // Create the WorkletNode
            const node = new AudioWorkletNode(
                context,
                "realtime-audio-processor"
            );

            workletNodeRef.current = node;

            return node;
        } catch (err) {
            console.error("Error setting up audio worklet:", err);
        }
    }, [context]);

    useEffect(() => {
        const context = new AudioContext({
            sampleRate: 16000,
        });
        setContext(context);

        return () => {
            context.close();
        };
    }, []);

    const startRecording = useCallback(() => {
        if (!context) {
            return;
        }

        navigator.mediaDevices
            .getUserMedia({
                audio: {
                    echoCancellation: true,
                    autoGainControl: false,
                    noiseSuppression: true,
                },
            })
            .then(async (stream) => {
                const input = context.createMediaStreamSource(stream);
                const recordingNode = await setupRecordingWorkletNode();
                if (!recordingNode) {
                    throw new Error("Recording node not initialized");
                }
                recordingNode.port.onmessage = (event) => {
                    const sampleData = event.data as Float32Array;
                    const average =
                        sampleData.reduce(
                            (sum, value) => sum + Math.abs(value),
                            0
                        ) / sampleData.length;
                    const normalizedLevel = Math.min(100, (average / 1) * 1000); // Assuming the sample data is normalized between -1 and 1
                    setAudioLevel(normalizedLevel);
                    audioCallbacks.forEach((callback) => {
                        callback(sampleData);
                    });
                };
                input.connect(recordingNode);
            })
            .catch((error) => {
                console.error(error);
            });
    }, [context, audioCallbacks, setupRecordingWorkletNode]);

    const stopRecording = useCallback(() => {
        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
        }
    }, []);

    return {
        context,
        startRecording,
        stopRecording,
        audioLevel,
    };
}
