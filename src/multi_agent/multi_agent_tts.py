from openai import OpenAI
from src.multi_agent.multi_agent import MultiAgent


response_topic_type = "response"
user_topic_type = "User"
group_chat_topic_type = "group_chat"

response_description = "Agent for providing answers to user questions."
user_description = "User for providing final approval."


class MultiAgentTTS:
    def __init__(self, client, websocket, **kwargs):
        self.client = client
        self.multi_agent = MultiAgent(self.client, **kwargs)
        self.multi_agent.add_listener(self.on_message)
        self.websocket = websocket
        self.openai_client = OpenAI()

    async def on_message(self, message, ctx):
        # TODO: Implement the text-to-speech functionality and stream the audio data to the client.
        print("MultiAgentTTS: received message", message, flush=True)
        from openai import OpenAI

        await self.elevenlabs_tts(message.body.content)

    async def openai_tts(self, message):
        response = self.openai_client.audio.speech.create(
            model="tts-1",
            voice="onyx",
            input=message,
        )
        # send this audio data to the websocket
        for data in response.iter_bytes(1024):
            await self.websocket.send(data)

    async def elevenlabs_tts(self, message):
        from elevenlabs import stream
        from elevenlabs.client import ElevenLabs

        client = ElevenLabs(
            api_key="sk_4b12e31aac58ccfddd7c31ea9a568fabbdd6735f894978ac",  # Defaults to ELEVEN_API_KEY
        )

        # for chunk in client.generate(
        #     text=message, voice="Brian", model="eleven_turbo_v2_5", stream=True
        # ):
        #     await self.websocket.send(chunk)

        audio = client.generate(text=message, voice="Brian", model="eleven_turbo_v2_5")

        await self.websocket.send(audio)
