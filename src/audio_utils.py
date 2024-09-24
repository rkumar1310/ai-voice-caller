import os
import wave
import json


async def save_audio_to_file(
    audio_data, file_name, audio_dir="audio_files", audio_format="wav"
):
    """
    Saves the audio data to a file.

    :param audio_data: The audio data to save.
    :param file_name: The name of the file.
    :param audio_dir: Directory where audio files will be saved.
    :param audio_format: Format of the audio file.
    :return: Path to the saved audio file.
    """

    os.makedirs(audio_dir, exist_ok=True)

    file_path = os.path.join(audio_dir, file_name)

    with wave.open(file_path, "wb") as wav_file:
        wav_file.setnchannels(1)  # Assuming mono audio
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(audio_data)

    return file_path


class MockWebsocket:
    def __init__(self, output_filename, type):
        """
        Initializes the file for writing based on the specified type.
        
        :param output_filename: The name of the file to write to.
        :param type: The type of data to write ('json' or 'txt').
        """
        self.output_filename = output_filename
        self.type = type
        self.messages = []  # Initialize an empty list to store messages

    async def send(self, message):
        """
        Appends data to the list based on the type.

        :param message: A dictionary containing the message data. If type is 'json',
                        the entire message is appended as a dictionary to the list.
                        If type is 'txt', only the 'text' field of the message is appended.
        """
        if self.type == 'json':
            self.messages.append(message)  # Append the message dictionary to the list
        elif self.type == 'txt':
            # Assume all messages contain a 'text' field
            self.messages.append(message['text'])

    def close(self):
        """
        Writes the messages to the file in the specified format and closes the file.
        """
        with open(self.output_filename, 'w') as file:
            if self.type == 'json':
                json.dump(self.messages, file, indent=4)  # Write the list of messages as JSON
            elif self.type == 'txt':
                file.write(' '.join(self.messages))  # Write all text messages separated by a space
