import argparse
import json
import time
import wave
import asyncio
from pydub import AudioSegment

from src.server import Server
from src.asr.asr_factory import ASRFactory
from src.vad.vad_factory import VADFactory
from src.audio_utils import MockWebsocket
from src.client import Client

sample_rate = 16000

default_client_config = '{"language": "null", "processing_strategy": "overlapping_buffers", "processing_args": { "chunk_length_seconds": 2, "overlap_seconds": 0.5}}'


def parse_args():
    parser = argparse.ArgumentParser(description="VoiceStreamAI Server: Real-time audio transcription using self-hosted Whisper and WebSocket")
    parser.add_argument("--vad-type", type=str, default="pyannote", help="Type of VAD pipeline to use (e.g., 'pyannote')")
    parser.add_argument("--vad-args", type=str, default='{"auth_token": "huggingface_token", "synchronous": false}', help="JSON string of additional arguments for VAD pipeline")
    parser.add_argument("--asr-type", type=str, default="faster_whisper", help="Type of ASR pipeline to use (e.g., 'whisper')")
    parser.add_argument("--asr-args", type=str, default='{"model_size": "large-v3"}', help="JSON string of additional arguments for ASR pipeline")
    parser.add_argument("--client-config", type=str, default=default_client_config, help="JSON string for the client configuration (buffering strategy etc)")
    parser.add_argument("--input-filename", type=str, required=True, help="The path a file that one wants to transcribe offline")
    parser.add_argument("--output-filename", type=str,  required=True, help="The path to the transcribed file")
    parser.add_argument("--output-format", type=str, default='json', help="json for full output, txt for only text")
    parser.add_argument("--buffer-length", type=int, default=256, help="The buffer length, simulating the client sending audio data")
    return parser.parse_args()


async def main():
    args = parse_args()

    try:
        vad_args = json.loads(args.vad_args)
        asr_args = json.loads(args.asr_args)
        client_config = json.loads(args.client_config)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON arguments: {e}")
        return

    # instantiate all the ingredients
    websocket = MockWebsocket(args.output_filename, args.output_format)    
    vad_pipeline = VADFactory.create_vad_pipeline(args.vad_type, **vad_args)
    asr_pipeline = ASRFactory.create_asr_pipeline(args.asr_type, **asr_args)
    client = Client("offline_client", 16000, 2)
    client.update_config(client_config)

    try:
        with wave.open(args.input_filename, 'rb') as wav:
            # Ensure the file's sample rate matches our expectations
            assert wav.getframerate() == sample_rate, "Sample rate does not match."

            start = time.time()

            while True:
                # Read frames for the next chunk
                frames = wav.readframes(args.buffer_length)
                if not frames:
                    silence = AudioSegment.silent(duration=2000)
                    await client.append_and_process_audio(silence.raw_data, websocket, vad_pipeline, asr_pipeline)
                    break  # End of file
                    
                # Process each chunk
                await client.append_and_process_audio(frames, websocket, vad_pipeline, asr_pipeline)

            end = time.time()
            websocket.close()
            
    except FileNotFoundError:
        print("The specified file does not exist.")
    except AssertionError as e:
        print(e)

    print(f"Process completed: total Processing time: {end-start}")

if __name__ == "__main__":
    asyncio.run(main()) # this is needed for the other asyncio stuff in the VAD