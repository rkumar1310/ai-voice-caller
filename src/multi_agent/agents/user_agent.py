import asyncio
from autogen_core.base import MessageContext
from autogen_core.components import (
    DefaultTopicId,
    RoutedAgent,
    message_handler,
)
from autogen_core.components.models import UserMessage
from rich.console import Console
from rich.markdown import Markdown

from src.multi_agent.messages import (
    GroupChatMessage,
    RequestToSpeak,
)


class UserAgent(RoutedAgent):

    def __init__(
        self,
        description: str,
        group_chat_topic_type: str,
        on_message_output: callable,
        transcription_queue: asyncio.Queue,
    ) -> None:
        super().__init__(description=description)
        self._group_chat_topic_type = group_chat_topic_type
        self.on_message_output = on_message_output
        self.transcription_queue = transcription_queue

    @message_handler
    async def handle_message(
        self, message: GroupChatMessage, ctx: MessageContext
    ) -> None:
        # When integrating with a frontend, this is where group chat message would be sent to the frontend.
        if self.on_message_output:
            await self.on_message_output(message, ctx)

    @message_handler
    async def handle_request_to_speak(
        self, message: RequestToSpeak, ctx: MessageContext
    ) -> None:

        # TODO: Hook the user input
        print("RequestToSpeak received", flush=True)
        # we need to wait for the client to send the data
        # before we can proceed
        print("UserAgent: waiting for data from client", flush=True)
        # wait for the transcription to be available on the queue
        user_input = await self.transcription_queue.get()

        print("UserAgent: received data from client", flush=True)
        print("UserAgent: current_transcription", user_input, flush=True)
        Console().print(Markdown(f"### User: \n{user_input}"))
        await self.publish_message(
            GroupChatMessage(body=UserMessage(content=user_input, source=self.id.type)),
            DefaultTopicId(type=self._group_chat_topic_type),
        )
