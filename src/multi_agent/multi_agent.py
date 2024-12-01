import asyncio
import os
import uuid

from autogen_core.application import SingleThreadedAgentRuntime
from autogen_core.base import TopicId
from autogen_core.components import (
    TypeSubscription,
)
from autogen_ext.models import OpenAIChatCompletionClient

from src.multi_agent.agents.response_agent import ResponseAgent
from src.multi_agent.agents.user_agent import UserAgent
from src.multi_agent.group_chat_manager import GroupChatManager
from src.multi_agent.messages import CallConnected


response_topic_type = "response"
user_topic_type = "User"
group_chat_topic_type = "group_chat"

response_description = "Agent for providing answers to user questions."
user_description = "User for providing final approval."


class MultiAgent:
    def __init__(self, client, **kwargs):
        self.message_listeners = []
        self.transcription_listeners = []
        self.client = client
        # schedule the initialization in a separate task
        asyncio.create_task(self.initialize(**kwargs))

    def add_listener(self, listener):
        self.message_listeners.append(listener)

    def remove_listener(self, listener):
        self.message_listeners.remove(listener)

    async def on_message_output(self, message, ctx):
        for listener in self.message_listeners:
            await listener(message, ctx)

    async def on_transcription(self, transcription):
        for listener in self.transcription_listeners:
            await listener(transcription)

    async def initialize(self, **kwargs):
        print(kwargs)
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            api_key = kwargs.get("openai_key")
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not set.")
        self.runtime = SingleThreadedAgentRuntime()
        response_agent_type = await ResponseAgent.register(
            self.runtime,
            response_topic_type,  # Using topic type as the agent type.
            lambda: ResponseAgent(
                description=response_description,
                group_chat_topic_type=group_chat_topic_type,
                model_client=OpenAIChatCompletionClient(
                    model="gpt-4o-mini",
                    api_key=api_key,
                ),
                client=self.client,
            ),
        )
        await self.runtime.add_subscription(
            TypeSubscription(
                topic_type=response_topic_type, agent_type=response_agent_type.type
            )
        )
        await self.runtime.add_subscription(
            TypeSubscription(
                topic_type=group_chat_topic_type, agent_type=response_agent_type.type
            )
        )

        user_agent_type = await UserAgent.register(
            self.runtime,
            user_topic_type,
            lambda: UserAgent(
                description=user_description,
                group_chat_topic_type=group_chat_topic_type,
                on_message_output=self.on_message_output,
                transcription_queue=self.client.transcription_queue,
            ),
        )
        await self.runtime.add_subscription(
            TypeSubscription(
                topic_type=user_topic_type, agent_type=user_agent_type.type
            )
        )
        await self.runtime.add_subscription(
            TypeSubscription(
                topic_type=group_chat_topic_type, agent_type=user_agent_type.type
            )
        )

        group_chat_manager_type = await GroupChatManager.register(
            self.runtime,
            "group_chat_manager",
            lambda: GroupChatManager(
                participant_topic_types=[
                    response_topic_type,
                    user_topic_type,
                ],
                main_interviewer_topic_type=response_topic_type,
                model_client=OpenAIChatCompletionClient(
                    model="gpt-4o-mini",
                    api_key=api_key,
                ),
                participant_descriptions=[
                    response_description,
                    user_description,
                ],
            ),
        )
        await self.runtime.add_subscription(
            TypeSubscription(
                topic_type=group_chat_topic_type,
                agent_type=group_chat_manager_type.type,
            )
        )

        await self.start()

    async def start(self):
        self.runtime.start()
        session_id = str(uuid.uuid4())
        await self.runtime.publish_message(
            CallConnected(),
            TopicId(type=group_chat_topic_type, source=session_id),
        )

        await self.runtime.stop_when_idle()

    async def stop(self):
        await self.runtime.stop()
