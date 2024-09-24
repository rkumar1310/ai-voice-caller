import asyncio

from src.buffering_strategy.buffering_strategy_factory import BufferingStrategyFactory
from src.postprocessing.postprocessing_factory import PostprocessingFactory


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

    def __init__(self, client_id, sampling_rate, samples_width):
        self.client_id = client_id
        self.buffer = bytearray()
        self.scratch_buffer = bytearray()
        self.state = {}
        self.config = {"language": None,
                       "processing_strategy": "overlapping_buffers", 
                       "processing_args": {
                           "chunk_length_seconds": 2, 
                           "chunk_overlap_seconds": 0.5
                           },
                       "postprocessing_strategy": "rule_based_speech_processor2",
                       "postprocessing_args": {"max_frames": 2}
                       }
        self.file_counter = 0
        self.total_samples = 0
        self.sampling_rate = sampling_rate
        self.samples_width = samples_width
        self.buffering_strategy = BufferingStrategyFactory.create_buffering_strategy(self.config['processing_strategy'], self, **self.config['processing_args'])
        self.postprocessing_strategy = PostprocessingFactory.create_postprocessing_pipeline(self.config['postprocessing_strategy'], **self.config['postprocessing_args'])
        self.semaphore = asyncio.Semaphore(1)
        self.current_start_time = 0.0
        self.current_end_time = 0.0

    def update_config(self, config_data):
        self.config.update(config_data)
        self.buffering_strategy = BufferingStrategyFactory.create_buffering_strategy(self.config['processing_strategy'], self, **self.config['processing_args'])
        self.postprocessing_strategy = PostprocessingFactory.create_postprocessing_pipeline(self.config['postprocessing_strategy'], **self.config['postprocessing_args'])

    def append_audio_data(self, audio_data):
        self.buffer.extend(audio_data)
        self.total_samples += len(audio_data) / self.samples_width
        self.current_start_time = self.current_end_time
        self.current_end_time += (len(audio_data) / self.samples_width) / self.sampling_rate

    def clear_buffer(self):
        self.buffer.clear()

    def increment_file_counter(self):
        self.file_counter += 1

    def get_file_name(self):
        return f"{self.client_id}_{self.file_counter}.wav"
    
    async def process_audio(self, websocket, vad_pipeline, asr_pipeline):
        await self.buffering_strategy.process_audio(websocket, vad_pipeline, asr_pipeline, self.postprocessing_strategy)

    
    async def append_and_process_audio(self, audio_data, websocket, vad_pipeline, asr_pipeline):
        self.buffer.extend(audio_data)
        self.total_samples += len(audio_data) / self.samples_width
        self.current_start_time = self.current_end_time
        self.current_end_time += (len(audio_data) / self.samples_width) / self.sampling_rate
        await self.buffering_strategy.process_audio(websocket, vad_pipeline, asr_pipeline, self.postprocessing_strategy)
