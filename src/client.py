# isort: skip_file

import asyncio
import time
import wave
from src.buffering_strategy.buffering_strategy_factory import (
    BufferingStrategyFactory,
)
from src.multi_agent.multi_agent_tts import MultiAgentTTS


class Client:
    """
    Represents a client connected to the VoiceStreamAI server.

    This class maintains the state for each connected client, including their
    unique identifier, audio buffer, configuration, and a counter for processed
    audio files.

    Attributes:
        client_id (str): A unique identifier for the client.
        buffer (bytearray): A buffer to store incoming audio data.
        config (dict): Configuration settings for the client, like chunk length
                       and offset.
        file_counter (int): Counter for the number of audio files processed.
        total_samples (int): Total number of audio samples received from this
                             client.
        sampling_rate (int): The sampling rate of the audio data in Hz.
        samples_width (int): The width of each audio sample in bits.
    """

    def __init__(self, client_id, sampling_rate, samples_width, websocket):
        self.client_id = client_id
        self.buffer = bytearray()
        self.scratch_buffer = bytearray()
        self.config = {
            "language": None,
            "processing_strategy": "silence_at_end_of_chunk",
            "processing_args": {
                "chunk_length_seconds": 3,
                "chunk_offset_seconds": 0.1,
            },
        }
        self.file_counter = 0
        self.total_samples = 0
        self.sampling_rate = sampling_rate
        self.samples_width = samples_width
        self.buffering_strategy = BufferingStrategyFactory.create_buffering_strategy(
            self.config["processing_strategy"],
            self,
            **self.config["processing_args"],
        )
        self.websocket = websocket
        self.transcription_queue = asyncio.Queue()

        self.multi_agent = MultiAgentTTS(self, websocket)
        self.transcription_text = ""
        # file saving stuff
        self.enable_file_saving = True
        self.last_saved_at = 0
        self.file_save_buffer = bytearray()
        self.file_save_interval = 0.5  # in seconds
        self.audio_capture_time = 0

    def on_transcription(self, transcription):
        # reset because the input is sent to the TTS
        self.transcription_text = ""
        self.transcription_queue.put_nowait(transcription)

    def clear_speech(self):
        self.transcription_text = ""

    def update_config(self, config_data):
        self.config.update(config_data)
        self.buffering_strategy = BufferingStrategyFactory.create_buffering_strategy(
            self.config["processing_strategy"],
            self,
            **self.config["processing_args"],
        )

    def append_audio_data(self, audio_data):
        self.buffer.extend(audio_data)
        if self.enable_file_saving:
            self.file_save_buffer.extend(audio_data)
            if time.time() - self.last_saved_at > self.file_save_interval:
                file_path = f"audio_files/{self.client_id}_full_audio.wav"
                with wave.open(file_path, "wb") as wav_file:
                    wav_file.setnchannels(1)  # Assuming mono audio
                    wav_file.setsampwidth(2)
                    wav_file.setframerate(16000)
                    wav_file.writeframes(self.file_save_buffer)
                self.last_saved_at = time.time()
        self.total_samples += len(audio_data) / self.samples_width

    def clear_buffer(self):
        self.buffer.clear()

    def increment_file_counter(self):
        self.file_counter += 1

    def get_file_name(self):
        return f"{self.client_id}_{self.file_counter}.wav"

    def process_audio(self, websocket, vad_pipeline, asr_pipeline):
        self.buffering_strategy.process_audio(websocket, vad_pipeline, asr_pipeline)
