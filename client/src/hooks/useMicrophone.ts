import { useCallback, useEffect, useRef, useState } from "react";

export default function useMicrophone({
    audioCallbacks,
}: {
    audioCallbacks: ((sampleData: Float32Array) => void)[];
}) {
    const [context, setContext] = useState<AudioContext | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

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

            // Handle messages from the Worklet
            node.port.onmessage = (event) => {
                console.log("Received audio data:", event.data);
                // Handle raw audio data here, e.g., send it to a server
            };

            workletNodeRef.current = node;

            return node;
        } catch (err) {
            console.error("Error setting up audio worklet:", err);
        }
    }, [context]);

    useEffect(() => {
        const context = new AudioContext();
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
            .getUserMedia({ audio: true })
            .then(async (stream) => {
                const input = context.createMediaStreamSource(stream);
                const recordingNode = await setupRecordingWorkletNode();
                if (!recordingNode) {
                    throw new Error("Recording node not initialized");
                }
                recordingNode.port.onmessage = (event) => {
                    audioCallbacks.forEach((callback) => {
                        callback(event.data);
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
    };
}
