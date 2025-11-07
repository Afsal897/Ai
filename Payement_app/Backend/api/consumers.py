import json
import asyncio
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from django.db import close_old_connections
from django.core.exceptions import ObjectDoesNotExist
from channels.generic.websocket import AsyncWebsocketConsumer
from chatbot.utils.websocket_authentication import JWTWebSocketAuth
from api.ai_module import rag

logger = logging.getLogger("api_logger")
executor = ThreadPoolExecutor(max_workers=10)


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for chat sessions with AI integration."""

    # -----------------------------------------------------------
    # Connection Lifecycle
    # -----------------------------------------------------------
    async def connect(self):
        logger.info("Starting WebSocket connection setup.")
        try:
            auth = JWTWebSocketAuth(self.scope["headers"], self.scope.get("query_string"))
            user = await auth.authenticate()

            self.scope["user"] = user
            self.user_id = user.id
            self.running_tasks = set()
            self.joined_sessions = set()
            self.keep_running = True

            await self.accept()
            logger.info(f"WebSocket connected for user {user.email} (id={self.user_id}).")

            # Start keepalive ping loop
            asyncio.create_task(self.keepalive())

        except Exception as e:
            logger.error(f"Error during connect: {e}", exc_info=True)
            await self.close()

    async def disconnect(self, close_code):
        from api.models.enums import SessionType

        user_id = getattr(self, "user_id", None)
        logger.info(f"Disconnect initiated for user_id={user_id}, code={close_code}")
        self.keep_running = False

        try:
            # Cancel all running background tasks
                for session_id in list(self.joined_sessions):
                    loop = asyncio.get_running_loop()
                    await loop.run_in_executor(None, self.set_session_status, session_id, SessionType.INACTIVE)
                logger.info(f"Marked joined sessions inactive for user {user_id}.")

        except Exception as e:
                logger.error(f"Failed to set inactive sessions for user {user_id}: {e}", exc_info=True)

        finally:
            close_old_connections()
            logger.info(f"WebSocket disconnected for user {user_id}. Code={close_code}")

    # -----------------------------------------------------------
    # Keepalive Ping
    # -----------------------------------------------------------
    async def keepalive(self):
        """Sends ping messages periodically to keep the socket alive."""
        logger.info("Keepalive loop started.")
        while self.keep_running:
            try:
                await self.send_json({"type": "ping"})
                logger.info("Keepalive ping sent.")
            except Exception:
                logger.warning("Keepalive stopped: socket likely closed.")
                break
            await asyncio.sleep(30)
        logger.info("Keepalive loop terminated.")

    # -----------------------------------------------------------
    # Message Handling
    # -----------------------------------------------------------
    async def receive(self, text_data, **kwargs):
        logger.info(f"Received WebSocket message: {text_data}")
        try:
            content = json.loads(text_data)
            action = content.get("action")
            session_id = int(content.get("session_id"))
            message_text = content.get("message")

            if not action:
                return await self.send_error("Missing action")

            # Validate session ownership if session_id is provided
            session = await self.get_valid_session(session_id)
            if session_id and not session:
                return  # Error already sent

            handlers = {
                "join": self.join_session,
                "leave": self.leave_session,
                "send_message": self.handle_send_message,
            }

            handler = handlers.get(action)  
            if not handler:
                return await self.send_error(f"Unknown action '{action}'")

            logger.info(f"Dispatching action='{action}' for user_id={self.user_id}")
            if action in ("join", "leave"):
                logger.info("action is join or leave")
                task = asyncio.create_task(self._run_handler(handler, session_id))
            else:
                task = asyncio.create_task(self._run_handler(handler, session_id, message_text))
            # Add task to running list for cleanup
            self.running_tasks.add(task)
            task.add_done_callback(self.running_tasks.discard)
            
        except Exception as e:
            logger.error(f"receive() failed: {e}", exc_info=True)


    async def _run_handler(self, handler, *args):
        """Wrapper to safely run handlers asynchronously with exception logging."""
        try:
            start = time.time()
            task_id = id(asyncio.current_task())
            logger.info(f"[START] {handler.__name__}() task={task_id}")
            await handler(*args)
            duration = time.time() - start
            logger.info(f"[END] {handler.__name__}() task={task_id} duration={duration:.2f}s")
        except Exception as e:
            logger.error(f"Handler {handler.__name__} failed: {e}", exc_info=True)

    # -----------------------------------------------------------
    # Session Validation & Management
    # -----------------------------------------------------------
    async def get_valid_session(self, session_id):
        if not session_id:
            return None

        from api.models import Session
        loop = asyncio.get_running_loop()
        try:
            session = await loop.run_in_executor(None, lambda: Session.objects.get(id=session_id))
            if session.user_id != self.user_id:
                await self.send_error("Unauthorized session access")
                logger.warning(f"User {self.user_id} attempted unauthorized access to session {session_id}")
                return None
            return session
        except ObjectDoesNotExist:
            await self.send_error("Invalid session ID")
            logger.warning(f"Invalid session ID={session_id} requested by user {self.user_id}")
            return None

    async def join_session(self, session_id):
        from api.models.enums import SessionType
        logger.info(f"Attempting to join session {session_id} for user {self.user_id}")

        if not session_id:
            await self.send_error("Missing session_id")
            return

        loop = asyncio.get_running_loop()
        already_active = await loop.run_in_executor(None, self.is_session_active, session_id)
        logger.info(f"Session {session_id} already_active={already_active} for user {self.user_id}")
        
        if already_active:
            await self.send_error(f"Session {session_id} is already active")
            logger.warning(f"Session {session_id} already active, user={self.user_id}")
            return

        can_join = await loop.run_in_executor(None, self.can_user_join_session, self.user_id)
        if not can_join:
            await self.send_error("Max 5 active sessions per user reached")
            logger.warning(f"User {self.user_id} exceeded active session limit.")
            return

        self.joined_sessions.add(session_id)
        await self.channel_layer.group_add(f"session_{session_id}", self.channel_name)

        await loop.run_in_executor(None, self.set_session_status, session_id, SessionType.ACTIVE)
        await self.send_json({"status": "joined", "session_id": session_id})
        logger.info(f"User {self.user_id} joined session {session_id}")

    async def leave_session(self, session_id):
        from api.models.enums import SessionType
        logger.info(f"Leaving session {session_id} for user {self.user_id}")
        if session_id in self.joined_sessions:
            self.joined_sessions.remove(session_id)
            await self.channel_layer.group_discard(f"session_{session_id}", self.channel_name)

            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self.set_session_status, session_id, SessionType.INACTIVE)
            await self.send_json({"status": "left", "session_id": session_id})
            logger.info(f"User {self.user_id} left session {session_id}")
        logger.info(f"User {self.user_id} not in joined_sessions")
    # -----------------------------------------------------------
    # AI Message Handling
    # -----------------------------------------------------------
    async def handle_send_message(self, session_id, message_text):
        session_id = int(session_id)
        if not session_id or not message_text:
            return await self.send_error("Both session_id and message are required")
        print(self.joined_sessions)
        if session_id not in self.joined_sessions:
            return await self.send_error(f"You must join session {session_id} before sending messages")

        start = time.time()
        task_id = id(asyncio.current_task())
        logger.info(f"[START] handle_send_message(): task={task_id}, time={start:.6f}")

        await self.send_json({"status": "pending", "session_id": session_id})
        task = asyncio.create_task(
            self.handle_message(self.scope["user"], session_id, message_text, start, task_id)
        )
        self.running_tasks.add(task)
        task.add_done_callback(self.running_tasks.discard)

    async def handle_message(self, user, session_id, message_text, start, task_id):
        logger.info(f"handle_message() started for session {session_id}: '{message_text}'")
        try:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(
                executor,
                lambda: self.save_message_sync(session_id, message_text, direction=1)
            )
            await self.run_ai(user, session_id, message_text)

            end = time.time()
            logger.info(f"[END] handle_message(): task={task_id}, duration={end - start:.6f}s")

        except Exception as e:
            logger.error(f"Error handling message for user {user.id}: {e}", exc_info=True)

    async def run_ai(self, user, session_id, message_text):
        from api.models.enums import UserRole
        logger.info(f"Running AI for session {session_id}, user {user.id}")

        try:
            user_role = UserRole(user.role).label
            # Offload blocking rag() call to thread pool
            loop = asyncio.get_running_loop()
            response_data = await loop.run_in_executor(
                executor, lambda: rag(user.id, message_text, user_role, session_id)
            )

            if isinstance(response_data, dict):
                resp = response_data.get("response", {})
                ai_message = resp.get("message")
                file_name = resp.get("file_name")
                file_path = resp.get("file_path")
            else:
                ai_message = response_data
                file_name = file_path = None

        except Exception as e:
            logger.error(f"AI exception for user {user.id}: {e}", exc_info=True)
            ai_message = "I'm sorry, I couldn't process your request at this time."
            file_name = file_path = None

        has_file = 0 if file_name else 1

        loop = asyncio.get_running_loop()
        ai_message_obj = await loop.run_in_executor(
            executor,
            lambda: self.save_message_sync(
                session_id, ai_message, direction=2, has_file=has_file,
                file_name=file_name, file_path=file_path
            )
        )

        payload = {
            "status": "success",
            "id": ai_message_obj.id,
            "session_id": session_id,
            "direction": ai_message_obj.direction,
            "message": ai_message,
            "created_at": str(ai_message_obj.created_at),
            "has_file": has_file == 0,
        }
        if file_name:
            payload.update({"file_name": file_name, "filepath": file_path})

        logger.info(f"AI response prepared for session {session_id}: {payload}")
        await self.send_json(payload)

    # -----------------------------------------------------------
    # Utility Send Methods
    # -----------------------------------------------------------
    async def send_error(self, message):
        logger.info(f"Sending error message: {message}")
        await self.send_json({"error": message})

    async def send_json(self, data):
        try:
            logger.info(f"Sending JSON data: {data}")
            await self.send(json.dumps(data))
            await asyncio.sleep(0)  # yields control so pending is actually flushed
        except Exception as e:
            if "ClientDisconnected" in str(type(e)):
                logger.info(f"Client disconnected before send: {data}")
            else:
                logger.error(f"send_json failed: {e}", exc_info=True)

    # -----------------------------------------------------------
    # Database Helpers (run in executors)
    # -----------------------------------------------------------
    def save_message_sync(self, session_id, message_text, direction=1, has_file=1, file_name=None, file_path=None):
        from api.models import Message, Session
        try:
            session = Session.objects.get(id=session_id)
            msg = Message.objects.create(
                session=session,
                message=message_text,
                direction=direction,
                has_file=has_file,
                file_name=file_name,
                file_path=file_path
            )
            logger.info(f"Message saved (session={session_id}, direction={direction})")
            return msg
        except ObjectDoesNotExist:
            logger.warning(f"No session found for ID: {session_id}")
        except Exception as e:
            logger.error(f"save_message_sync error: {e}", exc_info=True)
        finally:
            close_old_connections()

    def set_session_status(self, session_id, status):
        from api.models import Session
        from api.models.enums import SessionType
        try:
            close_old_connections()
            session = Session.objects.get(id=session_id)
            session.is_active = status
            session.save(update_fields=["is_active", "updated_at"])
            logger.info(f"Session {session_id} set to {SessionType(status).label}")
        except ObjectDoesNotExist:
            logger.warning(f"Session not found for ID: {session_id}")
        except Exception as e:
            logger.error(f"Error updating session {session_id} status: {e}", exc_info=True)


    def can_user_join_session(self, user_id):
        from api.models import Session
        from api.models.enums import SessionType
        from django.db.models import Count
        try:
            active_count = (
                Session.objects
                .filter(user_id=user_id, is_active=SessionType.ACTIVE)
                .aggregate(count=Count("id"))["count"]
            )
            logger.info(f"user_id={user_id}, active_count={active_count}")
            return active_count < 5
        except Exception as e:
            logger.error(f"Error checking user session limit: {e}", exc_info=True)
            return False
        finally:
            close_old_connections()

    def is_session_active(self, session_id):
        from api.models import Session
        from api.models.enums import SessionType
        try:
            session = Session.objects.get(id=session_id)
            logger.info(f"Fetched session:{session_id} for is_session_active check. is_active:{session.is_active}")
            active = session.is_active == SessionType.ACTIVE
            logger.info(f"Session {session_id} active={active}")
            return active
        except Session.DoesNotExist:
            logger.warning(f"is_session_active: Session {session_id} not found.")
            return False
        finally:
            close_old_connections()
